#!/usr/bin/env python3
"""
poser-traductions.py — Pose data-fr="…" sur les phrases anglaises des leçons.

    python3 scripts/poser-traductions.py 5e/anglais-*.html

Les traductions vivent dans scripts/traductions-anglais.json, indexées par le
texte anglais tel qu'il s'affiche (balises retirées, parties data-lire-ignore
retirées sauf le nom de l'interlocuteur des dialogues). js/traduction.js
ajoute ensuite le bouton « FR » à chaque élément qui porte data-fr.

Éléments visés : cellules de tableau, lignes de dialogue et <li data-lire>.
Une phrase absente du dictionnaire est signalée, pas inventée.
"""
import html, json, re, sys, pathlib

RACINE = pathlib.Path(__file__).resolve().parent.parent
TRAD = json.loads((RACINE / 'scripts' / 'traductions-anglais.json').read_text(encoding='utf-8'))

def texte(fragment, garder_qui=False):
    if garder_qui:
        fragment = re.sub(r'<span class="qui"[^>]*>(.*?)</span>', r'\1 ', fragment, flags=re.S)
    fragment = re.sub(r'<(\w+)[^>]*data-lire-ignore[^>]*>.*?</\1>', lambda m: '' if 'trou' not in m.group(0) else '', fragment, flags=re.S)
    fragment = re.sub(r'<br\s*/?>', ' ', fragment)
    fragment = re.sub(r'<[^>]+>', '', fragment)
    return re.sub(r'\s+', ' ', html.unescape(fragment)).strip()

def poser(ouvrant, contenu, garder_qui, manques):
    if 'data-fr=' in ouvrant:
        return ouvrant
    cle = texte(contenu, garder_qui)
    fr = TRAD.get(cle) or TRAD.get(cle.rstrip(' →'))
    if not fr:
        manques.append(cle)
        return ouvrant
    return ouvrant[:-1] + ' data-fr="' + html.escape(fr, quote=True) + '">'

MOTIFS = [
    # 2e colonne des tableaux de vocabulaire (Word | Definition)
    (re.compile(r'(<tr>\s*<td>[^<]*</td>\s*)(<td>)(.*?)(</td>)', re.S), False, 'td2'),
    # 2e colonne des tableaux d'exemples (construction ignorée | exemple)
    (re.compile(r'(<tr><td data-lire-ignore>[^<]*</td>)(<td>)(.*?)(</td>)', re.S), False, 'ex'),
    # 3e colonne des tableaux Subject | BE | Example
    (re.compile(r'(<tr><td>[^<]*</td><td>(?:am|is|are)</td>)(<td>)(.*?)(</td>)', re.S), False, 't3'),
    # lignes de dialogue
    (re.compile(r'()(<p>)(<span class="qui".*?)(</p>)', re.S), True, 'dlg'),
    # éléments de liste lus à voix haute
    (re.compile(r'()(<li data-lire>)(.*?)(</li>)', re.S), False, 'li'),
]

def traiter(chemin):
    s = pathlib.Path(chemin).read_text(encoding='utf-8')
    manques = []
    for motif, garder_qui, _ in MOTIFS:
        s = motif.sub(lambda m: m.group(1) + poser(m.group(2), m.group(3), garder_qui, manques) + m.group(3) + m.group(4), s)
    pathlib.Path(chemin).write_text(s, encoding='utf-8')
    return manques

if __name__ == '__main__':
    for f in sys.argv[1:]:
        manques = traiter(f)
        poses = pathlib.Path(f).read_text(encoding='utf-8').count('data-fr=')
        print(f, '→', poses, 'traductions posées')
        for m in manques:
            print('   (sans traduction)', m[:90])
