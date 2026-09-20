# 📚 Révisions Karniella — Classe de 5<sup>e</sup>

> **Année en cours : 5<sup>e</sup>.** Le site ne propose que le programme de 5<sup>e</sup>.
> Les ~58 pages de 6<sup>e</sup> restent dans le dépôt à la racine, mais plus rien ne les
> référence : ni l'accueil, ni le chat, ni le service worker. Pour les remettre en
> ligne, il suffirait de les réintégrer au programme.


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
- `npm run build:programme` : Régénère les sommaires de 5<sup>e</sup> et l'accueil
- `npm run build:chat` : Régénère la base de connaissances de l'assistant
- `npm run build:all` : Les deux, dans le bon ordre

## 🎒 Le programme de 5<sup>e</sup>

Tout part de **`data/programme-5e.json`** : c'est la source unique. Huit matières —
Anglais, Physique-Chimie, Mathématiques, SVT, Français, Histoire-Géographie, EDHC, TICE.

| Fichier | Rôle | Généré ? |
|---|---|---|
| `data/programme-5e.json` | Les matières et leurs leçons | non — **c'est ici qu'on écrit** |
| `5e/<matiere>.html` | Sommaire d'une matière | oui |
| `5e/<lecon>.html` | Une leçon | non — écrite à la main |
| `index.html` (2 blocs entre marqueurs) | Catalogue + programme de l'accueil | oui |

### Ajouter une leçon

1. Écrire la page dans `5e/<slug>.html`. Partir d'une leçon existante :
   elles chargent `css/lecon-5e.css` et `js/lecon-5e.js`, et n'ont **aucun style
   propre** (contrairement aux pages de 6<sup>e</sup>, qui embarquaient chacune
   ~320 lignes de CSS recopié).
2. Ajouter son entrée dans `lecons` de la bonne matière, avec `"statut": "prete"`.
3. Pour un quiz : ajouter les questions dans `data/section-questions.json` sous la
   clé `<slug>`, dans `tab3`. Le chat les reprend automatiquement pour son mode
   « Interroge-moi », et le score alimente le suivi des progrès.
4. `npm run build:all`
5. **Incrémenter `CACHE_NAME` dans `sw.js`** (`v10` → `v11`, …).

Une leçon annoncée `"prete"` dont la page n'existe pas est signalée par le
générateur — pas de lien mort sur un sommaire.

### Conventions des pages de 5<sup>e</sup>

- Onglets : `<button class="tab-button" data-onglet="tab2">` — `js/lecon-5e.js`
  branche les clics tout seul, plus de `onclick` à écrire.
- Encadrés : `.definition-box`, `.example-box`, `.important-box`, `.note-box`.
- Vocabulaire : `<table class="table-vocab">`. **Chaque ligne devient une notion
  cherchable par le chat** — « what is a canteen ? » trouve sa réponse.
- `data-hors-chat` sur un encadré : il s'affiche sur la page mais le chat l'ignore.
  À mettre sur les notes qui s'adressent à Karniella (« à compléter depuis ton
  cahier »), pas sur le contenu du cours.
- `<span class="a-completer">…</span>` : surligne un passage illisible sur la
  photo du cahier, pour qu'elle le recopie.

## 🐴 Assistant de révision

Un chat flottant est présent sur toutes les pages de 5<sup>e</sup> (`js/chat-assistant.js`). Quatre boutons :
**📝 Fiche de révision**, **🧮 Aide sur un exercice**, **🎯 Interroge-moi** et **📊 Où j'en suis ?**.

Il répond en fonction de **la page où se trouve Karniella**, en trois niveaux :

1. **Les notions de la page courante** — instantané, hors-ligne, gratuit.
2. **La base générale** en dur dans `js/chat-assistant.js`.
3. **L'API Claude** (`POST /api/chat`) — seulement si 1 et 2 n'ont rien trouvé
   *et* qu'il y a du réseau. Facultatif : sans clé API, le chat fonctionne
   simplement sans ce niveau.

### Mode « Interroge-moi »

Le chat pose les questions de quiz de la page, corrige et explique. **Entièrement hors-ligne** :
les questions sont dans `data/chat/<slug>.json`, aucun appel réseau.

**50 des 58 pages** portent des questions (584 au total, dans les 7 matières). Les 8 restantes
sont des sommaires, qui n'ont pas de quiz par nature.

Le générateur récupère les quiz de **quatre sources**, dédoublonnées par énoncé :

| Source | Où |
|---|---|
| `data/quizzes.json` | joint aux pages via `lessons.json` (`id` → `url`) |
| `data/section-questions.json` | indexé par slug de page |
| Corrigé `{ q1: 'b', … }` + `.quiz-question` | dans le HTML de la page |
| `checkAnswer('q1','b','explication')` et `quizData = [...]` | dans le JS de la page |

Les deux dernières sont indispensables : sans elles, seules 17 pages auraient un quiz, uniquement
en physique et en maths.

### Suivi des progrès

`js/progression.js` retient ce que Karniella a vu et ses scores, dans une clé `localStorage`.
Chargé par le chat : **aucune page HTML à modifier**. Alimenté par le mode quiz, par les visites
de leçons et par `js/section-quiz.js` (10 pages). Visible sur l'accueil (avancement par matière et
par leçon) et via le bouton 📊 du chat.

Si le navigateur refuse le stockage, tout reste utilisable — seul le suivi disparaît, et le chat
le dit clairement.

⚠️ Les 9 pages dont le quiz est corrigé par leur propre JS inline ne sont **pas** branchées sur le
suivi : leurs fonctions de correction sont toutes différentes. Leurs questions restent jouables
dans le chat, qui lui enregistre la progression.

### Régénérer la base après avoir modifié une leçon

```bash
npm run build:chat
```

Le script lit les pages de `5e/`, `data/quizzes.json` et `data/section-questions.json`,
puis écrit :

| Fichier | Rôle |
|---|---|
| `js/chat-knowledge-index.js` | Index de toutes les pages (titres des notions) |
| `data/chat/<slug>.json` | Détail d'une page : textes des notions + quiz |

**Ces fichiers sont générés — ne pas les éditer à la main.** Ils sont committés
car Vercel sert le site en statique, sans étape de build.

⚠️ Après régénération, **incrémenter `CACHE_NAME` dans `sw.js`** (`karniella-cache-v10`
→ `v11`, …). Sans ça, les utilisateurs ayant installé la PWA gardent l'ancienne
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
