/**
 * coquille.js — La barre du haut et la navigation du bas, sur toutes les pages.
 *
 * Chargé dans le <head>, sans defer, juste après js/theme.js et
 * js/programme-5e.js. Il construit la barre dès que <body> existe et l'expose
 * aux autres modules : theme.js y range 🌙 et A+, recherche.js y range 🔍.
 *
 * La barre montre :
 *   🐴 logo → accueil     Accueil › Matière › Leçon (fil d'Ariane)
 *   🔥 série de jours     ⭐ XP     🌙  A+  🔍     avatar → boutique
 *
 * Sur téléphone, une barre en bas : Accueil · Leçons · Boutique · Badges.
 *
 * La série et les XP viennent de js/progression.js et js/xp.js, chargés plus
 * tard par le chat : la barre s'affiche sans eux et se complète à leur arrivée.
 */
(function () {
    'use strict';

    if (window.KarniellaCoquille) { return; }

    var RACINE = (function () {
        var script = document.currentScript;
        if (script && script.src) { return script.src.replace(/js\/coquille\.js(\?.*)?$/, ''); }
        return '';
    })();

    var barre = null;
    var zoneOutils = null;
    var fil = null;
    var puceFlamme = null;
    var puceXP = null;
    var avatar = null;
    var panneau = null;

    function el(balise, classe, texte) {
        var e = document.createElement(balise);
        if (classe) { e.className = classe; }
        if (texte !== undefined) { e.textContent = texte; }
        return e;
    }

    /* ============================================================
       Où sommes-nous ?
       ============================================================ */

    function slugCourant() {
        return window.location.pathname.split('/').pop().replace(/\.html$/, '') || 'index';
    }

    function dans5e() {
        return /\/5e\/[^/]*$/.test(window.location.pathname);
    }

    function matiereDe(id) {
        var programme = window.KarniellaProgramme;
        if (!programme) { return null; }
        for (var i = 0; i < programme.matieres.length; i++) {
            if (programme.matieres[i].id === id) { return programme.matieres[i]; }
        }
        return null;
    }

    function leconDe(matiere, id) {
        if (!matiere) { return null; }
        for (var i = 0; i < (matiere.lecons || []).length; i++) {
            if (matiere.lecons[i].id === id) { return matiere.lecons[i]; }
        }
        return null;
    }

    /**
     * Les maillons du fil d'Ariane : [{ texte, href }] — le dernier n'a pas de lien.
     */
    function maillons() {
        var slug = slugCourant();
        var liste = [{ texte: 'Accueil', href: RACINE + 'index.html' }];

        if (slug === 'index') { return liste; }
        if (slug === 'boutique') { liste.push({ texte: '⭐ Boutique' }); return liste; }

        var idMatiere = document.body.getAttribute('data-matiere');
        var matiere = matiereDe(idMatiere);
        var nomMatiere = matiere ? matiere.nom : (idMatiere || '');

        if (slug === 'mission') {
            var idLecon = new URLSearchParams(window.location.search).get('id') || '';
            var lecon = leconDe(matiere, idLecon);
            if (nomMatiere) { liste.push({ texte: nomMatiere, href: RACINE + '5e/' + idMatiere + '.html' }); }
            if (lecon) { liste.push({ texte: lecon.titre, href: RACINE + '5e/' + lecon.id + '.html' }); }
            liste.push({ texte: '🚀 Mission' });
            return liste;
        }

        if (dans5e() && slug === idMatiere) {
            liste.push({ texte: nomMatiere || slug });
            return liste;
        }

        if (nomMatiere) { liste.push({ texte: nomMatiere, href: RACINE + '5e/' + idMatiere + '.html' }); }
        var h1 = document.querySelector('h1');
        liste.push({ texte: (h1 ? h1.textContent : document.title).trim() });
        return liste;
    }

    function rendreFil() {
        if (!fil) { return; }
        fil.textContent = '';
        var liste = maillons();
        liste.forEach(function (m, i) {
            if (i > 0) { fil.appendChild(el('span', 'sep', '›')).setAttribute('aria-hidden', 'true'); }
            if (m.href) {
                var a = el('a', '', m.texte);
                a.href = m.href;
                fil.appendChild(a);
            } else {
                var ici = el('span', 'ici', m.texte);
                ici.setAttribute('aria-current', 'page');
                fil.appendChild(ici);
            }
        });
    }

    /* ============================================================
       🔥 La série
       ============================================================ */

    var HEURE_ALERTE = 18;

    function rendreFlamme() {
        var P = window.KarniellaProgression;
        if (!puceFlamme || !P || !P.disponible()) { return; }
        var serie = P.serie();
        var jour = serie.aujourdhui;
        var actifAujourdhui = jour.lecons + jour.quiz > 0;
        var enDanger = !actifAujourdhui && serie.actuelle > 0 && new Date().getHours() >= HEURE_ALERTE;

        puceFlamme.hidden = false;
        puceFlamme.querySelector('.n').textContent = String(serie.actuelle);
        puceFlamme.classList.toggle('eteinte', !actifAujourdhui);
        puceFlamme.classList.toggle('en-danger', enDanger);

        var titre;
        if (enDanger) { titre = 'Ta série de ' + serie.actuelle + ' jours est en danger : 2 minutes de révision pour garder ta flamme !'; }
        else if (actifAujourdhui) { titre = serie.actuelle + (serie.actuelle > 1 ? ' jours de suite' : ' jour de suite') + ' — flamme validée pour aujourd\'hui'; }
        else if (serie.actuelle) { titre = serie.actuelle + ' jours de suite. Révise aujourd\'hui pour continuer !'; }
        else { titre = 'Lance ta série : une leçon par jour et la flamme s\'allume.'; }
        puceFlamme.setAttribute('title', titre);
        puceFlamme.setAttribute('aria-label', titre);

        if (panneau && !panneau.hidden) { rendrePanneau(); }
    }

    function jourCle(d) {
        var m = d.getMonth() + 1, j = d.getDate();
        return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (j < 10 ? '0' : '') + j;
    }

    function rendrePanneau() {
        var P = window.KarniellaProgression;
        if (!panneau || !P) { return; }
        var serie = P.serie();
        var jour = serie.aujourdhui;
        panneau.textContent = '';

        var gros = el('div', 'gros');
        gros.appendChild(el('span', 'ico', serie.actuelle ? '🔥' : '🐴')).setAttribute('aria-hidden', 'true');
        gros.appendChild(el('span', '', serie.actuelle
            ? serie.actuelle + (serie.actuelle > 1 ? ' jours de suite' : ' jour de suite')
            : 'Lance ta série !'));
        panneau.appendChild(gros);
        panneau.appendChild(el('p', '', serie.actuelle
            ? (serie.actuelle >= serie.record ? 'C\'est ton record !' : 'Ton record : ' + serie.record + ' jours')
            : 'Une leçon par jour, et la flamme s\'allume.'));

        var etapes = el('ul');
        [[jour.lecons > 0, 'Ouvrir une leçon'], [jour.quiz > 0, 'Faire un quiz']].forEach(function (e) {
            var li = el('li', e[0] ? 'fait' : '');
            li.appendChild(el('span', 'coche', e[0] ? '✓' : '')).setAttribute('aria-hidden', 'true');
            li.appendChild(document.createTextNode(e[1]));
            li.appendChild(el('span', 'lecteur-seul', e[0] ? ' (fait)' : ''));
            etapes.appendChild(li);
        });
        panneau.appendChild(etapes);

        // La semaine en cours : lundi → dimanche, les jours révisés allumés.
        var brut = {};
        try { brut = (JSON.parse(window.localStorage.getItem('karniella-progression')) || {}).jours || {}; } catch (err) { brut = {}; }
        var auj = new Date();
        var lundi = new Date(auj);
        lundi.setDate(auj.getDate() - ((auj.getDay() + 6) % 7));
        var semaine = el('div', 'semaine');
        semaine.setAttribute('aria-label', 'Cette semaine');
        var lettres = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
        for (var i = 0; i < 7; i++) {
            var d = new Date(lundi);
            d.setDate(lundi.getDate() + i);
            var cle = jourCle(d);
            var c = el('i', (brut[cle] ? 'on' : '') + (cle === jourCle(auj) ? ' auj' : ''), lettres[i]);
            semaine.appendChild(c);
        }
        panneau.appendChild(semaine);
    }

    function basculerPanneau() {
        if (!panneau) {
            panneau = el('div', 'coquille-panneau');
            panneau.setAttribute('role', 'dialog');
            panneau.setAttribute('aria-label', 'Ma série de révisions');
            panneau.hidden = true;
            document.body.appendChild(panneau);
            document.addEventListener('click', function (e) {
                if (panneau.hidden || panneau.contains(e.target) || puceFlamme.contains(e.target)) { return; }
                panneau.hidden = true;
                puceFlamme.setAttribute('aria-expanded', 'false');
            });
            document.addEventListener('keydown', function (e) {
                if (e.key === 'Escape' && !panneau.hidden) { panneau.hidden = true; puceFlamme.focus(); }
            });
        }
        panneau.hidden = !panneau.hidden;
        puceFlamme.setAttribute('aria-expanded', panneau.hidden ? 'false' : 'true');
        if (!panneau.hidden) { rendrePanneau(); }
    }

    /* ============================================================
       ⭐ XP et avatar (js/xp.js)
       ============================================================ */

    function rendreXP() {
        var X = window.KarniellaXP;
        if (!puceXP || !X) { return; }
        puceXP.hidden = false;
        puceXP.querySelector('.n').textContent = String(X.solde());
        var titre = X.solde() + ' XP — clique pour ouvrir la boutique';
        puceXP.setAttribute('title', titre);
        puceXP.setAttribute('aria-label', titre);
        if (avatar) { avatar.textContent = X.avatar(); }
    }

    /* ============================================================
       Construction
       ============================================================ */

    function assurerBarre() {
        if (barre || !document.body) { return barre; }

        barre = el('header', 'coquille-barre');
        barre.setAttribute('role', 'banner');

        var logo = el('a', 'coquille-logo');
        logo.href = RACINE + 'index.html';
        logo.setAttribute('aria-label', 'Retour à l\'accueil');
        logo.appendChild(el('span', 'signe', '🐴')).setAttribute('aria-hidden', 'true');
        logo.appendChild(el('span', 'nom', 'Karniella'));
        barre.appendChild(logo);

        fil = el('nav', 'coquille-fil');
        fil.setAttribute('aria-label', 'Fil d\'Ariane');
        barre.appendChild(fil);

        zoneOutils = el('div', 'coquille-outils');

        puceFlamme = el('button', 'coquille-puce coquille-flamme');
        puceFlamme.type = 'button';
        puceFlamme.hidden = true;
        puceFlamme.setAttribute('aria-haspopup', 'dialog');
        puceFlamme.setAttribute('aria-expanded', 'false');
        puceFlamme.appendChild(el('span', 'ico', '🔥')).setAttribute('aria-hidden', 'true');
        puceFlamme.appendChild(el('span', 'n', '0'));
        puceFlamme.addEventListener('click', basculerPanneau);
        zoneOutils.appendChild(puceFlamme);

        puceXP = el('a', 'coquille-puce coquille-xp');
        puceXP.href = RACINE + 'boutique.html';
        puceXP.hidden = true;
        puceXP.appendChild(el('span', 'ico', '⭐')).setAttribute('aria-hidden', 'true');
        puceXP.appendChild(el('span', 'n', '0'));
        puceXP.appendChild(el('span', 'texte', 'XP'));
        zoneOutils.appendChild(puceXP);

        barre.appendChild(zoneOutils);

        avatar = el('a', 'coquille-rond coquille-avatar', '🐴');
        avatar.href = RACINE + 'boutique.html';
        avatar.setAttribute('title', 'Mon avatar et ma boutique');
        avatar.setAttribute('aria-label', 'Mon avatar et ma boutique');
        // Ajouté après les outils des autres modules : voir zoneOutils().

        document.body.insertBefore(barre, document.body.firstChild);
        rendreFil();
        construireNavBas();
        return barre;
    }

    /** L'avatar reste le dernier bouton, quel que soit l'ordre d'arrivée des modules. */
    function placerAvatar() {
        if (zoneOutils && avatar) { zoneOutils.appendChild(avatar); }
    }

    function construireNavBas() {
        var slug = slugCourant();
        var ancre = window.location.hash;
        var nav = el('nav', 'coquille-nav-bas');
        nav.setAttribute('aria-label', 'Navigation principale');

        var entrees = [
            { ico: '🏠', texte: 'Accueil', href: RACINE + 'index.html', actif: slug === 'index' && ancre !== '#sommaire' && ancre !== '#mes-badges' },
            { ico: '📚', texte: 'Leçons', href: RACINE + 'index.html#sommaire', actif: dans5e() || ancre === '#sommaire' },
            { ico: '⭐', texte: 'Boutique', href: RACINE + 'boutique.html', actif: slug === 'boutique' },
            { ico: '🏅', texte: 'Badges', href: RACINE + 'index.html#mes-badges', actif: ancre === '#mes-badges' }
        ];
        entrees.forEach(function (e) {
            var a = el('a', e.actif ? 'actif' : '');
            a.href = e.href;
            if (e.actif) { a.setAttribute('aria-current', 'page'); }
            a.appendChild(el('span', 'ico', e.ico)).setAttribute('aria-hidden', 'true');
            a.appendChild(document.createTextNode(e.texte));
            nav.appendChild(a);
        });
        document.body.appendChild(nav);
    }

    /* ============================================================
       Démarrage
       ============================================================ */

    function attendreModules() {
        var essais = 40;
        (function attendre() {
            rendreFlamme();
            rendreXP();
            var pret = window.KarniellaProgression && window.KarniellaXP;
            if (!pret && essais-- > 0) { window.setTimeout(attendre, 300); }
        })();
        window.addEventListener('karniella:progression', function () { window.setTimeout(rendreFlamme, 0); });
        window.addEventListener('karniella:xp', function () { window.setTimeout(rendreXP, 0); });
    }

    function initialiser() {
        assurerBarre();
        placerAvatar();
        attendreModules();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialiser);
    } else {
        initialiser();
    }

    window.KarniellaCoquille = {
        /** La zone où ranger un bouton d'outil (🌙, A+, 🔍). Construit la barre au besoin. */
        zoneOutils: function () {
            assurerBarre();
            placerAvatar();
            return zoneOutils;
        },
        /** À appeler si un module ajoute un bouton après coup, pour garder l'avatar en dernier. */
        ranger: placerAvatar,
        rafraichir: function () { rendreFil(); rendreFlamme(); rendreXP(); },
        racine: RACINE
    };
})();
