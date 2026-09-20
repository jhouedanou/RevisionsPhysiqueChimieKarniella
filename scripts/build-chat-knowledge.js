#!/usr/bin/env node
/**
 * build-chat-knowledge.js — Génère la base de connaissances du chat, page par page.
 *
 *   node scripts/build-chat-knowledge.js      (ou : npm run build:chat)
 *
 * Lit les pages de 5e (dossier 5e/) et en extrait, pour chacune, ses notions
 * (titre + texte), ses onglets et ses questions de quiz.
 *
 * Les ~58 pages de 6e restées à la racine ne sont PLUS scannées : Karniella est
 * passée en 5e et le site ne propose que le programme de l'année en cours. Les
 * fichiers restent dans le dépôt, mais rien ne les référence.
 *
 * Produit deux niveaux :
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
const DOSSIER_5E = path.join(RACINE, '5e');
const DOSSIER_SORTIE = path.join(RACINE, 'data', 'chat');
const FICHIER_INDEX = path.join(RACINE, 'js', 'chat-knowledge-index.js');
const PROGRAMME = path.join(RACINE, 'data', 'programme-5e.json');

/* ============================================================
   Sélection des fichiers
   ============================================================ */

// Le dépôt contient 74 sauvegardes committées (.bak, .contrast-backup,
// .theme_backup_20251130_133709, .backup_20251130_130839…). Elles ne sont plus
// dans le périmètre depuis qu'on ne scanne que 5e/, mais le filtre reste : rien
// ne garantit qu'un script de thème n'en déposera pas là un jour.
const EST_SAUVEGARDE = /\.(bak|contrast-backup|theme_backup_\d+|backup_\d+)$/;

function listerPages() {
    if (!fs.existsSync(DOSSIER_5E)) {
        console.error('Dossier 5e/ absent — lance d\'abord `npm run build:programme`.');
        return [];
    }

    return fs.readdirSync(DOSSIER_5E)
        .filter((nom) => nom.endsWith('.html') && !EST_SAUVEGARDE.test(nom))
        .map((nom) => ({
            slug: nom.slice(0, -'.html'.length),
            chemin: path.join(DOSSIER_5E, nom)
        }))
        .sort((a, b) => a.slug.localeCompare(b.slug));
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

const LONGUEUR_MAX = 550;

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
    // Encadrés destinés à l'œil de Karniella sur la page (« à compléter depuis
    // ton cahier »), pas au chat : les proposer comme sujet de révision n'a
    // aucun sens.
    conteneur.find('[data-hors-chat]').remove();

    conteneur.find(TITRES + ', p, li, tr, .definition, .encadre, .important').each((_, el) => {
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
        // Un <li> dans un <tr>, ou un <p> dans un <tr> : la ligne a déjà
        // apporté ce texte, le reprendre le compterait deux fois.
        if ($el.parents('p, li, tr').length) { return; }

        // Le texte brut d'un <tr> colle ses cellules bout à bout
        // (« ÉtatFormeVolumeExemple ») : on les sépare.
        const texte = balise === 'tr'
            ? nettoyerTexte($el.find('th, td').map((_, c) => $(c).text()).get().join(' — '))
            : nettoyerTexte($el.text());
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

/**
 * Lignes d'un tableau de vocabulaire, converties en notions à part entière.
 *
 * Les mots-clés d'une notion viennent de son TITRE. Pour une leçon d'anglais,
 * tout le vocabulaire vit dans un tableau sous un seul titre (« A/ Vocabulary ») :
 * « what is a canteen ? » ne matchait donc rien. Chaque ligne « mot | définition »
 * devient ici sa propre notion, et le mot devient cherchable.
 */
function extraireVocabulaire($, idOnglet) {
    const notions = [];

    $('.table-vocab').each((_, table) => {
        $(table).find('tbody tr').each((__, ligne) => {
            const cellules = $(ligne).find('td');
            if (cellules.length < 2) { return; }

            const mot = nettoyerTexte($(cellules[0]).text());
            const definition = nettoyerTexte(
                cellules.slice(1).map((i, c) => $(c).text()).get().join(' — ')
            );

            if (!mot || mot.length > 60 || definition.length < 10) { return; }
            if (!motsUtiles(mot).length) { return; }

            notions.push({
                titre: mot,
                onglet: idOnglet,
                texte: tronquer(definition)
            });
        });
    });
    return notions;
}

/* ============================================================
   Matière
   ============================================================ */

/**
 * La matière ne se devine plus : elle est lue dans data/programme-5e.json,
 * qui est la source de vérité du programme. Un slug y est soit l'identifiant
 * d'une matière (page sommaire), soit celui d'une de ses leçons.
 */
function chargerMatieres() {
    const parSlug = {};
    let programme;
    try {
        programme = JSON.parse(fs.readFileSync(PROGRAMME, 'utf8'));
    } catch (err) {
        console.warn('  ! programme-5e.json illisible (' + err.message + ')');
        return parSlug;
    }

    for (const matiere of programme.matieres || []) {
        parSlug[matiere.id] = matiere.id;                       // la page sommaire
        for (const lecon of matiere.lecons || []) {
            parSlug[lecon.id] = matiere.id;                     // ses leçons
        }
    }
    return parSlug;
}

const MATIERE_PAR_SLUG = chargerMatieres();

function deduireMatiere($, slug) {
    if (MATIERE_PAR_SLUG[slug]) { return MATIERE_PAR_SLUG[slug]; }

    // Repli : une page déposée dans 5e/ sans entrée dans le programme. On la
    // rattache via son bouton Retour, qui pointe vers le sommaire de sa matière.
    const retour = $('header .btn-back').attr('href') || '';
    const cible = retour.split('/').pop().split('?')[0].replace(/\.html$/, '');
    if (MATIERE_PAR_SLUG[cible]) { return MATIERE_PAR_SLUG[cible]; }

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

/**
 * Quiz écrits en dur dans le HTML de la page.
 *
 * quizzes.json et section-questions.json ne couvrent que 17 pages, toutes en
 * physique et en maths. 38 pages portent en réalité leur quiz dans leur propre
 * HTML, avec le corrigé dans un objet JS — invisible pour les deux fichiers de
 * données. Sans cette extraction, le mode « interroge-moi » ne fonctionnerait
 * ni en SVT, ni en ECM, ni en français, histoire-géo ou informatique.
 *
 * Deux variantes de balisage coexistent, toutes deux couvertes ici :
 *   .quiz-question > .question-text + label.quiz-option > input[radio]
 *   .quiz-question > h4            + .quiz-options > label > input[radio]
 */
function extraireQuizInline($, html) {
    // 1) Le corrigé : { q1: 'b', q2: 'c', … } quelque part dans le <script>.
    const corrige = corrigeDepuisOnclick(html);

    const bloc = html.match(/(?:quizAnswers|correctAnswers|answers)\s*=\s*\{([^}]*)\}/);
    if (bloc) {
        for (const p of bloc[1].matchAll(/(['"]?)(q\d+)\1\s*:\s*['"]([a-z0-9]+)['"]/gi)) {
            if (!corrige[p[2]]) { corrige[p[2]] = { valeur: p[3], explication: '' }; }
        }
    }
    if (!Object.keys(corrige).length) { return []; }

    // 2) Les énoncés et leurs options.
    const questions = [];
    $('.quiz-question').each((_, el) => {
        const $q = $(el);
        const enonce = nettoyerTexte(
            $q.find('.question-text').first().text() ||
            $q.find('h3, h4').first().text() ||
            $q.find('p').first().text()
        ).replace(/^\d+[.)]\s*/, '');      // « 1. Quel état… » -> « Quel état… »
        if (!enonce) { return; }

        const options = [];
        let nomGroupe = null;

        $q.find('label').each((__, l) => {
            const $l = $(l);
            const input = $l.find('input[type=radio]').first();
            if (!input.length) { return; }
            nomGroupe = nomGroupe || input.attr('name');
            // Certaines pages préfixent le libellé (« a) Des lois… ») : le repère
            // visuel n'a plus de sens une fois la question posée dans le chat.
            const texte = nettoyerTexte($l.text()).replace(/^[a-z][.)]\s+/i, '');
            options.push({ valeur: input.attr('value'), texte: texte });
        });

        // Sans corrigé pour ce groupe, la question est inutilisable : on ne
        // saurait pas corriger Karniella. Mieux vaut l'écarter que la deviner.
        if (options.length < 2 || !nomGroupe || !corrige[nomGroupe]) { return; }
        const attendu = corrige[nomGroupe];
        const bonne = options.find((o) => o.valeur === attendu.valeur);
        if (!bonne) { return; }

        questions.push({
            question: enonce,
            options: options.map((o) => o.texte),
            reponse: bonne.texte,
            explication: attendu.explication
        });
    });
    return questions;
}

/**
 * Variante « corrigé passé en argument » :
 *   <button onclick="checkAnswer('q1', 'b', 'Parce que …')">
 *
 * Six pages font ainsi (education-civique et cinq leçons de maths), et c'est la
 * seule variante HTML qui porte aussi l'explication — précieux pour corriger
 * Karniella autrement qu'en lui donnant la bonne case.
 */
function corrigeDepuisOnclick(html) {
    const corrige = {};
    const motif = /checkAnswer\(\s*['"](q\d+)['"]\s*,\s*['"]([a-z0-9]+)['"]\s*(?:,\s*(['"])([\s\S]*?)\3)?\s*\)/gi;
    for (const m of html.matchAll(motif)) {
        corrige[m[1]] = { valeur: m[2], explication: nettoyerTexte(m[4] || '') };
    }
    return corrige;
}

/**
 * Variante « tableau de données » : `quizData = [{ question, options, correct, explanation }]`
 * dans le <script> de la page (les deux pages de quiz autonomes).
 *
 * Le littéral est évalué plutôt que découpé à la regex : il contient des
 * apostrophes échappées et des virgules dans les énoncés, qu'une regex
 * traiterait mal. C'est un script de build qui lit les fichiers du dépôt
 * lui-même, pas une entrée utilisateur.
 */
function extraireQuizTableau(html) {
    const debut = html.search(/(?:quizData|quizQuestions)\s*=\s*\[/);
    if (debut === -1) { return []; }

    const ouvrant = html.indexOf('[', debut);
    let profondeur = 0;
    let fin = -1;
    for (let i = ouvrant; i < html.length; i++) {
        if (html[i] === '[') { profondeur++; }
        else if (html[i] === ']') { profondeur--; if (!profondeur) { fin = i; break; } }
    }
    if (fin === -1) { return []; }

    let donnees;
    try {
        donnees = new Function('return ' + html.slice(ouvrant, fin + 1))();
    } catch (err) {
        console.warn('  ! tableau de quiz illisible (' + err.message + ')');
        return [];
    }
    if (!Array.isArray(donnees)) { return []; }

    return donnees.map((q) => {
        const options = Array.isArray(q.options) ? q.options.map(nettoyerTexte) : null;
        const enonce = nettoyerTexte(q.question || q.text || '');
        if (!enonce || !options || options.length < 2) { return null; }

        const idx = typeof q.correct === 'number' ? q.correct : q.correctAnswer;
        return {
            question: enonce,
            options: options,
            reponse: options[idx] !== undefined ? options[idx] : null,
            explication: nettoyerTexte(q.explanation || q.explication || '')
        };
    }).filter((q) => q && q.reponse);
}

/* ============================================================
   Traitement d'une page
   ============================================================ */

const MAX_QUIZ = 20;

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
        if (!libelle) { return; }

        // Les pages de 5e déclarent leur cible en data-onglet (js/lecon-5e.js
        // branche les clics) ; les anciennes la cachaient dans un onclick.
        const direct = $(el).attr('data-onglet');
        if (direct) { onglets.push({ id: direct, libelle }); return; }

        const onclick = $(el).attr('onclick') || '';
        const trouve = onclick.match(/openTab\s*\([^,]+,\s*['"]([^'"]+)['"]/);
        if (trouve) { onglets.push({ id: trouve[1], libelle }); }
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

    // Le vocabulaire passe en premier : sur une leçon d'anglais, c'est lui que
    // Karniella vient chercher.
    notions = extraireVocabulaire(cheerio.load(html), null).concat(notions);

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

    // Les questions issues des fichiers de données passent en premier : elles
    // portent souvent une explication, que le HTML n'a pas.
    const quiz = deduplicerQuiz([
        ...(indexQuiz.parSlug[page.slug] || []),
        ...(indexQuiz.parTitre[normaliser(titre)] || []),
        ...extraireQuizInline($, html),
        ...extraireQuizTableau(html)
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
