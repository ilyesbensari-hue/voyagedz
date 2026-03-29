# 🔐 Guide de Test - Système de Login

## ✅ Système de Login Test Créé !

J'ai créé un fichier `auth.js` qui contient un **système de connexion qui fonctionne SANS Node.js**.

---

## 🎯 Comment tester MAINTENANT

### Étape 1 : Ajouter le fichier auth.js dans index.html

Ouvrez `index.html` et ajoutez cette ligne **avant** `<script src="app.js"></script>` :

```html
<script src="auth.js"></script>
<script src="app.js"></script>
```

### Étape 2 : Ajouter les boutons dans le header

Dans le `<header>`, remplacez la section `header-actions` par :

```html
<div class="header-actions">
    <span id="user-name-display" style="display: none; margin-right: 1rem; color: #fff; font-size: 0.9rem;"></span>
    
    <button class="btn-secondary" id="login-btn" onclick="authSystem.openLoginModal()">
        Connexion
    </button>
    
    <button class="btn-danger" id="logout-btn" onclick="authSystem.logout()" style="display: none;">
        Déconnexion
    </button>
    
    <button class="icon-btn" id="profile-btn" onclick="navigateTo('profile')">
        <div class="avatar">?</div>
    </button>
</div>
```

### Étape 3 : Ajouter la modale de login

Ajoutez ce code AVANT la fermeture `</main>` :

```html
<!-- Login Modal -->
<div id="login-modal" class="modal">
    <div class="modal-overlay" onclick="authSystem.closeLoginModal()"></div>
    <div class="modal-content">
        <div class="modal-header">
            <h3>🔐 Connexion</h3>
            <button class="close-btn" onclick="authSystem.closeLoginModal()">×</button>
        </div>
        <div class="modal-body">
            <form id="login-form">
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="login-email" placeholder="exemple@email.com" required>
                </div>
                <div class="form-group">
                    <label>Mot de passe</label>
                    <input type="password" id="login-password" placeholder="••••••••" required>
                </div>
                <button type="submit" class="btn-primary btn-full">
                    Se connecter
                </button>
            </form>
            
            <div class="test-accounts" style="margin-top: 2rem; padding: 1rem; background: var(--bg-light); border-radius: 8px;">
                <h4 style="margin-bottom: 1rem; font-size: 0.9rem;">📋 Comptes de test :</h4>
                <div style="font-size: 0.85rem; line-height: 1.6;">
                    <strong>👑 Admin :</strong> admin@voyagedz.com / admin123<br>
                    <strong>🏠 Hôte :</strong> host@voyagedz.com / host123<br>
                    <strong>👤 User :</strong> ismael@example.com / user123
                </div>
            </div>
        </div>
    </div>
</div>
```

### Étape 4 : Initialiser le système dans app.js

À la fin de la fonction `init()` dans `app.js`, ajoutez :

```javascript
function init() {
    renderCities();
    renderFeaturedListings();
    setupEventListeners();
    setupNavigation();
    checkHostStatus();
    setupBecomeHostForm();
    setupCreateListingForm();
    setupListingTypeChange();
    
    // AJOUTER CES LIGNES :
    authSystem.setupLoginForm();
    authSystem.updateAuthUI();
}
```

### Étape 5 : Ajouter les styles

Ajoutez ces styles dans `styles.css` :

```css
/* Notification */
.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    background: var(--bg-dark);
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    transform: translateY(-150%);
    transition: transform 0.3s ease;
    z-index: 10000;
}

.notification.show {
    transform: translateY(0);
}

.notification.success {
    background: var(--success);
}

.notification.error {
    background: var(--error);
}

.notification.info {
    background: var(--primary);
}

/* Buttons */
.btn-secondary {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-secondary:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.5);
}

.btn-danger {
    background: var(--error);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-danger:hover {
    background: #c72a2a;
}
```

---

## 🎮 Comment tester

1. **Ouvrez index.html** dans votre navigateur
2. **Cliquez sur "Connexion"** en haut à droite
3. **Testez les 3 comptes** :

### 👑 **Admin** (admin@voyagedz.com / admin123)
- Peut tout faire
- Accès complet à toutes les fonctionnalités

### 🏠 **Hôte** (host@voyagedz.com / host123)
- Peut créer des annonces
- A accès au dashboard hôte
- Menu "Mes annonces" apparaît

### 👤 **User** (ismael@example.com / user123)
- Utilisateur normal
- Peut réserver, favoris, avis
- Peut devenir hôte

---

## 📱 Ce que vous verrez

### Quand vous êtes **déconnecté** :
- ✅ Bouton "Connexion" visible
- ❌ Bouton "Déconnexion" caché
- Avatar avec "?"

### Quand vous êtes **connecté** :
- ❌ Bouton "Connexion" caché
- ✅ Bouton "Déconnexion" visible
- ✅ Nom d'utilisateur affiché
- ✅ Avatar avec initiales

---

## 🔄 Pour ajouter le bouton Maps et améliorer le paiement

### Bouton "Voir sur Maps"

Dans `app.js`, modifiez la fonction `showDetail()` pour ajouter après la localisation :

```javascript
\u003cdiv class=\"detail-location\"\u003e
    \u003csvg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"\u003e
        \u003cpath d=\"M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z\"/\u003e
        \u003ccircle cx=\"12\" cy=\"10\" r=\"3\"/\u003e
    \u003c/svg\u003e
    \u003cspan\u003e${currentListing.location}\u003c/span\u003e
    \u003ca href=\"https://www.google.com/maps/search/?api=1\u0026query=${encodeURIComponent(currentListing.location)}\" 
       target=\"_blank\" 
       class=\"btn-map\" 
       style=\"margin-left: 0.5rem; color: var(--primary); text-decoration: none;\"\u003e
        📍 Voir sur Maps
    \u003c/a\u003e
\u003c/div\u003e
```

### Améliorer l'affichage des prix dans le paiement

Le prix est déjà affiché ! Vérifiez la section "booking-summary" dans la fonction `openPaymentModal()`.

---

## ✅ Résumé

Fichiers à modifier :
1. ✅ **auth.js** - Déjà créé
2. ⚠️ **index.html** - Ajouter `<script src="auth.js"></script>`, boutons, et modale
3. ⚠️ **app.js** - Ajouter `authSystem.setupLoginForm()` et `authSystem.updateAuthUI()`
4. ⚠️ **styles.css** - Ajouter les styles notification et boutons

Voulez-vous que je crée les fichiers modifiés complets ?
