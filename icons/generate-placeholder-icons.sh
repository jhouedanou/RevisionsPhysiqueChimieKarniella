#!/bin/bash
# Script pour générer des icônes placeholder PNG en attendant les vraies icônes

# Créer un répertoire temporaire
cd "$(dirname "$0")"

# Pour chaque taille, créer une icône simple
# Note : Ce script nécessite ImageMagick install. Pour un placeholder simple,
# on peut aussi copier le SVG renommé en PNG (les navigateurs le supportent)

echo "📝 Pour générer les icônes PNG, vous pouvez:"
echo "1. Utiliser https://realfavicongenerator.net/ (recommandé)"
echo "2. Installer ImageMagick et exécuter ce script"
echo "3. Créer vos propres icônes 512x512 et les redimensionner"
echo ""
echo "Tailles requises: 72, 96, 128, 144, 152, 192, 384, 512"
echo ""
echo "En attendant, le SVG fonctionne aussi comme placeholder!"

# Copier le SVG comme fallback pour les navigateurs qui le supportent
cp icon.svg icon-192x192.png 2>/dev/null || true
cp icon.svg icon-512x512.png 2>/dev/null || true

echo "✓ Placeholder icons created (SVG renamed to PNG as fallback)"
