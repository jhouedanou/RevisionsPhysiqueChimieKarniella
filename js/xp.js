/**
 * xp.js — Les points d'expérience ⭐ et la boutique.
 *
 * Chaque bonne réponse à un quiz vaut 10 XP, un sans-faute 50 XP de plus.
 * Les XP s'échangent dans la boutique (boutique.html) contre des récompenses
 * qui changent vraiment l'application : badges, thèmes, avatars, cadres
 * d'avatar, pluies de confettis, titres. Un achat ne se perd jamais.
 *
 * Tout tient dans une clé localStorage, comme js/progression.js :
 *   { version, total, depenses, achats[], actifs: { theme, avatar, cadre, confettis, titre } }
 * Chargé par chat-assistant.js sur toutes les pages, et directement par la
 * boutique. À chaque changement, l'événement `karniella:xp` prévient la barre.
 */
(function () {
    'use strict';

    if (window.KarniellaXP) { return; }

    var CLE = 'karniella-xp';
    var VERSION = 2;
    var XP_BONNE_REPONSE = 10;
    var XP_SANS_FAUTE = 50;
    var QUESTIONS_MIN_BONUS = 3;   // un sans-faute sur 2 questions, ce n'est pas un exploit

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
        return { version: VERSION, total: 0, depenses: 0, achats: [], actifs: {} };
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
                brut.achats = brut.achats || [];
                brut.actifs = brut.actifs || {};
                return brut;
            }
        } catch (err) { /* stockage refusé ou illisible */ }
        return vide();
    }

    function ecrire(donnees) {
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
        d.total += points;
        d.dernierGain = { points: points, raison: raison || '', date: Date.now() };
        ecrire(d);
        return points;
    }

    /** Ce que vaut un quiz : { total, base, bonus }. */
    function valeurQuiz(correct, total) {
        var base = correct * XP_BONNE_REPONSE;
        var bonus = (total >= QUESTIONS_MIN_BONUS && correct === total) ? XP_SANS_FAUTE : 0;
        return { total: base + bonus, base: base, bonus: bonus };
    }

    /** Enregistre les XP d'un quiz terminé et renvoie le détail. */
    function gagnerQuiz(correct, total, slug) {
        var v = valeurQuiz(correct, total);
        gagner(v.total, 'quiz:' + (slug || ''));
        return v;
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
        d.depenses += a.prix;
        d.achats.push(id);
        if (a.type !== 'badge') { d.actifs[a.type] = a.id; }
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
        ecrire(d);
        appliquerTheme();
        return true;
    }

    /** Retire la récompense active d'un type (retour au réglage de base). */
    function desactiver(type) {
        var d = lire();
        if (!TYPES[type]) { return false; }
        d.actifs[type] = null;
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
            .map(function (a) { return { id: a.id, icone: a.icone, nom: a.nom, quoi: a.quoi, obtenu: true }; });
    }

    window.KarniellaXP = {
        XP_BONNE_REPONSE: XP_BONNE_REPONSE,
        XP_SANS_FAUTE: XP_SANS_FAUTE,
        TYPES: TYPES,
        gagner: gagner,
        gagnerQuiz: gagnerQuiz,
        valeurQuiz: valeurQuiz,
        solde: solde,
        total: function () { return lire().total; },
        possede: possede,
        acheter: acheter,
        activer: activer,
        desactiver: desactiver,
        catalogue: catalogue,
        prochain: prochain,
        badgesAchetes: badgesAchetes,
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
})();
