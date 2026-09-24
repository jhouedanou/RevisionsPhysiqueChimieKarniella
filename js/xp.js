/**
 * xp.js — Les points d'expérience ⭐ et la boutique.
 *
 * Chaque bonne réponse à un quiz vaut 10 XP, un sans-faute 50 XP de plus.
 * Les XP s'échangent dans la boutique (boutique.html) contre un badge, des
 * thèmes d'interface et un avatar. Un achat ne se perd jamais.
 *
 * Tout tient dans une clé localStorage, comme js/progression.js. Chargé par
 * chat-assistant.js sur toutes les pages, et directement par la boutique.
 * À chaque changement, l'événement `karniella:xp` prévient la barre du haut.
 */
(function () {
    'use strict';

    if (window.KarniellaXP) { return; }

    var CLE = 'karniella-xp';
    var VERSION = 1;
    var XP_BONNE_REPONSE = 10;
    var XP_SANS_FAUTE = 50;
    var QUESTIONS_MIN_BONUS = 3;   // un sans-faute sur 2 questions, ce n'est pas un exploit

    /* ============================================================
       Le catalogue
       ============================================================ */

    var CATALOGUE = [
        { id: 'apprentie-alchimiste', type: 'badge', prix: 100, icone: '🧪',
          nom: 'Apprentie Alchimiste', quoi: 'Ton premier badge de la boutique. Il s\'affiche avec les autres sur l\'accueil.' },
        { id: 'theme-cyberpunk-rose', type: 'theme', prix: 300, icone: '🌆', valeur: 'cyberpunk-rose',
          nom: 'Thème Cyberpunk Rose', quoi: 'Néons roses et violets sur toute l\'application.' },
        { id: 'theme-espace-profond', type: 'theme', prix: 300, icone: '🪐', valeur: 'espace-profond',
          nom: 'Thème Espace Profond', quoi: 'Bleu nuit et étoiles. Parfait pour réviser le soir.' },
        { id: 'avatar-poney-astronaute', type: 'avatar', prix: 500, icone: '🐴🚀', valeur: '🐴🚀',
          nom: 'Poney astronaute', quoi: 'Un avatar exclusif dans la barre du haut.' }
    ];

    /* ============================================================
       Stockage
       ============================================================ */

    function lire() {
        try {
            var brut = JSON.parse(window.localStorage.getItem(CLE));
            if (brut && brut.version === VERSION) {
                brut.achats = brut.achats || [];
                return brut;
            }
        } catch (err) { /* stockage refusé ou illisible */ }
        return { version: VERSION, total: 0, depenses: 0, achats: [], skin: null, avatar: null };
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

    function acheter(id) {
        var a = article(id);
        if (!a || possede(id)) { return false; }
        var d = lire();
        if (d.total - d.depenses < a.prix) { return false; }
        d.depenses += a.prix;
        d.achats.push(id);
        if (a.type === 'theme') { d.skin = a.valeur; }
        if (a.type === 'avatar') { d.avatar = a.valeur; }
        ecrire(d);
        appliquerSkin();
        return true;
    }

    /** Active un thème possédé (ou `null` pour revenir au thème de base). */
    function activerTheme(id) {
        var d = lire();
        if (id === null) { d.skin = null; }
        else {
            var a = article(id);
            if (!a || a.type !== 'theme' || !possede(id)) { return false; }
            d.skin = a.valeur;
        }
        ecrire(d);
        appliquerSkin();
        return true;
    }

    function activerAvatar(id) {
        var d = lire();
        if (id === null) { d.avatar = null; }
        else {
            var a = article(id);
            if (!a || a.type !== 'avatar' || !possede(id)) { return false; }
            d.avatar = a.valeur;
        }
        ecrire(d);
        return true;
    }

    function appliquerSkin() {
        if (window.KarniellaTheme && window.KarniellaTheme.appliquer) { window.KarniellaTheme.appliquer(); }
    }

    function catalogue() {
        var d = lire();
        return CATALOGUE.map(function (a) {
            return {
                id: a.id, type: a.type, prix: a.prix, icone: a.icone, nom: a.nom, quoi: a.quoi, valeur: a.valeur,
                possede: d.achats.indexOf(a.id) !== -1,
                actif: (a.type === 'theme' && d.skin === a.valeur) || (a.type === 'avatar' && d.avatar === a.valeur)
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

    window.KarniellaXP = {
        XP_BONNE_REPONSE: XP_BONNE_REPONSE,
        XP_SANS_FAUTE: XP_SANS_FAUTE,
        gagner: gagner,
        gagnerQuiz: gagnerQuiz,
        valeurQuiz: valeurQuiz,
        solde: solde,
        total: function () { return lire().total; },
        possede: possede,
        acheter: acheter,
        activerTheme: activerTheme,
        activerAvatar: activerAvatar,
        catalogue: catalogue,
        prochain: prochain,
        skin: function () { return lire().skin; },
        avatar: function () { return lire().avatar || '🐴'; },
        reinitialiser: function () { try { window.localStorage.removeItem(CLE); } catch (err) { /* rien */ } }
    };
})();
