-- Tests de sécurité (RLS, garde-fous, RPC). Chaque ligne « ok » est une
-- règle vérifiée ; le script s'arrête à la première règle violée.
\set ON_ERROR_STOP on
\set QUIET on

-- Comptes de test (le trigger crée les profils)
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@test.sn', '{"display_name":"Admin Test","role":"admin"}'),
  ('00000000-0000-0000-0000-00000000000b', 'proprio@test.sn', '{"display_name":"Awa Proprio","role":"proprietaire","phone":"+221 77 000 00 01"}'),
  ('00000000-0000-0000-0000-00000000000c', 'locataire@test.sn', '{"display_name":"Moussa Locataire"}'),
  ('00000000-0000-0000-0000-00000000000d', 'autre@test.sn', '{"display_name":"Autre Proprio","role":"proprietaire"}');

select test.ok((select role from profiles where id = '00000000-0000-0000-0000-00000000000a') = 'locataire',
  'inscription : le rôle admin demandé dans les métadonnées est ignoré');
select test.ok((select role from profiles where id = '00000000-0000-0000-0000-00000000000b') = 'proprietaire',
  'inscription : le rôle propriétaire est accepté');
select test.ok((select phone from profile_private where user_id = '00000000-0000-0000-0000-00000000000b') = '+221 77 000 00 01',
  'inscription : le téléphone est rangé dans la table privée');

-- Promotion admin : uniquement par SQL d'administration
update profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000000a';

-- ---------- Propriétaire ----------
select test.login('00000000-0000-0000-0000-00000000000b');
select test.fails($$update profiles set role = 'admin' where id = auth.uid()$$,
  'un utilisateur ne peut pas changer son rôle');
select test.fails($$update profiles set verification_status = 'verifie' where id = auth.uid()$$,
  'un utilisateur ne peut pas se déclarer vérifié');
select test.ok(test.affected($$update profiles set display_name = 'Awa P.' where id = auth.uid()$$) = 1,
  'un utilisateur peut modifier son nom');
select test.ok(test.count('select 1 from profiles') = 1, 'un utilisateur ne voit que son propre profil');
select test.ok(test.count('select 1 from profile_private') = 1, 'un utilisateur ne voit que ses propres données privées');

insert into properties (id, owner_id, type, city, neighborhood)
  values ('10000000-0000-0000-0000-000000000001', auth.uid(), 'appartement', 'Dakar', 'Mermoz');
select test.fails($$insert into listings (property_id, owner_id, title, description, price_fcfa, contact_phone, status)
  values ('10000000-0000-0000-0000-000000000001', auth.uid(), 'Appartement test Mermoz', 'Description suffisamment longue pour passer la validation.', 250000, '+221770000001', 'publiee')$$,
  'un propriétaire ne peut pas créer une annonce directement publiée');
insert into listings (id, property_id, owner_id, title, description, price_fcfa, contact_phone, status, is_demo)
  values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', auth.uid(),
          'Appartement test Mermoz', 'Description suffisamment longue pour passer la validation.', 250000, '+221770000001', 'brouillon', true);
select test.fails($$update listings set status = 'en_attente' where id = '20000000-0000-0000-0000-000000000001'$$,
  'une annonce sans photo ne peut pas être soumise à validation');
insert into listing_images (listing_id, owner_id, storage_path)
  values ('20000000-0000-0000-0000-000000000001', auth.uid(), auth.uid()::text || '/20000000-0000-0000-0000-000000000001/a.jpg');
update listings set status = 'en_attente' where id = '20000000-0000-0000-0000-000000000001';
select test.fails($$insert into listing_images (listing_id, owner_id, storage_path)
  select '20000000-0000-0000-0000-000000000001', auth.uid(), auth.uid()::text || '/x/' || g || '.jpg' from generate_series(1, 8) g$$,
  'pas plus de 8 photos par annonce');
select test.ok((select is_demo from listings where id = '20000000-0000-0000-0000-000000000001') = false,
  'le drapeau is_demo ne peut pas être posé par un utilisateur');
select test.fails($$update listings set status = 'publiee' where id = '20000000-0000-0000-0000-000000000001'$$,
  'un propriétaire ne peut pas publier lui-même son annonce');
select test.fails($$select admin_moderate_listing('20000000-0000-0000-0000-000000000001', 'publiee')$$,
  'la RPC de modération est refusée à un non-admin');
select test.fails($$insert into moderation_logs (action, target_type, target_id) values ('x', 'y', gen_random_uuid())$$,
  'aucune écriture directe dans le journal de modération');

-- ---------- Visiteur anonyme ----------
select test.anon();
select test.ok(test.count('select 1 from listings_public') = 0, 'une annonce en attente est invisible du public');
select test.fails('select 1 from listings', 'la table des annonces est fermée aux anonymes');
select test.fails('select 1 from profiles', 'la table des profils est fermée aux anonymes');
select test.fails('select 1 from profile_private', 'les données privées sont fermées aux anonymes');
select test.fails($$select * from reveal_listing_contact('20000000-0000-0000-0000-000000000001')$$,
  'les coordonnées ne sont pas révélées aux anonymes');

-- ---------- Administrateur ----------
select test.login('00000000-0000-0000-0000-00000000000a');
select test.fails($$select admin_moderate_listing('20000000-0000-0000-0000-000000000001', 'rejetee')$$,
  'un rejet sans motif est refusé');
select admin_moderate_listing('20000000-0000-0000-0000-000000000001', 'publiee');
select test.ok(test.count('select 1 from moderation_logs') = 1, 'la publication est journalisée');

select test.anon();
select test.ok(test.count('select 1 from listings_public') = 1, 'une annonce validée devient publique');
select test.ok((select owner_verified from listings_public limit 1) = false,
  'le propriétaire non contrôlé n''est pas affiché comme vérifié');
select test.ok(test.count($$select 1 from information_schema.columns where table_name = 'listings_public'
  and column_name in ('contact_phone', 'contact_whatsapp', 'address_private', 'owner_id')$$) = 0,
  'la vue publique ne contient ni coordonnées ni adresse');

-- ---------- Locataire ----------
select test.login('00000000-0000-0000-0000-00000000000c');
select test.ok(test.count('select 1 from listings') = 0, 'un locataire ne lit pas la table brute des annonces');
select test.fails($$insert into properties (owner_id, type, city, neighborhood) values (auth.uid(), 'studio', 'Dakar', 'Yoff')$$,
  'un locataire ne peut pas créer de bien');
select test.ok((select phone from reveal_listing_contact('20000000-0000-0000-0000-000000000001')) = '+221770000001',
  'un utilisateur connecté obtient le contact d''une annonce publiée');
insert into favorites (user_id, listing_id) values (auth.uid(), '20000000-0000-0000-0000-000000000001');
select test.fails($$insert into favorites (user_id, listing_id) values ('00000000-0000-0000-0000-00000000000d', '20000000-0000-0000-0000-000000000001')$$,
  'impossible d''ajouter un favori au nom d''un autre');
insert into visit_requests (listing_id, requester_id, owner_id, preferred_date, requester_phone)
  values ('20000000-0000-0000-0000-000000000001', auth.uid(), '00000000-0000-0000-0000-00000000000d', current_date + 3, '+221780000002');
select test.ok((select owner_id from visit_requests limit 1) = '00000000-0000-0000-0000-00000000000b',
  'le destinataire d''une demande de visite est déduit de l''annonce (non falsifiable)');
select test.fails($$update visit_requests set status = 'acceptee'$$, 'le demandeur ne peut pas accepter sa propre demande');
insert into reports (listing_id, reporter_id, reason) values ('20000000-0000-0000-0000-000000000001', auth.uid(), 'fraude');
select test.fails($$insert into reports (listing_id, reporter_id, reason) values ('20000000-0000-0000-0000-000000000001', auth.uid(), 'doublon')$$,
  'un seul signalement par annonce et par utilisateur');
select test.fails($$insert into owner_verifications (user_id, document_type, document_path) values (auth.uid(), 'cni', auth.uid()::text || '/cni.jpg')$$,
  'un locataire ne peut pas déposer de dossier propriétaire');
select test.fails($$insert into storage.objects (bucket_id, name) values ('identity-documents', '00000000-0000-0000-0000-00000000000b/cni.jpg')$$,
  'impossible de déposer un fichier dans le dossier d''un autre');

-- ---------- Autre propriétaire ----------
select test.login('00000000-0000-0000-0000-00000000000d');
select test.ok(test.count('select 1 from visit_requests') = 0, 'un tiers ne voit pas les demandes de visite des autres');
select test.ok(test.affected($$update listings set price_fcfa = 1 where id = '20000000-0000-0000-0000-000000000001'$$) = 0,
  'un tiers ne peut pas modifier l''annonce d''un autre');
select test.ok(test.affected($$delete from listings where id = '20000000-0000-0000-0000-000000000001'$$) = 0,
  'un tiers ne peut pas supprimer l''annonce d''un autre');
select test.fails($$insert into listing_images (listing_id, owner_id, storage_path)
  values ('20000000-0000-0000-0000-000000000001', auth.uid(), auth.uid()::text || '/intrus.jpg')$$,
  'impossible d''ajouter une photo à l''annonce d''un autre');
select test.fails($$insert into listings (property_id, owner_id, title, description, price_fcfa, contact_phone)
  values ('10000000-0000-0000-0000-000000000001', auth.uid(), 'Annonce greffée sur le bien', 'Description suffisamment longue pour passer la validation.', 1000, '+221770000009')$$,
  'impossible de créer une annonce sur le bien d''un autre');

-- ---------- Propriétaire : suite ----------
select test.login('00000000-0000-0000-0000-00000000000b');
select test.ok(test.count('select 1 from visit_requests') = 1, 'le propriétaire voit la demande de visite reçue');
select test.ok(test.affected($$update visit_requests set status = 'acceptee'$$) = 1, 'le propriétaire peut accepter la demande');
update listings set availability = 'reserve' where id = '20000000-0000-0000-0000-000000000001';
select test.ok((select status from listings where id = '20000000-0000-0000-0000-000000000001') = 'publiee',
  'changer la disponibilité ne dépublie pas l''annonce');
update listings set price_fcfa = 300000 where id = '20000000-0000-0000-0000-000000000001';
select test.ok((select status from listings where id = '20000000-0000-0000-0000-000000000001') = 'en_attente',
  'modifier le prix d''une annonce publiée la renvoie en validation');

insert into owner_verifications (id, user_id, document_type, document_path)
  values ('30000000-0000-0000-0000-000000000001', auth.uid(), 'cni', auth.uid()::text || '/cni.jpg');
select test.ok((select verification_status from profiles where id = auth.uid()) = 'en_attente',
  'déposer un dossier donne le statut « en attente », pas « vérifié »');
select test.fails($$select admin_review_verification('30000000-0000-0000-0000-000000000001', true)$$,
  'un propriétaire ne peut pas valider son propre dossier');
insert into storage.objects (bucket_id, name) values ('identity-documents', auth.uid()::text || '/cni.jpg');

select test.login('00000000-0000-0000-0000-00000000000c');
select test.ok(test.count('select 1 from storage.objects') = 0, 'un tiers ne peut pas lire les documents d''identité');
select test.ok(test.count('select 1 from owner_verifications') = 0, 'un tiers ne voit pas les dossiers de vérification');

-- ---------- Admin : vérification, suspension ----------
select test.login('00000000-0000-0000-0000-00000000000a');
select test.ok(test.count('select 1 from storage.objects') = 1, 'l''admin peut lire le document à contrôler');
select admin_review_verification('30000000-0000-0000-0000-000000000001', true, 'CNI conforme');
select admin_moderate_listing('20000000-0000-0000-0000-000000000001', 'publiee');
select test.ok((select owner_verified from listings_public limit 1) = true,
  'après contrôle admin, le badge vérifié apparaît');
select test.fails($$select admin_set_account_status(auth.uid(), 'suspendu', 'test')$$, 'un admin ne peut pas se suspendre lui-même');
select admin_set_account_status('00000000-0000-0000-0000-00000000000b', 'suspendu', 'Annonce frauduleuse confirmée');

select test.anon();
select test.ok(test.count('select 1 from listings_public') = 0, 'les annonces d''un compte suspendu disparaissent du public');

select test.login('00000000-0000-0000-0000-00000000000b');
select test.fails($$insert into properties (owner_id, type, city, neighborhood) values (auth.uid(), 'studio', 'Dakar', 'Yoff')$$,
  'un compte suspendu ne peut plus créer de bien');
select test.ok(test.affected($$update listings set title = 'Nouveau titre annonce' where owner_id = auth.uid()$$) = 0,
  'un compte suspendu ne peut plus modifier ses annonces');

-- ---------- Limitation de débit ----------
reset role;
select set_config('request.jwt.claims', '', false);
update profiles set account_status = 'actif' where id = '00000000-0000-0000-0000-00000000000b';
select test.login('00000000-0000-0000-0000-00000000000b');
insert into listings (property_id, owner_id, title, description, price_fcfa, contact_phone)
  select '10000000-0000-0000-0000-000000000001', auth.uid(), 'Annonce en série numéro ' || g,
         'Description suffisamment longue pour passer la validation.', 1000, '+221770000001'
  from generate_series(1, 9) g;
select test.fails($$insert into listings (property_id, owner_id, title, description, price_fcfa, contact_phone)
  values ('10000000-0000-0000-0000-000000000001', auth.uid(), 'Annonce de trop numéro 11', 'Description suffisamment longue pour passer la validation.', 1000, '+221770000001')$$,
  'pas plus de 10 annonces créées par jour et par compte');

reset role;
\echo
\echo 'TOUS LES TESTS DE SECURITE SONT PASSES'
