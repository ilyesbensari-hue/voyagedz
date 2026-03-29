# 🧪 Guide de Test - Système de Réservation

## ✅ Pré-requis

Assurez-vous que Docker est lancé :
```powershell
docker-compose ps
```

Vous devriez voir :
- ✅ `voyage-dz-frontend` - Up (healthy)
- ✅ `voyage-dz-backend` - Up (healthy)

---

## 🎯 Test 1 : Utilisateur NON Connecté (Message d'Erreur)

### Étapes :

1. **Ouvrir l'application**
   - URL : http://localhost:8080
   - Attendez que la page charge complètement

2. **Sélectionner un listing**
   - Faites défiler vers le bas
   - Cliquez sur n'importe quelle carte de listing

3. **Sélectionner des dates**
   - Cherchez le champ "Sélectionner les dates"
   - Cliquez dessus pour ouvrir le calendrier
   - Sélectionnez une date de départ (demain ou après)
   - Sélectionnez une date de retour (2-3 jours après)

4. **Observer le bouton de réservation**
   - Le bouton devrait afficher : **"🔒 Réserver maintenant"**
   - L'opacité devrait être plus faible (0.7)
   - Le cadenas 🔒 indique qu'il faut se connecter

5. **Cliquer sur "Réserver maintenant"**
   - Un modal doit s'afficher avec :
     - Titre : "🔒 Connexion requise"
     - Message : "Vous devez être connecté pour réserver..."
     - Bouton "Se connecter"

### ✅ Résultat attendu :
- **Le message d'erreur s'affiche clairement**
- Vous savez pourquoi la réservation ne fonctionne pas
- Vous avez un bouton pour vous connecter

---

## 🎯 Test 2 : Utilisateur Connecté (Réservation Réussie)

### Étapes :

1. **Se connecter**
   - Cliquez sur "Connexion" dans le header
   - Email : `ismael@example.com`
   - Mot de passe : `user123`
   - Cliquez "Se connecter"

2. **Sélectionner un listing**
   - Retournez à l'accueil
   - Cliquez sur un listing

3. **Sélectionner des dates**
   - Ouvrez le calendrier
   - Sélectionnez des dates (ex : 20 déc → 28 déc)

4. **Observer le bouton**
   - Le bouton devrait afficher : **"Réserver maintenant"** (SANS cadenas 🔒)
   - L'opacité devrait être normale (1.0)
   - Une petite animation "pulse" doit apparaître

5. **Cliquer sur "Réserver maintenant"**
   - Un modal de confirmation doit s'afficher avec :
     - Titre : "🎉 Réservation confirmée !"
     - Code de confirmation (ex : VDZ-582309)
     - Récapitulatif (hébergement, dates, prix)
     - Boutons "Fermer" et "Voir mes réservations"

6. **Vérifier la réservation**
   - Cliquez sur "Voir mes réservations"
   - Vous devriez être redirigé vers la page "Mes Réservations"
   - Votre réservation doit apparaître avec :
     - Code de confirmation
     - Dates
     - Prix total
     - Statut "Confirmé"

### ✅ Résultat attendu :
- **Modal de succès affiché**
- **Réservation enregistrée**
- **Visible dans "Mes Réservations"**

---

## 🎯 Test 3 : Dates Non Sélectionnées

### Étapes :

1. **Connecté, ouvrir un listing**
2. **NE PAS sélectionner de dates**
3. **Observer le bouton**
   - Le bouton devrait être grisé (disabled)
   - Impossible de cliquer

### ✅ Résultat attendu :
- Bouton désactivé tant que dates non sélectionnées

---

## 📸 Captures à Faire

Si vous voulez partager des captures d'écran :

1. **Modal d'erreur (non connecté)** : Montrant "Connexion requise"
2. **Bouton avec cadenas** : Montrant "🔒 Réserver maintenant"
3. **Modal de succès** : Montrant "Réservation confirmée !"
4. **Page Mes Réservations** : Montrant la réservation créée

---

## 🐛 Dépannage

### Le site ne charge pas (localhost:8080)

```powershell
# Vérifier les conteneurs
docker-compose ps

# Voir les logs
docker-compose logs frontend
docker-compose logs backend

# Redémarrer
docker-compose down
docker-compose up -d
```

### Le bouton ne change pas

- Vérifiez la console du navigateur (F12)
- Rechargez la page (Ctrl+F5)
- Vérifiez que `booking-system.js` est bien chargé

### Les dates ne se sélectionnent pas

- Cliquez bien dans l'input du calendrier
- Le popup Flatpickr doit s'ouvrir
- Sélectionnez deux dates différentes

---

## ✅ Checklist Complète

- [ ] Site accessible sur http://localhost:8080
- [ ] Conteneurs Docker en cours d'exécution
- [ ] Listing s'ouvre correctement
- [ ] Calendrier fonctionne (sélection de dates)
- [ ] **Bouton avec cadenas 🔒 quand NON connecté**
- [ ] **Modal "Connexion requise" s'affiche au clic**
- [ ] Connexion fonctionne
- [ ] **Bouton SANS cadenas quand connecté**
- [ ] **Modal "Réservation confirmée !" s'affiche**
- [ ] **Code de confirmation généré**
- [ ] **Réservation visible dans "Mes Réservations"**

---

**Si tout fonctionne → ✅ Le système est opérationnel !**
