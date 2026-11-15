-- SATIL — SinoAfrica Trade Intelligence & Logistics Platform
-- 0001 : schéma (tables et relations). La sécurité (RLS, audit) est dans 0002.
-- Convention : toute table métier porte org_id (isolation par organisation),
-- is_demo (jeu d'exemple), created_at / updated_at / created_by.
-- Les tables de DONNÉES DE MARCHÉ portent en plus les colonnes de provenance.

create extension if not exists pgcrypto;

-- ───────────────────────── Organisation et accès ─────────────────────────
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 120),
  base_currency text not null default 'XOF',
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);

-- Profil public de l'utilisateur (miroir de auth.users, jamais de mot de passe ici)
create table users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  locale text not null default 'fr' check (locale in ('fr', 'en', 'zh')),
  created_at timestamptz not null default now()
);

create table memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  role text not null check (role in (
    'super_admin', 'associe_investisseur', 'directeur_pays', 'analyste', 'acheteur',
    'logisticien', 'comptable', 'commercial', 'client_grossiste', 'fournisseur')),
  -- null = tous les pays de l'organisation ; sinon accès limité à ces pays
  country_ids uuid[],
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

-- ───────────────────────── Géographie ─────────────────────────
create table countries (
  id uuid primary key default gen_random_uuid(),
  name_fr text not null, name_en text, name_zh text,
  iso2 text check (iso2 is null or iso2 ~ '^[A-Z]{2}$'),
  iso3 text check (iso3 is null or iso3 ~ '^[A-Z]{3}$'),
  currency text,
  phase int check (phase between 1 and 9),
  notes text
);
create table regions (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references countries (id) on delete cascade,
  name text not null
);
create table cities (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references countries (id) on delete cascade,
  region_id uuid references regions (id) on delete set null,
  name text not null,
  is_capital boolean not null default false,
  catchment_notes text            -- zone de chalandise (description)
);
create table ports (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references countries (id) on delete cascade,
  city_id uuid references cities (id) on delete set null,
  name text not null,
  unlocode text,
  port_type text not null default 'maritime' check (port_type in ('maritime', 'sec', 'aeroport')),
  notes text
);
create table hubs (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references countries (id) on delete cascade,
  city_id uuid references cities (id) on delete set null,
  name text not null,
  status text not null default 'etude' check (status in ('etude', 'projet', 'actif', 'ferme')),
  opened_on date,
  notes text
);
create table warehouses (
  id uuid primary key default gen_random_uuid(),
  hub_id uuid not null references hubs (id) on delete cascade,
  name text not null,
  area_m2 numeric check (area_m2 >= 0),
  capacity_cbm numeric check (capacity_cbm >= 0),
  monthly_rent numeric check (monthly_rent >= 0),
  currency text
);

-- ───────────────────────── Produits ─────────────────────────
create table product_categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references product_categories (id) on delete set null,
  name_fr text not null, name_en text, name_zh text
);
create table hs_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null check (code ~ '^[0-9]{2,12}$'),
  description text
);
create table products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references product_categories (id) on delete set null,
  hs_code_id uuid references hs_codes (id) on delete set null,
  sku text,
  name_fr text not null, name_en text, name_zh text,
  unit text not null default 'pièce',
  unit_weight_kg numeric check (unit_weight_kg >= 0),
  unit_cbm numeric check (unit_cbm >= 0),
  description text,
  status text not null default 'etude' check (status in ('etude', 'retenu', 'ecarte'))
);

-- ───────────────────────── Sourcing Chine ─────────────────────────
create table suppliers (
  id uuid primary key default gen_random_uuid(),
  name_zh text, name_en text not null,
  supplier_type text not null default 'usine' check (supplier_type in ('usine', 'trading', 'grossiste', 'agent')),
  city text, province text,
  contact_name text, contact_email text, contact_phone text, wechat text, website text,
  business_license text, certifications text, categories text, capacity text,
  pipeline_stage text not null default 'prospection' check (pipeline_stage in (
    'prospection', 'verification', 'echantillon', 'negociation', 'commande', 'inspection', 'expedition', 'ecarte')),
  verification_status text not null default 'non_verifie' check (verification_status in ('non_verifie', 'en_cours', 'verifie', 'rejete')),
  verified_on date,
  notes text
);
create table supplier_quotes (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references suppliers (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  quote_date date not null,
  valid_until date,
  incoterm text not null check (incoterm in ('EXW', 'FOB', 'CIF')),
  incoterm_place text,
  unit_price numeric not null check (unit_price >= 0),
  currency text not null,
  moq numeric check (moq >= 0),
  lead_time_days int check (lead_time_days >= 0),
  sample_available boolean,
  sample_cost numeric check (sample_cost >= 0),
  payment_terms text,
  status text not null default 'recu' check (status in ('recu', 'retenu', 'rejete', 'expire')),
  notes text
);

-- ───────────────────────── Intelligence de marché ─────────────────────────
create table data_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  publisher text,
  source_type text not null default 'autre' check (source_type in (
    'statistique_officielle', 'douane', 'organisation_internationale', 'enquete_terrain',
    'fournisseur', 'transitaire', 'presse', 'interne', 'autre')),
  url text,
  license text,
  notes text
);
create table market_indicators (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references countries (id) on delete cascade,
  city_id uuid references cities (id) on delete set null,
  category_id uuid references product_categories (id) on delete set null,
  product_id uuid references products (id) on delete set null,
  indicator_code text not null,
  value numeric,
  value_text text,
  notes text,
  check (value is not null or value_text is not null)
);
create table field_surveys (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references countries (id) on delete cascade,
  city_id uuid references cities (id) on delete set null,
  category_id uuid references product_categories (id) on delete set null,
  product_id uuid references products (id) on delete set null,
  survey_date date not null,
  location text,
  surveyor text,
  respondent_name text,
  respondent_type text not null check (respondent_type in ('grossiste', 'detaillant', 'autre')),
  respondent_contact text,
  consent_given boolean not null default false,   -- consentement du répondant
  monthly_volume numeric check (monthly_volume >= 0),
  volume_unit text,
  buy_price numeric check (buy_price >= 0),
  sell_price numeric check (sell_price >= 0),
  current_supplier text,
  difficulties text,
  purchase_intent text check (purchase_intent in ('oui', 'peut_etre', 'non')),
  notes text
);
create table competitors (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references countries (id) on delete cascade,
  city_id uuid references cities (id) on delete set null,
  name text not null,
  competitor_type text check (competitor_type in ('importateur', 'grossiste', 'distributeur', 'plateforme', 'autre')),
  categories text, strengths text, weaknesses text, price_positioning text, notes text
);
create table price_observations (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references countries (id) on delete cascade,
  city_id uuid references cities (id) on delete set null,
  product_id uuid not null references products (id) on delete cascade,
  observed_on date not null,
  price_type text not null check (price_type in ('gros', 'detail')),
  price numeric not null check (price >= 0),
  seller_name text,
  location text,
  notes text
);
create table trade_flows (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references countries (id) on delete cascade,   -- pays déclarant
  hs_code_id uuid references hs_codes (id) on delete set null,
  partner text not null default 'Chine',
  flow text not null default 'import' check (flow in ('import', 'export')),
  year int not null check (year between 1990 and 2100),
  value_usd numeric check (value_usd >= 0),
  quantity numeric check (quantity >= 0),
  notes text
);
create table customs_rules (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references countries (id) on delete cascade,
  hs_code_id uuid references hs_codes (id) on delete set null,
  duty_rate numeric check (duty_rate between 0 and 500),               -- % de la valeur CAF
  other_taxes_rate numeric check (other_taxes_rate between 0 and 500), -- % CAF, non récupérables
  other_taxes_detail text,
  vat_rate numeric check (vat_rate between 0 and 100),
  valid_from date, valid_to date,
  legal_reference text,
  notes text
);
create table freight_quotes (
  id uuid primary key default gen_random_uuid(),
  origin_port text not null,
  destination_port_id uuid not null references ports (id) on delete cascade,
  mode text not null check (mode in ('LCL', '20GP', '40GP', '40HQ', 'AIR')),
  price numeric not null check (price >= 0),   -- par conteneur, ou par CBM (LCL), ou par kg (AIR)
  transit_days int check (transit_days >= 0),
  carrier text,
  quote_date date not null,
  valid_until date,
  notes text
);
create table exchange_rates (
  id uuid primary key default gen_random_uuid(),
  base_currency text not null,
  quote_currency text not null,
  rate numeric not null check (rate > 0),      -- 1 base = rate quote
  rate_date date not null,
  notes text,
  check (base_currency <> quote_currency)
);

-- ───────────────────────── Finance ─────────────────────────
create table financial_scenarios (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  scenario_type text not null default 'cout_rendu' check (scenario_type in ('cout_rendu', 'business_plan')),
  product_id uuid references products (id) on delete set null,
  country_id uuid references countries (id) on delete set null,
  hub_id uuid references hubs (id) on delete set null,
  inputs jsonb not null default '{}',     -- hypothèses saisies
  results jsonb not null default '{}',    -- résultats calculés au moment de l'enregistrement
  notes text
);
create table investments (
  id uuid primary key default gen_random_uuid(),
  hub_id uuid references hubs (id) on delete cascade,
  label text not null, category text,
  amount numeric not null check (amount >= 0), currency text not null,
  planned_date date, depreciation_years int check (depreciation_years >= 0)
);
create table operating_costs (
  id uuid primary key default gen_random_uuid(),
  hub_id uuid references hubs (id) on delete cascade,
  label text not null, category text,
  monthly_amount numeric not null check (monthly_amount >= 0), currency text not null,
  start_month date, end_month date
);

-- ───────────────────────── Logistique ─────────────────────────
create table shipments (
  id uuid primary key default gen_random_uuid(),
  reference text not null,
  supplier_id uuid references suppliers (id) on delete set null,
  origin_port text,
  destination_port_id uuid references ports (id) on delete set null,
  hub_id uuid references hubs (id) on delete set null,
  incoterm text check (incoterm in ('EXW', 'FOB', 'CIF')),
  bl_number text,
  etd date, eta date, ata date,
  customs_status text not null default 'non_depose' check (customs_status in ('non_depose', 'depose', 'en_controle', 'liquide', 'enleve')),
  status text not null default 'planifie' check (status in ('planifie', 'en_production', 'embarque', 'en_mer', 'arrive', 'receptionne', 'annule'))
);
create table containers (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid references shipments (id) on delete cascade,
  container_no text not null,
  container_type text not null check (container_type in ('20GP', '40GP', '40HQ', 'LCL')),
  seal_no text,
  status text not null default 'prevu'
);
create table inventory_lots (
  id uuid primary key default gen_random_uuid(),
  warehouse_id uuid not null references warehouses (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  shipment_id uuid references shipments (id) on delete set null,
  lot_no text not null,
  location_code text,
  received_on date,
  qty_received numeric not null default 0 check (qty_received >= 0),
  qty_available numeric not null default 0 check (qty_available >= 0),
  qty_reserved numeric not null default 0 check (qty_reserved >= 0),
  unit_cost numeric check (unit_cost >= 0), currency text
);
create table stock_movements (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references inventory_lots (id) on delete cascade,
  movement_type text not null check (movement_type in ('reception', 'sortie', 'reservation', 'transfert', 'ajustement', 'retour')),
  quantity numeric not null,
  from_warehouse_id uuid references warehouses (id) on delete set null,
  to_warehouse_id uuid references warehouses (id) on delete set null,
  reference text,
  moved_at timestamptz not null default now(),
  notes text
);

-- ───────────────────────── CRM et ventes ─────────────────────────
create table customers (
  id uuid primary key default gen_random_uuid(),
  country_id uuid references countries (id) on delete set null,
  city_id uuid references cities (id) on delete set null,
  name text not null,
  segment text check (segment in ('grossiste', 'semi_grossiste', 'detaillant', 'institution', 'autre')),
  contact_name text, phone text, email text,
  payment_terms_days int check (payment_terms_days >= 0),
  credit_limit numeric check (credit_limit >= 0),
  status text not null default 'prospect' check (status in ('prospect', 'actif', 'inactif', 'bloque'))
);
create table leads (
  id uuid primary key default gen_random_uuid(),
  country_id uuid references countries (id) on delete set null,
  customer_id uuid references customers (id) on delete set null,
  name text not null, contact text, source text, interest text,
  stage text not null default 'nouveau' check (stage in ('nouveau', 'qualifie', 'devis', 'gagne', 'perdu')),
  notes text
);
create table quotations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers (id) on delete cascade,
  reference text not null,
  quote_date date not null, valid_until date,
  currency text not null,
  total_amount numeric not null default 0 check (total_amount >= 0),
  lines jsonb not null default '[]',
  status text not null default 'brouillon' check (status in ('brouillon', 'envoye', 'accepte', 'refuse', 'expire'))
);
create table orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers (id) on delete cascade,
  quotation_id uuid references quotations (id) on delete set null,
  reference text not null,
  order_date date not null,
  currency text not null,
  total_amount numeric not null default 0 check (total_amount >= 0),
  lines jsonb not null default '[]',
  status text not null default 'confirmee' check (status in ('confirmee', 'preparee', 'livree', 'facturee', 'annulee', 'retournee')),
  delivery_status text
);
create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  paid_on date not null,
  amount numeric not null check (amount > 0), currency text not null,
  method text, reference text,
  status text not null default 'recu' check (status in ('attendu', 'recu', 'rejete', 'rembourse'))
);

-- ───────────────────────── Risques ─────────────────────────
create table risk_register (
  id uuid primary key default gen_random_uuid(),
  country_id uuid references countries (id) on delete set null,
  hub_id uuid references hubs (id) on delete set null,
  title text not null,
  category text check (category in ('marche', 'change', 'douane', 'logistique', 'fournisseur', 'credit', 'reglementaire', 'securite', 'autre')),
  probability int check (probability between 1 and 5),
  impact int check (impact between 1 and 5),
  mitigation text, owner text,
  status text not null default 'ouvert' check (status in ('ouvert', 'en_traitement', 'clos'))
);

-- ───────────────────────── Journal d'audit ─────────────────────────
create table audit_logs (
  id bigint generated always as identity primary key,
  org_id uuid not null references organizations (id) on delete cascade,
  user_id uuid,
  table_name text not null,
  row_id uuid,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  at timestamptz not null default now()
);
create index audit_logs_org_at on audit_logs (org_id, at desc);
create index audit_logs_row on audit_logs (table_name, row_id);

-- ───────────────── Colonnes communes ajoutées en boucle ─────────────────
do $$
declare
  t text;
  business text[] := array[
    'countries','regions','cities','ports','hubs','warehouses','product_categories','hs_codes','products',
    'suppliers','supplier_quotes','data_sources','market_indicators','field_surveys','competitors',
    'price_observations','trade_flows','customs_rules','freight_quotes','exchange_rates',
    'financial_scenarios','investments','operating_costs','shipments','containers','inventory_lots',
    'stock_movements','customers','leads','quotations','orders','payments','risk_register'];
  -- tables dont chaque ligne est une DONNÉE devant être sourcée
  sourced text[] := array[
    'market_indicators','field_surveys','competitors','price_observations','trade_flows',
    'customs_rules','freight_quotes','exchange_rates'];
begin
  foreach t in array business loop
    execute format($f$
      alter table %1$I
        add column org_id uuid not null references organizations (id) on delete cascade,
        add column is_demo boolean not null default false,
        add column created_at timestamptz not null default now(),
        add column updated_at timestamptz not null default now(),
        add column created_by uuid default auth.uid();
      create index %2$I on %1$I (org_id);
    $f$, t, t || '_org_idx');
  end loop;
  foreach t in array sourced loop
    execute format($f$
      alter table %1$I
        add column source_id uuid references data_sources (id) on delete set null,
        add column source_url text,
        add column collected_at date,
        add column reference_period text,
        add column unit text,
        add column currency text,
        add column method text,
        add column confidence text not null default 'moyen' check (confidence in ('faible', 'moyen', 'eleve')),
        add column verification_status text not null default 'non_verifie'
          check (verification_status in ('non_verifie', 'verifie', 'hypothese', 'rejete'));
    $f$, t);
  end loop;
end $$;

-- Unicités utiles au contrôle de doublons (par organisation)
create unique index countries_org_iso2 on countries (org_id, iso2) where iso2 is not null;
create unique index hs_codes_org_code on hs_codes (org_id, code);
create unique index products_org_sku on products (org_id, sku) where sku is not null;
create index market_indicators_lookup on market_indicators (org_id, country_id, indicator_code);
create index price_obs_lookup on price_observations (org_id, product_id, country_id, observed_on);
create index quotes_lookup on supplier_quotes (org_id, product_id);
create index rates_lookup on exchange_rates (org_id, base_currency, quote_currency, rate_date desc);
