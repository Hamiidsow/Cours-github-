# Configuration et déploiement

## 1. Créer le projet Supabase

1. Sur supabase.com, créer un projet (région conseillée : Europe de l'Ouest, la plus proche du Sénégal). L'offre gratuite suffit pour démarrer ; elle met le projet en pause après une semaine sans activité et ne conserve pas de sauvegardes téléchargeables.
2. **SQL Editor** : coller et exécuter `supabase/schema-complet.sql` (les deux migrations réunies) — ou, dans l'ordre, le contenu de `supabase/migrations/0001_schema_initial.sql` puis de `0002_regles_photos.sql`.
   Ne pas exécuter les fichiers de `supabase/tests/` : ils sont réservés aux tests locaux.
3. **Authentication → URL Configuration** : renseigner l'adresse du site dans *Site URL* et ajouter `https://VOTRE-DOMAINE/auth/callback` dans *Redirect URLs* (plus `http://localhost:3000/auth/callback` pour le développement).
4. **Authentication → Providers → Email** : laisser la confirmation par e-mail activée. Longueur minimale du mot de passe : 10.
5. Avant l'ouverture au public : configurer un service d'envoi d'e-mails (SMTP) — celui fourni par défaut est limité à quelques messages par heure — et activer le CAPTCHA.

## 2. Configurer l'application

Dans **Project Settings → API**, copier l'URL du projet et la clé **publique** (« publishable » ou « anon ») :

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
NEXT_PUBLIC_SITE_URL=https://VOTRE-DOMAINE
```

La clé secrète (`service_role`) n'est **pas** utilisée : ne la copiez nulle part.

## 3. Créer le premier administrateur

1. S'inscrire sur le site avec le compte qui sera administrateur et confirmer l'e-mail.
2. Dans **SQL Editor** :

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'votre-adresse@exemple.sn');
```

C'est volontairement la seule façon de devenir administrateur.

## 4. Mettre en ligne (Vercel)

1. Importer le dépôt GitHub dans Vercel (détection automatique de Next.js).
2. Ajouter les trois variables d'environnement ci-dessus.
3. Déployer, puis brancher le nom de domaine.
4. Reporter l'adresse finale dans *Site URL* et *Redirect URLs* de Supabase.

Tout hébergeur Node.js convient aussi : `npm run build` puis `npm start`.

## 5. Sauvegardes et exploitation

- **Sauvegardes** : l'offre payante de Supabase inclut des sauvegardes quotidiennes (et la restauration à un instant précis en option). Sur l'offre gratuite, prévoir un export régulier (`pg_dump`) vers un stockage externe. Les fichiers du Storage ne sont pas inclus dans les sauvegardes de la base : les copier séparément.
- **Journaux** : décisions d'administration dans l'onglet *Journal* de `/admin` ; journaux techniques dans Supabase (*Logs*) et chez l'hébergeur.
- **Suspendre un compte** : `/admin` → *Comptes* ou depuis un signalement. Motif obligatoire. Les annonces du compte disparaissent aussitôt du site ; la réactivation se fait au même endroit.
- **Après chaque changement de schéma** : ajouter un nouveau fichier dans `supabase/migrations/`, lancer `npm run test:db`, puis l'appliquer.

## Liste de contrôle avant ouverture

- [ ] Migration appliquée, parcours de test manuel réussi (docs/TESTS.md)
- [ ] Premier administrateur créé
- [ ] SMTP et CAPTCHA configurés
- [ ] Pages légales complétées et relues par un juriste ; contact d'assistance renseigné
- [ ] Sauvegardes en place et restauration essayée une fois
- [ ] `NEXT_PUBLIC_SITE_URL` égal au domaine final
