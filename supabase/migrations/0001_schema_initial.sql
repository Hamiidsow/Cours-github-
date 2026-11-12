-- =====================================================================
-- SamaKeur — schéma initial (PostgreSQL / Supabase)
-- Principes :
--   * RLS activée sur TOUTES les tables.
--   * Données publiques (annonces publiées) exposées via la vue
--     `listings_public` ; données personnelles et documents d'identité
--     dans des tables et un bucket séparés, jamais lisibles publiquement.
--   * Les actions sensibles (modération, vérification, suspension) passent
--     par des fonctions RPC qui vérifient le rôle admin et journalisent.
-- =====================================================================

-- ---------- Types ----------------------------------------------------
create type public.user_role as enum ('locataire', 'proprietaire', 'gestionnaire', 'admin');
create type public.account_status as enum ('actif', 'suspendu');
create type public.verification_status as enum ('non_verifie', 'en_attente', 'verifie', 'rejete');
create type public.document_type as enum ('cni', 'passeport', 'titre_propriete', 'mandat_gestion');
create type public.property_type as enum (
  'appartement', 'studio', 'chambre', 'maison', 'villa', 'magasin',
  'bureau', 'depot', 'entrepot', 'terrain', 'local_commercial'
);
create type public.transaction_type as enum ('location', 'vente');
create type public.listing_status as enum (
  'brouillon', 'en_attente', 'publiee', 'rejetee', 'suspendue', 'archivee'
);
create type public.availability_status as enum ('disponible', 'reserve', 'indisponible');
create type public.visit_status as enum ('en_attente', 'acceptee', 'refusee', 'annulee');
create type public.report_reason as enum (
  'fraude', 'faux_prix', 'bien_inexistant', 'doublon', 'contenu_inapproprie', 'autre'
);
create type public.report_status as enum ('ouvert', 'traite', 'rejete');

-- ---------- Utilisateurs --------------------------------------------
-- Profil : informations non sensibles. Le rôle, le statut du compte et le
-- statut de vérification ne sont JAMAIS modifiables par l'utilisateur.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 80),
  role public.user_role not null default 'locataire',
  account_status public.account_status not null default 'actif',
  verification_status public.verification_status not null default 'non_verifie',
  locale text not null default 'fr' check (locale in ('fr', 'wo', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Données personnelles : séparées du profil.
create table public.profile_private (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  phone text check (phone is null or phone ~ '^\+?[0-9 ]{7,20}$'),
  updated_at timestamptz not null default now()
);

-- Dossiers de vérification des propriétaires / gestionnaires.
-- Les fichiers sont dans le bucket PRIVÉ `identity-documents`.
create table public.owner_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  document_type public.document_type not null,
  document_path text not null,
  status public.verification_status not null default 'en_attente'
    check (status in ('en_attente', 'verifie', 'rejete')),
  review_note text,
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index owner_verifications_user_idx on public.owner_verifications (user_id);
create unique index owner_verifications_one_pending
  on public.owner_verifications (user_id) where status = 'en_attente';

-- ---------- Biens et annonces ---------------------------------------
-- Bien : caractéristiques physiques. `address_private` n'est jamais public.
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  type public.property_type not null,
  city text not null check (char_length(city) between 2 and 60),
  neighborhood text not null check (char_length(neighborhood) between 2 and 80),
  address_private text check (address_private is null or char_length(address_private) <= 200),
  surface_m2 integer check (surface_m2 is null or surface_m2 between 1 and 1000000),
  rooms smallint check (rooms is null or rooms between 0 and 100),
  bedrooms smallint check (bedrooms is null or bedrooms between 0 and 100),
  bathrooms smallint check (bathrooms is null or bathrooms between 0 and 100),
  furnished boolean not null default false,
  amenities text[] not null default '{}' check (cardinality(amenities) <= 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index properties_owner_idx on public.properties (owner_id);
create index properties_search_idx on public.properties (city, type);
create index properties_amenities_idx on public.properties using gin (amenities);

-- Annonce : offre commerciale portant sur un bien.
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 10 and 120),
  description text not null check (char_length(description) between 30 and 4000),
  transaction public.transaction_type not null default 'location',
  price_fcfa bigint not null check (price_fcfa > 0 and price_fcfa < 100000000000),
  charges_fcfa bigint check (charges_fcfa is null or charges_fcfa >= 0),
  deposit_months smallint check (deposit_months is null or deposit_months between 0 and 24),
  advance_months smallint check (advance_months is null or advance_months between 0 and 24),
  fees_note text check (fees_note is null or char_length(fees_note) <= 500),
  conditions text check (conditions is null or char_length(conditions) <= 2000),
  status public.listing_status not null default 'brouillon',
  availability public.availability_status not null default 'disponible',
  available_from date,
  -- Coordonnées de contact : jamais dans la vue publique, révélées
  -- uniquement via reveal_listing_contact() à un utilisateur connecté.
  contact_phone text not null check (contact_phone ~ '^\+?[0-9 ]{7,20}$'),
  contact_whatsapp text check (contact_whatsapp is null or contact_whatsapp ~ '^\+?[0-9 ]{7,20}$'),
  is_demo boolean not null default false,
  rejection_reason text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index listings_owner_idx on public.listings (owner_id);
create index listings_property_idx on public.listings (property_id);
create index listings_public_idx on public.listings (status, published_at desc);
create index listings_price_idx on public.listings (price_fcfa) where status = 'publiee';

create table public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null unique,
  position smallint not null default 0 check (position between 0 and 20),
  created_at timestamptz not null default now()
);
create index listing_images_listing_idx on public.listing_images (listing_id, position);

-- ---------- Interactions --------------------------------------------
create table public.favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

-- Alertes : critères de recherche enregistrés. (L'envoi de notifications
-- n'est pas encore implémenté — voir docs/FONCTIONNALITES.md.)
create table public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  label text not null check (char_length(label) between 2 and 80),
  criteria jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index saved_searches_user_idx on public.saved_searches (user_id);

create table public.visit_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  requester_id uuid not null references public.profiles (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  preferred_date date not null,
  message text check (message is null or char_length(message) <= 1000),
  requester_phone text not null check (requester_phone ~ '^\+?[0-9 ]{7,20}$'),
  status public.visit_status not null default 'en_attente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index visit_requests_requester_idx on public.visit_requests (requester_id);
create index visit_requests_owner_idx on public.visit_requests (owner_id);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason public.report_reason not null,
  details text check (details is null or char_length(details) <= 1000),
  status public.report_status not null default 'ouvert',
  resolution_note text,
  resolved_by uuid references public.profiles (id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (listing_id, reporter_id)
);
create index reports_status_idx on public.reports (status, created_at);

-- Journal de modération : écrit uniquement par les fonctions admin.
create table public.moderation_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid not null,
  note text,
  created_at timestamptz not null default now()
);
create index moderation_logs_target_idx on public.moderation_logs (target_type, target_id);

-- Journal des révélations de contact (limitation anti-aspiration).
create table public.contact_reveals (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index contact_reveals_user_idx on public.contact_reveals (user_id, created_at);

-- ---------- Fonctions utilitaires -----------------------------------
create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin' and account_status = 'actif'
  );
$$;

create function public.is_active() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and account_status = 'actif'
  );
$$;

create function public.can_publish() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and account_status = 'actif'
      and role in ('proprietaire', 'gestionnaire', 'admin')
  );
$$;

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger profile_private_touch before update on public.profile_private
  for each row execute function public.touch_updated_at();
create trigger properties_touch before update on public.properties
  for each row execute function public.touch_updated_at();
create trigger listings_touch before update on public.listings
  for each row execute function public.touch_updated_at();
create trigger visit_requests_touch before update on public.visit_requests
  for each row execute function public.touch_updated_at();

-- Création automatique du profil à l'inscription.
-- Le rôle demandé est filtré : jamais 'admin' par ce chemin.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_role public.user_role := 'locataire';
  v_name text;
  v_phone text;
begin
  if new.raw_user_meta_data ->> 'role' in ('proprietaire', 'gestionnaire') then
    v_role := (new.raw_user_meta_data ->> 'role')::public.user_role;
  end if;
  v_name := left(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), 80);
  if char_length(v_name) < 2 then
    v_name := 'Utilisateur';
  end if;
  v_phone := new.raw_user_meta_data ->> 'phone';
  if v_phone is null or v_phone !~ '^\+?[0-9 ]{7,20}$' then
    v_phone := null;
  end if;
  insert into public.profiles (id, display_name, role) values (new.id, v_name, v_role);
  insert into public.profile_private (user_id, phone) values (new.id, v_phone);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Limitation du nombre de créations par utilisateur et par période.
-- Arguments : colonne utilisateur, maximum, intervalle.
create function public.enforce_rate_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_count integer;
begin
  if v_uid is null or public.is_admin() then
    return new;
  end if;
  execute format(
    'select count(*) from %I.%I where %I = $1 and created_at > now() - $2::interval',
    tg_table_schema, tg_table_name, tg_argv[0]
  ) into v_count using v_uid, tg_argv[2];
  if v_count >= tg_argv[1]::integer then
    raise exception 'Limite atteinte : trop de créations sur la période. Réessayez plus tard.'
      using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger listings_rate_limit before insert on public.listings
  for each row execute function public.enforce_rate_limit('owner_id', '10', '1 day');
create trigger visit_requests_rate_limit before insert on public.visit_requests
  for each row execute function public.enforce_rate_limit('requester_id', '15', '1 day');
create trigger reports_rate_limit before insert on public.reports
  for each row execute function public.enforce_rate_limit('reporter_id', '10', '1 day');
create trigger owner_verifications_rate_limit before insert on public.owner_verifications
  for each row execute function public.enforce_rate_limit('user_id', '3', '1 day');
create trigger saved_searches_rate_limit before insert on public.saved_searches
  for each row execute function public.enforce_rate_limit('user_id', '20', '1 day');

-- Garde-fou des annonces : un propriétaire ne peut jamais publier lui-même.
create function public.listings_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- Opérations d'administration (SQL direct ou admin connecté) : libres.
  if (select auth.uid()) is null or public.is_admin() then
    if new.status = 'publiee' and new.published_at is null then
      new.published_at := now();
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status not in ('brouillon', 'en_attente') then
      raise exception 'Une annonce doit être validée par un administrateur avant publication.';
    end if;
    new.is_demo := false;
    new.published_at := null;
    new.rejection_reason := null;
    return new;
  end if;

  -- UPDATE par le propriétaire
  new.owner_id := old.owner_id;
  new.property_id := old.property_id;
  new.is_demo := old.is_demo;
  new.published_at := old.published_at;
  new.rejection_reason := old.rejection_reason;
  new.created_at := old.created_at;

  if old.status = 'suspendue' and new.status <> 'suspendue' then
    raise exception 'Cette annonce est suspendue par la modération.';
  end if;

  if new.status is distinct from old.status
     and new.status not in ('brouillon', 'en_attente', 'archivee') then
    raise exception 'Une annonce doit être validée par un administrateur avant publication.';
  end if;

  -- Toute modification du contenu d'une annonce publiée la renvoie en validation.
  if old.status = 'publiee' and new.status = 'publiee' and (
       new.title is distinct from old.title
    or new.description is distinct from old.description
    or new.transaction is distinct from old.transaction
    or new.price_fcfa is distinct from old.price_fcfa
    or new.charges_fcfa is distinct from old.charges_fcfa
    or new.deposit_months is distinct from old.deposit_months
    or new.advance_months is distinct from old.advance_months
    or new.fees_note is distinct from old.fees_note
    or new.conditions is distinct from old.conditions
    or new.contact_phone is distinct from old.contact_phone
    or new.contact_whatsapp is distinct from old.contact_whatsapp
  ) then
    new.status := 'en_attente';
  end if;
  return new;
end $$;

create trigger listings_guard_trg before insert or update on public.listings
  for each row execute function public.listings_guard();

-- Modifier un bien ou ses photos renvoie aussi l'annonce publiée en validation.
create function public.requeue_listing_on_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or public.is_admin() then
    return null;
  end if;
  if tg_table_name = 'properties' then
    update public.listings set status = 'en_attente'
      where property_id = new.id and status = 'publiee';
  else
    update public.listings set status = 'en_attente'
      where id = coalesce(new.listing_id, old.listing_id) and status = 'publiee';
  end if;
  return null;
end $$;

create trigger properties_requeue after update on public.properties
  for each row execute function public.requeue_listing_on_change();
create trigger listing_images_requeue after insert or delete on public.listing_images
  for each row execute function public.requeue_listing_on_change();

-- Demande de visite : le propriétaire est déduit de l'annonce (non falsifiable)
-- et l'annonce doit être publiée.
create function public.visit_requests_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid;
begin
  if tg_op = 'INSERT' then
    select l.owner_id into v_owner from public.listings l
      where l.id = new.listing_id and l.status = 'publiee';
    if v_owner is null then
      raise exception 'Annonce indisponible.';
    end if;
    if v_owner = new.requester_id then
      raise exception 'Vous ne pouvez pas demander une visite de votre propre annonce.';
    end if;
    new.owner_id := v_owner;
    new.status := 'en_attente';
    return new;
  end if;
  -- UPDATE : seul le statut peut changer.
  new.listing_id := old.listing_id;
  new.requester_id := old.requester_id;
  new.owner_id := old.owner_id;
  new.preferred_date := old.preferred_date;
  new.message := old.message;
  new.requester_phone := old.requester_phone;
  new.created_at := old.created_at;
  if (select auth.uid()) = old.requester_id and (select auth.uid()) <> old.owner_id
     and new.status is distinct from old.status and new.status <> 'annulee' then
    raise exception 'Le demandeur peut seulement annuler sa demande.';
  end if;
  return new;
end $$;

create trigger visit_requests_guard_trg before insert or update on public.visit_requests
  for each row execute function public.visit_requests_guard();

-- Un nouveau dossier passe le profil à « en attente » (jamais « vérifié »).
create function public.owner_verifications_after_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set verification_status = 'en_attente'
    where id = new.user_id and verification_status <> 'verifie';
  return null;
end $$;

create trigger owner_verifications_ai after insert on public.owner_verifications
  for each row execute function public.owner_verifications_after_insert();

-- ---------- Vue publique --------------------------------------------
-- Seule projection lisible sans connexion : annonces PUBLIÉES de comptes
-- ACTIFS, sans coordonnées ni adresse. Vue volontairement exécutée avec
-- les droits de son propriétaire (les tables de base restent fermées).
create view public.listings_public as
select
  l.id, l.title, l.description, l.transaction, l.price_fcfa, l.charges_fcfa,
  l.deposit_months, l.advance_months, l.fees_note, l.conditions,
  l.availability, l.available_from, l.is_demo, l.published_at,
  p.type as property_type, p.city, p.neighborhood, p.surface_m2, p.rooms,
  p.bedrooms, p.bathrooms, p.furnished, p.amenities,
  pr.display_name as owner_name,
  pr.role as owner_role,
  (pr.verification_status = 'verifie') as owner_verified,
  coalesce(
    (select array_agg(i.storage_path order by i.position, i.created_at)
       from public.listing_images i where i.listing_id = l.id),
    '{}'::text[]
  ) as image_paths
from public.listings l
join public.properties p on p.id = l.property_id
join public.profiles pr on pr.id = l.owner_id
where l.status = 'publiee' and pr.account_status = 'actif';

-- ---------- Fonctions RPC -------------------------------------------
-- Révèle les coordonnées d'une annonce publiée à un utilisateur connecté.
-- Limite : 30 annonces différentes par 24 h. Chaque révélation est journalisée.
create function public.reveal_listing_contact(p_listing_id uuid)
returns table (phone text, whatsapp text)
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_count integer;
begin
  if v_uid is null or not public.is_active() then
    raise exception 'Connexion requise.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.listings l join public.profiles pr on pr.id = l.owner_id
    where l.id = p_listing_id and l.status = 'publiee' and pr.account_status = 'actif'
  ) then
    raise exception 'Annonce indisponible.';
  end if;
  select count(distinct c.listing_id) into v_count from public.contact_reveals c
    where c.user_id = v_uid and c.created_at > now() - interval '1 day'
      and c.listing_id <> p_listing_id;
  if v_count >= 30 and not public.is_admin() then
    raise exception 'Limite quotidienne de contacts atteinte. Réessayez demain.';
  end if;
  insert into public.contact_reveals (user_id, listing_id) values (v_uid, p_listing_id);
  return query
    select l.contact_phone, l.contact_whatsapp from public.listings l where l.id = p_listing_id;
end $$;

create function public.admin_moderate_listing(
  p_listing_id uuid, p_status public.listing_status, p_note text default null
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Accès réservé aux administrateurs.' using errcode = '42501';
  end if;
  if p_status not in ('publiee', 'rejetee', 'suspendue', 'en_attente') then
    raise exception 'Statut de modération invalide.';
  end if;
  if p_status in ('rejetee', 'suspendue') and coalesce(trim(p_note), '') = '' then
    raise exception 'Un motif est obligatoire pour rejeter ou suspendre.';
  end if;
  update public.listings set
    status = p_status,
    rejection_reason = case when p_status in ('rejetee', 'suspendue') then p_note else null end,
    published_at = case when p_status = 'publiee' then coalesce(published_at, now()) else published_at end
  where id = p_listing_id;
  if not found then
    raise exception 'Annonce introuvable.';
  end if;
  insert into public.moderation_logs (actor_id, action, target_type, target_id, note)
    values ((select auth.uid()), 'annonce:' || p_status, 'listing', p_listing_id, p_note);
end $$;

-- Décision sur un dossier de vérification. C'est le SEUL chemin qui peut
-- donner le statut « vérifié » à un compte.
create function public.admin_review_verification(
  p_verification_id uuid, p_approve boolean, p_note text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid;
  v_status public.verification_status := case when p_approve then 'verifie' else 'rejete' end;
begin
  if not public.is_admin() then
    raise exception 'Accès réservé aux administrateurs.' using errcode = '42501';
  end if;
  if not p_approve and coalesce(trim(p_note), '') = '' then
    raise exception 'Un motif est obligatoire pour refuser un dossier.';
  end if;
  update public.owner_verifications set
    status = v_status, review_note = p_note,
    reviewed_by = (select auth.uid()), reviewed_at = now()
  where id = p_verification_id and status = 'en_attente'
  returning user_id into v_user;
  if v_user is null then
    raise exception 'Dossier introuvable ou déjà traité.';
  end if;
  update public.profiles set verification_status = v_status where id = v_user;
  insert into public.moderation_logs (actor_id, action, target_type, target_id, note)
    values ((select auth.uid()), 'verification:' || v_status, 'profile', v_user, p_note);
end $$;

create function public.admin_set_account_status(
  p_user_id uuid, p_status public.account_status, p_note text
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Accès réservé aux administrateurs.' using errcode = '42501';
  end if;
  if p_user_id = (select auth.uid()) then
    raise exception 'Vous ne pouvez pas modifier votre propre compte.';
  end if;
  if coalesce(trim(p_note), '') = '' then
    raise exception 'Un motif est obligatoire.';
  end if;
  update public.profiles set account_status = p_status where id = p_user_id;
  if not found then
    raise exception 'Compte introuvable.';
  end if;
  insert into public.moderation_logs (actor_id, action, target_type, target_id, note)
    values ((select auth.uid()), 'compte:' || p_status, 'profile', p_user_id, p_note);
end $$;

create function public.admin_resolve_report(
  p_report_id uuid, p_status public.report_status, p_note text default null
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Accès réservé aux administrateurs.' using errcode = '42501';
  end if;
  update public.reports set
    status = p_status, resolution_note = p_note,
    resolved_by = (select auth.uid()), resolved_at = now()
  where id = p_report_id;
  if not found then
    raise exception 'Signalement introuvable.';
  end if;
  insert into public.moderation_logs (actor_id, action, target_type, target_id, note)
    values ((select auth.uid()), 'signalement:' || p_status, 'report', p_report_id, p_note);
end $$;

-- ---------- Droits ---------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

grant select on public.listings_public to anon, authenticated;

grant select on public.profiles to authenticated;
grant update (display_name, locale) on public.profiles to authenticated;
grant select, update (phone) on public.profile_private to authenticated;
grant select on public.profile_private to authenticated;
grant select, insert on public.owner_verifications to authenticated;
grant select, insert, update, delete on public.properties to authenticated;
grant select, insert, update, delete on public.listings to authenticated;
grant select, insert, delete on public.listing_images to authenticated;
grant select, insert, delete on public.favorites to authenticated;
grant select, insert, delete on public.saved_searches to authenticated;
grant select, insert on public.visit_requests to authenticated;
grant update (status) on public.visit_requests to authenticated;
grant select, insert on public.reports to authenticated;
grant select on public.moderation_logs to authenticated;

grant execute on function public.is_admin() to authenticated, anon;
grant execute on function public.is_active() to authenticated;
grant execute on function public.can_publish() to authenticated;
grant execute on function public.reveal_listing_contact(uuid) to authenticated;
grant execute on function public.admin_moderate_listing(uuid, public.listing_status, text) to authenticated;
grant execute on function public.admin_review_verification(uuid, boolean, text) to authenticated;
grant execute on function public.admin_set_account_status(uuid, public.account_status, text) to authenticated;
grant execute on function public.admin_resolve_report(uuid, public.report_status, text) to authenticated;

-- ---------- Row Level Security ---------------------------------------
alter table public.profiles enable row level security;
alter table public.profile_private enable row level security;
alter table public.owner_verifications enable row level security;
alter table public.properties enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;
alter table public.favorites enable row level security;
alter table public.saved_searches enable row level security;
alter table public.visit_requests enable row level security;
alter table public.reports enable row level security;
alter table public.moderation_logs enable row level security;
alter table public.contact_reveals enable row level security;

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- profile_private
create policy profile_private_select on public.profile_private for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy profile_private_update on public.profile_private for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- owner_verifications
create policy owner_verifications_select on public.owner_verifications for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy owner_verifications_insert on public.owner_verifications for insert to authenticated
  with check (
    user_id = (select auth.uid()) and public.can_publish() and status = 'en_attente'
    and reviewed_by is null and reviewed_at is null and review_note is null
    and document_path like (select auth.uid())::text || '/%'
  );

-- properties
create policy properties_select on public.properties for select to authenticated
  using (owner_id = (select auth.uid()) or public.is_admin());
create policy properties_insert on public.properties for insert to authenticated
  with check (owner_id = (select auth.uid()) and public.can_publish());
create policy properties_update on public.properties for update to authenticated
  using (owner_id = (select auth.uid()) and public.is_active())
  with check (owner_id = (select auth.uid()));
create policy properties_delete on public.properties for delete to authenticated
  using (owner_id = (select auth.uid()) or public.is_admin());

-- listings (lecture publique uniquement via listings_public)
create policy listings_select on public.listings for select to authenticated
  using (owner_id = (select auth.uid()) or public.is_admin());
create policy listings_insert on public.listings for insert to authenticated
  with check (
    owner_id = (select auth.uid()) and public.can_publish()
    and exists (select 1 from public.properties p
                where p.id = property_id and p.owner_id = (select auth.uid()))
  );
create policy listings_update on public.listings for update to authenticated
  using ((owner_id = (select auth.uid()) and public.is_active()) or public.is_admin())
  with check (owner_id = (select auth.uid()) or public.is_admin());
create policy listings_delete on public.listings for delete to authenticated
  using (owner_id = (select auth.uid()) or public.is_admin());

-- listing_images
create policy listing_images_select on public.listing_images for select to authenticated
  using (owner_id = (select auth.uid()) or public.is_admin());
create policy listing_images_insert on public.listing_images for insert to authenticated
  with check (
    owner_id = (select auth.uid()) and public.can_publish()
    and storage_path like (select auth.uid())::text || '/%'
    and exists (select 1 from public.listings l
                where l.id = listing_id and l.owner_id = (select auth.uid()))
  );
create policy listing_images_delete on public.listing_images for delete to authenticated
  using (owner_id = (select auth.uid()) or public.is_admin());

-- favorites
create policy favorites_all on public.favorites for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.is_active());

-- saved_searches
create policy saved_searches_all on public.saved_searches for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.is_active());

-- visit_requests
create policy visit_requests_select on public.visit_requests for select to authenticated
  using (requester_id = (select auth.uid()) or owner_id = (select auth.uid()) or public.is_admin());
create policy visit_requests_insert on public.visit_requests for insert to authenticated
  with check (requester_id = (select auth.uid()) and public.is_active());
create policy visit_requests_update on public.visit_requests for update to authenticated
  using ((requester_id = (select auth.uid()) or owner_id = (select auth.uid())) and public.is_active())
  with check (requester_id = (select auth.uid()) or owner_id = (select auth.uid()));

-- reports
create policy reports_select on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()) or public.is_admin());
create policy reports_insert on public.reports for insert to authenticated
  with check (
    reporter_id = (select auth.uid()) and public.is_active() and status = 'ouvert'
    and resolved_by is null and resolved_at is null and resolution_note is null
  );

-- moderation_logs : lecture admin uniquement, aucune écriture directe.
create policy moderation_logs_select on public.moderation_logs for select to authenticated
  using (public.is_admin());

-- contact_reveals : aucune politique => aucun accès direct (RPC uniquement).

-- ---------- Stockage -------------------------------------------------
-- Photos d'annonces : bucket public en lecture, 2 Mo max, images seulement.
-- Documents d'identité : bucket PRIVÉ, 5 Mo max.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('listing-images', 'listing-images', true, 2097152, array['image/jpeg', 'image/webp']),
  ('identity-documents', 'identity-documents', false, 5242880,
   array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy "listing_images_upload_own_folder" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.can_publish()
  );
create policy "listing_images_delete_own" on storage.objects for delete to authenticated
  using (
    bucket_id = 'listing-images'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin())
  );

create policy "identity_docs_upload_own_folder" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'identity-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.can_publish()
  );
create policy "identity_docs_read_own_or_admin" on storage.objects for select to authenticated
  using (
    bucket_id = 'identity-documents'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin())
  );
