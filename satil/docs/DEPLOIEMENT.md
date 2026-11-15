# Déploiement

## 0. Projet existant

Le projet Supabase **satil** (référence `fpzvzynxaovzinbirimw`, région Paris `eu-west-3`) existe déjà : les trois
migrations y sont appliquées. Adresse : `https://fpzvzynxaovzinbirimw.supabase.co`. La clé publique se lit dans
*Project Settings → API*. Il reste à faire les étapes 3 et 4 ci-dessous (adresse du site, réglages d'e-mail) une fois
le site mis en ligne. La section 1 ne sert que pour recréer une base ailleurs.

## 1. Créer la base (Supabase)

1. Créer un projet sur supabase.com (région conseillée : `eu-west-3`, Paris — la plus proche de l'Afrique de l'Ouest).
2. Ouvrir **SQL Editor** et exécuter, dans l'ordre, le contenu de :
   `supabase/migrations/0001_schema.sql`, `0002_security.sql`, `0003_fonctions.sql`.
3. **Authentication → URL Configuration** : renseigner l'adresse du site dans *Site URL* et *Redirect URLs*
   (sinon le lien de confirmation d'e-mail renvoie vers `localhost`).
4. **Authentication → Providers → Email** : garder « Confirm email » activé ; longueur minimale du mot de passe : 10.
5. **Project Settings → API** : copier l'URL et la clé **publishable** (publique).

Ne jamais utiliser la clé `service_role` dans l'application : elle contourne toutes les politiques de sécurité.

## 2. Configurer et construire

```bash
cp .env.example .env.local
# VITE_SUPABASE_URL=https://xxxx.supabase.co
# VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
npm install && npm run build      # produit dist/
```

`dist/` est un site statique : Vercel, Netlify, Cloudflare Pages ou tout serveur web. Régler une réécriture de toutes
les routes vers `index.html` (application monopage). Sur Vercel/Netlify, déclarer les deux variables `VITE_*`.

## 3. Premier administrateur et équipe

1. Créer un compte dans l'application, confirmer l'e-mail, se connecter.
2. Créer l'organisation : le créateur en devient super administrateur ; les 9 pays et leurs ports sont créés.
3. Chaque collègue crée son compte ; le super administrateur l'ajoute dans **Paramètres → Membres** avec son rôle et,
   si besoin, un pays autorisé.

## 4. Reprise des données du mode local

Paramètres → *Exporter une sauvegarde (JSON)*, puis exporter chaque liste en CSV/Excel et la réimporter dans
l'organisation Supabase (l'import contrôle les doublons). Une reprise automatique est au backlog (B-07).

## 5. Sauvegardes et exploitation

- Supabase : sauvegardes quotidiennes automatiques sur les offres payantes ; activer la restauration à un instant donné
  (PITR) avant la mise en production. Sur l'offre gratuite, planifier un `pg_dump` hebdomadaire.
- Tester une restauration avant le lancement du pilote, puis une fois par trimestre.
- Après chaque migration : exécuter `npm run test:db` puis consulter *Advisors → Security* dans Supabase.
- MFA : activer l'authentification à deux facteurs pour les comptes administrateurs (écran d'enrôlement au backlog, S-01).

## 6. Conformité

Les enquêtes terrain contiennent des données personnelles (nom et contact du répondant). Avant le pilote : informer les
répondants, recueillir leur consentement (case prévue), limiter la durée de conservation et vérifier les obligations
locales (CDP au Sénégal, ARTCI en Côte d'Ivoire, autorité compétente en Guinée). À valider par un juriste.
