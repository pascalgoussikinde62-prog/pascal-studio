# Pascal Studio

Application web française de gestion d'activité pour un indépendant du marketing digital et de la création :
- Clients
- Projets et prestations
- Campagnes publicitaires (Meta Ads, LinkedIn Ads, TikTok Ads, etc.)
- Devis / factures et suivi des montants payés
- Tableau de bord

Le projet est prévu pour GitHub Pages (frontend statique) et Supabase (authentification + base de données).

## 1. Préparer Supabase

1. Créez un projet personnel sur https://supabase.com/.
2. Ouvrez **SQL Editor** puis créez une requête.
3. Copiez le contenu de `supabase/schema.sql` et exécutez-le.
4. Dans **Project Settings → API**, récupérez l'URL du projet et la clé **anon/public**.
5. Ouvrez `config.js` et remplacez :
   - `https://VOTRE-PROJET.supabase.co`
   - `VOTRE_CLE_ANON_PUBLIQUE`
6. Dans **Authentication → URL Configuration**, ajoutez l'URL GitHub Pages du site à **Site URL** et aux **Redirect URLs** autorisées. Exemple : `https://VOTRE-NOM.github.io/pascal-studio/`.

> Important : le fichier `config.js` est public. La clé anon/public est destinée à être utilisée dans un frontend avec les politiques RLS activées. Ne placez jamais la clé `service_role` ou une clé secrète dans le dépôt.

## 2. Tester en local

Vous pouvez ouvrir `index.html` directement pour vérifier le design, mais pour un test plus fiable, utilisez un serveur statique local (par exemple l'extension Live Server de VS Code). Les fonctions connectées nécessitent une configuration Supabase valide et une connexion Internet.

## 3. Publier sur GitHub Pages

1. Créez un dépôt GitHub nommé `pascal-studio`.
2. Importez tous les fichiers du projet en conservant la structure, notamment le dossier `assets` et le dossier `supabase`.
3. Dans le dépôt : **Settings → Pages**.
4. Choisissez **Deploy from a branch**, branche `main`, dossier `/ (root)`, puis **Save**.
5. Attendez la fin du déploiement et ouvrez l'URL affichée par GitHub.
6. Ajoutez cette URL dans les URL autorisées de Supabase Auth comme indiqué plus haut.

## 4. Fonctionnement actuel

- Authentification par e-mail et mot de passe via Supabase Auth.
- Création de compte, connexion et déconnexion.
- CRUD (création, lecture, modification, suppression) des clients, projets, campagnes et factures.
- Filtrage/recherche dans les tableaux.
- Les données sont isolées par utilisateur via Row Level Security (RLS).
- Les montants sont affichés en FCFA.

## 5. Limites de cette première version

- Les liens de partage client, commentaires sur une vidéo, téléversement de médias et validation de livrables ne sont pas encore implémentés.
- Les factures sont suivies dans l'application, mais aucun PDF conforme ou envoi automatique n'est généré.
- Les métriques de campagnes sont saisies manuellement ; aucune connexion API à Meta ou LinkedIn n'est incluse.
- Cette application n'a pas fait l'objet d'un audit de sécurité indépendant. Testez-la avec des données fictives avant d'y stocker des données réelles.
- Les utilisateurs ne voient que leurs propres données ; un espace client partagé nécessitera une conception dédiée des permissions et des liens de partage.

## 6. Dépannage

- **« Tables manquantes »** : exécutez `supabase/schema.sql` dans le bon projet Supabase.
- **Connexion impossible** : vérifiez l'URL, la clé anon/public et les URL autorisées dans Authentication.
- **Inscription sans connexion immédiate** : si la confirmation d'e-mail est activée, ouvrez le message de confirmation reçu.
- **GitHub Pages affiche une erreur** : vérifiez que `index.html`, `site.css`, `config.js` et `app.js` sont à la racine du dépôt.
