# Architecture technique

## Vue d'ensemble

```
Navigateur (mobile d'abord)
   │  HTML rendu côté serveur, très peu de JavaScript
   ▼
Next.js 16 (App Router, TypeScript, Tailwind)
   │  pages serveur + actions serveur ; agit avec la SESSION de l'utilisateur
   ▼
Supabase
   ├─ Auth        e-mail + mot de passe, confirmation par e-mail
   ├─ PostgreSQL  tables, politiques RLS, triggers, fonctions RPC
   └─ Storage     listing-images (lecture publique) · identity-documents (privé)
```

**Principe central : les règles métier et de sécurité sont dans la base**, pas dans le serveur web. L'application n'utilise que la clé publique de Supabase ; aucune clé secrète (`service_role`) n'existe dans le code ni dans la configuration. Conséquence : une application mobile peut se brancher sur le même backend et hérite exactement des mêmes protections.

## Choix techniques

| Besoin | Choix | Raison |
| --- | --- | --- |
| Téléphones modestes, réseau lent | Rendu serveur, polices système, galerie et menus sans JavaScript, images en chargement différé | Peu de données à télécharger, pas de blocage pendant le chargement |
| Photos | Compression dans le navigateur (1600 px, JPEG) avant envoi | Envoi 5 à 10 fois plus léger ; supprime les métadonnées GPS |
| SEO | Pages rendues côté serveur, adresses de recherche partageables, `sitemap.xml`, `robots.txt`, données structurées schema.org, balises Open Graph | Les annonces sont lisibles par les moteurs et s'affichent bien une fois partagées |
| Langues | Dictionnaire typé `src/lib/i18n/fr.ts` | Ajouter `wo.ts` / `en.ts` sans toucher aux pages (voir ci-dessous) |

## Base de données

Migrations : `supabase/migrations/0001_schema_initial.sql` (schéma) et `0002_regles_photos.sql` (au moins une photo pour soumettre, 8 photos maximum).

| Table | Rôle | Qui peut lire |
| --- | --- | --- |
| `profiles` | Nom affiché, rôle, statut du compte, statut de vérification | Soi-même, admin |
| `profile_private` | Téléphone personnel | Soi-même, admin |
| `owner_verifications` | Dossiers de vérification (chemin du document privé, décision) | Soi-même, admin |
| `properties` | Bien : type, ville, quartier, surface, équipements, adresse privée | Propriétaire, admin |
| `listings` | Annonce : titre, prix, frais, conditions, statut, disponibilité, contact | Propriétaire, admin |
| `listing_images` | Photos d'une annonce | Propriétaire, admin |
| `favorites`, `saved_searches` | Favoris et recherches enregistrées | Soi-même |
| `visit_requests` | Demandes de visite | Demandeur, propriétaire concerné, admin |
| `reports` | Signalements | Auteur, admin |
| `moderation_logs` | Journal des décisions d'administration | Admin (écriture par RPC uniquement) |
| `contact_reveals` | Journal des consultations de numéros | Personne (RPC uniquement) |
| vue `listings_public` | Annonces publiées de comptes actifs, **sans** téléphone ni adresse | Tout le monde |

### Séparation public / privé

- Le public ne lit **que** la vue `listings_public`. Les tables brutes sont fermées aux visiteurs anonymes.
- Le téléphone d'une annonce n'est jamais dans une page : il est obtenu par la fonction `reveal_listing_contact`, réservée aux utilisateurs connectés, limitée à 30 annonces par 24 h et journalisée.
- Les documents d'identité sont dans un bucket privé, dans un dossier au nom de l'utilisateur ; seuls lui et les administrateurs peuvent les lire (liens temporaires de 10 minutes côté admin).

### Cycle de vie d'une annonce

```
brouillon ──► en_attente ──► publiee ──► archivee
                  │             │ modification du contenu
                  ▼             ▼
               rejetee      en_attente        (admin) ──► suspendue
```

Un trigger interdit à un propriétaire de passer lui-même une annonce en `publiee`. Modifier le prix, le texte, le bien ou les photos d'une annonce publiée la renvoie en validation ; changer la seule disponibilité ne la dépublie pas.

### Vérification des propriétaires

Le statut « vérifié » ne peut être écrit que par la fonction `admin_review_verification`, appelée par un administrateur après ouverture du document. Déposer un dossier donne « contrôle en cours ». L'interface n'affiche le badge que si la base renvoie ce statut.

## Sécurité

| Mesure | Mise en œuvre |
| --- | --- |
| Contrôle d'accès | RLS sur toutes les tables ; rôle et statut non modifiables par l'utilisateur (droits par colonne) ; le rôle `admin` ne peut pas être obtenu à l'inscription |
| Validation des entrées | zod côté serveur + contraintes `CHECK` et types énumérés côté base |
| Limitation des requêtes | Triggers : 10 annonces, 15 demandes de visite, 10 signalements, 3 dossiers par jour et par compte ; 30 numéros par jour ; limites natives de Supabase Auth sur la connexion |
| Fichiers | Taille et types limités par bucket ; écriture uniquement dans son propre dossier |
| Journalisation | `moderation_logs` (qui, quoi, quand, motif) et `contact_reveals` |
| Suspension | `admin_set_account_status` : le compte ne peut plus rien créer ni modifier, ses annonces disparaissent du site |
| En-têtes HTTP | CSP, HSTS, `X-Frame-Options`, `nosniff`, `Referrer-Policy` (`next.config.ts`) |
| Redirections | Seuls des chemins internes sont acceptés après connexion |
| Sauvegardes | Assurées par Supabase ; réglages décrits dans DEPLOIEMENT.md |

Point connu : la vue `listings_public` s'exécute avec les droits de son propriétaire (c'est voulu, pour garder les tables fermées). L'outil de conseils de Supabase le signalera comme avertissement.

## Ajouter une langue

1. Copier `src/lib/i18n/fr.ts` vers `wo.ts` ou `en.ts` et traduire (les clés absentes retombent sur le français).
2. L'enregistrer dans `dictionaries` (`src/lib/i18n/index.ts`).
3. Reste à faire : le choix de la langue par l'utilisateur (la colonne `profiles.locale` existe déjà) et la traduction des pages légales.

## Application mobile (React Native / Expo)

Le backend est prêt à être partagé :

- même projet Supabase, même clé publique, `supabase-js` côté mobile ;
- lecture des annonces via `listings_public`, actions via les mêmes tables et fonctions RPC ;
- réutilisables tels quels : `src/lib/constants.ts`, `types.ts`, `validation.ts`, `format.ts`, `i18n/`.

À prévoir à ce moment-là : sortir ces fichiers dans un paquet partagé.
