# Backend - Instructions de Démarrage

Pour faire fonctionner la connexion Sociale (Google/Facebook) et le système Backend, suivez ces étapes :

## 1. Pré-requis
Assurez-vous d'avoir [Node.js](https://nodejs.org/) installé sur votre machine.

## 2. Installation
Ouvrez un terminal dans le dossier `backend` :
```bash
cd backend
npm install
```

## 3. Configuration
1. Copiez le fichier d'exemple :
   ```bash
   cp .env.example .env
   ```
2. Ouvrez `.env` et ajoutez vos clés API Google et Facebook si vous les avez. Sinon, la redirection fonctionnera mais l'authentification échouera chez Google/Facebook.

## 4. Initialisation de la Base de Données
```bash
node init-db.js
```

## 5. Démarrage
```bash
node server.js
```
Le serveur démarrera sur `http://localhost:3000`.

## 6. Utilisation
Ouvrez votre navigateur sur `http://localhost:3000` (et non plus sur le fichier index.html direct).
La connexion via Google/Facebook est maintenant activée !
