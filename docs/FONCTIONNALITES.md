# Fonctionnalités

Légende — **Fait** : écrit et testé automatiquement ou à l'écran. **Écrit, à valider** : code complet, mais pas encore exécuté contre un vrai projet Supabase.

## Réalisé

| Fonctionnalité | État |
| --- | --- |
| Schéma de base, politiques RLS, triggers, fonctions RPC, buckets | Fait (51 règles vérifiées par `npm run test:db`) |
| Accueil avec recherche, dernières annonces, parcours par type | Fait (mode démonstration) |
| Résultats avec filtres : ville, quartier, type, location/vente, prix, chambres, meublé, équipements, tri, pagination | Fait (mode démonstration) ; requêtes Supabase écrites, à valider |
| Fiche détaillée : galerie, prix en FCFA, charges, caution, avance, conditions, équipements | Fait (mode démonstration) |
| Partage WhatsApp d'une annonce | Fait |
| SEO : titres et descriptions, sitemap, robots, données structurées, Open Graph | Fait |
| Données fictives étiquetées « Annonce fictive », jamais référencées | Fait |
| Pages légales (modèles) et page d'aide / sécurité | Fait |
| Inscription, connexion, déconnexion, confirmation par e-mail | Écrit, à valider |
| Publication d'annonce avec photos compressées, brouillon, soumission | Écrit, à valider |
| Gestion des annonces : modifier, archiver, supprimer, disponibilité | Écrit, à valider |
| Contact direct : numéro révélé aux connectés, appel, WhatsApp | Écrit, à valider (règles de base testées) |
| Favoris et recherches enregistrées | Écrit, à valider |
| Demandes de visite (envoi, acceptation, refus, annulation) | Écrit, à valider (règles de base testées) |
| Signalement d'annonce | Écrit, à valider (règles de base testées) |
| Dépôt d'un dossier de vérification (bucket privé) | Écrit, à valider (règles de base testées) |
| Administration : validation des annonces, contrôle des dossiers, signalements, suspension de comptes, journal | Écrit, à valider (règles de base testées) |

## Reste à développer

| Sujet | Détail |
| --- | --- |
| Liaison Supabase | Créer le projet, appliquer la migration, dérouler le parcours de test manuel |
| Notifications | Aucun e-mail ni SMS n'est envoyé : nouvelle demande de visite, décision de modération, alertes sur recherche enregistrée |
| Alertes | Les critères sont enregistrés et relançables à la main ; l'envoi automatique n'existe pas |
| Connexion par téléphone (SMS) | Souhaitable au Sénégal ; service payant, non activé |
| Mot de passe oublié, modification du profil, suppression du compte | Non faits |
| Wolof et anglais | Architecture prête, traductions et sélecteur de langue à faire |
| Carte et géolocalisation | Non faits |
| Messagerie interne | Non faite (contact par téléphone / WhatsApp) |
| Réorganisation des photos, photo de couverture | Non fait (ordre d'envoi) |
| Protection anti-robots à l'inscription (CAPTCHA) | À activer dans Supabase Auth |
| Statistiques de vues par annonce | Non fait |
| Tests de bout en bout automatisés | À écrire une fois le backend connecté |
| Textes légaux | À faire valider par un juriste ; déclaration CDP à effectuer |
| Application mobile Expo | Backend prêt, application non commencée |
