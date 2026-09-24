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

    /* ============================================================
       Icônes SVG (tracés Lucide, 24×24, trait 2)
       ============================================================
       Les emojis restent pour le contenu (leçons, badges, avatars) : ils font
       partie du jeu. Pour la navigation et les commandes, des icônes vectorielles :
       même rendu sur tous les appareils, colorables par le thème. */

    var ICONES = {
        maison: '<path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
        livre: '<path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z"/>',
        etoile: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
        medaille: '<circle cx="12" cy="8" r="6"/><path d="M15.5 13 17 22l-5-3-5 3 1.5-9"/>',
        flamme: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
        lune: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>',
        soleil: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
        loupe: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
        fusee: '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',
        panier: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>'
    };

    function svg(nom, taille) {
        var t = taille || 20;
        return '<svg class="ico-svg" width="' + t + '" height="' + t + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
            'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
            (ICONES[nom] || '') + '</svg>';
    }

    window.KarniellaIcones = { svg: svg, noms: Object.keys(ICONES) };

    /** Baloo 2 + Nunito (css/theme.css). Hors-ligne, la pile système prend le relais. */
    function chargerPolices() {
        if (document.getElementById('karniella-polices')) { return; }
        var pre = document.createElement('link');
        pre.rel = 'preconnect';
        pre.href = 'https://fonts.gstatic.com';
        pre.crossOrigin = 'anonymous';
        document.head.appendChild(pre);
        var lien = document.createElement('link');
        lien.id = 'karniella-polices';
        lien.rel = 'stylesheet';
        lien.href = 'https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Nunito:wght@500;700;800;900&display=swap';
        document.head.appendChild(lien);
    }
    chargerPolices();

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
        if (avatar) {
            avatar.textContent = X.avatar();
            var cadre = X.cadre();
            if (cadre) { avatar.setAttribute('data-cadre', cadre); } else { avatar.removeAttribute('data-cadre'); }
        }
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
        var icoFlamme = el('span', 'ico');
        icoFlamme.innerHTML = svg('flamme', 18);
        puceFlamme.appendChild(icoFlamme);
        puceFlamme.appendChild(el('span', 'n', '0'));
        puceFlamme.addEventListener('click', basculerPanneau);
        zoneOutils.appendChild(puceFlamme);

        puceXP = el('a', 'coquille-puce coquille-xp');
        puceXP.href = RACINE + 'boutique.html';
        puceXP.hidden = true;
        var icoXP = el('span', 'ico');
        icoXP.innerHTML = svg('etoile', 18);
        puceXP.appendChild(icoXP);
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
            { ico: 'maison', texte: 'Accueil', href: RACINE + 'index.html', actif: slug === 'index' && ancre !== '#sommaire' && ancre !== '#mes-badges' },
            { ico: 'livre', texte: 'Leçons', href: RACINE + 'index.html#sommaire', actif: dans5e() || ancre === '#sommaire' },
            { ico: 'etoile', texte: 'Boutique', href: RACINE + 'boutique.html', actif: slug === 'boutique' },
            { ico: 'medaille', texte: 'Badges', href: RACINE + 'index.html#mes-badges', actif: ancre === '#mes-badges' }
        ];
        entrees.forEach(function (e) {
            var a = el('a', e.actif ? 'actif' : '');
            a.href = e.href;
            if (e.actif) { a.setAttribute('aria-current', 'page'); }
            var ico = el('span', 'ico');
            ico.innerHTML = svg(e.ico, 22);
            a.appendChild(ico);
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
