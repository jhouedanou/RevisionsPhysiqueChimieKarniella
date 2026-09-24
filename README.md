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
| `js/programme-5e.js` | Catalogue lu par l'accueil | oui |

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

### 🔊 Lecture vocale

`js/lecture-vocale.js` pose un bouton 🔊 sur le vocabulaire, les questions de quiz et
les réponses du chat. Il utilise la **Web Speech API** du navigateur : pas de clé d'API,
pas de coût, et les voix étant installées sur l'appareil, **ça fonctionne hors-ligne**.
Si le navigateur ne sait pas parler, aucun bouton n'apparaît et rien ne casse.

#### La règle

> Un bouton prononce un passage **dans la langue où ce passage est écrit**, et ne
> prononce **jamais** ce qui n'est pas de la parole : une formule grammaticale
> (`like + V-ing`), une étiquette de colonne, un numéro de question, l'émoji du bouton.

Corollaire : **ce qui est prononcé ne dit jamais plus que ce que la page affiche.** Là où
le cahier était illisible, la voix s'arrête comme la page.

Un même bouton enchaîne plusieurs langues, parce que le cours les mêle au milieu d'une
ligne — « upstairs — à l'étage », un énoncé de quiz français avec des propositions
anglaises. Chaque morceau garde sa voix, et son débit : l'anglais ralentit, le français
non.

#### Les trois marqueurs

| Marqueur | Effet |
|---|---|
| `data-lire` (sans valeur) | pose un bouton, lit ce qui est écrit. **À préférer** : ne peut pas diverger de la page. Ne jamais l'imbriquer. |
| `data-lire="texte"` | lit *ceci* à la place. À réserver aux cas où l'affichage contient du non-parlé. |
| `data-lire-ignore` | ce sous-arbre n'est jamais prononcé, et aucun bouton n'y est posé. Sur un `<em>`, une cellule, une ligne ou une `<table>` entière. |
| `lang` / `data-lire-langue` | la langue, héritée du plus proche ancêtre qui en déclare une. |

Sont muets **d'office**, sans rien écrire : `<s>` et `<del>`. Une forme fautive est
affichée barrée pour être reconnue ; la prononcer avec un bon accent la ferait apprendre.

```html
<!-- Le mot anglais se dit, sa glose française non : on marque le fragment. -->
<li><strong lang="en-GB" data-lire>upstairs</strong> — à l'étage</li>

<!-- Tableau « Construction | Example » : la formule ne se prononce pas. -->
<tr><td data-lire-ignore>like + V-ing</td><td>I like speaking English.</td></tr>
```

Une ligne de tableau prononce **toutes ses cellules parlables**, dans l'ordre : un
tableau de vocabulaire dit le mot *et* sa définition, un tableau à quatre colonnes n'en
perd aucune.

#### Les quiz

Chaque question de `data/section-questions.json` peut porter `langue` et, si ses
propositions sont dans une autre langue, `optionsLangue` :

```json
{ "question": "Quelle phrase est CORRECTE ?", "options": ["I like speak English.", "…"],
  "langue": "fr", "optionsLangue": "en" }
```

`js/section-quiz.js` les pose sur la page, et `scripts/build-chat-knowledge.js` les
propage dans `data/chat/<slug>.json` — le mode « Interroge-moi » du chat affiche les
mêmes questions et doit les lire pareil. Pour un énoncé réellement bilingue
(« Complète : « I dislike ____ the board. » »), on marque la langue **dominante**.

#### Le chargement

Les pages de leçon chargent le module elles-mêmes, **avant** `chat-assistant.js` :

```html
<script src="../js/lecture-vocale.js" defer></script>
```

`chat-assistant.js` l'injecte aussi en filet pour les pages qui n'ont pas la balise.
Les deux chemins sont idempotents, et le module porte son propre CSS — il fonctionne
donc aussi sur l'accueil, qui ne charge pas `css/lecon-5e.css`.

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
| `js/recherche-index.js` | Index de la recherche : notions (avec extrait) et quiz de toutes les pages |

**Ces fichiers sont générés — ne pas les éditer à la main.** Ils sont committés
car Vercel sert le site en statique, sans étape de build.

⚠️ Après régénération, **incrémenter `CACHE_NAME` dans `sw.js`** (`karniella-cache-v13`
→ `v14`, …). Sans ça, les utilisateurs ayant installé la PWA gardent l'ancienne
version : les fichiers `/js/` sont servis en cache-first.

### Activer le repli IA

Copier `.env.example` vers `.env` et renseigner `ANTHROPIC_API_KEY`
(sur Vercel : variable d'environnement du projet).

`CHAT_MODEL` permet de changer de modèle — `claude-opus-5` par défaut,
`claude-haiku-4-5` pour un coût nettement plus bas.

Le navigateur n'envoie que le **slug** de la page, jamais son contenu : le
contexte donné au modèle est relu côté serveur depuis `data/chat/`.

## 🏠 La page d'accueil

Volontairement courte : un en-tête, une recherche, le sommaire des leçons groupé
par matière, un pied de page. Elle est passée de **828 à 66 lignes** — ses
349 lignes de CSS et 313 lignes de JS vivent maintenant dans `css/accueil.css`,
`js/accueil.js` et `js/inscrire-sw.js`.

Ce qui a été retiré : la section « Programme », **qui listait une deuxième fois
les mêmes leçons que les cartes de matières** — c'était la vraie cause de la
surcharge. Avec elle sont partis le bandeau « Ta session en 3 étapes », le titre
d'accroche, les deux boutons d'appel à l'action et la ligne de compteurs.

Les matières encore vides ne prennent **pas** un bloc chacune : elles sont
réunies sur une ligne « Bientôt ». Six blocs vides sur huit alourdiraient la page
au lieu de l'éclaircir.

La recherche de l'accueil filtre **carte par carte** : noms de matières, titres
de leçons **et titres des notions** (via l'index du chat). Taper « canteen » ou
« dissolution » garde la bonne leçon. Un bouton en dessous passe le même mot à la
recherche complète.

### 🔍 Recherche complète

Bouton **🔍 Rechercher** en haut à droite de chaque page, ou touche `/` (ou Ctrl+K).
Chargée par `chat-assistant.js` : aucune page HTML à modifier.

- Cherche dans les leçons, **le texte des notions** et les questions de quiz
  (`js/recherche-index.js`, généré par `npm run build:chat`, chargé à la première recherche).
- Sans accents, pluriels compris, une faute de frappe tolérée (« circiut » trouve « circuit »).
- Un résultat de notion ouvre la leçon **sur le bon onglet** et fait briller la notion :
  `js/lecon-5e.js` lit l'adresse `#onglet=tab3&notion=Mélange homogène`.
- Dernière ligne : « Demander au poney », qui passe la question au chat.

### 🔥 Série de jours et 🏅 badges

`js/progression.js` note chaque jour de révision (leçon ouverte ou quiz fait).
L'accueil affiche la série, l'objectif du jour (une leçon + un quiz) et la dernière
leçon ouverte. `js/badges.js` déduit les badges de la progression, les garde une fois
gagnés (clé `karniella-badges`) et affiche un message de félicitations à chaque nouveau
badge, ou au premier progrès du jour quand la série continue.

### 🌙 Mode sombre, A+ et couleurs des matières

- `css/theme.css` porte **toutes** les couleurs du site, en clair et en sombre.
  `js/theme.js`, chargé sans `defer` dans le `<head>`, pose `data-theme` sur `<html>`
  avant l'affichage : le site suit le réglage de l'appareil, puis le choix fait avec
  le bouton 🌙 (dans la barre du haut). Le bouton **A+** agrandit le texte.
- `css/matieres.css` est **généré** par `npm run build:programme` à partir du champ
  `couleur` de `data/programme-5e.json` : trois teintes par matière, vérifiées à
  4,5:1 en clair et en sombre. Les pages portent `data-matiere` sur `<body>`.
- Une nouvelle page de leçon doit donc avoir, dans son `<head>` :

```html
<link rel="stylesheet" href="../css/theme.css">
<link rel="stylesheet" href="../css/matieres.css">
<script src="../js/theme.js"></script>
<script src="../js/programme-5e.js"></script>
<link rel="stylesheet" href="../css/coquille.css">
<script src="../js/coquille.js"></script>
```

et `<body class="lecon-5e" data-matiere="<id-de-la-matière>">`. Pas de bouton
« Retour » à écrire : la barre du haut s'en charge.

### 🧭 La coquille : barre du haut et navigation du bas

`js/coquille.js` + `css/coquille.css`, chargés dans le `<head>` de toutes les pages.
Comme sur une plateforme de cours en ligne :

- une **barre fixe en haut** : le logo 🐴 ramène à l'accueil, un fil d'Ariane
  (`Accueil › Physique-Chimie › Les mélanges`) mène partout en un clic, puis
  🔥 la série, ⭐ les XP, 🌙, A+, 🔍 et l'avatar (→ boutique) ;
- sur **téléphone**, une barre en bas : Accueil · Leçons · Boutique · Badges ;
- dans les leçons, les onglets deviennent un **parcours** numéroté : colonne à
  gauche sur grand écran, puces sous la barre sur téléphone, coche sur les
  étapes vues (gardées pour la session), « étape 2 sur 4 ».
- La flamme 🔥 est grise tant que rien n'a été révisé aujourd'hui et **clignote
  après 18 h** si la série est en danger. Un clic ouvre le résumé de la semaine.

### ⭐ XP et boutique

`js/xp.js` (clé `karniella-xp`) : **+10 XP par bonne réponse, +50 XP pour un
sans-faute** (quiz d'au moins 3 questions). `boutique.html` propose **27
récompenses en 6 rayons**, de 100 à 1 500 XP, qui changent vraiment l'application :

| Rayon | Effet | Exemples |
|---|---|---|
| Badges (6) | s'ajoutent à « Mes badges » | Apprentie Alchimiste 100 · Savante Suprême 1500 |
| Thèmes (6) | couleurs de tout le site, `html[data-skin=…]` dans `css/theme.css` | Cyberpunk Rose, Grand Océan (jour), Or Royal |
| Avatars (6) | le rond dans la barre du haut | Licorne 350 · Poney astronaute 500 · Reine 1000 |
| Cadres (3) | anneau autour de l'avatar | argent, or, arc-en-ciel |
| Confettis (3) | la pluie des réussites (`js/badges.js`) | étoiles, cœurs, feu d'artifice |
| Titres (3) | sous « Salut Karniella » sur l'accueil | Capitaine Karniella, Reine de l'écurie |

Un seul actif par rayon (sauf les badges). Les thèmes « de nuit » imposent le mode
sombre, ceux « de jour » le clair ; le bouton 🌙 retire le thème actif.

### 🎨 Polices et icônes

Titres en **Baloo 2**, texte en **Nunito** (Google Fonts, chargées par
`js/coquille.js` ; hors-ligne la pile système prend le relais). Les commandes
(navigation, 🌙, 🔍, flamme, XP) sont des icônes SVG (`KarniellaIcones.svg(nom)`
dans `js/coquille.js`) ; les emojis restent pour le contenu et les récompenses.
Les skills de design du projet vivent dans `.claude/skills/` (`ui-ux-pro-max`).

### 🎯 Quiz en étapes et mode Ghost 👻

`initSectionQuiz(id, questions, { etapes: true })` affiche **une question à la
fois** : feedback immédiat, chrono, points d'avancement, écran final avec les XP.
`js/progression.js` garde le **record chronométré** de chaque quiz
(`KarniellaProgression.record(slug)`). Au quiz suivant, « 👻 Battre mon fantôme »
fait courir l'ancien record sur une piste pendant qu'on répond.

### 🚀 Missions de 3 minutes

`5e/mission.html?id=<slug>` joue `data/missions/<slug>.json` en trois écrans,
une carte à la fois : l'histoire, une micro-leçon par carte, le quiz en étapes.
Le format JSON et le prompt pour en générer sont dans `docs/prompt-missions.md`.
Pour afficher le bouton « 🚀 Mission 3 min » sur une leçon : `"mission": true`
dans `data/programme-5e.json`, puis `npm run build:programme`.

### 📖 Dans les leçons

Ajouté par `js/lecon-5e.js`, sans rien à écrire dans les pages :
- les onglets restent en haut de l'écran, avec une **barre de lecture** ;
- des boutons **Précédent / Suivant** au bas de chaque onglet ;
- **🃏 Réviser en cartes** : les notions de la leçon (hors situation, correction
  et quiz) en cartes à retourner, tirées de `data/chat/<slug>.json` ;
- des **confettis** 🎉 à 80 % et plus à un quiz, à chaque nouveau badge et à la
  fin d'un paquet de cartes (`window.KarniellaFete`, dans `js/badges.js`).

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
