#!/usr/bin/env node
/**
 * build-interros.js — Réunit les interros des leçons, matière par matière.
 *
 *   node scripts/build-interros.js      (ou : npm run build:interros)
 *
 * Lit data/programme-5e.json et data/interros/<slug>.json (une par leçon,
 * format dans docs/prompt-interros.md), vérifie chaque fichier, puis écrit
 * js/interros-index.js : pour chaque matière, ses leçons qui ont une interro,
 * la plus récente, et une `version`.
 *
 * La version change quand la matière reçoit du nouveau contenu (une leçon de
 * plus, des questions de plus, une date plus récente). L'accueil propose
 * alors une interro surprise de cette matière (js/interro.js). Une simple
 * correction de faute ne la change pas.
 *
 * Une erreur de format arrête le script (code 1) : une interro cassée ne doit
 * pas partir en ligne. Une leçon prête sans interro est seulement signalée.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const PROGRAMME = path.join(RACINE, 'data', 'programme-5e.json');
const DOSSIER = path.join(RACINE, 'data', 'interros');
const SORTIE = path.join(RACINE, 'js', 'interros-index.js');

const LANGUE = /^[a-z]{2}(-[A-Za-z]{2,8})?$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function texte(v) { return typeof v === 'string' && v.trim() !== ''; }

/** Les erreurs (bloquantes) et les remarques d'un fichier d'interro. */
function verifier(interro, slug, matiere) {
    const erreurs = [];
    const remarques = [];

    if (interro.lecon !== slug) { erreurs.push(`"lecon" vaut "${interro.lecon}", attendu "${slug}"`); }
    if (interro.matiere !== matiere) { erreurs.push(`"matiere" vaut "${interro.matiere}", attendu "${matiere}"`); }
    if (!DATE.test(interro.date || '')) { erreurs.push('"date" doit être au format AAAA-MM-JJ'); }

    const langues = (q, ou) => {
        ['langue', 'reponseLangue'].forEach((c) => {
            if (q[c] !== undefined && !LANGUE.test(q[c])) { erreurs.push(`${ou} : "${c}" invalide`); }
        });
    };

    const restitution = Array.isArray(interro.restitution) ? interro.restitution : null;
    if (!restitution) { erreurs.push('"restitution" doit être une liste'); }
    (restitution || []).forEach((q, i) => {
        const ou = `restitution[${i}]`;
        if (!texte(q.question)) { erreurs.push(`${ou} : "question" manquante`); }
        if (!texte(q.reponse)) { erreurs.push(`${ou} : "reponse" manquante`); }
        if (q.accepte !== undefined) {
            if (!Array.isArray(q.accepte) || !q.accepte.every(texte)) { erreurs.push(`${ou} : "accepte" doit être une liste de textes`); }
            else if (String(q.reponse).length > 40) { remarques.push(`${ou} : réponse tapée longue (${String(q.reponse).length} signes)`); }
        }
        if (q.exact !== undefined && typeof q.exact !== 'boolean') { erreurs.push(`${ou} : "exact" doit valoir true ou false`); }
        langues(q, ou);
    });

    const vraiFaux = Array.isArray(interro.vrai_faux) ? interro.vrai_faux : null;
    if (!vraiFaux) { erreurs.push('"vrai_faux" doit être une liste'); }
    (vraiFaux || []).forEach((q, i) => {
        const ou = `vrai_faux[${i}]`;
        if (!texte(q.affirmation)) { erreurs.push(`${ou} : "affirmation" manquante`); }
        if (typeof q.vrai !== 'boolean') { erreurs.push(`${ou} : "vrai" doit valoir true ou false`); }
        if (!texte(q.correction)) { erreurs.push(`${ou} : "correction" manquante`); }
        langues(q, ou);
    });

    if (restitution && restitution.length < 4) { remarques.push(`${restitution.length} question(s) de cours (4 à 6 attendues)`); }
    if (vraiFaux && vraiFaux.length < 6) { remarques.push(`${vraiFaux.length} vrai ou faux (6 à 8 attendus)`); }
    if (vraiFaux && vraiFaux.length >= 4) {
        const vrais = vraiFaux.filter((q) => q.vrai === true).length;
        if (vrais === 0 || vrais === vraiFaux.length) { remarques.push('vrai ou faux : tous ' + (vrais ? 'vrais' : 'faux')); }
    }

    // Deux questions au même énoncé se confondraient dans « Réviser mes erreurs ».
    const vus = new Set();
    (restitution || []).map((q) => q.question).concat((vraiFaux || []).map((q) => q.affirmation)).forEach((e) => {
        if (vus.has(e)) { erreurs.push(`énoncé en double : « ${e} »`); }
        vus.add(e);
    });

    return { erreurs, remarques };
}

function main() {
    const programme = JSON.parse(fs.readFileSync(PROGRAMME, 'utf8'));
    const matieres = (programme.matieres || []).slice().sort((a, b) => (a.ordre || 99) - (b.ordre || 99));
    const fichiers = fs.existsSync(DOSSIER) ? fs.readdirSync(DOSSIER).filter((f) => f.endsWith('.json')) : [];
    const restants = new Set(fichiers.map((f) => f.replace(/\.json$/, '')));

    const index = {};
    let erreursTotales = 0;
    let questionsTotales = 0;

    for (const matiere of matieres) {
        const lecons = [];
        for (const lecon of (matiere.lecons || []).filter((l) => l.statut === 'prete')) {
            const fichier = path.join(DOSSIER, lecon.id + '.json');
            restants.delete(lecon.id);
            if (!fs.existsSync(fichier)) {
                console.warn('     ⚠ pas d\'interro : data/interros/' + lecon.id + '.json');
                continue;
            }

            let interro;
            try {
                interro = JSON.parse(fs.readFileSync(fichier, 'utf8'));
            } catch (err) {
                console.error('     ✗ ' + lecon.id + '.json : JSON invalide — ' + err.message);
                erreursTotales++;
                continue;
            }

            const { erreurs, remarques } = verifier(interro, lecon.id, matiere.id);
            erreurs.forEach((e) => console.error('     ✗ ' + lecon.id + ' : ' + e));
            remarques.forEach((r) => console.warn('     ⚠ ' + lecon.id + ' : ' + r));
            erreursTotales += erreurs.length;
            if (erreurs.length) { continue; }

            const n = interro.restitution.length + interro.vrai_faux.length;
            questionsTotales += n;
            lecons.push({ id: lecon.id, titre: lecon.titre, date: interro.date, n: n });
        }

        if (!lecons.length) {
            console.log('  ' + matiere.icone + ' ' + matiere.nom.padEnd(20) + '(pas d\'interro)');
            continue;
        }

        // La plus récente : la date la plus grande ; à égalité, la plus loin dans le programme.
        const nouvelle = lecons.reduce((a, b) => (b.date >= a.date ? b : a));
        const n = lecons.reduce((s, l) => s + l.n, 0);
        index[matiere.id] = {
            id: matiere.id,
            nom: matiere.nom,
            icone: matiere.icone,
            date: nouvelle.date,
            version: nouvelle.date + '-' + lecons.length + '-' + n,
            nouvelle: nouvelle.id,
            lecons: lecons
        };
        console.log('  ' + matiere.icone + ' ' + matiere.nom.padEnd(20) + lecons.length + ' leçon(s), ' + n + ' questions');
    }

    restants.forEach((slug) => console.warn('     ⚠ data/interros/' + slug + '.json : aucune leçon prête de ce nom, fichier ignoré'));

    if (erreursTotales) {
        console.error('\n✗ ' + erreursTotales + ' erreur(s) dans data/interros/ : js/interros-index.js n\'est pas réécrit.');
        process.exit(1);
    }

    const contenu =
        '/**\n' +
        ' * interros-index.js — GÉNÉRÉ par scripts/build-interros.js\n' +
        ' * Ne pas éditer à la main : modifier data/interros/<slug>.json puis\n' +
        ' * relancer `npm run build:interros`.\n' +
        ' */\n' +
        'self.KarniellaInterros = ' + JSON.stringify({ matieres: index }) + ';\n';
    fs.writeFileSync(SORTIE, contenu, 'utf8');

    console.log('\n✓ ' + Object.keys(index).length + ' matière(s) avec interro, ' + questionsTotales + ' questions');
    console.log('  js/interros-index.js  ' + Math.round(Buffer.byteLength(contenu) / 1024 * 10) / 10 + ' Ko');
}

main();
