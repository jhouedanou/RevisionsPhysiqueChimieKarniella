# 🚀 Guide de Déploiement sur Vercel

Ce guide vous explique comment déployer votre application Révisions Karniella sur Vercel.

## 📋 Prérequis

- Un compte GitHub
- Un compte Vercel (gratuit)
- Git installé sur votre ordinateur

## 🔧 Étape 1 : Préparer le Projet

Les fichiers de configuration nécessaires ont déjà été créés :
- ✅ `vercel.json` - Configuration de déploiement
- ✅ `.vercelignore` - Fichiers à exclure du déploiement
- ✅ `package.json` - Avec script build

## 📤 Étape 2 : Pousser sur GitHub

Si ce n'est pas déjà fait, créez un repository GitHub et poussez votre code :

```bash
# Si le dépôt n'est pas encore créé sur GitHub
git add .
git commit -m "Configuration pour déploiement Vercel"
git branch -M main
git remote add origin https://github.com/VOTRE-USERNAME/VOTRE-REPO.git
git push -u origin main
```

Si le dépôt existe déjà :

```bash
git add .
git commit -m "Configuration pour déploiement Vercel"
git push
```

## 🌐 Étape 3 : Déployer sur Vercel

### Option A : Via l'Interface Web (Recommandé)

1. **Connexion à Vercel**
   - Aller sur [https://vercel.com](https://vercel.com)
   - Se connecter avec votre compte GitHub

2. **Importer le Projet**
   - Cliquer sur "Add New Project"
   - Sélectionner "Import Git Repository"
   - Choisir votre repository GitHub

3. **Configuration du Projet**
   - **Project Name** : `revisions-karniella` (ou votre choix)
   - **Framework Preset** : Other
   - **Build Command** : Laisser vide ou `npm run build`
   - **Output Directory** : Laisser vide
   - **Install Command** : `npm install`

4. **Variables d'Environnement** (optionnel)
   - Vous pouvez ajouter des variables si nécessaire
   - Exemple : `NODE_ENV=production`

5. **Déployer**
   - Cliquer sur "Deploy"
   - Attendre quelques minutes le déploiement

### Option B : Via CLI Vercel

1. **Installer Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Se connecter**
   ```bash
   vercel login
   ```

3. **Déployer**
   ```bash
   vercel
   ```
   
   Suivre les instructions :
   - Set up and deploy? `Y`
   - Which scope? Choisir votre compte
   - Link to existing project? `N`
   - Project name? `revisions-karniella`
   - In which directory? `./`
   - Override settings? `N`

4. **Déployer en Production**
   ```bash
   vercel --prod
   ```

## 🔒 Étape 4 : Configuration Post-Déploiement

### Sécuriser l'Application

⚠️ **Important** : Pour un déploiement en production, il est recommandé de :

1. **Changer les identifiants admin** dans `routes/auth.js`
2. **Utiliser des variables d'environnement** pour les secrets
3. **Activer HTTPS** (automatique sur Vercel)

### Variables d'Environnement Recommandées

Dans les paramètres Vercel de votre projet :

```
ADMIN_USERNAME=votre-nouveau-username
ADMIN_PASSWORD=votre-mot-de-passe-securise
SESSION_SECRET=une-cle-secrete-aleatoire-longue
NODE_ENV=production
```

## 📝 Étape 5 : Accéder à votre Site

Après déploiement, Vercel vous donnera une URL :
- **URL de production** : `https://revisions-karniella.vercel.app`
- **Page admin** : `https://revisions-karniella.vercel.app/admin/login.html`

## 🔄 Mises à Jour Automatiques

Une fois configuré, chaque fois que vous poussez du code sur GitHub :
```bash
git add .
git commit -m "Votre message"
git push
```

Vercel déploiera automatiquement les changements ! 🎉

## 🐛 Dépannage

### Le site ne charge pas
- Vérifier les logs dans le dashboard Vercel
- S'assurer que toutes les dépendances sont dans `package.json`

### Les fichiers JSON ne se mettent pas à jour
- Vercel utilise un système de fichiers en lecture seule
- Pour persister les données, il faudra utiliser une base de données externe (MongoDB, PostgreSQL, etc.)

### Erreur 404
- Vérifier que `vercel.json` est bien présent
- Vérifier les routes dans la configuration

## 📚 Ressources

- [Documentation Vercel](https://vercel.com/docs)
- [Déployer Node.js sur Vercel](https://vercel.com/docs/frameworks/nodejs)
- [Variables d'environnement](https://vercel.com/docs/projects/environment-variables)

## ⚠️ Note Importante sur la Persistance des Données

Vercel utilise un environnement **serverless** et les fichiers sont en **lecture seule**.

**Cela signifie** :
- ✅ Le site fonctionnera parfaitement
- ✅ Les utilisateurs peuvent consulter les leçons et quiz
- ❌ Les modifications via l'admin **ne seront pas sauvegardées**

### Solutions pour la Persistance

Pour que l'admin puisse modifier les données, vous aurez besoin d'une base de données externe :

1. **MongoDB Atlas** (gratuit)
2. **Vercel Postgres** (gratuit avec limites)
3. **Supabase** (gratuit)
4. **Firebase Firestore** (gratuit)

Souhaitez-vous que je vous aide à intégrer une de ces solutions ?

---

**Auteur** : Configuration Vercel pour Karniella 💕
**Version** : 1.0.0
