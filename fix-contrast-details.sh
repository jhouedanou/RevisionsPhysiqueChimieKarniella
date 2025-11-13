#!/bin/bash

# Améliorer encore plus le contraste avec des changements spécifiques
echo "🎨 Améliorations supplémentaires du contraste..."

for file in mathematiques.html physique.html svt-lecons.html histoire-geographie-lecons.html; do
    if [ -f "$file" ]; then
        echo "  📝 Amélioration de $file..."
        
        # Améliorer les titres H2
        sed -i '' 's/color: #FF1493; font-weight: 700;/color: #C71585; font-weight: 700; text-shadow: 1px 1px 2px rgba(199, 21, 133, 0.2);/g' "$file"
        
        # Améliorer les boutons
        sed -i '' 's/background: linear-gradient(135deg, #FF69B4 0%, #FF1493 100%);/background: linear-gradient(135deg, #FF69B4 0%, #C71585 100%);/g' "$file"
        sed -i '' 's/box-shadow: 0 4px 15px rgba(255, 20, 147, 0.6); border: 2px solid #C71585;/box-shadow: 0 4px 15px rgba(199, 21, 133, 0.6); border: 2px solid #C71585; text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);/g' "$file"
        
        echo "    ✓ $file amélioré"
    fi
done

# Améliorer les pages de leçons détaillées
for file in svt.html histoire-geographie.html; do
    if [ -f "$file" ]; then
        echo "  📝 Amélioration de $file..."
        
        # Améliorer les headers
        sed -i '' 's/background: linear-gradient(135deg, #FF69B4 0%, #FF1493 100%);/background: linear-gradient(135deg, #FF1493 0%, #C71585 100%);/g' "$file"
        
        # Améliorer les tab-buttons actifs
        sed -i '' 's/background: linear-gradient(135deg, #FF69B4 0%, #FF1493 100%); color: white;/background: linear-gradient(135deg, #C71585 0%, #8B008B 100%); color: white; font-weight: 700;/g' "$file"
        
        echo "    ✓ $file amélioré"
    fi
done

echo ""
echo "✅ Contraste supplémentaire appliqué !"
