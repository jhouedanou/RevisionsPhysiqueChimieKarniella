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
- `npm run build:chat` : Régénère la base de connaissances de l'assistant

## 🐴 Assistant de révision

Un chat flottant est présent sur les 60 pages (`js/chat-assistant.js`). Il répond
en fonction de **la page où se trouve Karniella**, en trois niveaux :

1. **Les notions de la page courante** — instantané, hors-ligne, gratuit.
2. **La base générale** en dur dans `js/chat-assistant.js`.
3. **L'API Claude** (`POST /api/chat`) — seulement si 1 et 2 n'ont rien trouvé
   *et* qu'il y a du réseau. Facultatif : sans clé API, le chat fonctionne
   simplement sans ce niveau.

### Régénérer la base après avoir modifié une leçon

```bash
npm run build:chat
```

Le script lit les pages HTML, `data/quizzes.json` et `data/section-questions.json`,
puis écrit :

| Fichier | Rôle |
|---|---|
| `js/chat-knowledge-index.js` | Index de toutes les pages (titres des notions) |
| `data/chat/<slug>.json` | Détail d'une page : textes des notions + quiz |

**Ces fichiers sont générés — ne pas les éditer à la main.** Ils sont committés
car Vercel sert le site en statique, sans étape de build.

⚠️ Après régénération, **incrémenter `CACHE_NAME` dans `sw.js`** (`karniella-cache-v8`
→ `v9`, …). Sans ça, les utilisateurs ayant installé la PWA gardent l'ancienne
version : les fichiers `/js/` sont servis en cache-first.

### Activer le repli IA

Copier `.env.example` vers `.env` et renseigner `ANTHROPIC_API_KEY`
(sur Vercel : variable d'environnement du projet).

`CHAT_MODEL` permet de changer de modèle — `claude-opus-5` par défaut,
`claude-haiku-4-5` pour un coût nettement plus bas.

Le navigateur n'envoie que le **slug** de la page, jamais son contenu : le
contexte donné au modèle est relu côté serveur depuis `data/chat/`.

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
