#!/usr/bin/env python3
"""Pose la « notion » de chaque question de quiz dans data/section-questions.json.

La notion est le nom de la partie de la leçon (l'onglet) où se trouve la
réponse. Le quiz s'en sert pour l'aide-mémoire (après 8 secondes sans
réponse, à la deuxième chance) et pour les points à revoir en fin de quiz.

Pour chaque question, dans l'ordre :
  1. si un exemple du cours (« 💡 Exemples pour les exercices ») reprend la
     question, c'est l'onglet de cet exemple ;
  2. sinon, l'onglet du cours qui contient le plus de mots de la bonne
     réponse, de l'explication et de la question ;
  3. sinon, pas de notion (le quiz dira le titre de la leçon).

Une notion écrite à la main avec "notionFixe": true n'est pas touchée.

    python3 scripts/poser-notions.py            # toutes les leçons
    python3 scripts/poser-notions.py --voir     # sans écrire, montre le résultat
"""
import html, json, re, sys, unicodedata
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
VIDES = set("""avec dans pour mais plus moins leur leurs elle elles nous vous sont etre avoir cette
cela comme tout tous toute toutes quel quelle quels quelles dont alors donc aussi tres bien fait
faire peut entre autre autres meme sans sous chez vers puis deux trois est une des les que qui
what which when where with that this from they them have does your their the and are you is
complete choose correct reponse question vrai faux bonne phrase""".split())


def mots(texte):
    t = unicodedata.normalize('NFD', html.unescape(re.sub(r'<[^>]+>', ' ', str(texte))).lower())
    t = ''.join(c for c in t if unicodedata.category(c) != 'Mn')
    return {m[:7] for m in re.findall(r'[a-z0-9]{3,}', t) if m not in VIDES}


def onglets(page):
    """[(id, nom, mots du texte, texte brut)] pour les onglets de cours."""
    s = page.read_text(encoding='utf-8')
    noms = {a: html.unescape(b).strip() for a, b in re.findall(r'data-onglet="([^"]+)">([^<]*)<', s)}
    liste = []
    for m in re.finditer(r'<section class="tab-content[^"]*" id="([^"]+)"[^>]*>(.*?)</section>', s, re.S):
        ident, corps = m.group(1), m.group(2)
        nom = noms.get(ident, '')
        if not nom or 'quiz-' in corps and 'id="quiz' in corps and len(corps) < 900:
            continue
        if re.search(r'quiz|exerc|practice|say it', nom, re.I):
            continue
        exemples = html.unescape(re.sub(r'<[^>]+>', ' ', ' '.join(re.findall(r'<div class="example-box exemple-exo".*?</div>', corps, re.S))))
        # Les exemples viennent du quiz : on ne les compte pas dans le texte du cours.
        cours = re.sub(r'<h3 class="exemples-titre">.*', '', corps, flags=re.S)
        cours = re.sub(r'<div class="exercice">.*?</details>\s*</div>', '', cours, flags=re.S)
        liste.append((ident, nom, mots(cours), re.sub(r'\s+', ' ', exemples)))
    return liste


def notion(q, liste):
    enonce = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', q['question']))).strip()
    for ident, nom, _, exemples in liste:
        if enonce and enonce in exemples:
            return nom
    bonne = mots(q['options'][q['correctAnswer']]) if 'options' in q else mots(q.get('reponse', ''))
    autres = mots(q.get('explanation', '')) | mots(q['question'])
    meilleur, score = None, 0
    for ident, nom, texte, _ in liste:
        if ident == 'cahier':
            continue   # le cahier contient tout : il ne dit pas où chercher
        s = 2 * len(bonne & texte) + len((autres - bonne) & texte)
        if s > score:
            meilleur, score = nom, s
    return meilleur if score >= 3 else None


def main():
    voir = '--voir' in sys.argv
    chemin = RACINE / 'data' / 'section-questions.json'
    donnees = json.loads(chemin.read_text(encoding='utf-8'))
    posees = sans = 0
    for slug, groupes in donnees.items():
        page = RACINE / '5e' / (slug + '.html')
        if not page.exists():
            continue
        liste = onglets(page)
        for questions in groupes.values():
            for q in questions:
                if q.get('notionFixe'):
                    continue
                n = notion(q, liste)
                if n:
                    q['notion'] = n
                    posees += 1
                else:
                    q.pop('notion', None)
                    sans += 1
                if voir:
                    print(f"{slug[:28]:28} | {str(n)[:34]:34} | {q['question'][:70]}")
    if not voir:
        chemin.write_text(json.dumps(donnees, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'{posees} notions posées, {sans} questions sans notion')


if __name__ == '__main__':
    main()
