# Écrire l'interro d'une leçon (data/interros/<slug>.json)

Chaque leçon prête a un fichier d'interro : des **questions de cours** (restitution)
et des **vrai ou faux**. `npm run build:all` les réunit par matière dans
`js/interros-index.js`. Quand une matière reçoit du nouveau contenu, l'accueil
propose à Karniella une **interro surprise** de cette matière
(`5e/interro.html?matiere=<id>`) : 10 questions tirées au hasard, la moitié sur
la nouveauté, plus ses erreurs de la dernière fois.

## Le format

```json
{
  "lecon": "physique-chimie-association-piles",
  "matiere": "physique-chimie",
  "date": "2026-10-28",
  "restitution": [
    {
      "question": "Complète : en série concordance, la tension de l'association est la … des tensions des piles.",
      "reponse": "somme",
      "accepte": ["somme des tensions", "addition"]
    },
    {
      "question": "Quand dit-on que deux piles sont en série opposition ?",
      "reponse": "Quand on relie deux bornes de même signe : + avec +, ou − avec −."
    }
  ],
  "vrai_faux": [
    {
      "affirmation": "Deux piles de 1,5 V en opposition donnent 3 V.",
      "vrai": false,
      "correction": "Elles donnent 0 V : en opposition, on soustrait. 1,5 V − 1,5 V = 0 V."
    }
  ]
}
```

- `date` : le jour où le contenu a été ajouté (AAAA-MM-JJ). **À changer** quand
  on ajoute du contenu à la leçon (par exemple l'onglet « Mon cahier ») : c'est
  ce qui relance l'interro surprise de la matière. Une simple correction de
  faute ne change pas la date.
- `restitution` : **4 à 6 questions de cours**.
  - **Avec `accepte`** : la réponse tient en 1 à 3 mots. Karniella la tape, le
    site corrige tout seul. Au moins 2 questions de ce type.
  - **Sans `accepte`** : définir, citer, expliquer. Karniella écrit sa réponse,
    voit celle du cours, puis dit elle-même si elle l'avait. Au moins 2.
- `vrai_faux` : **6 à 8 affirmations**, à peu près moitié vraies, moitié fausses.
  `correction` est toujours montrée après la réponse : elle dit la bonne idée en
  une ou deux phrases.

Champs facultatifs sur une question :

| Champ | Quand |
|---|---|
| `langue: "en"` | l'énoncé (ou l'affirmation) est en anglais |
| `reponseLangue: "en"` | la réponse attendue est en anglais |
| `exact: true` | l'orthographe compte : pas de faute de frappe tolérée |

## Comment le site corrige une réponse tapée

Il ignore les majuscules, les accents, la ponctuation, les espaces et l'article
du début (le, la, les, l', un, une, des, du, the, a, an). `1,5` et `1.5` sont
pareils. Une faute de frappe est tolérée si la réponse fait au moins 6 lettres et
n'a pas de chiffre (sauf `exact`). `reponse` est toujours acceptée : `accepte` ne
liste que les **autres** façons justes de répondre (synonyme, pluriel, « 3 » et
« trois », avec ou sans unité).

## Les règles d'écriture

- **Fidèle à la leçon** : seulement ce qui est écrit dans la page, d'abord
  l'onglet « Mon cahier » s'il existe. Rien de ce qui est dans un encadré
  « ✏️ À vérifier ».
- **Chaque question se comprend seule** : pas de « sur le schéma », « dans le
  document 2 », « d'après le texte ».
- **Écrire simple** (voir `CLAUDE.md`) : environ 15 mots, une idée, tutoiement,
  mots simples.
- **Une fausse affirmation est une vraie confusion** : on échange deux notions
  de la leçon, on se trompe de nombre ou de mot. Pas de piège sur un détail, pas
  de double négation.
- Pas deux fois la même idée dans le même fichier.
- Anglais : les vrai ou faux peuvent être en anglais (`langue: "en"`) ; les
  questions de cours demandent de traduire un mot ou de compléter une phrase.
- Maths : les questions avec `accepte` peuvent être un calcul court
  (« Calcule 2⁴. » → `16`).
