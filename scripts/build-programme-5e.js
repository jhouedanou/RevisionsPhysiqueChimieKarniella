#!/usr/bin/env node
/**
 * build-programme-5e.js — Génère les sommaires de matière de 5e.
 *
 *   node scripts/build-programme-5e.js      (ou : npm run build:programme)
 *
 * Lit data/programme-5e.json et écrit une page 5e/<matiere>.html par matière.
 * Les pages de leçon, elles, sont écrites à la main : seul le sommaire qui les
 * liste est généré, pour qu'ajouter une leçon ne demande qu'une entrée de
 * données plutôt que la retouche d'un fichier HTML.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const PROGRAMME = path.join(RACINE, 'data', 'programme-5e.json');
const DOSSIER_5E = path.join(RACINE, '5e');

/** Échappe le texte destiné au HTML : il vient d'un fichier de données. */
function echapper(texte) {
    return String(texte === undefined || texte === null ? '' : texte)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/** Une carte de leçon : lien cliquable si la page existe, grisée sinon. */
function carteLecon(lecon) {
    const titre = echapper(lecon.titre);
    const sousTitre = lecon.sousTitre ? `<p>${echapper(lecon.sousTitre)}</p>` : '';
    const description = lecon.description ? `<p>${echapper(lecon.description)}</p>` : '';
    const icone = echapper(lecon.icone || '📄');

    if (lecon.statut === 'prete') {
        return `      <a class="carte-lecon" href="${echapper(lecon.id)}.html">
        <span class="icone" aria-hidden="true">${icone}</span>
        <span class="etiquette prete">Disponible</span>
        <h3>${titre}</h3>
        ${sousTitre}
        ${description}
      </a>`;
    }

    return `      <div class="carte-lecon a-venir">
        <span class="icone" aria-hidden="true">${icone}</span>
        <span class="etiquette attente">À venir</span>
        <h3>${titre}</h3>
        ${sousTitre}
        ${description}
      </div>`;
}

/** Message affiché quand aucune leçon n'a encore été saisie. */
function sommaireVide(matiere) {
    return `      <div class="vide">
        <p class="gros" aria-hidden="true">${echapper(matiere.icone)}</p>
        <p><strong>Pas encore de leçon de ${echapper(matiere.nom)} ici.</strong></p>
        <p>Dès que le cours est pris en note, il apparaîtra sur cette page. 🐴</p>
      </div>`;
}

function pageMatiere(matiere, programme) {
    const lecons = matiere.lecons || [];
    const pretes = lecons.filter((l) => l.statut === 'prete').length;

    const corps = lecons.length
        ? `      <div class="grille-lecons">
${lecons.map(carteLecon).join('\n')}
      </div>`
        : sommaireVide(matiere);

    const compte = lecons.length
        ? `${pretes} leçon${pretes > 1 ? 's' : ''} disponible${pretes > 1 ? 's' : ''}` +
          (lecons.length > pretes ? ` · ${lecons.length - pretes} à venir` : '')
        : 'Sommaire à remplir';

    return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${echapper(matiere.nom)} ${programme.niveau} - Révisions Karniella</title>
<meta name="description" content="${echapper(matiere.description)}">
<link rel="manifest" href="../manifest.json">
<link rel="stylesheet" href="../css/karniella-theme.css">
<link rel="stylesheet" href="../css/lecon-5e.css">
</head>
<body class="lecon-5e">
<header>
<a class="btn-back" href="../index.html">← Retour à l'accueil</a>
<span class="badge-niveau">Classe de ${echapper(programme.niveau)}</span>
<h1>${echapper(matiere.icone)} ${echapper(matiere.nom)}</h1>
<p>${echapper(matiere.description)}</p>
</header>

<main class="content">
  <section class="container">
    <h2>Mes leçons — ${echapper(compte)}</h2>
${corps}
  </section>
</main>

<p class="pied">Révisions de Karniella · ${echapper(programme.niveau)} · ${echapper(programme.anneeScolaire)}</p>

<script src="../js/chat-assistant.js" defer></script>
</body>
</html>
`;
}

/* ============================================================
   Catalogue pour l'accueil
   ============================================================ */

const FICHIER_PROGRAMME_JS = path.join(RACINE, 'js', 'programme-5e.js');

/**
 * Écrit le programme sous forme de fichier JavaScript.
 *
 * Un `.js` plutôt qu'un `.json` : l'accueil le charge par une balise <script>,
 * donc sans `fetch`. Il est servi en cache-first par le service worker et
 * s'affiche hors-ligne sans dépendre d'une requête réseau — ce qui compte pour
 * la page d'entrée du site.
 *
 * `self` et non `window` : le service worker importe le même fichier.
 */
function ecrireProgrammeJS(programme, matieres) {
    const donnees = {
        niveau: programme.niveau,
        anneeScolaire: programme.anneeScolaire,
        matieres: matieres.map((m) => ({
            id: m.id,
            nom: m.nom,
            icone: m.icone,
            description: m.description,
            lecons: (m.lecons || []).map((l) => ({
                id: l.id,
                titre: l.titre,
                sousTitre: l.sousTitre || '',
                icone: l.icone || '📄',
                statut: l.statut
            }))
        }))
    };

    const contenu =
        '/**\n' +
        ' * programme-5e.js — GÉNÉRÉ par scripts/build-programme-5e.js\n' +
        ' * Ne pas éditer à la main : modifier data/programme-5e.json puis\n' +
        ' * relancer `npm run build:programme`.\n' +
        ' */\n' +
        'self.KarniellaProgramme = ' + JSON.stringify(donnees) + ';\n';

    fs.writeFileSync(FICHIER_PROGRAMME_JS, contenu, 'utf8');
    return Buffer.byteLength(contenu);
}

function main() {
    const programme = JSON.parse(fs.readFileSync(PROGRAMME, 'utf8'));
    const matieres = (programme.matieres || [])
        .slice()
        .sort((a, b) => (a.ordre || 99) - (b.ordre || 99));

    fs.mkdirSync(DOSSIER_5E, { recursive: true });

    let totalLecons = 0;
    let totalPretes = 0;

    for (const matiere of matieres) {
        const fichier = path.join(DOSSIER_5E, matiere.id + '.html');
        fs.writeFileSync(fichier, pageMatiere(matiere, programme), 'utf8');

        const lecons = matiere.lecons || [];
        const pretes = lecons.filter((l) => l.statut === 'prete');
        totalLecons += lecons.length;
        totalPretes += pretes.length;

        console.log(
            '  ' + matiere.icone + ' ' + matiere.nom.padEnd(20) +
            (lecons.length ? pretes.length + '/' + lecons.length + ' leçon(s)' : '(vide)')
        );

        // Une leçon annoncée « prête » dont la page n'existe pas produirait un
        // lien mort sur le sommaire : mieux vaut le dire tout de suite.
        for (const lecon of pretes) {
            if (!fs.existsSync(path.join(DOSSIER_5E, lecon.id + '.html'))) {
                console.warn('     ⚠ page manquante : 5e/' + lecon.id + '.html');
            }
        }
    }

    const taille = ecrireProgrammeJS(programme, matieres);

    console.log('\n✓ ' + matieres.length + ' sommaires écrits dans 5e/');
    console.log('  ' + totalPretes + ' leçon(s) disponible(s) sur ' + totalLecons + ' annoncée(s)');
    console.log('  js/programme-5e.js  ' + Math.round(taille / 1024) + ' Ko (catalogue de l\'accueil)');
}

main();
