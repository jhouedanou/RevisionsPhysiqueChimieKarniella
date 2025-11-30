#!/usr/bin/env python3
"""
Script d'harmonisation du thème rose Karniella
Applique le thème cohérent à toutes les leçons
"""

import re
import os
import sys
from datetime import datetime
from pathlib import Path

# Fichiers HTML de leçons à traiter (exclure index, admin, viewers)
LESSON_FILES = [
    # Mathématiques
    "maths-lecon-1-calculs-algebriques.html",
    "maths-lecon-2-diviseurs.html",
    "maths-lecon-3-droites-points.html",
    "maths-lecon-4-secantes-perpendiculaires.html",
    "maths-lecon-5-droites-paralleles.html",
    "maths-lecon-6-proprietes.html",
    "maths-lecon-7-nombres-relatifs.html",
    "maths-lecon-8-somme-relatifs.html",
    "maths-lecon-segments.html",
    
    # Physique
    "le-circuit-electrique.html",
    "lecon-3-court-circuit.html",
    "les-commandes-electriques.html",
    
    # Autres matières
    "svt.html",
    "histoire-geographie.html",
    "education-civique.html",
    
    # Pages quiz associées
    "le-circuit-electrique-quiz.html",
    "lecon-3-court-circuit-quiz.html",
    "les-commandes-electriques-quiz.html",
    "education-civique-quiz.html",
    "maths-lecon-7-nombres-relatifs-quiz.html",
    "maths-lecon-8-somme-relatifs-quiz.html",
]

# Remplacements de couleurs à effectuer
COLOR_REPLACEMENTS = {
    # Headers - uniformiser en rose Karniella
    r'linear-gradient\(135deg,\s*#667eea\s+0%,\s*#764ba2\s+100%\)': 'linear-gradient(135deg, #FF69B4 0%, #FF1493 100%)',
    r'linear-gradient\(135deg,\s*#5433ff\s+0%,\s*#20bdff\s+100%\)': 'linear-gradient(135deg, #FF69B4 0%, #FF1493 100%)',
    
    # Boutons - uniformiser en rose
    r'#667eea': '#FF69B4',
    r'#764ba2': '#FF1493',
    r'#5433ff': '#FF69B4',
    r'#20bdff': '#FF69B4',
    
    # Tabs inactifs - rose clair
    r'background:\s*#444': 'background: linear-gradient(135deg, #FFE5F0 0%, #FFB6D9 100%); color: #C71585; font-weight: 700',
}


def backup_file(filepath):
    """Créer une sauvegarde du fichier."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"{filepath}.theme_backup_{timestamp}"
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    with open(backup_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"  ✓ Backup: {os.path.basename(backup_path)}")
    return backup_path


def add_theme_css_link(html_content):
    """Ajouter le lien vers karniella-theme.css si absent."""
    if 'karniella-theme.css' in html_content:
        print("  - Thème CSS déjà présent")
        return html_content, False
    
    # Chercher </title> et ajouter après
    pattern = r'(</title>)'
    replacement = r'\1\n    <link rel="stylesheet" href="css/karniella-theme.css">'
    
    modified = re.sub(pattern, replacement, html_content, count=1)
    
    if modified != html_content:
        print("  ✓ Ajout du lien CSS thème")
        return modified, True
    
    return html_content, False


def harmonize_colors(html_content):
    """Remplacer les couleurs incohérentes."""
    modified = html_content
    changes = 0
    
    for pattern, replacement in COLOR_REPLACEMENTS.items():
        matches = len(re.findall(pattern, modified, re.IGNORECASE))
        if matches > 0:
            modified = re.sub(pattern, replacement, modified, flags=re.IGNORECASE)
            changes += matches
    
    if changes > 0:
        print(f"  ✓ {changes} couleur(s) harmonisée(s)")
    
    return modified, changes > 0


def process_file(filepath, dry_run=False):
    """Traiter un fichier HTML."""
    print(f"\n{'='*60}")
    print(f"Traitement: {os.path.basename(filepath)}")
    print(f"{'='*60}")
    
    if not os.path.exists(filepath):
        print(f"  ✗ Fichier non trouvé")
        return False
    
    # Lire le fichier
    with open(filepath, 'r', encoding='utf-8') as f:
        original_content = f.read()
    
    modified_content = original_content
    has_changes = False
    
    # Ajouter le lien CSS
    modified_content, css_added = add_theme_css_link(modified_content)
    has_changes = has_changes or css_added
    
    # Harmoniser les couleurs
    modified_content, colors_changed = harmonize_colors(modified_content)
    has_changes = has_changes or colors_changed
    
    # Vérifier si des changements
    if not has_changes:
        print("  ✓ Aucun changement nécessaire")
        return True
    
    if dry_run:
        print("  ⚠️  [DRY RUN] Modifications simulées")
        return True
    
    # Sauvegarder
    backup_file(filepath)
    
    # Écrire les modifications
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(modified_content)
    
    print("  ✅ Fichier harmonisé")
    return True


def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Harmoniser le thème rose Karniella sur toutes les leçons'
    )
    parser.add_argument(
        '--file',
        help='Fichier spécifique à traiter'
    )
    parser.add_argument(
        '--all',
        action='store_true',
        help='Traiter tous les fichiers de leçons'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Mode simulation (pas de modifications)'
    )
    
    args = parser.parse_args()
    
    # Changer vers le répertoire du projet
    script_dir = Path(__file__).parent.parent
    os.chdir(script_dir)
    
    print("=" * 60)
    print("HARMONISATION THÈME ROSE KARNIELLA")
    print("=" * 60)
    
    if args.dry_run:
        print("⚠️  MODE DRY RUN - Aucune modification")
    
    success_count = 0
    fail_count = 0
    
    if args.file:
        # Traiter un fichier
        success = process_file(args.file, args.dry_run)
        success_count += 1 if success else 0
        fail_count += 0 if success else 1
    
    elif args.all:
        # Traiter tous les fichiers
        for filename in LESSON_FILES:
            if os.path.exists(filename):
                success = process_file(filename, args.dry_run)
                success_count += 1 if success else 0
                fail_count += 0 if success else 1
            else:
                print(f"\n⚠️  Fichier ignoré (absent): {filename}")
    
    else:
        parser.print_help()
        return
    
    # Résumé
    print(f"\n{'='*60}")
    print("RÉSUMÉ")
    print(f"{'='*60}")
    print(f"✓ Réussis: {success_count}")
    print(f"✗ Échecs: {fail_count}")
    
    if args.dry_run:
        print("\n⚠️  Dry run - Aucun fichier modifié")
    else:
        print(f"\n✅ Harmonisation terminée!")
        print(f"   Vérifiez les fichiers dans le navigateur")


if __name__ == '__main__':
    main()
