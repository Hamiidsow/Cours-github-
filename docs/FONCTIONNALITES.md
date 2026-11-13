# Fonctionnalités

Légende — **Fait** : écrit et testé. **Testé sur Supabase** : parcours exécuté dans un navigateur automatisé contre le projet Supabase réel (comptes fictifs). **Écrit, à valider** : code complet, pas encore exécuté de bout en bout.

## Réalisé

| Fonctionnalité | État |
| --- | --- |
| Schéma de base, politiques RLS, triggers, fonctions RPC, buckets | Fait (54 règles vérifiées par `npm run test:db`) |
| Accueil avec recherche, dernières annonces, parcours par type | Fait (mode démonstration) |
| Résultats avec filtres : ville, quartier, type, location/vente, prix, chambres, meublé, équipements, tri, pagination | Fait (mode démonstration) ; filtres ville, type, prix et équipements testés sur Supabase |
| Fiche détaillée : galerie, prix en FCFA, charges, caution, avance, conditions, équipements | Fait (mode démonstration) |
| Partage WhatsApp d'une annonce | Fait |
| SEO : titres et descriptions, sitemap, robots, données structurées, Open Graph | Fait |
| Données fictives étiquetées « Annonce fictive », jamais référencées | Fait |
| Pages légales (modèles) et page d'aide / sécurité | Fait |
| Inscription, connexion, déconnexion | Testé sur Supabase (confirmation par e-mail désactivée pendant le test : le lien de confirmation reste à valider) |
| Modification du profil (nom, téléphone) | Testé sur Supabase |
| Mot de passe oublié, changement de mot de passe | Écrit, à valider (dépend de l'envoi d'e-mails) |
| Publication d'annonce avec photos compressées, brouillon, soumission | Testé sur Supabase |
| Gestion des annonces : modification (renvoi en validation) | Testé sur Supabase |
| Gestion des annonces : archiver, supprimer, disponibilité, retrait de photo | Écrit, à valider |
| Contact direct : numéro révélé aux connectés, appel, WhatsApp | Testé sur Supabase |
| Favoris et recherches enregistrées | Testé sur Supabase |
| Demandes de visite (envoi, acceptation, refus, annulation) | Testé sur Supabase |
| Signalement d'annonce | Testé sur Supabase |
| Dépôt d'un dossier de vérification (bucket privé) | Testé sur Supabase |
| Administration : validation des annonces, contrôle des dossiers, signalements, suspension de comptes, journal | Testé sur Supabase |

## Reste à développer

| Sujet | Détail |
| --- | --- |
| E-mails | Configurer un service d'envoi (SMTP), puis valider le lien de confirmation et « mot de passe oublié » |
| Notifications | Aucun e-mail ni SMS n'est envoyé : nouvelle demande de visite, décision de modération, alertes sur recherche enregistrée |
| Alertes | Les critères sont enregistrés et relançables à la main ; l'envoi automatique n'existe pas |
| Connexion par téléphone (SMS) | Souhaitable au Sénégal ; service payant, non activé |
| Suppression du compte par l'utilisateur | Non faite |
| Wolof et anglais | Architecture prête, traductions et sélecteur de langue à faire |
| Carte et géolocalisation | Non faits |
| Messagerie interne | Non faite (contact par téléphone / WhatsApp) |
| Réorganisation des photos, photo de couverture | Non fait (ordre d'envoi) |
| Protection anti-robots à l'inscription (CAPTCHA) | À activer dans Supabase Auth |
| Statistiques de vues par annonce | Non fait |
| Tests de bout en bout automatisés | À écrire une fois le backend connecté |
| Textes légaux | À faire valider par un juriste ; déclaration CDP à effectuer |
| Application mobile Expo | Backend prêt, application non commencée |
