# Icons PWA pour Karniella

## Générer les icônes PNG à partir du SVG

L'icône SVG `icon.svg` est fournie. Pour générer toutes les tailles PNG nécessaires :

### Option 1 : En ligne (facile)
1. Aller sur https://realfavicongenerator.net/
2. Uploader `icon.svg`
3. Télécharger le package complet

### Option 2 : Avec ImageMagick (ligne de commande)
```bash
# Installer ImageMagick si nécessaire :
# brew install imagemagick (Mac)
# sudo apt-get install imagemagick (Linux)

# Générer toutes les tailles
convert icon.svg -resize 72x72 icon-72x72.png
convert icon.svg -resize 96x96 icon-96x96.png
convert icon.svg -resize 128x128 icon-128x128.png
convert icon.svg -resize 144x144 icon-144x144.png
convert icon.svg -resize 152x152 icon-152x152.png
convert icon.svg -resize 192x192 icon-192x192.png
convert icon.svg -resize 384x384 icon-384x384.png
convert icon.svg -resize 512x512 icon-512x512.png
```

### Option 3 : Remplacer par vos propres icônes
Créez simplement les fichiers PNG aux tailles suivantes dans ce dossier :
- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png (OBLIGATOIRE)
- icon-384x384.png
- icon-512x512.png (OBLIGATOIRE)

## Design recommandé
- Fond : Gradient rose (#FFB6D9 → #FF69B4)
- Logo : Livre 📚 ou graduation cap 🎓
- Style : Kawaii, adapté aux enfants
- Format : Carré avec coins arrondis
