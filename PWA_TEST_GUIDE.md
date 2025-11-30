# 📱 Guide de Test PWA - Révisions Karniella

## Vérifications Rapides

### ✅ Fichiers Créés
- [x] `manifest.json` - Configuration PWA
- [x] `sw.js` - Service Worker avec cache
- [x] `icons/` - Icônes (SVG + PNG placeholders)
- [x] `js/pwa-install.js` - Gestionnaire d'installation
- [x] Meta tags PWA dans `index.html`

---

## Comment Tester

### 1. Tester en Local (Localhost)

```bash
# Démarrer le serveur
npm start

# Ouvrir dans Chrome
# http://localhost:3000
```

**Dans Chrome DevTools (F12)** :
- **Application** → **Manifest** : Vérifier les infos PWA
- **Application** → **Service Workers** : Vérifier qu'il est enregistré
- **Application** → **Storage** → **Cache Storage** : Voir les fichiers mis en cache

---

### 2. Test d'Installation (Desktop)

1. Ouvrir `http://localhost:3000` dans Chrome
2. Regarder en haut à droite de la barre d'adresse
3. Chercher l'icône ⊕ "Installer"
4. Cliquer et installer
5. L'app s'ouvre dans une fenêtre standalone

**Désinstaller** :
- Chrome : Trois points → Plus d'outils → Supprimer

---

### 3. Test Hors Ligne

1. Charger `http://localhost:3000`
2. Naviguer dans quelques leçons
3. **Chrome DevTools** → **Network** → Cocher "Offline"
4. Rafraîchir la page (F5)
5. ✅ La page devrait se charger depuis le cache

**Ou avec mode avion** :
1. Charger le site
2. Activer le mode avion
3. Naviguer → ça marche !

---

### 4. Test sur Mobile

#### Option A : Tunnel ngrok (pour test sur vrai mobile)

```bash
# Installer ngrok
brew install ngrok  # Mac
# ou télécharger sur https://ngrok.com

# Démarrer le serveur
npm start

# Dans un autre terminal, créer un tunnel
ngrok http 3000

# Utiliser l'URL HTTPS fournie (ex: https://abc123.ngrok.io)
```

#### Option B : Même réseau WiFi

```bash
# Trouver votre IP locale
ifconfig | grep "inet "  # Mac/Linux
ipconfig                  # Windows

# Exemple IP: 192.168.1.10
# Sur mobile : http://192.168.1.10:3000
```

**Sur mobile** :
1. Chrome Android :
   - Menu → "Ajouter à l'écran d'accueil"
2. Safari iOS :
   - Partager → "Sur l'écran d'accueil"

---

### 5. Test Lighthouse (Score PWA)

1. Chrome DevTools → **Lighthouse**
2. Cocher "Progressive Web App"
3. Cliquer "Generate report"
4. **Objectif** : Score ≥ 90/100

**Critères importants** :
- ✅ Manifest valide
- ✅ Service Worker enregistré
- ✅ HTTPS (ou localhost)
- ✅ Icônes 192x192 et 512x512
- ✅ Responsive design

---

## Déploiement sur Vercel

Une fois déployé sur Vercel, tout fonctionnera automatiquement car :
- ✅ HTTPS automatique
- ✅ Service Worker supporté
- ✅ Manifest servi correctement

```bash
# Pousser sur GitHub
git add .
git commit -m "Add PWA support"
git push

# Vercel déploie automatiquement
```

**Tester en production** :
```
https://votre-app.vercel.app
```

---

## Icônes PNG - À Améliorer

Les icônes actuelles sont des **placeholders SVG**.

### Pour générer de vraies icônes PNG :

#### Option 1 : En ligne (Recommandé)
1. Aller sur https://realfavicongenerator.net/
2. Uploader `icons/icon.svg`
3. Télécharger le package
4. Extraire dans `/icons/`

#### Option 2 : ImageMagick
```bash
cd icons
chmod +x generate-placeholder-icons.sh
# Puis suivre les instructions dans README.md
```

#### Option 3 : Créer manuellement
Créer 8 fichiers PNG dans `/icons/` :
- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png ← OBLIGATOIRE
- icon-384x384.png
- icon-512x512.png ← OBLIGATOIRE

---

## Troubleshooting

### Service Worker ne s'installe pas
- Vérifier console Chrome (F12)
- Vérifier que `/sw.js` est accessible
- Hard refresh : Ctrl+Shift+R (Cmd+Shift+R sur Mac)

### Manifest non détecté
- Vérifier `/manifest.json` est valide (JSON validator)
- URL du manifest dans `<head>` correcte
- Refresh cache navigateur

### Installation ne s'affiche pas
- Vérifier HTTPS (ou localhost)
- Vérifier icônes 192x192 et 512x512 existent
- Fermer/rouvrir le navigateur

### Cache ne se met pas à jour
- `sw.js` ligne 4 : changer `CACHE_NAME` version
- Application → Service Workers → "Update on reload"
- "Skip waiting" pour forcer la mise à jour

---

## Prochaines Améliorations

- [ ] Améliorer les icônes PNG (design professionnel)
- [ ] Ajouter bouton d'installation custom dans l'UI
- [ ] Notifications push (optionnel)
- [ ] Sync en arrière-plan (optionnel)
- [ ] Analytics d'installation

---

**La PWA est prête à être testée ! 🎉**

Testez en local, puis déployez sur Vercel pour un test complet HTTPS.
