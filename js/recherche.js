/**
 * recherche.js — Chercher un mot dans toutes les leçons, depuis n'importe quelle page.
 *
 * Chargé par chat-assistant.js, comme progression.js : aucune page HTML à
 * modifier. Le module ajoute un bouton 🔍 dans l'en-tête et ouvre une fenêtre
 * de recherche avec la touche « / » ou Ctrl+K.
 *
 * Ce qu'on trouve, rangé en trois groupes :
 *   - les leçons et les matières (titre, sous-titre) ;
 *   - les notions (un titre de la leçon, avec un extrait du texte) ;
 *   - les questions de quiz.
 * Chaque notion mène à la bonne leçon, sur le bon onglet, au bon endroit :
 * js/lecon-5e.js lit l'adresse `#onglet=tab3&notion=…` et y fait défiler.
 *
 * L'index (js/recherche-index.js, généré par `npm run build:chat`) n'est chargé
 * qu'à la première recherche. Tout marche hors-ligne : le service worker le
 * garde en cache.
 */
(function () {
    'use strict';

    if (window.KarniellaRecherche) { return; }

    /** Racine du site, déduite de l'URL de ce script (même méthode que le chat). */
    var RACINE = (function () {
        var script = document.currentScript;
        if (script && script.src) {
            return script.src.replace(/js\/recherche\.js(\?.*)?$/, '');
        }
        return '';
    })();

    var CLE_RECENTES = 'karniella-recherches';
    var MAX_RECENTES = 5;
    var MAX_PAR_GROUPE = { lecon: 5, notion: 8, quiz: 4 };

    // Mots trop courants pour trier quoi que ce soit : « le circuit » doit
    // chercher « circuit », pas tout ce qui commence par « le ».
    var MOTS_VIDES = [
        'le', 'la', 'les', 'l', 'un', 'une', 'des', 'du', 'de', 'd', 'et', 'ou',
        'a', 'au', 'aux', 'en', 'c', 'est', 'ce', 'qu', 'que', 'qui', 'quoi',
        'the', 'an', 'is', 'of', 'to'
    ];

    var index = null;          // entrées préparées, une fois l'index chargé
    var chargement = null;     // callbacks en attente pendant le chargement

    var elVoile, elBoite, elSaisie, elResultats, dernierFocus;
    var options = [];          // les <a> sélectionnables, dans l'ordre affiché
    var actif = -1;

    /* ============================================================
       Texte
       ============================================================ */

    /** Minuscules, sans accents ni ponctuation — même règle que le chat. */
    function normaliser(texte) {
        return String(texte || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .replace(/[’'`]/g, ' ')
            .replace(/[^a-z0-9]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function mots(texte) {
        var n = normaliser(texte);
        return n ? n.split(' ') : [];
    }

    /** Les mots de la recherche, sans les mots vides (sauf s'il n'y a qu'eux). */
    function motsRecherche(terme) {
        var tous = mots(terme);
        var utiles = tous.filter(function (m) { return MOTS_VIDES.indexOf(m) === -1; });
        return utiles.length ? utiles : tous;
    }

    /** Une faute de frappe au plus : lettre en trop, en moins, changée ou inversée. */
    function uneFauteAuPlus(a, b) {
        if (a === b) { return true; }
        var la = a.length, lb = b.length;
        if (Math.abs(la - lb) > 1) { return false; }

        var i = 0;
        while (i < la && i < lb && a[i] === b[i]) { i++; }
        if (la === lb) {
            // Lettre changée, ou deux lettres voisines inversées.
            if (a.slice(i + 1) === b.slice(i + 1)) { return true; }
            return a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2);
        }
        return la > lb ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
    }

    /**
     * À quel point un mot cherché correspond à un mot du texte.
     * 4 : identique · 3 : début du mot · 1.5 : au milieu · 1 : une faute de frappe.
     */
    function correspondance(cherche, mot) {
        if (mot === cherche) { return 4; }
        if (mot.indexOf(cherche) === 0) { return 3; }
        // Pluriel : « melanges » doit trouver « melange » aussi bien que l'inverse.
        var singulier = cherche.length >= 4 ? cherche.replace(/[sx]$/, '') : cherche;
        if (singulier !== cherche && mot.indexOf(singulier) === 0) { return 3; }
        if (cherche.length >= 3 && mot.indexOf(cherche) !== -1) { return 1.5; }
        if (cherche.length >= 4) {
            // « circiut » doit trouver « circuit », et « melang » (en cours de
            // frappe, avec une faute) doit trouver « melange ».
            if (uneFauteAuPlus(cherche, mot)) { return 1; }
            if (mot.length > cherche.length && uneFauteAuPlus(cherche, mot.slice(0, cherche.length))) { return 1; }
        }
        return 0;
    }

    function meilleure(cherche, liste) {
        var max = 0;
        for (var i = 0; i < liste.length && max < 4; i++) {
            var c = correspondance(cherche, liste[i]);
            if (c > max) { max = c; }
        }
        return max;
    }

    /**
     * Score d'une entrée : chaque mot cherché doit se trouver quelque part,
     * sinon 0. Un mot du titre compte trois fois plus qu'un mot du texte.
     */
    function scorer(entree, cherches) {
        var total = 0;
        for (var i = 0; i < cherches.length; i++) {
            var c = Math.max(
                meilleure(cherches[i], entree.motsTitre) * 3,
                meilleure(cherches[i], entree.motsSous) * 1.5,
                meilleure(cherches[i], entree.motsTexte)
            );
            if (!c) { return 0; }
            total += c;
        }
        return total + (entree.bonus || 0);
    }

    /* ============================================================
       Index
       ============================================================ */

    function urlPage(slug) { return RACINE + '5e/' + slug + '.html'; }

    function urlVers(slug, onglet, notion) {
        if (!onglet && !notion) { return urlPage(slug); }
        var morceaux = [];
        if (onglet) { morceaux.push('onglet=' + encodeURIComponent(onglet)); }
        if (notion) { morceaux.push('notion=' + encodeURIComponent(notion)); }
        return urlPage(slug) + '#' + morceaux.join('&');
    }

    function libelleOnglet(page, id) {
        for (var i = 0; i < (page.onglets || []).length; i++) {
            if (page.onglets[i].id === id) { return page.onglets[i].libelle; }
        }
        return '';
    }

    /** Transforme l'index brut en une liste plate d'entrées prêtes à scorer. */
    function preparer(brut) {
        var matieres = brut.matieres || {};
        var entrees = [];

        (brut.pages || []).forEach(function (page) {
            var matiere = matieres[page.matiere] || { nom: '', icone: '📄' };

            entrees.push({
                type: 'lecon',
                titre: page.titre,
                sous: page.sousTitre,
                icone: page.sommaire ? matiere.icone : '📘',
                contexte: page.sommaire ? 'Matière' : matiere.nom,
                url: urlPage(page.slug),
                motsTitre: mots(page.titre),
                motsSous: mots(page.sousTitre + ' ' + (page.sommaire ? '' : matiere.nom)),
                motsTexte: [],
                bonus: page.sommaire ? 1 : 2
            });

            (page.notions || []).forEach(function (n) {
                var onglet = libelleOnglet(page, n.onglet);
                entrees.push({
                    type: 'notion',
                    titre: n.titre,
                    texte: n.texte,
                    icone: '💡',
                    contexte: matiere.icone + ' ' + page.titre + (onglet ? ' › ' + onglet : ''),
                    url: urlVers(page.slug, n.onglet, n.titre),
                    motsTitre: mots(n.titre),
                    motsSous: mots(page.titre),
                    motsTexte: mots(n.texte)
                });
            });

            (page.quiz || []).forEach(function (q) {
                entrees.push({
                    type: 'quiz',
                    titre: q.question,
                    icone: '🎯',
                    contexte: matiere.icone + ' ' + page.titre + ' › Quiz',
                    url: urlVers(page.slug, q.onglet, null),
                    motsTitre: mots(q.question),
                    motsSous: mots(page.titre),
                    motsTexte: []
                });
            });
        });

        return { entrees: entrees, brut: brut };
    }

    /** Charge js/recherche-index.js une seule fois ; `quandPret(ok)` ensuite. */
    function charger(quandPret) {
        if (index) { quandPret(true); return; }
        if (chargement) { chargement.push(quandPret); return; }
        chargement = [quandPret];

        function fin() {
            var brut = window.KarniellaRechercheIndex;
            if (brut) { index = preparer(brut); }
            var attente = chargement;
            chargement = null;
            attente.forEach(function (f) { f(Boolean(index)); });
        }

        if (window.KarniellaRechercheIndex) { fin(); return; }
        var script = document.createElement('script');
        script.src = RACINE + 'js/recherche-index.js';
        script.onload = fin;
        script.onerror = fin;
        document.head.appendChild(script);
    }

    /**
     * Cherche `terme` dans l'index déjà chargé.
     * Renvoie { lecon: [...], notion: [...], quiz: [...], total, mots }.
     */
    function chercher(terme) {
        var resultat = { lecon: [], notion: [], quiz: [], total: 0, mots: [] };
        var cherches = motsRecherche(terme);
        if (!index || !cherches.length) { return resultat; }
        resultat.mots = cherches;

        index.entrees.forEach(function (e) {
            var score = scorer(e, cherches);
            if (score > 0) { resultat[e.type].push({ entree: e, score: score }); }
        });

        ['lecon', 'notion', 'quiz'].forEach(function (type) {
            resultat.total += resultat[type].length;
            resultat[type] = resultat[type]
                .sort(function (a, b) { return b.score - a.score; })
                .slice(0, MAX_PAR_GROUPE[type])
                .map(function (r) { return r.entree; });
        });
        return resultat;
    }

    /* ============================================================
       Recherches récentes
       ============================================================ */

    function lireRecentes() {
        try {
            var liste = JSON.parse(window.localStorage.getItem(CLE_RECENTES));
            return Array.isArray(liste) ? liste : [];
        } catch (err) {
            return [];
        }
    }

    function noterRecente(terme) {
        terme = String(terme || '').trim();
        if (terme.length < 2) { return; }
        var liste = lireRecentes().filter(function (t) {
            return normaliser(t) !== normaliser(terme);
        });
        liste.unshift(terme);
        try {
            window.localStorage.setItem(CLE_RECENTES, JSON.stringify(liste.slice(0, MAX_RECENTES)));
        } catch (err) { /* stockage refusé : on oublie, sans conséquence */ }
    }

    /* ============================================================
       Rendu
       ============================================================ */

    function el(balise, classe, texte) {
        var e = document.createElement(balise);
        if (classe) { e.className = classe; }
        if (texte !== undefined) { e.textContent = texte; }
        return e;
    }

    /** Ce morceau de texte (un mot et sa ponctuation) répond-il à la recherche ? */
    function motTrouve(morceau, cherches) {
        var liste = mots(morceau);
        return liste.some(function (m) {
            return cherches.some(function (c) { return correspondance(c, m) > 0; });
        });
    }

    /** Écrit `texte` dans `parent` en entourant de <mark> les mots trouvés. */
    function surligner(parent, texte, cherches) {
        String(texte || '').split(/(\s+)/).forEach(function (morceau) {
            if (!morceau) { return; }
            var trouve = motTrouve(morceau, cherches);
            parent.appendChild(trouve ? el('mark', '', morceau) : document.createTextNode(morceau));
        });
    }

    /** Une vingtaine de mots autour du premier mot trouvé dans le texte. */
    function extrait(texte, cherches) {
        var liste = String(texte || '').split(/\s+/);
        var position = 0;
        for (var i = 0; i < liste.length; i++) {
            if (motTrouve(liste[i], cherches)) { position = i; break; }
        }
        var debut = Math.max(0, position - 6);
        var fin = Math.min(liste.length, debut + 24);
        return (debut > 0 ? '… ' : '') + liste.slice(debut, fin).join(' ') + (fin < liste.length ? ' …' : '');
    }

    function ajouterOption(parent, lien) {
        lien.id = 'rech-opt-' + options.length;
        lien.setAttribute('role', 'option');
        lien.setAttribute('aria-selected', 'false');
        options.push(lien);
        parent.appendChild(lien);
    }

    function ligneResultat(entree, cherches, terme) {
        var a = el('a', 'rech-item rech-' + entree.type);
        a.href = entree.url;
        a.addEventListener('click', function () {
            noterRecente(terme);
            // Une notion de la leçon déjà ouverte ne recharge pas la page :
            // seule l'ancre change. La fenêtre doit donc se fermer d'elle-même.
            fermer(false);
        });

        a.appendChild(el('span', 'rech-icone', entree.icone)).setAttribute('aria-hidden', 'true');

        var corps = el('span', 'rech-corps');
        var titre = el('span', 'rech-titre');
        surligner(titre, entree.titre, cherches);
        corps.appendChild(titre);

        if (entree.type === 'notion' && entree.texte) {
            var ext = el('span', 'rech-extrait');
            surligner(ext, extrait(entree.texte, cherches), cherches);
            corps.appendChild(ext);
        } else if (entree.sous) {
            var sous = el('span', 'rech-extrait');
            surligner(sous, entree.sous, cherches);
            corps.appendChild(sous);
        }
        corps.appendChild(el('span', 'rech-contexte', entree.contexte));
        a.appendChild(corps);
        return a;
    }

    /** Dernière ligne, toujours là : passer la question au poney. */
    function ligneChat(terme) {
        var a = el('a', 'rech-item rech-chat');
        a.href = '#';
        a.appendChild(el('span', 'rech-icone', '🐴')).setAttribute('aria-hidden', 'true');
        var corps = el('span', 'rech-corps');
        corps.appendChild(el('span', 'rech-titre', 'Demander au poney : « ' + terme + ' »'));
        corps.appendChild(el('span', 'rech-extrait', 'Il t\'explique avec les mots de tes leçons.'));
        a.appendChild(corps);
        a.addEventListener('click', function (e) {
            e.preventDefault();
            noterRecente(terme);
            fermer(false);
            if (window.KarniellaChat && window.KarniellaChat.demander) {
                window.KarniellaChat.demander(terme);
            }
        });
        return a;
    }

    function puces(titre, liste, surClic) {
        var bloc = el('div', 'rech-groupe');
        bloc.appendChild(el('p', 'rech-groupe-titre', titre));
        var rangee = el('div', 'rech-puces');
        liste.forEach(function (texte) {
            var b = el('button', 'rech-puce', texte);
            b.type = 'button';
            b.addEventListener('click', function () { surClic(texte); });
            rangee.appendChild(b);
        });
        bloc.appendChild(rangee);
        return bloc;
    }

    /** Quelques idées quand le champ est vide : une notion par leçon. */
    function idees() {
        if (!index) { return []; }
        var vues = {};
        var liste = [];
        (index.brut.pages || []).forEach(function (p) {
            if (p.sommaire || !p.notions || !p.notions.length) { return; }
            var n = p.notions[0].titre.replace(/^(a|an|the)\s+/i, '');
            if (!vues[n] && n.length <= 28) { vues[n] = true; liste.push(n); }
        });
        return liste.slice(0, 6);
    }

    function viderResultats() {
        elResultats.textContent = '';
        options = [];
        actif = -1;
        elSaisie.removeAttribute('aria-activedescendant');
    }

    function rendreVide() {
        viderResultats();
        var remplir = function (t) { elSaisie.value = t; rendre(); elSaisie.focus(); };

        var recentes = lireRecentes();
        if (recentes.length) { elResultats.appendChild(puces('🕘 Tes recherches récentes', recentes, remplir)); }

        var liste = idees();
        if (liste.length) { elResultats.appendChild(puces('✨ Des idées', liste, remplir)); }

        elResultats.appendChild(el('p', 'rech-astuce',
            'Astuce : pas besoin des accents, et une petite faute de frappe passe quand même. 😉'));
    }

    var GROUPES = [
        { type: 'lecon', titre: '📚 Leçons' },
        { type: 'notion', titre: '💡 Dans les leçons' },
        { type: 'quiz', titre: '🎯 Questions de quiz' }
    ];

    function rendre() {
        var terme = elSaisie.value.trim();
        if (!terme) { rendreVide(); return; }

        if (!index) {
            viderResultats();
            elResultats.appendChild(el('p', 'rech-etat', chargement
                ? 'Je prépare la recherche… 🐴'
                : 'La recherche n\'est pas disponible pour l\'instant. Demande au poney ! 🐴'));
            return;
        }

        var r = chercher(terme);
        viderResultats();

        var annonce = el('p', 'rech-compte');
        annonce.setAttribute('aria-live', 'polite');
        annonce.textContent = r.total
            ? r.total + (r.total > 1 ? ' résultats' : ' résultat')
            : 'Rien trouvé pour « ' + terme + ' ». Essaie un autre mot, ou demande au poney ! 🐴';
        elResultats.appendChild(annonce);

        var liste = el('div', 'rech-liste');
        liste.setAttribute('role', 'listbox');
        liste.setAttribute('aria-label', 'Résultats');

        GROUPES.forEach(function (g) {
            if (!r[g.type].length) { return; }
            var bloc = el('div', 'rech-groupe');
            bloc.setAttribute('role', 'group');
            var titre = el('p', 'rech-groupe-titre', g.titre);
            titre.id = 'rech-g-' + g.type;
            bloc.setAttribute('aria-labelledby', titre.id);
            bloc.appendChild(titre);
            r[g.type].forEach(function (e) { ajouterOption(bloc, ligneResultat(e, r.mots, terme)); });
            liste.appendChild(bloc);
        });

        if (window.KarniellaChat && window.KarniellaChat.demander) {
            var blocChat = el('div', 'rech-groupe');
            ajouterOption(blocChat, ligneChat(terme));
            liste.appendChild(blocChat);
        }

        elResultats.appendChild(liste);
        activer(0);
    }

    function activer(i) {
        if (actif >= 0 && options[actif]) {
            options[actif].classList.remove('rech-actif');
            options[actif].setAttribute('aria-selected', 'false');
        }
        actif = options.length ? (i + options.length) % options.length : -1;
        if (actif < 0) { elSaisie.removeAttribute('aria-activedescendant'); return; }

        var o = options[actif];
        o.classList.add('rech-actif');
        o.setAttribute('aria-selected', 'true');
        elSaisie.setAttribute('aria-activedescendant', o.id);
        if (o.scrollIntoView) { o.scrollIntoView({ block: 'nearest' }); }
    }

    /* ============================================================
       Fenêtre
       ============================================================ */

    function construire() {
        if (elVoile) { return; }

        elVoile = el('div', 'rech-voile');
        elVoile.hidden = true;
        elVoile.addEventListener('mousedown', function (e) {
            if (e.target === elVoile) { fermer(true); }
        });

        elBoite = el('div', 'rech-boite');
        elBoite.setAttribute('role', 'dialog');
        elBoite.setAttribute('aria-modal', 'true');
        elBoite.setAttribute('aria-label', 'Rechercher dans mes leçons');

        var champ = el('div', 'rech-champ');
        champ.appendChild(el('span', 'rech-loupe', '🔍')).setAttribute('aria-hidden', 'true');

        elSaisie = el('input');
        elSaisie.type = 'search';
        elSaisie.autocomplete = 'off';
        elSaisie.spellcheck = false;
        elSaisie.placeholder = 'Cherche un mot : mélange, canteen, circuit…';
        elSaisie.setAttribute('aria-label', 'Rechercher dans mes leçons');
        elSaisie.setAttribute('role', 'combobox');
        elSaisie.setAttribute('aria-expanded', 'true');
        elSaisie.setAttribute('aria-controls', 'rech-resultats');
        elSaisie.setAttribute('aria-autocomplete', 'list');
        champ.appendChild(elSaisie);

        var fermerBtn = el('button', 'rech-fermer', 'Fermer');
        fermerBtn.type = 'button';
        fermerBtn.addEventListener('click', function () { fermer(true); });
        champ.appendChild(fermerBtn);

        elResultats = el('div', 'rech-resultats');
        elResultats.id = 'rech-resultats';

        var pied = el('p', 'rech-pied', '↑ ↓ pour choisir · Entrée pour ouvrir · Échap pour fermer');

        elBoite.appendChild(champ);
        elBoite.appendChild(elResultats);
        elBoite.appendChild(pied);
        elVoile.appendChild(elBoite);
        document.body.appendChild(elVoile);

        elSaisie.addEventListener('input', rendre);
        elSaisie.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowDown') { e.preventDefault(); activer(actif + 1); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); activer(actif - 1); }
            else if (e.key === 'Enter' && actif >= 0 && options[actif]) {
                e.preventDefault();
                options[actif].click();
            }
        });

        // Garder le focus dans la fenêtre tant qu'elle est ouverte.
        elBoite.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') { e.preventDefault(); fermer(true); return; }
            if (e.key !== 'Tab') { return; }
            var focusables = elBoite.querySelectorAll('input, button, a[href]');
            var premier = focusables[0];
            var dernier = focusables[focusables.length - 1];
            if (e.shiftKey && document.activeElement === premier) { e.preventDefault(); dernier.focus(); }
            else if (!e.shiftKey && document.activeElement === dernier) { e.preventDefault(); premier.focus(); }
        });
    }

    /** Ouvre la fenêtre, éventuellement déjà remplie avec `terme`. */
    function ouvrir(terme) {
        construire();
        dernierFocus = document.activeElement;
        elVoile.hidden = false;
        document.documentElement.classList.add('rech-ouverte');
        elSaisie.value = terme || '';
        rendre();
        if (!index) { charger(function () { rendre(); }); }
        elSaisie.focus();
        if (terme) { elSaisie.select(); }
    }

    /** `rendreFocus` : false quand un autre élément (le chat) prend la main. */
    function fermer(rendreFocus) {
        if (!elVoile || elVoile.hidden) { return; }
        elVoile.hidden = true;
        document.documentElement.classList.remove('rech-ouverte');
        if (rendreFocus && dernierFocus && typeof dernierFocus.focus === 'function') {
            dernierFocus.focus();
        }
    }

    /* ============================================================
       Bouton et raccourcis
       ============================================================ */

    /** Le bouton 🔍, en haut à droite de l'en-tête de la page. */
    function ajouterBouton() {
        var entete = document.querySelector('.accueil-entete, body.lecon-5e > header, header');
        if (!entete || entete.querySelector('.rech-bouton')) { return; }

        var b = el('button', 'rech-bouton');
        b.type = 'button';
        b.setAttribute('aria-label', 'Rechercher dans mes leçons (touche /)');
        b.setAttribute('title', 'Rechercher (touche /)');
        b.appendChild(el('span', '', '🔍')).setAttribute('aria-hidden', 'true');
        b.appendChild(el('span', 'rech-bouton-texte', 'Rechercher'));
        b.addEventListener('click', function () { ouvrir(''); });
        entete.classList.add('rech-entete');
        entete.appendChild(b);
    }

    function enTrainDEcrire(cible) {
        if (!cible) { return false; }
        var balise = (cible.tagName || '').toLowerCase();
        return balise === 'input' || balise === 'textarea' || balise === 'select' || cible.isContentEditable;
    }

    function brancherRaccourcis() {
        document.addEventListener('keydown', function (e) {
            var ctrlK = (e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K');
            var slash = e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !enTrainDEcrire(e.target);
            if (!ctrlK && !slash) { return; }
            if (elVoile && !elVoile.hidden) { return; }
            e.preventDefault();
            ouvrir('');
        });
    }

    function initialiser() {
        // Tout de suite, pas à l'ouverture : le bouton 🔍 en a besoin.
        var feuille = document.createElement('link');
        feuille.rel = 'stylesheet';
        feuille.href = RACINE + 'css/recherche.css';
        document.head.appendChild(feuille);

        ajouterBouton();
        brancherRaccourcis();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialiser);
    } else {
        initialiser();
    }

    window.KarniellaRecherche = {
        ouvrir: ouvrir,
        fermer: function () { fermer(true); },
        charger: charger,
        chercher: chercher,
        normaliser: normaliser
    };
})();
