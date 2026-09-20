/**
 * routes/chat.js — Repli IA de l'assistant de révision.
 *
 * Appelé UNIQUEMENT quand la base hors-ligne du navigateur n'a rien trouvé.
 * Sans ANTHROPIC_API_KEY, la route répond 503 et le chat retombe sur son repli
 * local : le site reste parfaitement utilisable sans cette route.
 *
 * Le client n'envoie que le slug de la page, jamais son contenu : le contexte
 * donné au modèle est relu ici, à partir des fichiers générés par
 * `npm run build:chat`. Charge utile minuscule, et contexte digne de confiance.
 */

'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const DOSSIER_CHAT = path.join(__dirname, '..', 'data', 'chat');

const MODELE = process.env.CHAT_MODEL || 'claude-opus-5';
const MAX_QUESTION = 500;
const MAX_TOURS = 6;

/* ============================================================
   Client Anthropic — construit à la demande
   ============================================================ */

let client = null;
let clientIndisponible = false;

function obtenirClient() {
    if (client || clientIndisponible) { return client; }

    if (!process.env.ANTHROPIC_API_KEY) {
        clientIndisponible = true;
        return null;
    }
    try {
        const Anthropic = require('@anthropic-ai/sdk');
        client = new Anthropic();          // lit ANTHROPIC_API_KEY
        return client;
    } catch (err) {
        // Le paquet n'est pas installé : ce n'est pas une panne, juste une
        // fonctionnalité non déployée. Le chat local continue de fonctionner.
        console.warn('[chat] @anthropic-ai/sdk indisponible : ' + err.message);
        clientIndisponible = true;
        return null;
    }
}

/* ============================================================
   Limitation de débit
   ============================================================ */

const FENETRE_MS = 60 * 1000;
const MAX_PAR_FENETRE = 12;
const appels = new Map();

/**
 * Fenêtre glissante par IP. À considérer comme un garde-fou de « meilleur
 * effort » : en serverless chaque instance a sa propre mémoire, et le compteur
 * repart de zéro à froid. Il protège d'une boucle côté client, pas d'un abus
 * déterminé — pour ça il faudrait un compteur partagé.
 */
function debitDepasse(ip) {
    const maintenant = Date.now();
    const recents = (appels.get(ip) || []).filter((t) => maintenant - t < FENETRE_MS);
    recents.push(maintenant);
    appels.set(ip, recents);

    if (appels.size > 500) {
        for (const [cle, horodatages] of appels) {
            if (!horodatages.some((t) => maintenant - t < FENETRE_MS)) { appels.delete(cle); }
        }
    }
    return recents.length > MAX_PAR_FENETRE;
}

/* ============================================================
   Contexte de la page
   ============================================================ */

// Le slug arrive du client : il ne doit jamais servir à construire un chemin
// sans être vérifié, sinon `../../etc/passwd` devient un contexte valide.
const SLUG_VALIDE = /^[a-z0-9][a-z0-9-]{0,80}$/i;

function lireContexte(slug) {
    if (!SLUG_VALIDE.test(slug)) { return null; }

    const fichier = path.join(DOSSIER_CHAT, slug + '.json');
    if (path.dirname(fichier) !== DOSSIER_CHAT) { return null; }

    try {
        return JSON.parse(fs.readFileSync(fichier, 'utf8'));
    } catch (err) {
        return null;
    }
}

/** Met la page en forme pour le modèle : titres, notions, quiz. */
function formaterContexte(page) {
    const lignes = [
        'Voici le contenu exact de la page que Karniella a sous les yeux.',
        '',
        'LEÇON : ' + page.titre,
        'MATIÈRE : ' + page.matiere
    ];
    if (page.sousTitre) { lignes.push('SOUS-TITRE : ' + page.sousTitre); }

    if (page.onglets && page.onglets.length) {
        lignes.push('ONGLETS : ' + page.onglets.map((o) => o.libelle).join(' · '));
    }

    lignes.push('', 'NOTIONS DE LA PAGE :');
    (page.notions || []).forEach((n, i) => {
        lignes.push((i + 1) + '. ' + n.titre);
        lignes.push('   ' + n.texte);
    });

    if (page.quiz && page.quiz.length) {
        lignes.push('', 'EXERCICES DE LA PAGE (avec leur correction) :');
        page.quiz.forEach((q, i) => {
            lignes.push((i + 1) + '. ' + q.question);
            if (q.reponse) { lignes.push('   Réponse : ' + q.reponse); }
            if (q.explication) { lignes.push('   Explication : ' + q.explication); }
        });
    }
    return lignes.join('\n');
}

/* ============================================================
   Prompt
   ============================================================ */

const PERSONA = [
    'Tu es l\'assistant de révision de Karniella, une élève de 6e/5e, sur son site de révisions.',
    'Ton personnage : un poney de révision bienveillant et encourageant (emoji 🐴 avec parcimonie).',
    '',
    'RÈGLES :',
    '- Réponds en français, en 3 à 5 phrases maximum. Vocabulaire de son niveau, phrases courtes.',
    '- Appuie-toi sur le contenu de la page fourni ci-dessous. S\'il ne contient pas la réponse,',
    '  dis-le simplement et donne quand même une explication correcte et courte.',
    '- N\'invente jamais une définition ou une formule. Mieux vaut dire que tu n\'es pas sûr.',
    '- Reste sur le scolaire. Pour toute autre demande, ramène gentiment vers les leçons.',
    '- Ne demande jamais d\'informations personnelles et n\'en réclame pas pour répondre.',
    '- Écris du texte simple. Pas de HTML, pas de tableaux, pas de titres markdown.',
    '  Tu peux utiliser **gras** et des puces « - » : c\'est tout ce qui sera affiché.',
    '- Les leçons d\'éducation civique abordent la puberté et l\'abstinence : traite ces sujets',
    '  de façon factuelle, sobre et adaptée à son âge, en t\'en tenant au contenu de la leçon.'
].join('\n');

const CONSIGNES_MODE = {
    explication: 'Explique la notion demandée, avec un exemple concret tiré de la leçon.',
    simplifier: 'Ré-explique la même chose ENCORE PLUS simplement, avec une image ou une comparaison ' +
        'de la vie de tous les jours. Deux ou trois phrases suffisent.',
    exercice: 'Karniella veut de l\'aide sur un exercice. NE DONNE PAS la réponse tout de suite : ' +
        'pose-lui une question qui la met sur la voie, ou donne-lui la première étape et demande-lui ' +
        'la suite. Si elle se trompe ensuite, corrige avec douceur et explique pourquoi.',
    fiche: 'Résume les points essentiels de la page en une courte fiche « à retenir ».'
};

/* ============================================================
   Route
   ============================================================ */

router.post('/', async (req, res) => {
    const anthropic = obtenirClient();
    if (!anthropic) {
        // 503 : le client mémorise et cesse d'appeler pour cette session.
        return res.status(503).json({
            success: false,
            message: 'Assistant IA non configuré (ANTHROPIC_API_KEY absente).'
        });
    }

    const ip = req.headers['x-forwarded-for'] || req.ip || 'inconnu';
    if (debitDepasse(String(ip).split(',')[0].trim())) {
        return res.status(429).json({
            success: false,
            message: 'Trop de questions d\'un coup — laisse-moi souffler un peu ! 🐴'
        });
    }

    const { slug, question, mode, historique } = req.body || {};

    if (typeof question !== 'string' || !question.trim()) {
        return res.status(400).json({ success: false, message: 'Question manquante.' });
    }

    const page = lireContexte(String(slug || ''));
    if (!page) {
        return res.status(400).json({ success: false, message: 'Page inconnue.' });
    }

    const consigne = CONSIGNES_MODE[mode] || CONSIGNES_MODE.explication;

    // On ne reprend que les tours en texte simple, et on force l'alternance
    // attendue par l'API : le premier message doit venir de l'utilisateur.
    const tours = (Array.isArray(historique) ? historique : [])
        .filter((t) => t && typeof t.content === 'string' &&
            (t.role === 'user' || t.role === 'assistant'))
        .slice(-MAX_TOURS)
        .map((t) => ({ role: t.role, content: t.content.slice(0, MAX_QUESTION) }));
    while (tours.length && tours[0].role !== 'user') { tours.shift(); }

    try {
        const reponse = await anthropic.beta.messages.create({
            model: MODELE,
            max_tokens: 4000,
            // Expliquer une notion de 6e à partir d'un contexte fourni est une
            // tâche simple : l'effort minimal suffit, et la réponse arrive vite.
            output_config: { effort: 'low' },
            betas: ['server-side-fallback-2026-07-01'],
            fallbacks: 'default',
            system: [
                { type: 'text', text: PERSONA },
                // Le contexte de page est identique d'une question à l'autre sur
                // une même leçon : le mettre en cache divise son coût par dix.
                {
                    type: 'text',
                    text: formaterContexte(page),
                    cache_control: { type: 'ephemeral' }
                },
                { type: 'text', text: 'CONSIGNE POUR CETTE RÉPONSE : ' + consigne }
            ],
            messages: [
                ...tours,
                { role: 'user', content: question.trim().slice(0, MAX_QUESTION) }
            ]
        });

        // Un refus renvoie un 200 avec stop_reason « refusal » : lire content
        // sans vérifier donnerait une réponse vide sans qu'on sache pourquoi.
        if (reponse.stop_reason === 'refusal') {
            return res.json({
                success: true,
                reponse: 'Je préfère ne pas répondre à cette question 🐴. ' +
                    'Pose-m\'en une sur ta leçon !'
            });
        }

        const texte = reponse.content
            .filter((bloc) => bloc.type === 'text')
            .map((bloc) => bloc.text)
            .join('\n')
            .trim();

        if (!texte) {
            return res.status(502).json({ success: false, message: 'Réponse vide.' });
        }
        return res.json({ success: true, reponse: texte, modele: reponse.model });
    } catch (err) {
        const Anthropic = require('@anthropic-ai/sdk');

        if (err instanceof Anthropic.AuthenticationError) {
            clientIndisponible = true;
            client = null;
            console.error('[chat] clé API refusée');
            return res.status(503).json({ success: false, message: 'Assistant IA indisponible.' });
        }
        if (err instanceof Anthropic.RateLimitError) {
            return res.status(429).json({ success: false, message: 'Trop de demandes, réessaie dans un instant.' });
        }
        if (err instanceof Anthropic.APIError) {
            console.error('[chat] erreur API ' + err.status + ' : ' + err.message);
            return res.status(502).json({ success: false, message: 'L\'assistant n\'a pas répondu.' });
        }
        console.error('[chat] ' + err.message);
        return res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
});

module.exports = router;
