/**
 * traduction.js — Le bouton « FR » à côté de chaque phrase en anglais.
 *
 * Dans les pages, une phrase anglaise porte sa traduction :
 *   <td data-fr="C'est une grande porte.">It's a big door.</td>
 *   <p data-fr="C'est en haut, à l'étage.">B: It's upstairs.</p>
 *
 * Le module ajoute à chacune un petit bouton « FR » qui affiche ou cache la
 * traduction juste en dessous. Un interrupteur en tête de leçon affiche
 * toutes les traductions d'un coup ; ce choix est gardé en mémoire
 * (localStorage) d'une leçon à l'autre et d'une visite à l'autre.
 *
 * Le bouton et la traduction portent data-lire-ignore : la lecture vocale 🔊
 * continue de lire la phrase anglaise, et seulement elle.
 */
(function () {
    'use strict';

    if (window.KarniellaTraduction) { return; }

    var CLE = 'karniella-traductions';

    function lireChoix() {
        try { return window.localStorage.getItem(CLE) === 'toutes'; } catch (err) { return false; }
    }

    function ecrireChoix(toutes) {
        try { window.localStorage.setItem(CLE, toutes ? 'toutes' : 'aucune'); } catch (err) { /* choix oublié au rechargement */ }
    }

    function el(balise, classe, texte) {
        var e = document.createElement(balise);
        if (classe) { e.className = classe; }
        if (texte !== undefined) { e.textContent = texte; }
        return e;
    }

    function basculer(bouton, trad, ouvrir) {
        trad.hidden = !ouvrir;
        bouton.setAttribute('aria-expanded', ouvrir ? 'true' : 'false');
        bouton.classList.toggle('actif', ouvrir);
    }

    function equiper(racine) {
        var elements = (racine || document).querySelectorAll('[data-fr]');
        var toutes = lireChoix();
        var paires = [];

        Array.prototype.forEach.call(elements, function (cible) {
            if (cible.querySelector(':scope > .trad-bouton')) { return; }
            var texte = cible.getAttribute('data-fr');
            if (!texte) { return; }

            var bouton = el('button', 'trad-bouton', 'FR');
            bouton.type = 'button';
            bouton.setAttribute('data-lire-ignore', '');
            bouton.setAttribute('aria-label', 'Voir la traduction en français');
            bouton.setAttribute('title', 'Traduction en français');

            var trad = el('span', 'trad-texte', texte);
            trad.setAttribute('lang', 'fr');
            trad.setAttribute('data-lire-ignore', '');
            trad.id = 'trad-' + Math.random().toString(36).slice(2, 9);
            bouton.setAttribute('aria-controls', trad.id);

            bouton.addEventListener('click', function () { basculer(bouton, trad, trad.hidden); });

            cible.appendChild(bouton);
            cible.appendChild(trad);
            basculer(bouton, trad, toutes);
            paires.push([bouton, trad]);
        });

        return paires;
    }

    /** L'interrupteur « Toutes les traductions », en tête du contenu de la leçon. */
    function ajouterInterrupteur(paires) {
        if (!paires.length || document.querySelector('.trad-tout')) { return; }
        var zone = document.querySelector('main.content');
        if (!zone) { return; }

        var bouton = el('button', 'trad-tout');
        bouton.type = 'button';
        function maj() {
            var toutes = lireChoix();
            bouton.textContent = toutes ? '🇫🇷 Cacher toutes les traductions' : '🇫🇷 Afficher toutes les traductions';
            bouton.setAttribute('aria-pressed', toutes ? 'true' : 'false');
        }
        bouton.addEventListener('click', function () {
            var toutes = !lireChoix();
            ecrireChoix(toutes);
            paires.forEach(function (p) { basculer(p[0], p[1], toutes); });
            maj();
        });
        maj();

        var reglage = zone.querySelector(':scope > .kv-reglage');
        if (reglage) { reglage.appendChild(bouton); }
        else { zone.insertBefore(bouton, zone.firstChild); }
    }

    function initialiser() {
        var paires = equiper(document);
        // La barre de vitesse de lecture arrive après nous : on attend un tour.
        window.setTimeout(function () { ajouterInterrupteur(paires); }, 0);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialiser);
    } else {
        initialiser();
    }

    window.KarniellaTraduction = { equiper: equiper };
})();
