# SamaKeur

Plateforme immobilière pour le Sénégal : les propriétaires publient directement leurs biens, les locataires les recherchent et contactent le propriétaire **sans commission d'intermédiation**.

> **État : MVP en construction.** L'application et la base sont écrites et testées séparément. La liaison avec un vrai projet Supabase reste à faire (voir « Ce qui n'est pas encore vérifié »).

| Document | Contenu |
| --- | --- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architecture technique, base de données, sécurité, future app mobile |
| [docs/FONCTIONNALITES.md](docs/FONCTIONNALITES.md) | Ce qui est fait, ce qui reste à faire |
| [docs/DEPLOIEMENT.md](docs/DEPLOIEMENT.md) | Configuration Supabase, mise en ligne, sauvegardes, premier administrateur |
| [docs/TESTS.md](docs/TESTS.md) | Tests automatiques et parcours de test manuel |

## Démarrage rapide

Prérequis : Node.js 20 ou plus.

```bash
npm install
npm run dev        # http://localhost:3000
```

Sans configuration, le site démarre en **mode démonstration** : 8 annonces fictives clairement étiquetées, inscription, contact et publication désactivés.

Pour activer le vrai service, créer un projet Supabase puis suivre [docs/DEPLOIEMENT.md](docs/DEPLOIEMENT.md) :

```bash
cp .env.example .env.local   # puis renseigner l'URL et la clé PUBLIQUE
```

## Commandes

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` / `npm start` | Version de production |
| `npm run typecheck` | Vérification TypeScript |
| `npm test` | Tests unitaires (validation, formats, filtres) |
| `npm run test:db` | Tests de sécurité de la base sur un PostgreSQL local jetable |

## Organisation du code

```
src/app/            Pages (accueil, annonces, connexion, espace, admin, pages légales)
src/app/actions/    Actions serveur : validation puis appel à Supabase avec la session de l'utilisateur
src/components/     Composants d'interface
src/lib/            Validation (zod), formats, textes (i18n), accès aux données, clients Supabase
src/proxy.ts        Rafraîchit la session et protège /espace et /admin
supabase/migrations Schéma, politiques RLS, fonctions, stockage
supabase/tests      Tests de sécurité de la base
```

## Ce qui n'est pas encore vérifié

- Aucun projet Supabase n'existe encore : le parcours complet (inscription → publication → validation → contact) n'a **pas** été exécuté contre un vrai backend. Les règles de la base ont été testées sur PostgreSQL local avec une imitation minimale de Supabase ; l'interface a été testée en mode démonstration.
- Les pages légales sont des modèles à faire relire par un juriste.
