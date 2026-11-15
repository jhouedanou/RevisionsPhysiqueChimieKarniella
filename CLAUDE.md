# Révisions Karniella — règles pour ajouter une leçon

Site statique (HTML + JS vanilla), classe de 5e, Côte d'Ivoire. Le README
détaille l'architecture ; ce fichier garde les règles que Karniella a
demandées et qu'il faut appliquer à chaque nouvelle leçon.

**Règle n° 1 : garder simple.** Chaque leçon, chaque ajout, chaque
correction reste court et facile à lire pour une élève de 5e. Avant de
publier, se demander : « Est-ce que je peux le dire plus court ? » Le détail
est dans la section « Écrire simple » ci-dessous.

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
- Interro surprise dans `data/interros/<slug>.json` : questions de cours et
  vrai ou faux (format de `docs/prompt-interros.md`), `date` = jour de
  l'ajout. C'est ce qui fait apparaître l'interro surprise de la matière.
- **Un aide-mémoire sous le titre de chaque exercice** (demandé le 15/11) :
  l'icône i, puis un lien qui atterrit sur un **exemple résolu**, proche de
  l'exercice. Une phrase, sans donner la réponse de l'exercice.

      <p class="aide-memoire" data-hors-chat><span class="aide-i" aria-hidden="true">i</span><span><strong>Aide-mémoire :</strong> regarde <a href="#exemple-4">l'exemple 4</a>, dans <a href="#tab2">« 2. En dérivation »</a>. Regarde le schéma 6.</span></p>

- **Les exemples des exercices** : à la fin de l'onglet du cours visé (avant
  « ✏️ À vérifier »), sous `<h3 class="exemples-titre">💡 Exemples pour les
  exercices</h3>`. Chaque exemple s'inspire d'une ou deux questions du quiz
  (question, réponse, explication), avec d'autres données que l'exercice :

      <div class="example-box exemple-exo" id="exemple-4">
        <h4>Exemple 4</h4>
        <p><strong>Question :</strong> …</p>
        <p><strong>Réponse :</strong> …<br>…</p>
      </div>

  Le lien `#exemple-4` ouvre l'onglet et montre l'exemple (`js/lecon-5e.js`).
- **Le quiz** (demandé le 15/11, `js/section-quiz.js`) : pendant le quiz, la
  leçon est fermée (les autres onglets ne s'ouvrent plus), le chat et la
  recherche aussi ; « Quitter le quiz » les rouvre et garde l'avancement. À la première erreur sur un QCM,
  Karniella a une **deuxième chance** : sa réponse est barrée, une autre
  mauvaise réponse est retirée (4 choix ou plus), et un indice nomme la partie
  de la leçon. La question compte quand même comme une erreur. L'indice vient
  de l'exemple qui reprend la question ; sinon, on peut l'écrire dans la
  question : `"indice": "Pense à la partie « 2. En dérivation »."`. Jamais la
  réponse dans l'indice. Après chaque réponse, juste ou fausse, « Question
  suivante » reste désactivé : un minuteur de 20 secondes tourne, puis le
  bouton « J'ai compris » apparaît et débloque la suite. Ne pas le raccourcir.
- Puis `npm run build:all` et incrémenter `CACHE_NAME` dans `sw.js`.
- Quand Karniella envoie son **cahier** pour une leçon déjà faite d'après le
  manuel : ajouter un premier onglet « Mon cahier » (`data-onglet="cahier"`)
  qui suit le plan du professeur, corriger seulement l'orthographe, et mettre
  ce qui manque dans un encadré « ✏️ À vérifier ». Garder le texte brut reçu
  dans `docs/sources/`. Ajouter à l'interro des questions sur le cahier et
  mettre sa `date` au jour de l'ajout.

## Leçons tapées sur `saisie.html`

Karniella tape l'essentiel d'une leçon (matière, titre, texte) sur
`saisie.html` : elle s'affiche aussitôt sur `5e/lecon.html?id=<n>`, sans quiz
ni mission. Chaque soir, une tâche planifiée en fait une leçon complète. Les
leçons visibles se lisent dans la table Supabase `lecon_saisie` (commande
`curl` dans le README).

- Le texte saisi compte comme le cahier : onglet « Mon cahier » avec ce texte
  (orthographe corrigée seulement), puis les onglets de cours, les schémas,
  les exercices et le quiz, selon « Toute leçon ». Ce qui n'est pas dans le
  texte saisi va dans « ✏️ À vérifier dans ton cahier ».
- Copie du texte saisi dans `docs/sources/saisie-<n>.md`, avec en tête son
  `modifie_le`. Si la saisie change plus tard (nouveau `modifie_le`), mettre
  la leçon à jour.
- Entrée de `data/programme-5e.json` : `"saisie": <n>`. Une fois en ligne,
  la version saisie quitte le sommaire et son lien mène à la leçon complète.
- Une saisie déjà dans `data/programme-5e.json` ou dans une PR ouverte
  « Leçons du soir » n'est pas refaite.

## Écrire simple

Demandé le 14/10 : des leçons courtes, que Karniella comprend du premier coup.

- **Pas d'encadré « 📖 D'où vient cette leçon ? »**, ni aucune phrase sur la
  provenance du contenu dans la page (note vocale, enregistrement, message,
  « rédigé d'après le programme », « aide en plus », « j'entends »…). La
  provenance va dans `docs/sources/` et dans le message de commit.
- Phrases d'environ 15 mots, une idée par phrase, tutoiement, mots simples.
- Au plus un encadré 🐴 par partie (1 à 3 phrases) ; ⚠️ seulement pour un vrai
  piège ou un danger ; pas d'idée dite deux fois.
- « ✏️ À vérifier dans ton cahier » : un seul par onglet au plus, à la fin,
  1 à 4 puces courtes qui disent quoi vérifier, sans parler de l'audio.
- **Pas de trou « à recopier de ton cahier »** (demandé le 15/11) : un passage
  inaudible ou illisible est complété par la logique de la leçon, dans
  `<span class="deduit">…</span>` (pointillé discret), et cité dans
  « ✏️ À vérifier ». On ne devine pas une citation d'un texte d'étude : on
  l'enlève.
- On ne simplifie jamais le texte du cahier ni les textes d'étude (seule
  l'orthographe est corrigée), ni les définitions, les schémas, les exercices
  et leurs corrections.

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

Et un onglet « Say it! 🎤 » (`data-onglet="dire"`) juste avant « Practice » :
6 à 8 phrases de la leçon que Karniella dit au micro. `js/prononciation.js`
(à charger après `js/traduction.js`) l'écoute, colore les mots bien dits et
donne 5 XP par phrase réussie (85/100), une fois par jour. Phrases courtes
(4 à 10 mots), jamais la réponse d'un exercice ; `data-noms` pour les prénoms
ivoiriens, que la reconnaissance anglaise comprend mal.

    <div class="prononciation" lang="en-GB"><ol>
      <li data-fr="Koffi est le frère d'Aya." data-noms="Koffi Aya">Koffi is Aya's brother.</li>
    </ol></div>

## Leçons de mathématiques : des figures à manipuler

Même logique qu'en physique-chimie (demandé le 15/11) : quand une notion se
voit sur une figure, ajouter un bloc « 🕹️ Essaie toi-même » avec une figure à
manipuler. Karniella fait glisser un curseur, la figure suit, Aya dit le
résultat puis le « Pourquoi ? ». Les figures fixes du cahier restent.

    <h3>🕹️ Essaie toi-même</h3>
    <p>Change les angles Â et B̂. Regarde l'angle Ĉ.</p>
    <div class="schema-interactif" data-schema="angles" data-figure="triangle"></div>

Figures prêtes (`js/schema-interactif.js`, à charger après `js/lecon-5e.js`) :
`angles` (`data-figure` : `adjacents`, `complementaires`, `supplementaires`,
`opposes`, `triangle`), `segment` (`milieu`, `mediatrice`), `droite` (nombre
relatif, opposé, distance à zéro), `puissance`, `diviseurs` (premier ou pas).
Pour une nouvelle notion, ajouter un schéma dans `SCHEMAS`, avec `curseur(…)`
pour une valeur à faire glisser.

## Leçons de physique-chimie : toujours des schémas

Karniella l'a demandé : chaque leçon de physique-chimie a des **schémas**
(circuit, montage, expérience, appareil de mesure). Au moins un par partie
du cours, et un schéma dans chaque exercice qui parle d'un montage.

- SVG écrit dans la page (pas d'image externe), dans
  `<figure class="schema">` avec une `<figcaption>` qui dit ce qu'on voit.
  `viewBox`, `role="img"` et `aria-label` sur le `<svg>`.
- **Le mode sombre est désactivé** (demandé le 15/11) : le site est toujours
  en clair, sans bouton 🌙 (`js/theme.js`). Ne pas le remettre. Les thèmes
  foncés de la boutique existent encore, donc la règle des couleurs reste.
- Couleurs : traits en `stroke="currentColor"`, texte sans `fill`
  (la classe `.schema` le met en `currentColor`), accents avec les variables
  du thème (`var(--rose)`, `var(--boite-exemple-texte)`…). Jamais de
  couleur codée en dur.
- Circuits : symboles normalisés (pile, lampe, interrupteur ouvert / fermé,
  moteur, DEL, fil, nœud), étiquettes en français, lisibles à 390 px.
  Pile : grand trait fin = borne +, petit trait épais = borne −. Flèche du
  courant : de la borne + vers la borne −, à l'extérieur de la pile.
- Schéma du manuel ou du cahier : le refaire fidèlement. S'il est
  illisible ou deviné, le dire dans l'encadré « ✏️ À vérifier ».
- **Tout schéma de circuit du cours se manipule** (demandé le 15/11) :
  Karniella enlève un fil, dévisse une lampe, ouvre l'interrupteur, retourne
  une pile, et voit la conséquence. Au lieu d'un `<svg>` fixe, écrire le
  montage en attributs ; la légende reste dans la page :

      <div class="schema-interactif" data-schema="montage" data-piles="4.5"
           data-lampes="2" data-montage="derivation" data-inter="ferme" data-court="2">
        <p class="si-legende">Schéma 6 : un fil relie les bornes de L2.</p>
      </div>

  Attributs (détail en tête de `js/schema-interactif.js`, à charger après
  `js/lecon-5e.js`) : `data-piles` (tensions), `data-retournees`,
  `data-lampes` (1 à 3), `data-montage="derivation"`, `data-nominal`,
  `data-inter`, `data-inter-branches`, `data-devissees`, `data-grillees`,
  `data-court`, `data-voltmetre`, `data-options="retourner nombre choix grille"`.
  Le script calcule le circuit : ne pas écrire l'éclat des lampes à la main.
- **Des animations avec Aya, le personnage** (demandé le 15/11, pour toutes
  les leçons à venir) : dans un schéma à manipuler, Aya dit l'observation dans
  sa bulle et change de pose (`wave` au départ, `cheer` quand tout brille,
  `point`, `think` quand le circuit est ouvert, `alerte` au court-circuit). Les
  rayons des lampes et la flèche du courant bougent. C'est automatique pour
  `montage` et `melange`. Un nouveau schéma dans `SCHEMAS` fournit `texte(etat)`
  et `pose(etat)`.
- **Aya explique en détail** (demandé le 15/11) : la bulle donne l'observation,
  puis un « Pourquoi ? » d'une à trois phrases qui dit la cause
  (`<span class="si-pourquoi">` dans `texte(etat)`). Jamais l'observation
  seule. Dans une autre matière, pour animer une explication,
  réutiliser Aya (`KarniellaJeu.guide`, `KarniellaJeu.dessin(pose)` dans
  `js/jeu.js`) plutôt qu'un nouveau personnage.
- Restent en `<svg>` fixe : les schémas des **exercices** (le schéma vivant
  donnerait la réponse) et les dessins qui ne sont pas des circuits (pile
  plate, lampe torche, verre). Pour une expérience sans circuit, un bloc
  « 🕹️ Essaie toi-même » (`data-schema="melange"`), ou un nouveau schéma dans
  `SCHEMAS`.

    <figure class="schema">
      <svg viewBox="0 0 240 120" role="img" aria-label="Pile reliée à une lampe">…</svg>
      <figcaption>Schéma 1 : une pile alimente une lampe.</figcaption>
    </figure>
