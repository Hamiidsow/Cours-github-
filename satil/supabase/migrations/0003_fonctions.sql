-- SATIL — 0003 : fonctions appelées par l'application (API RPC).

-- Crée une organisation et fait de l'appelant son super administrateur.
create function public.create_organization(p_name text, p_base_currency text default 'XOF')
returns uuid language plpgsql security definer set search_path = public as $$
declare v_uid uuid := (select auth.uid()); v_org uuid;
begin
  if v_uid is null then raise exception 'Authentification requise'; end if;
  if (select count(*) from memberships where user_id = v_uid and role = 'super_admin') >= 3 then
    raise exception 'Limite atteinte : 3 organisations par administrateur';
  end if;
  insert into users (id, email) select id, email from auth.users where id = v_uid on conflict (id) do nothing;
  insert into organizations (name, base_currency, created_by)
    values (trim(p_name), upper(trim(p_base_currency)), v_uid) returning id into v_org;
  insert into memberships (org_id, user_id, role) values (v_org, v_uid, 'super_admin');
  return v_org;
end $$;

-- Ajoute à l'organisation un utilisateur DÉJÀ inscrit, identifié par son e-mail.
create function public.add_member(p_org uuid, p_email text, p_role text, p_country_ids uuid[] default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_user uuid; v_id uuid;
begin
  if not public.has_role(p_org, array['super_admin']) then
    raise exception 'Réservé au super administrateur';
  end if;
  select id into v_user from users where lower(email) = lower(trim(p_email));
  if v_user is null then
    raise exception 'Aucun compte avec cet e-mail : la personne doit d''abord s''inscrire';
  end if;
  if p_country_ids is not null and exists (
       select 1 from unnest(p_country_ids) c
       where not exists (select 1 from countries where id = c and org_id = p_org)) then
    raise exception 'Pays inconnu dans cette organisation';
  end if;
  insert into memberships (org_id, user_id, role, country_ids)
    values (p_org, v_user, p_role, p_country_ids) returning id into v_id;
  return v_id;
end $$;

-- Liste des membres avec e-mail (administration)
create function public.list_members(p_org uuid)
returns table (id uuid, user_id uuid, email text, full_name text, role text, country_ids uuid[], created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select m.id, m.user_id, u.email, u.full_name, m.role, m.country_ids, m.created_at
  from memberships m join users u on u.id = m.user_id
  where m.org_id = p_org and public.has_role(p_org, array['super_admin', 'directeur_pays'])
  order by m.created_at
$$;

revoke execute on function public.create_organization(text, text), public.add_member(uuid, text, text, uuid[]),
  public.list_members(uuid) from public, anon;
grant execute on function public.create_organization(text, text), public.add_member(uuid, text, text, uuid[]),
  public.list_members(uuid) to authenticated;
