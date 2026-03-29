# 🔐 Guide de Connexion - Voyage DZ

## 📌 Problème Actuel

**Node.js n'est pas installé**, donc le système de connexion avec base de données ne fonctionne pas encore.

## ✅ Solution Temporaire

Pour l'instant, l'application fonctionne avec l'ancien système `data.js` qui n'a PAS de login obligatoire.

---

## 🎯 Comment tester l'application MAINTENANT (sans Node.js)

### 1. **Ouvrir l'application**
- Double-cliquez sur `index.html` OU
- Cliquez droit → "Open with Live Server" (VS Code)

### 2. **Explorer les fonctionnalités**
✅ Voir les villes (Alger, Oran, Tlemcen)  
✅ Explorer les logements et activités  
✅ Ajouter aux favoris  
✅ Voir les détails d'une annonce  
❌ Login (ne fonctionne pas sans Node.js)  
❌ Paiement (fonctionne mais non persistant)  
❌ Devenir hôte  (ne fonctionne pas sans Node.js)

---

## 🚀 Comment activer le LOGIN + ADMIN (avec Node.js)

### Étape 1 : Installer Node.js

1. **Télécharger** : https://nodejs.org/
2. **Choisir** : Version LTS (recommandée)
3. **Installer** : Suivre les instructions
4. **Redémarrer** : VS Code et/ou votre terminal

### Étape 2 : Vérifier l'installation

```powershell
node --version
npm --version
```

Vous devriez voir :
```
v20.x.x
10.x.x
```

### Étape 3 : Installer le backend

```powershell
cd backend
npm install
```

### Étape 4 : Créer la base de données

```powershell
npm run init-db
```

Cela va créer **3 comptes automatiquement** :

| Type | Email | Mot de passe | Rôle |
|------|-------|--------------|------|
| 👤 **Admin** | admin@voyagedz.com | admin123 | Admin + Hôte |
| 🏠 **Hôte** | host@voyagedz.com | host123 | User + Hôte |
| 👥 **User** | ismael@example.com | user123 | User simple |

### Étape 5 : Lancer le serveur

```powershell
npm start
```

Le serveur démarre sur **http://localhost:3000**

### Étape 6 : Ouvrir l'application

- Ouvrez `index.html` dans le navigateur
- Le frontend se connectera automatiquement au backend

---

## 🎭 Différences par rôle

### 👤 **Admin** (admin@voyagedz.com)
✅ Peut tout faire  
✅ Gérer toutes les annonces  
✅ Accès complet  

### 🏠 **Hôte** (host@voyagedz.com)
✅ Créer des annonces (hébergements ou activités)  
✅ Gérer ses propres annonces  
✅ Voir les réservations reçues  
✅ Statistiques de revenus  

### 👥 **User** (ismael@example.com)
✅ Réserver des annonces  
✅ Mettre en favoris  
✅ Laisser des avis  
✅ Devenir hôte (après inscription)  

---

## 🖼️ Où est le bouton de LOGIN ?

### Dans l'application actuelle (sans backend)
Il n'y a PAS de bouton login visible car l'app utilise `data.js` (mode démo).

### Avec le backend Node.js activé
1. En haut à droite : **Bouton "Connexion"**
2. Click dessus → Formulaire de login apparaît
3. Entrez email + mot de passe
4. Vous êtes connecté !

---

## 💰 Le système de paiement

### Actuellement (sans backend)
- ✅ La modal de paiement s'affiche
- ✅ Vous pouvez choisir : Dahabia, CIB, Visa
- ❌ Mais la réservation n'est pas sauvegardée

### Avec backend Node.js
- ✅ La modal de paiement s'affiche
- ✅ Vous choisissez le moyen de paiement
- ✅ La réservation est sauvegardée en base de données
- ✅ Vous recevez un code de confirmation (ex: VDZ-A1B2C3)
- ✅ Vous pouvez voir vos réservations dans "Profil → Mes réservations"

---

## ⚠️ Erreurs Courantes

### "Le terme 'node' n'est pas reconnu"
❌ **Node.js n'est pas installé**  
✅ **Solution** : Installer Node.js depuis https://nodejs.org/

### "Cannot GET /api/..."
❌ **Le backend n'est pas lancé**  
✅ **Solution** : `cd backend` puis `npm start`

### "Network Error"
❌ **Le frontend ne trouve pas le backend**  
✅ **Solution** : Vérifier que le serveur tourne sur http://localhost:3000

### "Token invalide"
❌ **Session expirée**  
✅ **Solution** : Se déconnecter puis se reconnecter

---

## 📞 Besoin d'aide ?

1. **Installer Node.js** : https://nodejs.org/
2. **Redémarrer** : VS Code après installation
3. **Vérifier** : `node --version` dans le terminal
4. **Continuer** : Les étapes ci-dessus

---

## 🎯 Récapitulatif

| Fonctionnalité | Sans Node.js | Avec Node.js |
|----------------|--------------|--------------|
| Voir les annonces | ✅ | ✅ |
| Rechercher | ✅ | ✅ |
| Favoris | ✅ (session) | ✅ (persistant) |
| **Login** | ❌ | ✅ |
| **Paiement** | ⚠️ (temporaire) | ✅ (persistant) |
| **Admin** | ❌ | ✅ |
| **Hôte** | ❌ | ✅ |
| Créer annonces | ❌ | ✅ (hôtes seulement) |

---

**🚀 Installez Node.js pour débloquer toutes les fonctionnalités !**

📥 **Téléchargement** : https://nodejs.org/
