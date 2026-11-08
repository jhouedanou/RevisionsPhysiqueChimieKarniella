/**
 * xp.js — Les points d'expérience ⭐ et la boutique.
 *
 * Chaque bonne réponse à un quiz vaut 10 XP, un sans-faute 50 XP de plus.
 * Deux bonus du quiz en étapes, repris de brikelec : « Éclair » (au moins
 * 80 % juste, 8 secondes au plus par question) et « Série » (5 bonnes
 * réponses de suite) valent 20 XP chacun. Une révision des erreurs ne
 * rapporte que les bonnes réponses.
 * Les XP s'échangent dans la boutique (boutique.html) contre des récompenses
 * qui changent vraiment l'application : badges, thèmes, avatars, cadres
 * d'avatar, pluies de confettis, titres. Un achat ne se perd jamais.
 *
 * Tout tient dans une clé localStorage, comme js/progression.js :
 *   { version, gagnes: { <appareil>: xp }, cadeaux: { <id>: xp }, achats[],
 *     actifs: { theme, avatar, cadre, confettis, titre }, actifsDate,
 *     total, depenses, dernierGain }
 * Les XP gagnés sont comptés par appareil : js/sauvegarde.js additionne ceux
 * de tous les appareils sans compter deux fois. `total` et `depenses` sont
 * recalculés à chaque lecture (gagnés + cadeaux ; prix des achats).
 * Pour offrir des XP, ajouter une ligne à data/bonus-xp.json (voir « Cadeaux »).
 * Chargé par chat-assistant.js sur toutes les pages, et directement par la
 * boutique. À chaque changement, l'événement `karniella:xp` prévient la barre.
 */
(function () {
    'use strict';

    if (window.KarniellaXP) { return; }

    var CLE = 'karniella-xp';
    var VERSION = 2;
    var RACINE = (function () {
        var script = document.currentScript;
        if (script && script.src) { return script.src.replace(/js\/xp\.js(\?.*)?$/, ''); }
        return window.KarniellaCoquille ? window.KarniellaCoquille.racine : '';
    })();
    var XP_BONNE_REPONSE = 10;
    var XP_SANS_FAUTE = 50;
    var QUESTIONS_MIN_BONUS = 3;   // un sans-faute sur 2 questions, ce n'est pas un exploit
    var XP_ECLAIR = 20;
    var XP_SERIE = 20;
    var ECLAIR_SECONDES = 8;       // par question
    var ECLAIR_QUESTIONS_MIN = 5;
    var SERIE_MIN = 5;

    /* ============================================================
       Le catalogue — 27 récompenses, par paliers
       ============================================================
       type      : ce que la récompense change
         badge    → s'ajoute à « Mes badges » sur l'accueil
         theme    → les couleurs de toute l'application (html[data-skin])
         avatar   → le rond dans la barre du haut
         cadre    → l'anneau autour de l'avatar
         confettis→ la pluie de confettis des réussites
         titre    → le titre affiché sous « Salut Karniella »
       Un seul actif à la fois par type (sauf badge, qui se cumule). */

    var TYPES = {
        badge:     { nom: 'Badges',     quoi: 'Ils s\'ajoutent à ta collection sur l\'accueil.' },
        theme:     { nom: 'Thèmes',     quoi: 'Les couleurs de toute l\'application.' },
        avatar:    { nom: 'Avatars',    quoi: 'Le personnage dans la barre du haut.' },
        cadre:     { nom: 'Cadres',     quoi: 'Un anneau autour de ton avatar.' },
        confettis: { nom: 'Confettis',  quoi: 'La pluie qui tombe quand tu réussis.' },
        titre:     { nom: 'Titres',     quoi: 'Ton titre, affiché sur l\'accueil.' }
    };

    var CATALOGUE = [
        // ---- Badges
        { id: 'apprentie-alchimiste', type: 'badge', prix: 100, icone: '🧪', nom: 'Apprentie Alchimiste',
          quoi: 'Ton premier badge de la boutique.' },
        { id: 'chimiste-en-herbe', type: 'badge', prix: 250, icone: '⚗️', nom: 'Chimiste en herbe',
          quoi: 'Tu sais que le sucre ne disparaît pas.' },
        { id: 'physicienne', type: 'badge', prix: 400, icone: '🔬', nom: 'Physicienne',
          quoi: 'Les circuits et la matière n\'ont plus de secret.' },
        { id: 'astronome', type: 'badge', prix: 600, icone: '🔭', nom: 'Astronome',
          quoi: 'Les yeux vers les étoiles, les pieds dans la science.' },
        { id: 'ingenieure', type: 'badge', prix: 900, icone: '⚙️', nom: 'Ingénieure',
          quoi: 'Tu répares le vaisseau avant tout le monde.' },
        { id: 'savante-supreme', type: 'badge', prix: 1500, icone: '🏛️', nom: 'Savante Suprême',
          quoi: 'Le badge le plus rare de l\'écurie.' },

        // ---- Thèmes
        { id: 'theme-cyberpunk-rose', type: 'theme', prix: 300, icone: '🌆', valeur: 'cyberpunk-rose', nom: 'Cyberpunk Rose',
          quoi: 'Néons roses et violets, ambiance nuit.' },
        { id: 'theme-espace-profond', type: 'theme', prix: 300, icone: '🪐', valeur: 'espace-profond', nom: 'Espace Profond',
          quoi: 'Bleu nuit et étoiles. Parfait pour réviser le soir.' },
        { id: 'theme-foret-enchantee', type: 'theme', prix: 450, icone: '🌲', valeur: 'foret-enchantee', nom: 'Forêt Enchantée',
          quoi: 'Vert sapin et lucioles, ambiance nuit.' },
        { id: 'theme-ocean', type: 'theme', prix: 450, icone: '🌊', valeur: 'ocean', nom: 'Grand Océan',
          quoi: 'Bleu lagon et sable, ambiance jour.' },
        { id: 'theme-bonbon', type: 'theme', prix: 600, icone: '🍬', valeur: 'bonbon', nom: 'Bonbon Acidulé',
          quoi: 'Pastel rose, menthe et citron, ambiance jour.' },
        { id: 'theme-or-royal', type: 'theme', prix: 800, icone: '👑', valeur: 'or-royal', nom: 'Or Royal',
          quoi: 'Pourpre et or, pour la reine de l\'écurie.' },

        // ---- Avatars
        { id: 'avatar-licorne', type: 'avatar', prix: 350, icone: '🦄', valeur: '🦄', nom: 'Licorne',
          quoi: 'Un poney, mais avec une corne.' },
        { id: 'avatar-papillon', type: 'avatar', prix: 400, icone: '🦋', valeur: '🦋', nom: 'Papillon',
          quoi: 'Léger, rapide, comme tes réponses.' },
        { id: 'avatar-poney-astronaute', type: 'avatar', prix: 500, icone: '🐴🚀', valeur: '🐴🚀', nom: 'Poney astronaute',
          quoi: 'Le poney qui a redémarré le vaisseau.' },
        { id: 'avatar-scientifique', type: 'avatar', prix: 650, icone: '👩‍🔬', valeur: '👩‍🔬', nom: 'Scientifique',
          quoi: 'Blouse blanche et lunettes de labo.' },
        { id: 'avatar-dragon', type: 'avatar', prix: 800, icone: '🐉', valeur: '🐉', nom: 'Dragon',
          quoi: 'Pour celles qui crachent le feu aux quiz.' },
        { id: 'avatar-reine', type: 'avatar', prix: 1000, icone: '👸', valeur: '👸', nom: 'Reine',
          quoi: 'L\'avatar de la reine de l\'écurie.' },

        // ---- Cadres d'avatar
        { id: 'cadre-argent', type: 'cadre', prix: 200, icone: '⚪', valeur: 'argent', nom: 'Cadre argent',
          quoi: 'Un anneau argenté autour de ton avatar.' },
        { id: 'cadre-or', type: 'cadre', prix: 400, icone: '🟡', valeur: 'or', nom: 'Cadre or',
          quoi: 'Un anneau doré, qui brille.' },
        { id: 'cadre-arc-en-ciel', type: 'cadre', prix: 700, icone: '🌈', valeur: 'arc-en-ciel', nom: 'Cadre arc-en-ciel',
          quoi: 'Toutes les couleurs, qui tournent.' },

        // ---- Confettis
        { id: 'confettis-etoiles', type: 'confettis', prix: 250, icone: '⭐', valeur: ['⭐', '🌟', '✨', '💫'], nom: 'Pluie d\'étoiles',
          quoi: 'Des étoiles filantes à chaque réussite.' },
        { id: 'confettis-coeurs', type: 'confettis', prix: 250, icone: '💖', valeur: ['💖', '💗', '💕', '🩷', '✨'], nom: 'Pluie de cœurs',
          quoi: 'Des cœurs partout quand tu gagnes.' },
        { id: 'confettis-feu-artifice', type: 'confettis', prix: 500, icone: '🎆', valeur: ['🎆', '🎇', '🚀', '✨', '🌟'], nom: 'Feu d\'artifice',
          quoi: 'Le grand spectacle, pour les sans-faute.' },

        // ---- Titres
        { id: 'titre-cavaliere', type: 'titre', prix: 150, icone: '🏇', valeur: 'Cavalière curieuse', nom: 'Cavalière curieuse',
          quoi: 'Ton premier titre, sous ton prénom.' },
        { id: 'titre-capitaine', type: 'titre', prix: 350, icone: '🚀', valeur: 'Capitaine Karniella', nom: 'Capitaine',
          quoi: 'Le titre de celle qui pilote le vaisseau.' },
        { id: 'titre-reine', type: 'titre', prix: 1200, icone: '👑', valeur: 'Reine de l\'écurie', nom: 'Reine de l\'écurie',
          quoi: 'Le titre suprême.' }
    ];

    /* ============================================================
       Stockage
       ============================================================ */

    function vide() {
        return { version: VERSION, gagnes: {}, cadeaux: {}, total: 0, depenses: 0, achats: [], actifs: {} };
    }

    /** L'identifiant de l'appareil, partagé avec js/suivi.js (même clé, même forme). */
    function appareil() {
        var id = null;
        try { id = window.localStorage.getItem('karniella-appareil'); } catch (err) { /* rien */ }
        if (!id) {
            id = 'k-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
            try { window.localStorage.setItem('karniella-appareil', id); } catch (err) { /* rien */ }
        }
        return id;
    }

    function somme(objet) {
        return Object.keys(objet || {}).reduce(function (n, k) { return n + (Number(objet[k]) || 0); }, 0);
    }

    // Les cadeaux reçus avant le compte par appareil n'étaient qu'une liste d'id.
    var CADEAUX_CONNUS = { '2026-11-08-travail': 250 };

    /** Met les données au format du jour et recalcule total et dépenses. */
    function normaliser(d) {
        d.achats = d.achats || [];
        d.actifs = d.actifs || {};
        if (Array.isArray(d.cadeaux)) {
            var carte = {};
            d.cadeaux.forEach(function (id) { carte[id] = CADEAUX_CONNUS[id] || 0; });
            d.cadeaux = carte;
        }
        d.cadeaux = d.cadeaux || {};
        if (!d.gagnes || typeof d.gagnes !== 'object') {
            // Avant : un seul total. Tout ce qui n'est pas un cadeau a été gagné ici.
            d.gagnes = {};
            var ici = Math.max(0, (d.total || 0) - somme(d.cadeaux));
            if (ici) { d.gagnes[appareil()] = ici; }
        }
        d.total = somme(d.gagnes) + somme(d.cadeaux);
        d.depenses = d.achats.reduce(function (n, id) { var a = article(id); return n + (a ? a.prix : 0); }, 0);
        return d;
    }

    function lire() {
        try {
            var brut = JSON.parse(window.localStorage.getItem(CLE));
            if (brut && brut.version === 1) {
                // v1 : { skin, avatar } → v2 : actifs
                brut.version = VERSION;
                brut.actifs = { theme: brut.skin || null, avatar: brut.avatar || null };
                delete brut.skin; delete brut.avatar;
            }
            if (brut && brut.version === VERSION) {
                return normaliser(brut);
            }
        } catch (err) { /* stockage refusé ou illisible */ }
        return vide();
    }

    function ecrire(donnees) {
        normaliser(donnees);
        try { window.localStorage.setItem(CLE, JSON.stringify(donnees)); } catch (err) { return false; }
        try { window.dispatchEvent(new CustomEvent('karniella:xp', { detail: donnees })); } catch (err) { /* rien */ }
        return true;
    }

    function article(id) {
        for (var i = 0; i < CATALOGUE.length; i++) { if (CATALOGUE[i].id === id) { return CATALOGUE[i]; } }
        return null;
    }

    function articleActif(type) {
        var d = lire();
        var id = d.actifs[type];
        var a = id ? article(id) : null;
        return (a && d.achats.indexOf(a.id) !== -1) ? a : null;
    }

    /* ============================================================
       Gagner
       ============================================================ */

    function gagner(points, raison) {
        points = Math.max(0, Math.round(points || 0));
        if (!points) { return 0; }
        var d = lire();
        var ici = appareil();
        d.gagnes[ici] = (d.gagnes[ici] || 0) + points;
        d.dernierGain = { points: points, raison: raison || '', date: Date.now() };
        ecrire(d);
        return points;
    }

    /** Le quiz mérite-t-il le bonus « Éclair » ? `temps` en secondes. */
    function estEclair(correct, total, temps) {
        return total >= ECLAIR_QUESTIONS_MIN && typeof temps === 'number' && temps > 0 &&
            correct * 5 >= total * 4 && temps <= total * ECLAIR_SECONDES;
    }

    /**
     * Ce que vaut un quiz : { total, base, bonus, eclair, serie }.
     * extra (facultatif) : { temps, suite, revision } — suite = la plus
     * longue série de bonnes réponses.
     */
    function valeurQuiz(correct, total, extra) {
        extra = extra || {};
        var base = correct * XP_BONNE_REPONSE;
        if (extra.revision) { return { total: base, base: base, bonus: 0, eclair: 0, serie: 0 }; }
        var bonus = (total >= QUESTIONS_MIN_BONUS && correct === total) ? XP_SANS_FAUTE : 0;
        var eclair = estEclair(correct, total, extra.temps) ? XP_ECLAIR : 0;
        var serie = (extra.suite || 0) >= SERIE_MIN ? XP_SERIE : 0;
        return { total: base + bonus + eclair + serie, base: base, bonus: bonus, eclair: eclair, serie: serie };
    }

    /** Enregistre les XP d'un quiz terminé et renvoie le détail. */
    function gagnerQuiz(correct, total, slug, extra) {
        var v = valeurQuiz(correct, total, extra);
        gagner(v.total, 'quiz:' + (slug || ''));
        return v;
    }

    /* ============================================================
       Cadeaux d'XP (data/bonus-xp.json)
       ============================================================
       Pour offrir des XP, on ajoute une ligne { id, xp, raison } au fichier.
       Chaque cadeau compte une seule fois (`cadeaux`, par id), même sur
       plusieurs appareils une fois la sauvegarde reliée : on attend donc la
       première synchronisation avant de distribuer. */

    var XP_CADEAU_MAX = 1000;

    function annoncerCadeau(c, essai) {
        var J = window.KarniellaJeu;
        if (!J || !J.recompense || !document.body) {
            if ((essai || 0) < 20) { window.setTimeout(function () { annoncerCadeau(c, (essai || 0) + 1); }, 500); }
            return;
        }
        J.recompense({ id: 'cadeau', etiquette: 'Cadeau surprise', nom: '+' + c.xp + ' XP', quoi: c.raison || '', duree: 8000 });
        if (window.KarniellaFete) { window.KarniellaFete(); }
    }

    function recevoirCadeaux() {
        if (typeof window.fetch !== 'function') { return; }
        window.fetch(RACINE + 'data/bonus-xp.json', { cache: 'no-cache' })
            .then(function (r) { return r.ok ? r.json() : null; })
            .catch(function () { return null; })
            .then(function (fichier) {
                var liste = fichier && Array.isArray(fichier.cadeaux) ? fichier.cadeaux : [];
                liste.forEach(function (c) {
                    var points = Math.round(Number(c && c.xp));
                    if (!c || typeof c.id !== 'string' || !(points > 0) || points > XP_CADEAU_MAX) { return; }
                    var d = lire();
                    if (Object.prototype.hasOwnProperty.call(d.cadeaux, c.id)) { return; }
                    d.cadeaux[c.id] = points;
                    d.dernierGain = { points: points, raison: 'cadeau:' + c.id, date: Date.now() };
                    if (ecrire(d)) { annoncerCadeau({ xp: points, raison: c.raison }); }
                });
            });
    }

    /* ============================================================
       Acheter et activer
       ============================================================ */

    function solde() {
        var d = lire();
        return Math.max(0, d.total - d.depenses);
    }

    function possede(id) {
        return lire().achats.indexOf(id) !== -1;
    }

    /** Achète et active tout de suite (sauf un badge, qui s'affiche de lui-même). */
    function acheter(id) {
        var a = article(id);
        if (!a || possede(id)) { return false; }
        var d = lire();
        if (d.total - d.depenses < a.prix) { return false; }
        d.achats.push(id);
        if (a.type !== 'badge') { d.actifs[a.type] = a.id; d.actifsDate = Date.now(); }
        ecrire(d);
        appliquerTheme();
        return true;
    }

    /** Active une récompense possédée. */
    function activer(id) {
        var a = article(id);
        if (!a || a.type === 'badge' || !possede(id)) { return false; }
        var d = lire();
        d.actifs[a.type] = a.id;
        d.actifsDate = Date.now();
        ecrire(d);
        appliquerTheme();
        return true;
    }

    /** Retire la récompense active d'un type (retour au réglage de base). */
    function desactiver(type) {
        var d = lire();
        if (!TYPES[type]) { return false; }
        d.actifs[type] = null;
        d.actifsDate = Date.now();
        ecrire(d);
        appliquerTheme();
        return true;
    }

    function appliquerTheme() {
        if (window.KarniellaTheme && window.KarniellaTheme.appliquer) { window.KarniellaTheme.appliquer(); }
    }

    function catalogue() {
        var d = lire();
        return CATALOGUE.map(function (a) {
            return {
                id: a.id, type: a.type, prix: a.prix, icone: a.icone, nom: a.nom, quoi: a.quoi, valeur: a.valeur,
                possede: d.achats.indexOf(a.id) !== -1,
                actif: d.actifs[a.type] === a.id
            };
        });
    }

    /** Le prochain article à débloquer, pour la jauge de la boutique. */
    function prochain() {
        var d = lire();
        var restants = CATALOGUE.filter(function (a) { return d.achats.indexOf(a.id) === -1; })
            .sort(function (a, b) { return a.prix - b.prix; });
        return restants.length ? { id: restants[0].id, nom: restants[0].nom, icone: restants[0].icone, prix: restants[0].prix } : null;
    }

    /** Les badges achetés, au format de js/badges.js. */
    function badgesAchetes() {
        var d = lire();
        return CATALOGUE.filter(function (a) { return a.type === 'badge' && d.achats.indexOf(a.id) !== -1; })
            .map(function (a) { return { id: a.id, icone: a.icone, nom: a.nom, quoi: a.quoi, obtenu: true, achete: true }; });
    }

    window.KarniellaXP = {
        XP_BONNE_REPONSE: XP_BONNE_REPONSE,
        XP_SANS_FAUTE: XP_SANS_FAUTE,
        TYPES: TYPES,
        gagner: gagner,
        gagnerQuiz: gagnerQuiz,
        valeurQuiz: valeurQuiz,
        estEclair: estEclair,
        SERIE_MIN: SERIE_MIN,
        solde: solde,
        total: function () { return lire().total; },
        possede: possede,
        acheter: acheter,
        activer: activer,
        desactiver: desactiver,
        catalogue: catalogue,
        prochain: prochain,
        badgesAchetes: badgesAchetes,
        /* Pour js/sauvegarde.js : recalcule total et dépenses d'un état fusionné. */
        normaliser: function (d) { return normaliser(d); },
        /* Ce qui est actif, pour les modules qui l'affichent : */
        skin: function () { var a = articleActif('theme'); return a ? a.valeur : null; },
        avatar: function () { var a = articleActif('avatar'); return a ? a.valeur : '🐴'; },
        cadre: function () { var a = articleActif('cadre'); return a ? a.valeur : null; },
        confettis: function () { var a = articleActif('confettis'); return a ? a.valeur : null; },
        titre: function () { var a = articleActif('titre'); return a ? a.valeur : null; },
        /* Anciens noms, gardés pour les pages qui les appelaient : */
        activerTheme: function (id) { return id === null ? desactiver('theme') : activer(id); },
        activerAvatar: function (id) { return id === null ? desactiver('avatar') : activer(id); },
        reinitialiser: function () { try { window.localStorage.removeItem(CLE); } catch (err) { /* rien */ } }
    };

    // Données d'avant le compte par appareil : on les réécrit au format du
    // jour, pour que js/sauvegarde.js les trouve prêtes à fusionner.
    try {
        var brut = JSON.parse(window.localStorage.getItem(CLE));
        if (brut && (!brut.gagnes || Array.isArray(brut.cadeaux) || brut.version !== VERSION)) {
            window.localStorage.setItem(CLE, JSON.stringify(lire()));
        }
    } catch (err) { /* stockage refusé : rien à migrer */ }

    // Reliée à la sauvegarde ? On attend la première synchronisation : un
    // cadeau déjà reçu sur un autre appareil ne doit pas compter deux fois.
    (function () {
        var relie = false;
        try { relie = !!(JSON.parse(window.localStorage.getItem('karniella-sauvegarde')) || {}).code; } catch (err) { /* rien */ }
        if (!relie) { recevoirCadeaux(); return; }
        var fait = false;
        function go() { if (!fait) { fait = true; recevoirCadeaux(); } }
        window.addEventListener('karniella:sauvegarde', go);
        window.setTimeout(go, 15000);
    })();
})();
