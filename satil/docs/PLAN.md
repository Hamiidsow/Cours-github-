# Plan de réalisation et backlog

## Versions

| Version | Contenu | Condition de sortie |
| --- | --- | --- |
| **V1 — MVP** (livrée) | Authentification, organisation, rôles, référentiel, intelligence de marché, sourcing, comparateurs, simulateur de coût rendu, tableau de bord, import/export, audit, DEMO, FR/ZH/EN, PWA | Tests verts ; parcours complet vérifié en mode local |
| **V1.1 — Mise en service** | Projet Supabase, mise en ligne, MFA, parcours testé contre la base réelle, reprise du mode local | Trois utilisateurs réels saisissent des données de Dakar, Abidjan et Conakry |
| **V2 — Business plan** | Hubs, CAPEX, OPEX, prévisions 36 mois / 5 ans, compte de résultat, trésorerie, bilan simplifié, VAN, TRI, stress tests, dossier investisseur FR/ZH/EN, pièces jointes | Dossier comparatif Abidjan / Dakar / Conakry généré à partir de données vérifiées |
| **V3 — Logistique** | Expéditions, conteneurs, ETA, douane, réception, lots, stock disponible / réservé / en transit, alertes, transferts inter-hubs avec droits, inventaire | Un conteneur pilote suivi de la commande à la mise en stock ; délais **mesurés** |
| **V4 — CRM et portails** | Clients, devis, commandes, tarifs par volume, facturation, paiements, retours, portail grossiste, portail fournisseur | Dix grossistes pilotes passent commande par le portail |
| **V5 — IA et connecteurs** | Assistant sourcé, synthèses hebdomadaires, anomalies, connecteurs Comtrade / Banque mondiale, catalogue public | Chaque réponse cite ses lignes sources ; aucune action sans confirmation |

Le catalogue public n'est ouvert qu'après validation du pilote (fin V4).

## Backlog priorisé

Priorité : **P0** bloquant pour la mise en service, **P1** prochaine version, **P2** ensuite.

| Id | P | Élément | Critères d'acceptation |
| --- | --- | --- | --- |
| B-01 | P0 | Créer le projet Supabase et appliquer les migrations | Les 3 migrations passent ; *Advisors → Security* sans alerte critique ; `.env` de production renseigné avec la clé publique seule |
| B-02 | P0 | Mise en ligne (hébergement statique) | URL HTTPS ; routes rechargées sans erreur 404 ; lien de confirmation d'e-mail fonctionnel ; installation PWA possible sur Android et iOS |
| B-03 | P0 | Parcours de bout en bout contre Supabase | Inscription, création d'organisation, ajout d'un analyste et d'un directeur pays ; l'analyste ne peut pas supprimer ; le directeur ne voit que son pays ; vérifié depuis l'interface |
| S-01 | P0 | MFA des administrateurs | Enrôlement TOTP dans Paramètres ; un super administrateur sans second facteur ne peut ni gérer les membres ni supprimer (`aal2` exigé par les politiques) |
| B-04 | P0 | Mot de passe oublié et page profil | Lien de réinitialisation reçu et fonctionnel ; changement de langue enregistré dans le profil |
| B-05 | P0 | Relecture métier des traductions ZH et EN | Relu par un locuteur natif ; termes douaniers et incoterms validés |
| B-06 | P1 | Pagination et filtres côté serveur | Liste de 50 000 observations de prix fluide ; filtres par période, statut et source |
| B-07 | P1 | Reprise du mode local vers Supabase | Un fichier de sauvegarde est importé en une opération, références conservées, doublons signalés |
| B-08 | P1 | Pièces jointes (licences, fiches techniques, photos, catalogues) | Bucket privé ; un fichier n'est lisible que par les rôles internes de son organisation ; taille et types limités |
| B-09 | P1 | Workflow de vérification des données | Un directeur valide ou rejette en lot ; qui a vérifié et quand est conservé ; une donnée vérifiée modifiée repasse « non vérifiée » |
| B-10 | P1 | Tableaux de bord par pays et par produit | Écart prix de gros local / coût rendu par produit et par pays, calculé uniquement sur données non rejetées, avec part d'hypothèses affichée |
| B-11 | P1 | Enquêtes terrain hors connexion | Saisie sur téléphone sans réseau ; synchronisation à la reconnexion ; aucun doublon créé |
| F-01 | P1 | Business plan par hub (V2) | Prévisions mensuelles 36 mois et annuelles 5 ans ; compte de résultat, trésorerie, bilan simplifié équilibré ; chaque hypothèse listée avec sa source |
| F-02 | P1 | VAN, TRI, ROI, délai de récupération (V2) | Résultats identiques à un classeur de référence sur trois jeux d'essai ; taux d'actualisation modifiable |
| F-03 | P1 | Stress tests (V2) | Baisse des ventes, hausse du fret, dépréciation du FCFA et des autres devises, immobilisation douanière, impayés : effet sur trésorerie minimale et TRI affiché côte à côte |
| F-04 | P1 | Comparaison Abidjan / Dakar / Conakry (V2) | Même grille pour les trois sites ; aucune valeur par défaut favorisant un site ; cases sans donnée marquées « non disponible » |
| F-05 | P1 | Dossier d'investissement FR / ZH / EN (V2) | PDF avec tableaux, graphiques, sources et hypothèses ; mention DEMO sur toute page utilisant des données fictives ; polices chinoises correctes |
| F-06 | P1 | Simulation par conteneur multi-produits | Plusieurs articles dans un conteneur ; fret réparti au volume ou au poids ; marge par article et totale |
| S-02 | P1 | Chiffrement des données sensibles | Contacts des répondants et des fournisseurs chiffrés au niveau colonne ; lisibles par les seuls rôles autorisés |
| L-01 | P2 | Expéditions, conteneurs, documents, ETA (V3) | Statuts horodatés ; alerte si ETA dépassée ; documents rattachés |
| L-02 | P2 | Stock par lot et mouvements (V3) | Disponible + réservé + en transit = total ; tout mouvement tracé ; rapprochement d'inventaire avec écarts |
| L-03 | P2 | Alertes de stock (V3) | Rupture, surstock, vieillissement, seuil de réapprovisionnement paramétrables par SKU et par hub |
| L-04 | P2 | Transferts inter-hubs (V3) | Coût de transport et droits applicables saisis et sourcés ; aucune libre circulation supposée ; formalités listées par couple de pays |
| L-05 | P2 | Délais de livraison mesurés (V3–V4) | Délai réel calculé par destination ; l'objectif 7–10 jours est affiché comme objectif, jamais comme garantie |
| C-01 | P2 | CRM : clients, prospects, devis, commandes (V4) | Devis → commande → livraison → facture → paiement ; tarifs par volume ; retours |
| C-02 | P2 | Portail grossiste (V4) | Catalogue et disponibilité réelle par pays ; demande de devis ; un client ne voit que ses propres documents |
| C-03 | P2 | Portail fournisseur chinois (V4) | Interface en chinois ; le fournisseur ne voit que ses demandes de prix et ses commandes |
| A-01 | P2 | Assistant IA (V5) | Répond uniquement à partir des données autorisées par le rôle ; sépare vérifié / estimé / recommandation ; cite les lignes ; clé d'API côté serveur |
| A-02 | P2 | Connecteurs de données (V5) | Comtrade et Banque mondiale importés avec source, période et licence ; arrivée en « non vérifié » |
| A-03 | P2 | Détection d'anomalies (V5) | Prix hors de l'intervalle habituel, devis expirés, taux de change de plus de 30 jours signalés |

## Risques du projet

| Risque | Parade |
| --- | --- |
| Décider sur des données DEMO ou des hypothèses | Marquage systématique, part de données vérifiées en tête du tableau de bord, avertissement sur chaque classement |
| Taux douaniers erronés | Saisie depuis le tarif officiel avec référence légale ; validation par un transitaire local avant toute commande |
| Biais en faveur d'un site | Grille identique, poids visibles, couverture affichée ; revue par un associé non impliqué dans la collecte |
| Données personnelles des répondants | Consentement enregistré, accès limité, chiffrement (S-02), avis juridique local |
| Dépendance à un seul administrateur | Au moins deux super administrateurs ; MFA ; sauvegardes testées |
