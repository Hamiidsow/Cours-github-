# Tests, formules, sécurité, API

## 1. Plan de tests

| Niveau | Outil | Couverture | Commande |
| --- | --- | --- | --- |
| Formules | Vitest | 26 cas : coût rendu, TVA, marges, seuil, BFR, scénarios, LCL/FCL, VAN, TRI, délai de récupération, taux datés, score | `npm test` |
| Traductions | Vitest | 3 cas : clés utilisées, champs, options, 3 langues remplies | `npm test` |
| Base de données | psql sur PostgreSQL jetable | 35 cas : isolation entre organisations, rôles, pays, audit, contraintes | `npm run test:db` |
| Typage | TypeScript strict | tout le code | `npm run typecheck` |
| Bout en bout | Playwright (script manuel) | parcours complet en mode local, bureau et mobile | voir README |

À ajouter avant le pilote : parcours de bout en bout contre un projet Supabase de recette (inscription, rôles,
refus RLS vus depuis l'interface), import `.xlsx` réel, tests d'accessibilité, test de charge de l'import (5 000 lignes).

Recette manuelle minimale à chaque livraison :

1. Créer un produit, le modifier, vérifier l'historique, tenter un doublon de SKU.
2. Saisir une observation « vérifiée » sans source → refus attendu.
3. Importer un CSV contenant une ligne valide, un doublon, une erreur → rapport 1 / 1 / 1.
4. Comparer trois pays ; retirer une donnée → la couverture baisse, « non disponible » s'affiche.
5. Simuler depuis un devis, appliquer taux, fret, règle douanière ; contrôler une ligne à la main ; enregistrer ; rouvrir.
6. Passer en chinois et en anglais ; exporter en Excel ; imprimer en PDF.
7. Avec un compte analyste : pas de bouton supprimer ; avec un compte fournisseur : aucun accès.

## 2. Formules financières (`src/lib/finance.ts`)

Devise locale = devise de vente. Taux en fraction.

| Grandeur | Formule |
| --- | --- |
| Valeur FOB | prix × quantité × change (+ frais d'origine si EXW) |
| Assurance | (FOB + fret) × taux — ignorée en CIF |
| **Valeur CAF** | FOB + fret + assurance (en CIF : prix × quantité × change) |
| Droits / autres taxes | CAF × taux |
| TVA à l'import | (CAF + droits + autres taxes) × taux |
| TVA récupérable | TVA × part récupérable → **trésorerie, pas un coût** |
| **Coût de revient rendu entrepôt** | CAF + droits + autres taxes + TVA non récupérable + frais locaux |
| Décaissement total | coût de revient + TVA récupérable |
| Unités vendables | quantité × (1 − pertes) |
| **Coût unitaire** | coût de revient ÷ unités vendables |
| Prix suggéré HT | coût unitaire ÷ (1 − taux de marque visé) |
| Marge brute | CA HT − coût de revient |
| Taux de marque / taux de marge | marge ÷ CA / marge ÷ coût de revient |
| Résultat net | marge − commissions − charges fixes |
| Seuil de rentabilité | charges fixes ÷ (prix × (1 − commission) − coût unitaire) |
| BFR | stock (jours × ventes/jour × coût unitaire) + créances TTC − dette fournisseur (marchandise seule) |
| Groupage | max(m³, tonnes) × tarif, avec minimum |
| Conteneurs | ⌈max(m³ ÷ (capacité × remplissage), kg ÷ charge utile)⌉ × tarif |
| VAN / TRI / récupération | Σ flux ÷ (1+r)^t ; racine par dichotomie ; cumul interpolé |

Limites connues, à traiter selon les pays : assiettes spécifiques de certaines taxes (les « autres taxes » sont
regroupées en un taux sur la CAF), droits d'accise, valeurs mercuriales, frais d'inspection avant embarquement,
surestaries. Les taux réels viennent des tarifs douaniers officiels, saisis dans « Règles douanières » avec leur
référence légale — l'application n'en fournit aucun.

## 3. Sécurité

| Exigence | Réalisation | État |
| --- | --- | --- |
| Authentification | Supabase Auth, e-mail confirmé, mot de passe ≥ 10 caractères | V1 |
| RBAC | 10 rôles, matrice `can_write` par domaine | V1, testé |
| Isolation organisation | `org_id` + RLS sur les 37 tables ; une ligne ne change jamais d'organisation | V1, testé |
| Isolation pays | `memberships.country_ids` + `country_ok()` | V1, testé |
| Journal d'audit | déclencheurs sur 33 tables ; lecture restreinte ; ni modifiable ni effaçable | V1, testé |
| Pas de secret côté navigateur | clé publique seule ; `.env*` ignorés par git | V1 |
| Garde-fous | dernier super administrateur non retirable (testé) ; 3 organisations max par administrateur | V1 |
| Consentement | case obligatoire à renseigner sur chaque enquête terrain | V1 |
| MFA administrateurs | TOTP Supabase + exigence `aal2` dans les politiques | **à faire (S-01)** |
| Chiffrement | au repos et en transit par Supabase ; chiffrement applicatif des contacts répondants | **à faire (S-02)** |
| Stockage de fichiers | bucket privé, politiques par organisation | **à faire (V2)** |
| Mode local | aucune authentification : réservé à un poste personnel, signalé à l'écran | limite assumée |

## 4. API

En mode Supabase, l'API est l'API REST PostgREST du projet (`https://<projet>.supabase.co/rest/v1/<table>`),
documentée automatiquement dans le tableau de bord Supabase (*API Docs*) ; les politiques RLS s'y appliquent à
l'identique. Fonctions RPC :

| Fonction | Rôle requis | Effet |
| --- | --- | --- |
| `create_organization(p_name, p_base_currency)` | utilisateur connecté | crée l'organisation, l'appelant devient super administrateur |
| `add_member(p_org, p_email, p_role, p_country_ids)` | super administrateur | rattache un compte existant |
| `list_members(p_org)` | super administrateur, directeur pays | membres avec e-mail |

Connecteurs prévus (V5), tous côté serveur : UN Comtrade, Banque mondiale, BAD ; ITC Trade Map selon licence ;
douanes et instituts statistiques nationaux par import de fichiers. Chaque valeur importée arrivera « non vérifiée »
avec sa source et sa période.
