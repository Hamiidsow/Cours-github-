# SATIL — SinoAfrica Trade Intelligence & Logistics Platform

Plateforme B2B multilingue (français, 简体中文, English) pour étudier les marchés africains, sourcer en Chine,
comparer les pays d'implantation et calculer la rentabilité d'une importation.

> **État : V1 (MVP) fonctionnelle.** Vérifiée dans un navigateur automatisé en *mode local* et sur un PostgreSQL local
> pour la sécurité. **Pas encore branchée sur un projet Supabase réel ni mise en ligne** — voir « État des vérifications ».

| Document | Contenu |
| --- | --- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architecture fonctionnelle et technique, schéma de base de données, rôles |
| [docs/PLAN.md](docs/PLAN.md) | Plan de réalisation par versions, backlog priorisé avec critères d'acceptation |
| [docs/QUALITE.md](docs/QUALITE.md) | Plan de tests, formules financières, sécurité, API |
| [docs/DEPLOIEMENT.md](docs/DEPLOIEMENT.md) | Création du projet Supabase, mise en ligne, sauvegardes |
| [docs/captures/](docs/captures) | Captures d'écran réelles de l'application (bureau et mobile) |

## Démarrage

```bash
npm install
npm run dev          # http://localhost:5173
```

Sans configuration, l'application démarre en **mode local** : tout fonctionne, les données sont enregistrées dans le
navigateur (un seul poste, pas de compte). Pour le mode multi-utilisateurs sécurisé :

```bash
cp .env.example .env.local     # URL du projet + clé PUBLIQUE uniquement
```

puis suivre [docs/DEPLOIEMENT.md](docs/DEPLOIEMENT.md).

| Commande | Rôle |
| --- | --- |
| `npm run dev` / `npm run build` / `npm run preview` | Développement / production / aperçu de la production |
| `npm run typecheck` | Vérification TypeScript |
| `npm test` | 29 tests : formules financières, score d'attractivité, traductions |
| `npm run test:db` | 35 tests de sécurité de la base sur un PostgreSQL local jetable |

## Ce que fait la V1

- **Référentiel** : pays (9 pays cibles créés d'office avec villes et ports), catégories, codes HS, produits.
- **Intelligence de marché** : indicateurs, observations de prix, enquêtes terrain, concurrents, flux commerciaux, sources.
  Chaque donnée porte source, URL, date de collecte, période, unité, devise, méthode, confiance et statut de vérification.
- **Comparateur de pays** : score pondéré, normalisation transparente, couverture affichée, aucune donnée imputée.
- **Sourcing Chine** : fournisseurs (pipeline prospection → expédition), devis, comparaison de 3 à 5 devis par article.
- **Simulateur de coût rendu** : EXW/FOB/CIF, fret groupage contre 20GP/40GP/40HQ, douane, TVA récupérable ou non,
  marges, seuil de rentabilité, BFR, scénarios pessimiste / central / optimiste, enregistrement.
- **Tableau de bord dirigeant** : KPI, couverture des données par pays, qualité des données, alertes.
- **Transverse** : import CSV/XLSX avec validation et contrôle de doublons, export CSV/XLSX/PDF (impression),
  journal d'audit et historique par ligne, 10 rôles, jeu de données **DEMO** fictif et marqué, PWA installable.

Les modules Business plan, Logistique, CRM/Marketplace et Assistant IA ne sont **pas** simulés : leurs tables existent
dans le schéma, leurs écrans seront livrés dans les versions suivantes ([docs/PLAN.md](docs/PLAN.md)).

## Organisation du code

```
src/lib/finance.ts      Formules (coût rendu, scénarios, fret, VAN, TRI…) — pures et testées
src/lib/scoring.ts      Score d'attractivité multi-pays
src/lib/store.ts        Accès aux données : Supabase (RLS) ou navigateur, même interface
src/lib/seed.ts         Référentiel de départ et jeu DEMO
src/lib/dict.ts         Traductions FR / EN / ZH
src/resources/          Définition déclarative des 17 ressources en CRUD
src/components/         ResourcePage (liste, formulaire, import, export, historique), Layout, composants UI
src/pages/              Tableau de bord, comparateurs, simulateur, audit, paramètres
supabase/migrations/    Schéma (37 tables), sécurité (RLS, audit), fonctions RPC
supabase/tests/         Tests de sécurité de la base
```

## État des vérifications

- **Vérifié** (navigateur automatisé, mode local) : création d'organisation, CRUD, refus de doublon, historique,
  validation « vérifié ⇒ source obligatoire », import CSV avec rapport (valides / doublons / erreurs), exports CSV et
  Excel, chargement du jeu DEMO, tableau de bord, comparateur de pays, comparateur de devis, simulateur avec reprise des
  données de la base, enregistrement, journal d'audit, bascule FR / ZH / EN, persistance après rechargement, affichage mobile.
- **Vérifié** (PostgreSQL 16 local) : les 3 migrations s'appliquent ; 35 tests d'isolation, de rôles et d'audit passent.
- **Pas encore vérifié** : l'application contre un vrai projet Supabase (connexion, inscription par e-mail, gestion des
  membres), l'import de fichiers `.xlsx`, l'installation PWA sur téléphone, l'impression PDF sur papier.
- Les traductions chinoises et anglaises sont à faire relire par un locuteur natif du métier.
