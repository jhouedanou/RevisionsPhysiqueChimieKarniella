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
