# 🚀 Guide de Démarrage Rapide

## Option 1 : Avec Python (Recommandé)

```bash
cd C:\Users\ibensari\.gemini\antigravity\scratch\voyage-dz
python -m http.server 8000
```

Puis ouvrez : **http://localhost:8000**

## Option 2 : Avec PHP

```bash
cd C:\Users\ibensari\.gemini\antigravity\scratch\voyage-dz
php -S localhost:8000
```

Puis ouvrez : **http://localhost:8000**

## Option 3 : Sans Serveur (Limité)

Double-cliquez simplement sur **index.html**

⚠️ Note : Les fonctionnalités PWA ne fonctionneront pas sans serveur HTTP

## 📱 Tester sur Mobile

1. **Sur le même réseau WiFi**, trouvez votre IP locale :
   - Windows : `ipconfig` (cherchez IPv4)
   - Exemple : `192.168.1.100`

2. **Lancez le serveur** (Python ou PHP)

3. **Sur votre téléphone**, ouvrez :
   - `http://192.168.1.100:8000` (remplacez par votre IP)

4. **Installez l'app** :
   - Chrome : Menu ⋮ → "Ajouter à l'écran d'accueil"
   - Safari : Partager → "Sur l'écran d'accueil"

## ✅ Vérifications

- ✓ Page d'accueil s'affiche avec les 3 villes
- ✓ Navigation fonctionne (bottom nav)
- ✓ Recherche fonctionne
- ✓ Filtres fonctionnent (Tout, Logements, Activités, Tours)
- ✓ Détails des listings s'affichent
- ✓ Design responsive (mobile-first)

## 🎨 Générer les Icônes PNG

Ouvrez dans le navigateur : **icon-generator.html**

Téléchargez les icônes 192x192 et 512x512

## 🌐 Déploiement en Ligne (Gratuit)

### Netlify Drop
1. Allez sur [netlify.com/drop](https://app.netlify.com/drop)
2. Glissez-déposez le dossier `voyage-dz`
3. Obtenez une URL publique instantanée !

### GitHub Pages
1. Créez un repo GitHub
2. Uploadez tous les fichiers
3. Activez GitHub Pages dans Settings

### Vercel
1. Installez Vercel CLI : `npm i -g vercel`
2. Dans le dossier : `vercel`
3. Suivez les instructions

Bon voyage ! 🇩🇿
