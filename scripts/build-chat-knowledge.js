#!/usr/bin/env node
/**
 * build-chat-knowledge.js — Génère la base de connaissances du chat, page par page.
 *
 *   node scripts/build-chat-knowledge.js      (ou : npm run build:chat)
 *
 * Lit les pages HTML du site et en extrait, pour chacune, ses notions (titre + texte),
 * ses onglets et ses questions de quiz. Produit deux niveaux :
 *
 *   js/chat-knowledge-index.js   index léger, chargé sur toutes les pages
 *   data/chat/<slug>.json        détail complet, chargé pour la page courante seulement
 *
 * Les fichiers générés ne doivent pas être édités à la main : relancer ce script.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const RACINE = path.join(__dirname, '..');
const DOSSIER_SORTIE = path.join(RACINE, 'data', 'chat');
const FICHIER_INDEX = path.join(RACINE, 'js', 'chat-knowledge-index.js');

/* ============================================================
   Sélection des fichiers
   ============================================================ */

// Le dépôt contient 74 sauvegardes committées (.bak, .contrast-backup,
// .theme_backup_20251130_133709, .backup_20251130_130839…). Elles ressemblent à
// des pages mais n'en sont pas : tout glob naïf les embarque.
const EST_SAUVEGARDE = /\.(bak|contrast-backup|theme_backup_\d+|backup_\d+)$/;

// Pages qui ne sont pas des leçons : rien d'utile à en extraire pour le chat.
const SLUGS_IGNORES = new Set(['lesson-viewer', 'quiz-viewer']);

function listerPages() {
    const dossiers = [RACINE, path.join(RACINE, 'pages-composantes')];
    const pages = [];

    for (const dossier of dossiers) {
        for (const nom of fs.readdirSync(dossier)) {
            if (!nom.endsWith('.html') || EST_SAUVEGARDE.test(nom)) { continue; }
            const slug = nom.slice(0, -'.html'.length);
            if (SLUGS_IGNORES.has(slug)) { continue; }
            pages.push({ slug, chemin: path.join(dossier, nom) });
        }
    }
    return pages.sort((a, b) => a.slug.localeCompare(b.slug));
}

/* ============================================================
   Normalisation — DOIT rester identique à celle de js/chat-assistant.js,
   sinon les mots-clés générés ici ne matcheront jamais côté navigateur.
   ============================================================ */

const STOP_WORDS = new Set([
    'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'et', 'ou',
    'est', 'ce', 'cet', 'cette', 'ces', 'que', 'qui', 'quoi', 'quel',
    'quelle', 'pour', 'avec', 'dans', 'sur', 'par', 'plus', 'moi',
    'toi', 'tu', 'je', 'il', 'elle', 'on', 'nous', 'vous', 'son',
    'sa', 'ses', 'mon', 'ma', 'mes', 'en', 'au', 'aux', 'se', 'sont',
    'cest', 'qu', 'quest', 'ai', 'avoir', 'besoin', 'veut', 'dit',
    'sais', 'dis', 'dire', 'explique', 'expliquer', 'definition',
    'peux', 'veux', 'comment', 'pourquoi', 'quand', 'as', 'a',
    'pas', 'ne', 'si', 'tout', 'tous', 'faire', 'fait', 'sil', 'stp'
]);

function normaliser(texte) {
    return String(texte)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')   // accents
        .replace(/[’'`]/g, ' ')
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function motsUtiles(texte) {
    return normaliser(texte).split(' ').filter((m) => m.length >= 2 && !STOP_WORDS.has(m));
}

// Les mots-clés ne sont PAS pré-calculés ici : chat-assistant.js les dérive des
// titres au chargement, avec son propre `normaliser()`. Deux implémentations de
// la normalisation dans deux langages finiraient par diverger, et les mots-clés
// cesseraient silencieusement de matcher. `normaliser` ne sert plus ici qu'à
// dédoublonner les notions.

/* ============================================================
   Extraction du texte
   ============================================================ */

const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2190}-\u{21FF}]/gu;
// Les « keycaps » (1⃣, 2⃣) sont un chiffre ASCII suivi de U+20E3 : le chiffre
// survit au filtre emoji et laisse « 1 La Graine » si on ne traite pas la paire.
const KEYCAP = /[0-9#*]\u{FE0F}?\u{20E3}/gu;

function nettoyerTitre(texte) {
    return String(texte).replace(KEYCAP, '').replace(EMOJI, '').replace(/\s+/g, ' ').trim();
}

function nettoyerTexte(texte) {
    return String(texte)
        .replace(/ /g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

const LONGUEUR_MAX = 400;

/** Tronque sur une fin de phrase pour ne pas couper au milieu d'un mot. */
function tronquer(texte) {
    if (texte.length <= LONGUEUR_MAX) { return texte; }
    const coupe = texte.slice(0, LONGUEUR_MAX);
    const fin = Math.max(coupe.lastIndexOf('. '), coupe.lastIndexOf(' ! '), coupe.lastIndexOf(' ? '));
    if (fin > LONGUEUR_MAX * 0.5) { return coupe.slice(0, fin + 1); }
    const espace = coupe.lastIndexOf(' ');
    return (espace > 0 ? coupe.slice(0, espace) : coupe) + '…';
}

const TITRES = 'h2, h3, h4';
const MAX_NOTIONS = 14;

/**
 * Découpe un conteneur en notions : chaque titre ouvre une notion, on accumule
 * le texte des éléments suivants jusqu'au titre suivant.
 */
function extraireNotions($, conteneur, idOnglet) {
    const notions = [];
    let courante = null;

    conteneur.find('script, style, .section-quiz-wrapper, .tabs').remove();

    conteneur.find(TITRES + ', p, li, td, .definition, .encadre, .important').each((_, el) => {
        const $el = $(el);
        const balise = el.tagName ? el.tagName.toLowerCase() : '';

        if (balise === 'h2' || balise === 'h3' || balise === 'h4') {
            const titre = nettoyerTitre($el.text());
            if (!titre || titre.length < 3) { courante = null; return; }
            courante = { titre, onglet: idOnglet, morceaux: [] };
            notions.push(courante);
            return;
        }

        if (!courante) { return; }
        // Un <li> dans un <td>, ou un <p> dans un <td> : le parent a déjà
        // apporté ce texte, le reprendre le compterait deux fois.
        if ($el.parents('p, li, td').length) { return; }

        const texte = nettoyerTexte($el.text());
        if (texte.length < 15) { return; }
        if (courante.morceaux.join(' ').length > LONGUEUR_MAX * 1.5) { return; }
        courante.morceaux.push(texte);
    });

    return notions
        .map((n) => ({
            titre: n.titre,
            onglet: n.onglet,
            texte: tronquer(nettoyerTexte(n.morceaux.join(' ')))
        }))
        .filter((n) => n.texte.length >= 40 && motsUtiles(n.titre).length > 0);
}

/* ============================================================
   Matière
   ============================================================ */

// Le bouton « ← Retour » de chaque leçon pointe vers le sommaire de sa matière :
// c'est le signal le plus fiable dont on dispose.
const HUB_VERS_MATIERE = {
    'mathematiques.html': 'mathematiques',
    'physique.html': 'physique',
    'svt-lecons.html': 'svt',
    'svt.html': 'svt',
    'histoire-geographie-lecons.html': 'histoire-geo',
    'histoire-geographie.html': 'histoire-geo',
    'education-civique.html': 'education-civique',
    'francais-lecons.html': 'francais',
    'francais.html': 'francais',
    'tice.html': 'tice'
};

const PREFIXES_MATIERE = [
    // pages-composantes/ : fragments interactifs sur le circuit électrique.
    [/^\d\d-/, 'physique'],
    [/^maths?-/, 'mathematiques'],
    [/^svt-/, 'svt'],
    [/^ecm-/, 'education-civique'],
    [/^education-civique/, 'education-civique'],
    [/^francais/, 'francais'],
    [/^histoire-/, 'histoire-geo'],
    [/^informatique-/, 'tice'],
    [/^(le|les|lecon)-/, 'physique']
];

function deduireMatiere($, slug) {
    const retour = $('header .btn-back').attr('href') || $('.btn-back').first().attr('href') || '';
    const cible = retour.split('/').pop().split('?')[0];
    if (HUB_VERS_MATIERE[cible]) { return HUB_VERS_MATIERE[cible]; }
    if (HUB_VERS_MATIERE[slug + '.html']) { return HUB_VERS_MATIERE[slug + '.html']; }
    for (const [motif, matiere] of PREFIXES_MATIERE) {
        if (motif.test(slug)) { return matiere; }
    }
    return 'general';
}

/* ============================================================
   Quiz
   ============================================================ */

function lireJSON(relatif, defaut) {
    try {
        return JSON.parse(fs.readFileSync(path.join(RACINE, relatif), 'utf8'));
    } catch (err) {
        console.warn('  ! ' + relatif + ' illisible (' + err.message + ') — ignoré');
        return defaut;
    }
}

/**
 * Les deux fichiers de quiz ont des schémas divergents : quizzes.json nomme
 * l'énoncé `text`, section-questions.json le nomme `question`. On normalise
 * vers `question` pour que le reste de la chaîne n'ait qu'une forme à connaître.
 */
function normaliserQuestion(q) {
    const enonce = nettoyerTexte(q.question || q.text || '');
    if (!enonce || !Array.isArray(q.options)) { return null; }
    return {
        question: enonce,
        options: q.options.map(nettoyerTexte),
        reponse: q.options[q.correctAnswer] !== undefined
            ? nettoyerTexte(q.options[q.correctAnswer])
            : null,
        explication: nettoyerTexte(q.explanation || '')
    };
}

/**
 * Les `lessonId` de quizzes.json ne sont PAS des noms de fichiers : ce sont les
 * titres des leçons slugifiés (`droites-et-points` pour la page
 * `maths-lecon-3-droites-points.html`). La jointure passe par lessons.json, qui
 * porte à la fois `id` et `url`. Sans elle, 11 quiz sur 14 restent orphelins.
 */
function construireIndexQuiz() {
    const parSlug = {};
    const parTitre = {};

    const ajouter = (cible, slug, questions) => {
        if (!slug) { return; }
        (cible[slug] = cible[slug] || []).push(...questions);
    };

    const lecons = lireJSON('data/lessons.json', { lessons: [] }).lessons || [];
    const idVersSlug = {};
    for (const lecon of lecons) {
        if (lecon.id && lecon.url) {
            idVersSlug[lecon.id] = lecon.url.replace(/\.html$/, '');
        }
    }

    const quizzes = lireJSON('data/quizzes.json', { quizzes: [] }).quizzes || [];
    for (const quiz of quizzes) {
        const questions = (quiz.questions || []).map(normaliserQuestion).filter(Boolean);
        if (!questions.length) { continue; }

        const slug = idVersSlug[quiz.lessonId] || quiz.lessonId;
        if (slug) {
            ajouter(parSlug, slug, questions);
            // Chaque leçon a souvent une page de quiz autonome `<slug>-quiz.html`.
            ajouter(parSlug, slug + '-quiz', questions);
        }

        // Repli pour les quiz sans lessonId exploitable (il y en a un) :
        // rapprochement par titre, résolu au moment de traiter la page.
        const titre = normaliser(String(quiz.title || '').replace(/^quiz\s*[-–:]\s*/i, ''));
        if (titre) { ajouter(parTitre, titre, questions); }
    }

    // section-questions.json, lui, est bien indexé par slug de page.
    const sections = lireJSON('data/section-questions.json', {});
    for (const [slug, onglets] of Object.entries(sections)) {
        const questions = Object.values(onglets)
            .flat()
            .map(normaliserQuestion)
            .filter(Boolean);
        ajouter(parSlug, slug, questions);
    }

    return { parSlug, parTitre };
}

/* ============================================================
   Traitement d'une page
   ============================================================ */

const MAX_QUIZ = 12;

/** Deux sources peuvent apporter la même question : on la garde une fois. */
function deduplicerQuiz(questions) {
    const vues = new Set();
    return questions.filter((q) => {
        const cle = normaliser(q.question);
        if (vues.has(cle)) { return false; }
        vues.add(cle);
        return true;
    });
}

function traiterPage(page, indexQuiz) {
    const html = fs.readFileSync(page.chemin, 'utf8');
    const $ = cheerio.load(html);

    const titre = nettoyerTitre($('header h1').first().text())
        || nettoyerTitre($('h1').first().text())
        || nettoyerTitre($('title').text().split(' - ')[0])
        || page.slug;

    const sousTitre = nettoyerTexte($('header p').first().text()).slice(0, 120);
    const matiere = deduireMatiere($, page.slug);
    const retour = $('header .btn-back').attr('href') || $('.btn-back').first().attr('href') || '';

    // Onglets : le libellé est dans le bouton, l'id cible dans son onclick.
    const onglets = [];
    $('.tab-button').each((_, el) => {
        const libelle = nettoyerTitre($(el).text());
        const onclick = $(el).attr('onclick') || '';
        const trouve = onclick.match(/openTab\s*\([^,]+,\s*['"]([^'"]+)['"]/);
        if (libelle && trouve) { onglets.push({ id: trouve[1], libelle }); }
    });

    // Notions, onglet par onglet ; à défaut d'onglets, sur le corps entier.
    let notions = [];
    if (onglets.length) {
        for (const onglet of onglets) {
            const conteneur = $('#' + onglet.id);
            if (conteneur.length) {
                notions = notions.concat(extraireNotions($, conteneur, onglet.id));
            }
        }
    }
    if (!notions.length) {
        notions = extraireNotions($, $('main').length ? $('main') : $('body'), null);
    }

    // Doublons : le même titre apparaît parfois dans plusieurs onglets.
    const vus = new Set();
    notions = notions
        .filter((n) => {
            const cle = normaliser(n.titre);
            if (vus.has(cle)) { return false; }
            vus.add(cle);
            return true;
        })
        .slice(0, MAX_NOTIONS);

    const quiz = deduplicerQuiz([
        ...(indexQuiz.parSlug[page.slug] || []),
        ...(indexQuiz.parTitre[normaliser(titre)] || [])
    ]).slice(0, MAX_QUIZ);

    return { slug: page.slug, titre, sousTitre, matiere, retour, onglets, notions, quiz };
}

/* ============================================================
   Écriture
   ============================================================ */

function ecrireIndex(pages) {
    const index = {};
    for (const p of pages) {
        index[p.slug] = {
            titre: p.titre,
            sousTitre: p.sousTitre,
            matiere: p.matiere,
            retour: p.retour,
            onglets: p.onglets,
            nbQuiz: p.quiz.length,
            // Assez pour cadrer la recherche, construire les suggestions et le
            // message d'échec sans charger le détail de la page.
            notions: p.notions.map((n) => ({ titre: n.titre, onglet: n.onglet }))
        };
    }

    const contenu =
        '/**\n' +
        ' * chat-knowledge-index.js — GÉNÉRÉ par scripts/build-chat-knowledge.js\n' +
        ' * Ne pas éditer à la main : relancer `npm run build:chat`.\n' +
        ' *\n' +
        ' * Index léger de toutes les pages du site : de quoi permettre au chat de\n' +
        ' * savoir sur quelle leçon il se trouve et ce qu\'elle contient. Le texte\n' +
        ' * complet des notions vit dans data/chat/<slug>.json, chargé à la demande.\n' +
        ' */\n' +
        // `self` plutôt que `window` : le service worker importe ce même fichier
        // pour savoir quelles pages précacher, et n'a pas de `window`.
        'self.KarniellaChatKnowledge = ' + JSON.stringify({ version: 1, pages: index }) + ';\n';

    fs.writeFileSync(FICHIER_INDEX, contenu, 'utf8');
    return Buffer.byteLength(contenu);
}

function ecrireDetails(pages) {
    fs.rmSync(DOSSIER_SORTIE, { recursive: true, force: true });
    fs.mkdirSync(DOSSIER_SORTIE, { recursive: true });

    let total = 0;
    for (const p of pages) {
        const contenu = JSON.stringify(p);
        fs.writeFileSync(path.join(DOSSIER_SORTIE, p.slug + '.json'), contenu, 'utf8');
        total += Buffer.byteLength(contenu);
    }
    return total;
}

/* ============================================================
   Point d'entrée
   ============================================================ */

function main() {
    const fichiers = listerPages();
    const indexQuiz = construireIndexQuiz();

    console.log(fichiers.length + ' pages à traiter…\n');

    const pages = [];
    const sansNotion = [];

    for (const fichier of fichiers) {
        try {
            const page = traiterPage(fichier, indexQuiz);
            pages.push(page);
            if (!page.notions.length) { sansNotion.push(page.slug); }
        } catch (err) {
            console.error('  ✗ ' + fichier.slug + ' : ' + err.message);
        }
    }

    const tailleIndex = ecrireIndex(pages);
    const tailleDetails = ecrireDetails(pages);

    const totalNotions = pages.reduce((n, p) => n + p.notions.length, 0);
    const totalQuiz = pages.reduce((n, p) => n + p.quiz.length, 0);
    const parMatiere = {};
    for (const p of pages) { parMatiere[p.matiere] = (parMatiere[p.matiere] || 0) + 1; }

    console.log('✓ ' + pages.length + ' pages, ' + totalNotions + ' notions, ' + totalQuiz + ' questions de quiz');
    console.log('  par matière : ' + Object.entries(parMatiere)
        .sort((a, b) => b[1] - a[1])
        .map(([m, n]) => m + '=' + n).join(', '));
    console.log('  js/chat-knowledge-index.js  ' + Math.round(tailleIndex / 1024) + ' Ko');
    console.log('  data/chat/*.json            ' + Math.round(tailleDetails / 1024) + ' Ko au total');

    if (sansNotion.length) {
        // Signalé plutôt que masqué : sur ces pages le chat retombera sur la
        // base globale, ce qui est correct mais moins bon.
        console.log('\n  ⚠ aucune notion extraite (' + sansNotion.length + ') : ' + sansNotion.join(', '));
    }
}

main();
