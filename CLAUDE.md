# Révisions Karniella — règles pour ajouter une leçon

Site statique (HTML + JS vanilla), classe de 5e, Côte d'Ivoire. Le README
détaille l'architecture ; ce fichier garde les règles que Karniella a
demandées et qu'il faut appliquer à chaque nouvelle leçon.

## Toute leçon

- Modèle de page : une leçon existante de la même matière dans `5e/`
  (même `<head>`, `<body class="lecon-5e" data-matiere="…">`, onglets
  `data-onglet="tabN"`, dernier onglet = quiz en étapes
  `initSectionQuiz(id, questions.tabN, { etapes: true })`).
- Fidèle au cahier ou au manuel envoyé (photo, PDF, vocal). Ce qui est
  complété ou deviné va dans un encadré `important-box data-hors-chat`
  « ✏️ À vérifier dans ton cahier ».
- Entrée dans `data/programme-5e.json` (`statut: "prete"`, `mission: true`),
  questions dans `data/section-questions.json`, mission de 3 minutes dans
  `data/missions/<slug>.json` (format de `docs/prompt-missions.md`).
- Puis `npm run build:all` et incrémenter `CACHE_NAME` dans `sw.js`.
- Quand Karniella envoie son **cahier** pour une leçon déjà faite d'après le
  manuel : ajouter un premier onglet « Mon cahier » (`data-onglet="cahier"`)
  qui suit le plan du professeur, corriger seulement l'orthographe, et mettre
  ce qui manque dans un encadré « ✏️ À vérifier ». Garder le texte brut reçu
  dans `docs/sources/`.

## Leçons d'anglais : bouton de traduction sur chaque phrase

Chaque définition, phrase d'exemple et ligne de dialogue en anglais porte sa
traduction française dans un attribut `data-fr`. `js/traduction.js` (à
charger dans la page, après `js/lecon-5e.js`) y ajoute un bouton « FR » et
un interrupteur « Afficher toutes les traductions » mémorisé dans le
navigateur.

    <td data-fr="C'est une grande porte.">It's a big door.</td>
    <p data-fr="B : C'est en haut des escaliers, à l'étage."><span class="qui">B:</span> It's upstairs.</p>

Méthode : ajouter les phrases et leur traduction dans
`scripts/traductions-anglais.json`, puis lancer
`python3 scripts/poser-traductions.py 5e/anglais-*.html`, qui pose les
`data-fr` et signale les phrases sans traduction. Ne pas traduire une phrase
dont la traduction donnerait la réponse d'un exercice.

Chaque leçon d'anglais a aussi un onglet « C/ Practice » (exercices avec
correction dans `<details>`, classe `.exercice`) avant le quiz.
