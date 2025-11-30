# 📚 Révisions Karniella - CMS JSON

Site de révisions scolaires avec système de gestion de contenu (CMS) pour créer et modifier facilement les leçons et quiz.

## 🚀 Installation et Démarrage

### Prérequis
- Node.js (version 14 ou supérieure)
- npm (installé avec Node.js)

### Installation

1. Ouvrir un terminal dans le dossier du projet

2. Installer les dépendances :
```bash
npm install
```

3. Démarrer le serveur :
```bash
npm start
```

Le serveur démarrera sur `http://localhost:3000`

## 🌐 Accès au Site

- **Site public** : http://localhost:3000
- **Interface admin** : http://localhost:3000/admin/login.html

### Identifiants Admin
- **Username** : `karniella`
- **Password** : `houedanou`

## 📁 Structure du Projet

```
RevisionsPhysiqueChimieKarniella/
├── data/                    # Fichiers JSON contenant les données
│   ├── subjects.json       # Matières
│   ├── lessons.json        # Leçons
│   └── quizzes.json        # Quiz et questions
├── admin/                   # Interface d'administration
│   ├── login.html          # Page de connexion
│   ├── dashboard.html      # Dashboard admin
│   ├── css/
│   │   └── admin.css       # Styles admin
│   └── js/
│       └── admin.js        # Logique admin
├── routes/                  # Routes API
│   ├── auth.js             # Authentification
│   └── api.js              # Endpoints CRUD
├── utils/                   # Utilitaires
│   └── dataManager.js      # Gestion des fichiers JSON
├── server.js               # Serveur Express principal
├── package.json            # Configuration npm
└── *.html                  # Pages publiques du site
```

## 🎨 Fonctionnalités

### Interface Admin
- ✅ Authentification sécurisée
- ✅ Gestion des matières (CRUD)
- ✅ Gestion des leçons (CRUD)
- ✅ Gestion des quiz (CRUD)
- ✅ Éditeur de questions avec options multiples
- ✅ Activation/désactivation des contenus

### Site Public
- ✅ Affichage dynamique des matières
- ✅ Navigation par matière
- ✅ Leçons interactives
- ✅ Quiz avec correction automatique
- ✅ Design rose personnalisé

## 🔧 Utilisation de l'Admin

### Ajouter une Matière
1. Connexion à l'admin
2. Onglet "Matières"
3. Cliquer sur "+ Ajouter une matière"
4. Remplir le formulaire (nom, icône emoji, description)
5. Enregistrer

### Ajouter une Leçon
1. Onglet "Leçons"
2. Cliquer sur "+ Ajouter une leçon"
3. Sélectionner la matière
4. Remplir les informations (titre, description, URL)
5. Enregistrer

### Créer un Quiz
1. Onglet "Quiz"
2. Cliquer sur "+ Ajouter un quiz"
3. Sélectionner la matière et leçon associée
4. Ajouter des questions avec "+ Ajouter une question"
5. Pour chaque question :
   - Saisir le texte de la question
   - Ajouter 4 options de réponse
   - Cocher la bonne réponse
   - Ajouter une explication (optionnel)
6. Enregistrer

## 📝 Format des Données JSON

### subjects.json
```json
{
  "subjects": [
    {
      "id": "mathematiques",
      "icon": "🔢",
      "name": "Mathématiques",
      "description": "Description...",
      "order": 1,
      "isActive": true,
      "url": "mathematiques.html"
    }
  ]
}
```

### lessons.json
```json
{
  "lessons": [
    {
      "id": "lesson-id",
      "subjectId": "mathematiques",
      "title": "Titre de la leçon",
      "icon": "📐",
      "description": "Description...",
      "url": "ma-lecon.html",
      "order": 1,
      "isActive": true,
      "hasQuiz": false
    }
  ]
}
```

### quizzes.json
```json
{
  "quizzes": [
    {
      "id": "quiz-id",
      "subjectId": "physique",
      "lessonId": "lesson-id",
      "title": "Titre du quiz",
      "description": "Description...",
      "icon": "🎓",
      "isActive": true,
      "questions": [
        {
          "id": 1,
          "text": "Question ?",
          "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
          "correctAnswer": 0,
          "explanation": "Explication..."
        }
      ]
    }
  ]
}
```

## 🔒 Sécurité

⚠️ **Important** : Ce système utilise une authentification basique adaptée pour un usage personnel/familial. Pour un déploiement en production publique, il est recommandé d'ajouter :
- Hachage des mots de passe
- HTTPS
- Tokens JWT
- Protection CSRF
- Limitation du taux de requêtes

## 🛠️ Développement

### Mode développement avec auto-reload
```bash
npm run dev
```

### Scripts disponibles
- `npm start` : Démarre le serveur
- `npm run dev` : Mode développement avec nodemon

## 📞 Support

Pour toute question ou problème :
1. Vérifier que le serveur est bien démarré
2. Vérifier les logs dans le terminal
3. S'assurer que le port 3000 est disponible

## 🎀 Design

Le site conserve le thème rose original avec :
- Gradient rose (#FFB6D9, #FF69B4, #FFE5F0)
- Police Comic Sans MS
- Animations douces
- Interface ludique et attractive

---

**Auteur** : Créé pour Karniella 💕
**Version** : 1.0.0
