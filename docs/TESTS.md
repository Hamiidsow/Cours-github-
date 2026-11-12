# Procédures de test

## Tests automatiques

```bash
npm run typecheck   # types TypeScript
npm test            # 11 tests unitaires : validation, formats, redirections, filtres
npm run test:db     # 54 règles de sécurité de la base
npm run build       # compilation de production
```

`npm run test:db` crée un PostgreSQL local temporaire (PostgreSQL 15+ requis sur la machine), y applique la migration et vérifie notamment que :

- le rôle admin ne peut pas être obtenu à l'inscription ni par modification du profil ;
- un propriétaire ne peut ni publier seul ni se déclarer vérifié ;
- un visiteur anonyme ne lit ni les tables brutes ni les coordonnées ;
- la vue publique ne contient ni téléphone ni adresse ;
- un tiers ne peut ni lire ni modifier les annonces, demandes de visite et documents d'un autre ;
- modifier une annonce publiée la renvoie en validation ;
- un compte suspendu ne peut plus rien faire et ses annonces disparaissent ;
- une annonce sans photo ne peut pas être soumise, et pas plus de 8 photos par annonce ;
- les limites de débit s'appliquent.

Limite : ce test imite Supabase au minimum (rôles, `auth.uid()`, table de stockage). Il ne remplace pas le parcours ci-dessous sur un vrai projet.

## Parcours manuel (backend connecté)

Préparer trois comptes : A (propriétaire), B (locataire), C (administrateur).

| # | Action | Résultat attendu |
| --- | --- | --- |
| 1 | Inscrire A, B, C ; confirmer les e-mails | Connexion possible ; avant confirmation, message « Confirmez d'abord votre adresse » |
| 2 | Promouvoir C en admin (SQL) | Le lien « Administration » apparaît pour C |
| 3 | A crée une annonce avec 2 photos et la soumet | Statut « En attente de validation » ; invisible dans /annonces |
| 4 | A tente d'ouvrir /admin | Redirigé vers son espace |
| 5 | C publie l'annonce | Visible dans /annonces ; ligne dans le journal |
| 6 | Visiteur non connecté ouvre l'annonce | Pas de numéro ; bouton « Connectez-vous pour voir le numéro » ; propriétaire « non vérifié » |
| 7 | B affiche le numéro, ajoute en favori, demande une visite, signale l'annonce | Numéro affiché ; favori dans son espace ; demande visible chez A ; signalement visible chez C |
| 8 | A accepte la visite | Statut « Acceptée » chez B |
| 9 | A modifie le prix | L'annonce repasse « En attente » et disparaît du public |
| 10 | A dépose une pièce d'identité | Statut « Contrôle en cours », pas de badge |
| 11 | C ouvre le document puis valide | Badge « Vérifié » sur les annonces de A |
| 12 | B tente d'ouvrir l'adresse du document de A | Accès refusé |
| 13 | C suspend A (motif) | Annonces de A retirées ; A ne peut plus publier |
| 14 | B utilise « Mot de passe oublié », puis modifie son nom dans « Mon profil » | E-mail reçu, nouveau mot de passe accepté ; nom mis à jour |
| 15 | Sur téléphone Android, réseau « 3G lente » (outils du navigateur) | Pages lisibles en quelques secondes ; envoi de photo de 4 Mo ramené à quelques centaines de Ko |
