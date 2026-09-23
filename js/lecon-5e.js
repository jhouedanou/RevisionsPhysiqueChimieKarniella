/**
 * lecon-5e.js — Comportements communs aux leçons de 5e.
 *
 * `openTab` était recopié à l'identique dans 22 pages de 6e. Ici il vit à un
 * seul endroit, et les onglets se branchent tout seuls : plus besoin d'écrire
 * onclick="openTab(event, 'tab2')" dans chaque bouton.
 */
(function () {
    'use strict';

    /** Affiche l'onglet demandé et met à jour le bouton actif. */
    function ouvrirOnglet(id, bouton) {
        var contenus = document.querySelectorAll('.tab-content');
        for (var i = 0; i < contenus.length; i++) {
            contenus[i].classList.toggle('active', contenus[i].id === id);
        }

        var boutons = document.querySelectorAll('.tab-button');
        for (var j = 0; j < boutons.length; j++) {
            var estActif = boutons[j] === bouton;
            boutons[j].classList.toggle('active', estActif);
            boutons[j].setAttribute('aria-selected', estActif ? 'true' : 'false');
        }
    }

    function initialiser() {
        var boutons = document.querySelectorAll('.tab-button[data-onglet]');

        for (var i = 0; i < boutons.length; i++) {
            (function (bouton) {
                bouton.setAttribute('role', 'tab');
                bouton.setAttribute('aria-controls', bouton.getAttribute('data-onglet'));
                bouton.addEventListener('click', function () {
                    ouvrirOnglet(bouton.getAttribute('data-onglet'), bouton);
                });
            })(boutons[i]);
        }

        var groupe = document.querySelector('.tabs');
        if (groupe) { groupe.setAttribute('role', 'tablist'); }

        suivreAncre();
        window.addEventListener('hashchange', suivreAncre);
    }

    /* ============================================================
       Liens directs vers une notion — posés par la recherche
       ============================================================ */

    /** Même règle que la recherche : sans accents, ponctuation ni emoji. */
    function normaliser(texte) {
        return String(texte || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, ' ')
            .trim();
    }

    /**
     * L'élément qui porte le titre de la notion : un titre de section, ou la
     * première cellule d'une ligne de vocabulaire (c'est de là que le script de
     * build tire les notions d'anglais).
     */
    function trouverNotion(conteneur, titre) {
        var cible = normaliser(titre);
        if (!cible) { return null; }

        var candidats = conteneur.querySelectorAll('h2, h3, h4, .table-vocab tbody td:first-child');
        var approchant = null;
        for (var i = 0; i < candidats.length; i++) {
            var texte = normaliser(candidats[i].textContent);
            if (texte === cible) { return candidats[i]; }
            if (!approchant && texte && texte.indexOf(cible) !== -1) { approchant = candidats[i]; }
        }
        return approchant;
    }

    /**
     * Lit `#onglet=tab3&notion=Mélange homogène` (ou un simple `#tab3`) :
     * ouvre l'onglet, fait défiler jusqu'à la notion et la fait briller.
     */
    function suivreAncre() {
        var ancre = window.location.hash.slice(1);
        if (!ancre) { return; }

        var onglet = null;
        var notion = null;
        if (ancre.indexOf('=') === -1) {
            onglet = decodeURIComponent(ancre);
        } else {
            ancre.split('&').forEach(function (paire) {
                var morceaux = paire.split('=');
                var valeur = decodeURIComponent(morceaux.slice(1).join('=') || '');
                if (morceaux[0] === 'onglet') { onglet = valeur; }
                if (morceaux[0] === 'notion') { notion = valeur; }
            });
        }

        var contenu = onglet && document.getElementById(onglet);
        if (contenu && contenu.classList.contains('tab-content')) {
            ouvrirOnglet(onglet, document.querySelector('.tab-button[data-onglet="' + onglet + '"]'));
        } else {
            contenu = null;
        }
        if (!notion) { return; }

        var element = trouverNotion(contenu || document.querySelector('main') || document.body, notion);
        if (!element) { return; }
        var bloc = element.closest('tr') || element;

        // Laisser l'onglet s'afficher avant de mesurer sa position.
        window.requestAnimationFrame(function () {
            var doux = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            bloc.scrollIntoView({ behavior: doux ? 'smooth' : 'auto', block: 'center' });
            bloc.classList.remove('notion-ciblee');
            void bloc.offsetWidth;   // relance l'animation si on revient sur la même notion
            bloc.classList.add('notion-ciblee');
            window.setTimeout(function () { bloc.classList.remove('notion-ciblee'); }, 2600);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialiser);
    } else {
        initialiser();
    }

    // Les pages de 6e appellent encore openTab(event, 'tabN') en onclick :
    // on garde cette porte d'entrée pour ne rien casser si une page mixte
    // charge ce fichier.
    window.openTab = function (evt, id) {
        ouvrirOnglet(id, evt && evt.currentTarget);
    };
})();
