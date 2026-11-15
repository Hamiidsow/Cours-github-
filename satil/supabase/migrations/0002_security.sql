-- SATIL — 0002 : sécurité. RBAC, isolation par organisation et par pays (RLS), journal d'audit.
-- Principe : tout est refusé par défaut ; chaque autorisation est explicite.

-- ───────────────────────── Fonctions d'autorisation ─────────────────────────
-- SECURITY DEFINER : elles lisent memberships sans dépendre des politiques de cette table.

create function public.my_role(p_org uuid) returns text
language sql stable security definer set search_path = public as $$
  select role from memberships where org_id = p_org and user_id = (select auth.uid())
$$;

-- Rôles internes (les portails client/fournisseur n'ont AUCUN accès aux tables internes)
create function public.is_internal(p_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role(p_org) in (
    'super_admin', 'associe_investisseur', 'directeur_pays', 'analyste',
    'acheteur', 'logisticien', 'comptable', 'commercial'), false)
$$;

create function public.has_role(p_org uuid, p_roles text[]) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role(p_org) = any (p_roles), false)
$$;

-- Isolation par pays : country_ids null = tous les pays
create function public.country_ok(p_org uuid, p_country uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships
    where org_id = p_org and user_id = (select auth.uid())
      and (country_ids is null or p_country is null or p_country = any (country_ids)))
$$;

-- Matrice des droits d'écriture par domaine fonctionnel
create function public.can_write(p_org uuid, p_group text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.has_role(p_org, case p_group
    when 'reference' then array['super_admin', 'directeur_pays', 'analyste']
    when 'market'    then array['super_admin', 'directeur_pays', 'analyste', 'commercial']
    when 'sourcing'  then array['super_admin', 'directeur_pays', 'acheteur']
    when 'freight'   then array['super_admin', 'directeur_pays', 'acheteur', 'logisticien']
    when 'finance'   then array['super_admin', 'directeur_pays', 'analyste', 'comptable']
    when 'logistics' then array['super_admin', 'directeur_pays', 'logisticien']
    when 'crm'       then array['super_admin', 'directeur_pays', 'commercial']
    when 'payments'  then array['super_admin', 'comptable']
    when 'risk'      then array['super_admin', 'directeur_pays', 'analyste']
    else array[]::text[] end)
$$;

revoke execute on function public.my_role(uuid), public.is_internal(uuid), public.has_role(uuid, text[]),
  public.country_ok(uuid, uuid), public.can_write(uuid, text) from public, anon;
grant execute on function public.my_role(uuid), public.is_internal(uuid), public.has_role(uuid, text[]),
  public.country_ok(uuid, uuid), public.can_write(uuid, text) to authenticated;

-- ───────────────────────── Déclencheurs ─────────────────────────
create function public.touch_row() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := (select auth.uid());
    new.created_at := now();
  else
    new.org_id := old.org_id;          -- une ligne ne change jamais d'organisation
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end $$;

create function public.audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
declare r jsonb; o jsonb;
begin
  if tg_op <> 'INSERT' then o := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then r := to_jsonb(new); end if;
  -- suppression en cascade de l'organisation : plus rien à journaliser
  if not exists (select 1 from organizations where id = coalesce(r ->> 'org_id', o ->> 'org_id')::uuid) then
    return null;
  end if;
  insert into audit_logs (org_id, user_id, table_name, row_id, action, old_data, new_data)
  values (coalesce(r ->> 'org_id', o ->> 'org_id')::uuid, (select auth.uid()), tg_table_name,
          coalesce(r ->> 'id', o ->> 'id')::uuid, tg_op, o, r);
  return null;
end $$;

-- Profil créé automatiquement à l'inscription
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, full_name)
  values (new.id, new.email, nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Une organisation garde toujours au moins un super administrateur
create function public.keep_one_admin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.role = 'super_admin' and (tg_op = 'DELETE' or new.role <> 'super_admin')
     and exists (select 1 from organizations where id = old.org_id)
     and not exists (select 1 from memberships
                     where org_id = old.org_id and role = 'super_admin' and id <> old.id) then
    raise exception 'Une organisation doit conserver au moins un super administrateur';
  end if;
  return coalesce(new, old);
end $$;
create trigger memberships_keep_admin before update or delete on memberships
  for each row execute function public.keep_one_admin();

revoke execute on function public.touch_row(), public.audit_row(), public.handle_new_user(),
  public.keep_one_admin() from public, anon, authenticated;

-- ───────────────────────── RLS : tables d'accès ─────────────────────────
alter table organizations enable row level security;
alter table users enable row level security;
alter table memberships enable row level security;
alter table audit_logs enable row level security;

create policy org_select on organizations for select to authenticated
  using (public.my_role(id) is not null);
create policy org_update on organizations for update to authenticated
  using (public.has_role(id, array['super_admin'])) with check (public.has_role(id, array['super_admin']));
-- création : uniquement via la fonction create_organization (0003)

create policy users_select on users for select to authenticated using (
  id = (select auth.uid())
  or exists (select 1 from memberships m
             where m.user_id = users.id
               and public.has_role(m.org_id, array['super_admin', 'directeur_pays'])));
create policy users_update on users for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy memberships_select on memberships for select to authenticated using (
  user_id = (select auth.uid()) or public.has_role(org_id, array['super_admin', 'directeur_pays']));
create policy memberships_update on memberships for update to authenticated
  using (public.has_role(org_id, array['super_admin'])) with check (public.has_role(org_id, array['super_admin']));
create policy memberships_delete on memberships for delete to authenticated
  using (public.has_role(org_id, array['super_admin']));
-- ajout d'un membre : uniquement via la fonction add_member (0003)

create policy audit_select on audit_logs for select to authenticated using (
  public.has_role(org_id, array['super_admin', 'directeur_pays', 'associe_investisseur', 'comptable']));
-- aucune politique d'écriture : seul le déclencheur (SECURITY DEFINER) écrit, personne ne modifie ni n'efface

-- Supabase accorde par défaut tous les droits aux tables de public : on repart de zéro.
revoke all on all tables in schema public from anon, authenticated;
grant select, update on organizations, users to authenticated;
grant select, update, delete on memberships to authenticated;
grant select on audit_logs to authenticated;

-- ───────────────────────── RLS : tables métier ─────────────────────────
do $$
declare
  rec record;
  has_country boolean;
  c_read text; c_write text; c_del text;
begin
  for rec in
    select * from (values
      ('countries', 'reference'), ('regions', 'reference'), ('cities', 'reference'), ('ports', 'reference'),
      ('product_categories', 'reference'), ('hs_codes', 'reference'), ('products', 'reference'),
      ('data_sources', 'market'), ('market_indicators', 'market'), ('field_surveys', 'market'),
      ('competitors', 'market'), ('price_observations', 'market'), ('trade_flows', 'market'),
      ('customs_rules', 'market'),
      ('suppliers', 'sourcing'), ('supplier_quotes', 'sourcing'), ('freight_quotes', 'freight'),
      ('exchange_rates', 'finance'), ('financial_scenarios', 'finance'), ('investments', 'finance'),
      ('operating_costs', 'finance'),
      ('hubs', 'logistics'), ('warehouses', 'logistics'), ('shipments', 'logistics'),
      ('containers', 'logistics'), ('inventory_lots', 'logistics'), ('stock_movements', 'logistics'),
      ('customers', 'crm'), ('leads', 'crm'), ('quotations', 'crm'), ('orders', 'crm'),
      ('payments', 'payments'), ('risk_register', 'risk')
    ) as v (tbl, grp)
  loop
    select exists (select 1 from information_schema.columns
                   where table_schema = 'public' and table_name = rec.tbl and column_name = 'country_id')
      into has_country;
    c_read := 'public.is_internal(org_id)';
    c_write := format('public.can_write(org_id, %L)', rec.grp);
    c_del := $q$public.has_role(org_id, array['super_admin', 'directeur_pays'])$q$;
    if rec.tbl = 'countries' then
      c_read := c_read || ' and public.country_ok(org_id, id)';
      c_write := c_write || ' and public.country_ok(org_id, id)';
    elsif has_country then
      c_read := c_read || ' and public.country_ok(org_id, country_id)';
      c_write := c_write || ' and public.country_ok(org_id, country_id)';
      c_del := c_del || ' and public.country_ok(org_id, country_id)';
    end if;

    execute format('alter table %I enable row level security', rec.tbl);
    execute format('create policy %I on %I for select to authenticated using (%s)', rec.tbl || '_select', rec.tbl, c_read);
    execute format('create policy %I on %I for insert to authenticated with check (%s)', rec.tbl || '_insert', rec.tbl, c_write);
    execute format('create policy %I on %I for update to authenticated using (%s) with check (%s)', rec.tbl || '_update', rec.tbl, c_write, c_write);
    execute format('create policy %I on %I for delete to authenticated using (%s)', rec.tbl || '_delete', rec.tbl, c_del);
    execute format('grant select, insert, update, delete on %I to authenticated', rec.tbl);

    execute format('create trigger %I before insert or update on %I for each row execute function public.touch_row()', rec.tbl || '_touch', rec.tbl);
    execute format('create trigger %I after insert or update or delete on %I for each row execute function public.audit_row()', rec.tbl || '_audit', rec.tbl);
  end loop;
end $$;

-- Rien pour les visiteurs non connectés
revoke all on all tables in schema public from anon;
