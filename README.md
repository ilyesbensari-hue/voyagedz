# Voyage DZ - Guide d'installation et de démarrage

Bienvenue dans la nouvelle version de **Voyage DZ** avec un véritable backend Node.js !

Ce guide vous aidera à installer les prérequis et à lancer l'application complète (Frontend + Backend).

## 1. Prérequis

Vous devez installer **Node.js** (version LTS recommandée) sur votre machine.
1. Allez sur [nodejs.org](https://nodejs.org/).
2. Téléchargez la version **LTS** (Long Term Support).
3. Installez-la en suivant les instructions par défaut.
4. Une fois installé, redémarrez votre terminal (ou VS Code).

Pour vérifier l'installation, ouvrez un terminal et tapez :
```bash
node --version
npm --version
```

## 2. Installation du Backend

Le backend gère la base de données, l'authentification et les données de l'application.

1. Ouvrez un terminal dans le dossier du projet `voyage-dz`.
2. Naviguez vers le dossier `backend` :
   ```bash
   cd backend
   ```
3. Installez les dépendances :
   ```bash
   npm install
   ```
4. Initialisez la base de données (crée les tables et ajoute des données de test) :
   ```bash
   node init-db.js
   ```

## 3. Démarrage du Serveur

Toujours dans le dossier `backend`, lancez le serveur :
```bash
npm start
```
Le serveur démarrera sur `http://localhost:3000`. Vous devriez voir :
> Serveur démarré sur le port 3000

## 4. Utilisation de l'Application

1. Ouvrez le fichier `index.html` dans votre navigateur (ou utilisez une extension comme "Live Server" dans VS Code).
2. L'application se connectera automatiquement au backend local.

### Comptes de Démonstration

Vous pouvez utiliser ces comptes pour tester :

- **Utilisateur standard** :
  - Email : `ismael@example.com`
  - Mot de passe : `user123`

- **Hôte (déjà inscrit)** :
  - Email : `host@voyagedz.com`
  - Mot de passe : `host123`

- **Admin** :
  - Email : `admin@voyagedz.com`
  - Mot de passe : `admin123`

### Nouvelles Fonctionnalités "Hôte"

1. Connectez-vous ou créez un compte.
2. Allez dans l'onglet **Profil**.
3. Cliquez sur **"Devenir Hôte"** et remplissez le formulaire.
4. Une fois hôte, un nouveau menu **"Mes annonces"** apparaîtra.
5. Vous pourrez y créer, modifier et supprimer vos propres annonces de logements ou d'activités.

## Dépannage

- **Erreur de connexion** : Vérifiez que le serveur backend tourne bien dans un terminal (`npm start`).
- **Images manquantes** : Assurez-vous que le dossier `backend/uploads` existe (il est créé automatiquement).

Bon voyage avec Voyage DZ ! 🇩🇿
