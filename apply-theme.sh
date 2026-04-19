#!/bin/bash

# Script pour appliquer le thème Hello Kitty à toutes les pages HTML
# Ce script remplace les couleurs bleues/violettes par des couleurs roses

apply_theme_to_file() {
    local file="$1"
    echo "Application du thème Hello Kitty à $file..."
    
    # Sauvegarder l'original
    cp "$file" "$file.bak"
    
    # Remplacer les couleurs dans le fichier
    sed -i '' 's/linear-gradient(135deg, #667eea 0%, #764ba2 100%)/linear-gradient(135deg, #FFB6D9 0%, #FF69B4 50%, #FFE5F0 100%)/g' "$file"
    sed -i '' 's/#667eea/#FF69B4/g' "$file"
    sed -i '' 's/#764ba2/#FF1493/g' "$file"
    sed -i '' 's/#2196f3/#FF69B4/g' "$file"
    sed -i '' 's/#1565c0/#FF1493/g' "$file"
    sed -i '' 's/#ff9800/#FF69B4/g' "$file"
    sed -i '' 's/#e65100/#FF1493/g' "$file"
    sed -i '' 's/#4caf50/#FF69B4/g' "$file"
    sed -i '' 's/#2e7d32/#FF1493/g' "$file"
    sed -i '' 's/#e74c3c/#FF1493/g' "$file"
    sed -i '' 's/#3498db/#FF69B4/g' "$file"
    sed -i '' 's/#2c3e50/#FF1493/g' "$file"
    
    # Remplacer les fonts
    sed -i '' "s/'Segoe UI'/'Comic Sans MS', 'Segoe UI'/g" "$file"
    
    # Remplacer backgrounds blancs par roses
    sed -i '' 's/background: white;/background: linear-gradient(135deg, #FFF0F5 0%, #FFE5F0 100%);/g' "$file"
    sed -i '' 's/background: rgba(0, 0, 0, 0.9);/background: linear-gradient(135deg, #FF69B4 0%, #FF1493 100%);/g' "$file"
    
    # Ajouter box-shadow rose
    sed -i '' 's/box-shadow: 0 30px 80px rgba(0, 0, 0, 0.4);/box-shadow: 0 30px 80px rgba(255, 105, 180, 0.4); border: 3px solid #FFB6D9;/g' "$file"
    
    echo "✓ Thème appliqué à $file"
}

# Appliquer le thème à toutes les leçons de maths
for file in maths-lecon-*.html; do
    if [ "$file" != "maths-lecon-1-calculs-algebriques.html" ]; then
        apply_theme_to_file "$file"
    fi
done

# Appliquer le thème aux leçons de physique
for file in le-circuit-electrique.html les-commandes-electriques.html lecon-3-court-circuit.html; do
    if [ -f "$file" ]; then
        apply_theme_to_file "$file"
    fi
done

# Appliquer le thème aux quiz de physique
for file in le-circuit-electrique-quiz.html les-commandes-electriques-quiz.html lecon-3-court-circuit-quiz.html; do
    if [ -f "$file" ]; then
        apply_theme_to_file "$file"
    fi
done

echo ""
echo "========================================="
echo "Thème Hello Kitty appliqué à toutes les pages !"
echo "========================================="
