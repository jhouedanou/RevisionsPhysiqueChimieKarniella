#!/usr/bin/env python3
"""
Script pour ajouter automatiquement des mini-quiz de section
aux fichiers HTML de leçons existants.

Usage:
    python add_section_quizzes.py --file maths-lecon-2-diviseurs.html
    python add_section_quizzes.py --all  # Pour traiter tous les fichiers
    python add_section_quizzes.py --dry-run  # Pour tester sans modifier
"""

import re
import os
import sys
import json
import argparse
from pathlib import Path
from datetime import datetime
from bs4 import BeautifulSoup

# Lessons to process (excluding already processed ones)
LESSON_FILES = [
    "maths-lecon-2-diviseurs.html",
    "maths-lecon-3-droites-points.html",
    "maths-lecon-4-secantes-perpendiculaires.html",
    "maths-lecon-5-droites-paralleles.html",
    "maths-lecon-6-proprietes.html",
    "maths-lecon-7-nombres-relatifs.html",
    "maths-lecon-8-somme-relatifs.html",
    "maths-lecon-segments.html",
    "le-circuit-electrique.html",
    "lecon-3-court-circuit.html",
    "les-commandes-electriques.html",
]


def backup_file(filepath):
    """Create a timestamped backup of the file."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"{filepath}.backup_{timestamp}"
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    with open(backup_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✓ Backup created: {backup_path}")
    return backup_path


def add_css_link(html_content):
    """Add section-quiz.css link to <head> if not already present."""
    if 'section-quiz.css' in html_content:
        print("  - CSS link already present")
        return html_content
    
    # Find </title> and add CSS link after it
    pattern = r'(</title>)'
    replacement = r'\1\n    <link rel="stylesheet" href="css/section-quiz.css">'
    
    modified = re.sub(pattern, replacement, html_content, count=1)
    
    if modified != html_content:
        print("  ✓ Added CSS link")
    
    return modified


def find_tab_sections(html_content):
    """Identify tab sections (divs with class 'tab-content')."""
    soup = BeautifulSoup(html_content, 'html.parser')
    tabs = soup.find_all('div', class_='tab-content')
    
    print(f"  Found {len(tabs)} tab sections")
    
    tab_info = []
    for i, tab in enumerate(tabs):
        tab_id = tab.get('id', f'tab{i+1}')
        # Skip the quiz tab (usually the last one)
        if 'quiz' in tab_id.lower() or i == len(tabs) - 1:
            print(f"    - Skipping {tab_id} (quiz tab)")
            continue
        
        tab_info.append({
            'id': tab_id,
            'index': i + 1,
            'element': tab
        })
        print(f"    - Tab {i+1}: {tab_id}")
    
    return tab_info


def add_quiz_containers(html_content, lesson_id):
    """Add quiz container divs at the end of each tab section."""
    soup = BeautifulSoup(html_content, 'html.parser')
    tabs = soup.find_all('div', class_='tab-content')
    
    quiz_count = 0
    
    for i, tab in enumerate(tabs):
        tab_id = tab.get('id', f'tab{i+1}')
        
        # Skip quiz tab (usually last)
        if 'quiz' in tab_id.lower() or i == len(tabs) - 1:
            continue
        
        # Check if quiz container already exists
        existing_quiz = tab.find('div', id=lambda x: x and 'quiz-' in x)
        if existing_quiz:
            print(f"    - Quiz container already exists in {tab_id}")
            continue
        
        # Find the container div inside the tab
        container = tab.find('div', class_='container')
        if not container:
            print(f"    ! No container found in {tab_id}")
            continue
        
        # Create quiz container
        quiz_div = soup.new_tag('div')
        quiz_div['id'] = f'quiz-{tab_id}'
        
        # Add comment before the quiz
        comment = soup.new_string('\n\n                ')
        comment_tag = soup.new_string('<!-- Section Quiz -->')
        
        container.append(comment)
        container.append(comment_tag)
        container.append(soup.new_string('\n                '))
        container.append(quiz_div)
        
        quiz_count += 1
        print(f"    ✓ Added quiz container to {tab_id}")
    
    print(f"  ✓ Added {quiz_count} quiz containers")
    return str(soup)


def add_quiz_initialization(html_content, lesson_id):
    """Add quiz initialization script at the end of the file."""
    if 'section-quiz.js' in html_content:
        print("  - Quiz script already present")
        return html_content
    
    # Count tabs to generate initialization code
    tab_count = html_content.count('id="quiz-tab')
    
    if tab_count == 0:
        print("  ! No quiz containers found, skipping script")
        return html_content
    
    # Generate initialization code
    init_code = f'''
    <!-- Section Quiz Component -->
    <script src="js/section-quiz.js"></script>
    <script>
        // Load quiz questions from JSON
        fetch('data/section-questions.json')
            .then(response => response.json())
            .then(data => {{
                const lessonQuestions = data['{lesson_id}'];
                
                if (!lessonQuestions) {{
                    console.warn('No questions found for lesson: {lesson_id}');
                    return;
                }}
                
                // Initialize quizzes for each tab
'''
    
    for i in range(1, tab_count + 1):
        init_code += f'''                if (lessonQuestions['tab{i}']) {{
                    initSectionQuiz('quiz-tab{i}', lessonQuestions['tab{i}']);
                }}
                
'''
    
    init_code += '''            })
            .catch(error => {
                console.error('Erreur chargement questions:', error);
            });
    </script>'''
    
    # Add before </body>
    pattern = r'(</body>)'
    replacement = init_code + r'\n\1'
    
    modified = re.sub(pattern, replacement, html_content, count=1)
    
    if modified != html_content:
        print(f"  ✓ Added quiz initialization script ({tab_count} tabs)")
    
    return modified


def process_lesson_file(filepath, dry_run=False, lesson_id=None):
    """Process a single lesson file to add section quizzes."""
    print(f"\n{'='*60}")
    print(f"Processing: {filepath}")
    print(f"{'='*60}")
    
    if not os.path.exists(filepath):
        print(f"✗ File not found: {filepath}")
        return False
    
    # Derive lesson ID from filename if not provided
    if not lesson_id:
        lesson_id = os.path.basename(filepath).replace('.html', '')
    
    # Read the file
    with open(filepath, 'r', encoding='utf-8') as f:
        original_content = f.read()
    
    # Apply modifications
    modified_content = original_content
    modified_content = add_css_link(modified_content)
    modified_content = add_quiz_containers(modified_content, lesson_id)
    modified_content = add_quiz_initialization(modified_content, lesson_id)
    
    # Check if anything changed
    if modified_content == original_content:
        print("\n✓ No changes needed (already up to date)")
        return True
    
    if dry_run:
        print("\n✓ Dry run complete (no files modified)")
        print(f"  Would have modified {filepath}")
        return True
    
    # Create backup
    backup_file(filepath)
    
    # Write modified content
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(modified_content)
    
    print(f"\n✓ Successfully updated {filepath}")
    return True


def main():
    parser = argparse.ArgumentParser(
        description='Add section quizzes to lesson HTML files'
    )
    parser.add_argument(
        '--file',
        help='Specific file to process'
    )
    parser.add_argument(
        '--all',
        action='store_true',
        help='Process all lesson files'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Test mode (no files modified)'
    )
    parser.add_argument(
        '--lesson-id',
        help='Lesson ID for JSON lookup (default: derived from filename)'
    )
    
    args = parser.parse_args()
    
    # Change to script directory
    script_dir = Path(__file__).parent.parent
    os.chdir(script_dir)
    
    print("Section Quiz Automation Script")
    print("=" * 60)
    
    if args.dry_run:
        print("⚠️  DRY RUN MODE - No files will be modified")
    
    success_count = 0
    fail_count = 0
    
    if args.file:
        # Process single file
        success = process_lesson_file(args.file, args.dry_run, args.lesson_id)
        success_count += 1 if success else 0
        fail_count += 0 if success else 1
    
    elif args.all:
        # Process all files
        for filename in LESSON_FILES:
            success = process_lesson_file(filename, args.dry_run)
            success_count += 1 if success else 0
            fail_count += 0 if success else 1
    
    else:
        parser.print_help()
        return
    
    # Summary
    print(f"\n{'='*60}")
    print("SUMMARY")
    print(f"{'='*60}")
    print(f"✓ Successful: {success_count}")
    print(f"✗ Failed: {fail_count}")
    
    if args.dry_run:
        print("\n⚠️  This was a dry run - no files were actually modified")


if __name__ == '__main__':
    main()
