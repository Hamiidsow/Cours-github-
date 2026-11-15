-- Tests de sécurité SATIL (PostgreSQL local jetable uniquement).
\set A '''00000000-0000-0000-0000-00000000000a'''
\set B '''00000000-0000-0000-0000-00000000000b'''
\set C '''00000000-0000-0000-0000-00000000000c'''
\set D '''00000000-0000-0000-0000-00000000000d'''
\set E '''00000000-0000-0000-0000-00000000000e'''
\set F '''00000000-0000-0000-0000-00000000000f'''
insert into auth.users (id, email) values
  (:A, 'admin-a@test.local'), (:B, 'admin-b@test.local'), (:C, 'analyste@test.local'),
  (:D, 'directeur-sn@test.local'), (:E, 'investisseur@test.local'), (:F, 'fournisseur@test.local');

select test.ok((select count(*) from public.users) = 6, 'profil créé à l''inscription');

-- Visiteur anonyme
select test.anon();
select test.fails('select * from countries', 'anonyme : lecture des pays refusée');
select test.fails($$select create_organization('X')$$, 'anonyme : création d''organisation refusée');

-- A crée l'organisation 1, B l'organisation 2
select test.login(:A);
select create_organization('Org A', 'XOF') as org_a \gset
select test.fails($$insert into organizations (name) values ('pirate')$$, 'insertion directe d''organisation refusée');
insert into countries (org_id, name_fr, iso2) values (:'org_a', 'Sénégal', 'SN'), (:'org_a', 'Côte d''Ivoire', 'CI');
select id as sn from countries where iso2 = 'SN' \gset
select id as ci from countries where iso2 = 'CI' \gset
insert into products (org_id, name_fr, sku) values (:'org_a', 'Produit test', 'SKU-1');
select id as prod from products limit 1 \gset
select add_member(:'org_a', 'analyste@test.local', 'analyste');
select add_member(:'org_a', 'directeur-sn@test.local', 'directeur_pays', array[:'sn']::uuid[]);
select add_member(:'org_a', 'investisseur@test.local', 'associe_investisseur');
select add_member(:'org_a', 'fournisseur@test.local', 'fournisseur');
select test.fails(format($$select add_member(%L, 'inconnu@test.local', 'analyste')$$, :'org_a'), 'ajout d''un e-mail non inscrit refusé');

select test.login(:B);
select create_organization('Org B', 'XOF') as org_b \gset
select test.ok(test.count('select * from countries') = 0, 'isolation : B ne voit pas les pays de A');
select test.ok(test.count('select * from organizations') = 1, 'isolation : B ne voit que son organisation');
select test.fails(format($$insert into countries (org_id, name_fr) values (%L, 'intrus')$$, :'org_a'), 'B ne peut pas écrire dans l''organisation de A');
select test.ok(test.affected('update products set name_fr = ''piraté''') = 0, 'B ne peut pas modifier les produits de A');
select test.fails(format($$select add_member(%L, 'admin-b@test.local', 'super_admin')$$, :'org_a'), 'B ne peut pas s''ajouter à l''organisation de A');
select test.ok(test.count('select * from audit_logs') = 0, 'B ne voit pas le journal de A');

-- Analyste : écrit les données de marché, pas le sourcing, ne supprime pas
select test.login(:C);
insert into price_observations (org_id, country_id, product_id, observed_on, price_type, price, currency)
  values (:'org_a', :'sn', :'prod', '2026-01-10', 'gros', 1000, 'XOF');
select test.ok(test.count('select * from price_observations') = 1, 'analyste : saisie d''une observation de prix');
select test.fails(format($$insert into suppliers (org_id, name_en) values (%L, 'x')$$, :'org_a'), 'analyste : création de fournisseur refusée');
select test.ok(test.affected('delete from price_observations') = 0, 'analyste : suppression refusée');
select test.ok(test.count('select * from audit_logs') = 0, 'analyste : journal d''audit non visible');
select test.ok(test.affected('update memberships set role = ''super_admin''') = 0, 'analyste : ne peut pas s''élever en super admin');
update price_observations set org_id = :'org_b';
select test.ok((select org_id from price_observations limit 1) = :'org_a', 'une ligne ne change jamais d''organisation');

-- Directeur pays limité au Sénégal
select test.login(:D);
select test.ok(test.count('select * from countries') = 1, 'directeur pays : ne voit que son pays');
select test.fails(format($$insert into price_observations (org_id, country_id, product_id, observed_on, price_type, price)
  values (%L, %L, %L, '2026-01-11', 'gros', 5)$$, :'org_a', :'ci', :'prod'), 'directeur pays : écriture hors de son pays refusée');
select test.ok(test.affected('delete from price_observations') = 1, 'directeur pays : suppression dans son pays');

-- Investisseur : lecture seule
select test.login(:E);
select test.ok(test.count('select * from countries') = 2, 'investisseur : lecture');
select test.fails(format($$insert into products (org_id, name_fr) values (%L, 'x')$$, :'org_a'), 'investisseur : écriture refusée');
select test.ok(test.count('select * from audit_logs') > 0, 'investisseur : journal visible');
select test.fails('delete from audit_logs', 'journal d''audit non effaçable');
select test.fails('update audit_logs set action = ''INSERT''', 'journal d''audit non modifiable');

-- Portail fournisseur : aucun accès aux tables internes
select test.login(:F);
select test.ok(test.count('select * from countries') = 0 and test.count('select * from suppliers') = 0
  and test.count('select * from supplier_quotes') = 0, 'fournisseur : aucune donnée interne visible');
select test.fails(format($$insert into supplier_quotes (org_id, supplier_id, product_id, quote_date, incoterm, unit_price, currency)
  values (%L, gen_random_uuid(), %L, now(), 'FOB', 1, 'USD')$$, :'org_a', :'prod'), 'fournisseur : écriture refusée');

-- Journal et garde-fous administrateur
select test.login(:A);
select test.ok(test.count($$select * from audit_logs where table_name = 'price_observations' and action = 'DELETE' and old_data ->> 'price' = '1000'$$) = 1,
  'audit : suppression journalisée avec l''ancienne valeur');
select test.ok(test.count($$select * from audit_logs where table_name = 'price_observations' and action = 'INSERT'$$) = 1, 'audit : création journalisée');
select test.fails('delete from memberships where role = ''super_admin''', 'le dernier super administrateur ne peut pas être retiré');
select test.ok(test.count('select * from list_members(''' || :'org_a' || ''')') = 5, 'liste des membres');
select test.fails(format($$insert into customs_rules (org_id, country_id, duty_rate) values (%L, %L, -5)$$, :'org_a', :'sn'), 'validation : taux négatif refusé');
select test.fails(format($$insert into market_indicators (org_id, country_id, indicator_code) values (%L, %L, 'x')$$, :'org_a', :'sn'), 'validation : indicateur sans valeur refusé');
select test.fails(format($$insert into products (org_id, name_fr, sku) values (%L, 'doublon', 'SKU-1')$$, :'org_a'), 'doublon de SKU refusé');

do $$ begin raise notice 'TOUS LES TESTS SONT PASSÉS'; end $$;
