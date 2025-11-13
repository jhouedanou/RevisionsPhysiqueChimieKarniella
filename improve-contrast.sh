#!/bin/bash

# Script pour améliorer le contraste sur toutes les pages HTML
echo "🎨 Amélioration du contraste sur toutes les pages..."

improve_contrast() {
    local file="$1"
    echo "  ✨ Amélioration de $file..."
    
    # Sauvegarder l'original
    cp "$file" "$file.contrast-backup"
    
    # Améliorer le contraste des textes
    # Texte gris clair #666 -> gris foncé #333 pour meilleure lisibilité
    sed -i '' 's/color: #666;/color: #333;/g' "$file"
    sed -i '' 's/color:#666;/color:#333;/g' "$file"
    
    # Texte blanc -> blanc avec ombre portée pour meilleure lisibilité sur fond rose
    sed -i '' 's/color: white;/color: white; text-shadow: 1px 1px 3px rgba(0,0,0,0.3);/g' "$file"
    
    # Améliorer les titres roses - ajouter une ombre
    sed -i '' 's/color: #FF1493;$/color: #C71585; font-weight: 700;/g' "$file"
    
    # Renforcer les bordures
    sed -i '' 's/border: 3px solid #FFB6D9;/border: 4px solid #FF69B4;/g' "$file"
    sed -i '' 's/border: 2px solid #FF69B4;/border: 3px solid #FF1493;/g' "$file"
    
    # Améliorer le contraste des backgrounds de cartes
    sed -i '' 's/background: linear-gradient(135deg, #FFF0F5 0%, #FFE5F0 100%);/background: linear-gradient(135deg, #FFFFFF 0%, #FFF0F5 100%);/g' "$file"
    
    # Améliorer les boutons - bordure plus visible
    sed -i '' 's/box-shadow: 0 4px 15px rgba(255, 105, 180, 0.4);/box-shadow: 0 4px 15px rgba(255, 20, 147, 0.6); border: 2px solid #C71585;/g' "$file"
    
    # Améliorer le contraste des box (definition, example, property)
    sed -i '' 's/background: #e3f2fd;/background: #FFFFFF; border: 3px solid #2196f3;/g' "$file"
    sed -i '' 's/background: #fff3e0;/background: #FFFFFF; border: 3px solid #ff9800;/g' "$file"
    sed -i '' 's/background: #e8f5e9;/background: #FFFFFF; border: 3px solid #4caf50;/g' "$file"
    
    echo "    ✓ Contraste amélioré pour $file"
}

# Améliorer toutes les pages HTML dans le répertoire principal
for file in *.html; do
    if [ -f "$file" ] && [ "$file" != "*.html" ]; then
        improve_contrast "$file"
    fi
done

# Améliorer les pages dans pages-composantes/
if [ -d "pages-composantes" ]; then
    cd pages-composantes
    for file in *.html; do
        if [ -f "$file" ] && [ "$file" != "*.html" ]; then
            improve_contrast "$file"
        fi
    done
    cd ..
fi

echo ""
echo "✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨"
echo "✨  Contraste amélioré sur toutes les pages !  ✨"
echo "✨  - Textes plus foncés (#333 au lieu de #666) ✨"
echo "✨  - Ombres ajoutées pour la profondeur      ✨"
echo "✨  - Bordures renforcées                     ✨"
echo "✨  - Backgrounds plus blancs                 ✨"
echo "✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨"
