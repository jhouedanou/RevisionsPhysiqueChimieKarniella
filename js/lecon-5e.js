/**
 * lecon-5e.js — Comportements communs aux leçons de 5e.
 *
 * `openTab` était recopié à l'identique dans 22 pages de 6e. Ici il vit à un
 * seul endroit, et les onglets se branchent tout seuls : plus besoin d'écrire
 * onclick="openTab(event, 'tab2')" dans chaque bouton.
 *
 * Le module ajoute aussi, sans rien demander aux pages :
 *   - une barre de lecture sous les onglets, qui restent en haut de l'écran ;
 *   - des boutons « Précédent / Suivant » au bas de chaque onglet ;
 *   - les cartes à retourner 🃏, tirées des notions de la leçon ;
 *   - les liens directs vers une notion, posés par la recherche.
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
        var rang = 0;
        for (var j = 0; j < boutons.length; j++) {
            var estActif = boutons[j] === bouton;
            // L'étape qu'on quitte est vue : elle gagne sa coche.
            if (boutons[j].classList.contains('active') && !estActif) { marquerVu(boutons[j]); }
            boutons[j].classList.toggle('active', estActif);
            boutons[j].setAttribute('aria-selected', estActif ? 'true' : 'false');
            if (estActif) { rang = j + 1; }
        }
        majTitreParcours(rang, boutons.length);
    }

    /* ============================================================
       Le parcours : étape X sur N, étapes vues
       ============================================================
       Les étapes vues sont gardées pour la session : revenir sur la leçon
       après un détour garde les coches, fermer l'onglet les efface. */

    var CLE_VUES = 'karniella-etapes-vues:' + window.location.pathname;

    function lireVues() {
        try { return JSON.parse(window.sessionStorage.getItem(CLE_VUES)) || {}; } catch (err) { return {}; }
    }

    function marquerVu(bouton) {
        bouton.classList.add('vu');
        var vues = lireVues();
        vues[bouton.getAttribute('data-onglet')] = true;
        try { window.sessionStorage.setItem(CLE_VUES, JSON.stringify(vues)); } catch (err) { /* sans suite */ }
    }

    function majTitreParcours(rang, total) {
        var titre = document.querySelector('.parcours-titre');
        if (!titre || !rang) { return; }
        titre.innerHTML = 'Parcours · <strong>étape ' + rang + ' sur ' + total + '</strong>';

        var jauge = document.querySelector('.parcours-jauge span');
        if (jauge) { jauge.style.width = Math.round(rang / total * 100) + '%'; }

        var suivant = document.querySelector('.parcours-suivant');
        if (suivant) {
            var boutons = document.querySelectorAll('.tab-button[data-onglet]');
            var cible = boutons[rang];   // l'étape d'après (index = rang)
            suivant.hidden = !cible;
            if (cible) { suivant.textContent = 'Étape suivante : ' + cible.textContent.trim() + ' →'; }
        }
    }

    /** Sous les étapes : la jauge d'avancement et le bouton vers l'étape d'après. */
    function ajouterSuiteParcours(groupe, boutons) {
        if (!groupe || boutons.length < 2) { return; }
        var jauge = document.createElement('div');
        jauge.className = 'parcours-jauge';
        jauge.setAttribute('aria-hidden', 'true');
        jauge.appendChild(document.createElement('span'));
        groupe.appendChild(jauge);

        var suivant = document.createElement('button');
        suivant.type = 'button';
        suivant.className = 'parcours-suivant';
        suivant.addEventListener('click', function () {
            var actifs = document.querySelectorAll('.tab-button[data-onglet]');
            for (var i = 0; i < actifs.length; i++) {
                if (actifs[i].classList.contains('active') && actifs[i + 1]) {
                    ouvrirOnglet(actifs[i + 1].getAttribute('data-onglet'), actifs[i + 1]);
                    var doux = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                    document.querySelector('main.content').scrollIntoView({ behavior: doux ? 'smooth' : 'auto', block: 'start' });
                    return;
                }
            }
        });
        groupe.appendChild(suivant);
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
        if (groupe) {
            groupe.setAttribute('role', 'tablist');
            var titre = document.createElement('p');
            titre.className = 'parcours-titre';
            groupe.insertBefore(titre, groupe.firstChild);
        }

        var vues = lireVues();
        var rangActif = 0;
        for (var k = 0; k < boutons.length; k++) {
            if (vues[boutons[k].getAttribute('data-onglet')]) { boutons[k].classList.add('vu'); }
            if (boutons[k].classList.contains('active')) { rangActif = k + 1; }
        }
        majTitreParcours(rangActif, boutons.length);

        ajouterBarreLecture(groupe);
        ajouterNavigation(boutons);
        preparerCartes(groupe);
        ajouterMission(groupe);
        ajouterSuiteParcours(groupe, boutons);
        majTitreParcours(rangActif, boutons.length);

        suivreAncre();
        window.addEventListener('hashchange', suivreAncre);
    }

    /* ============================================================
       Barre de lecture
       ============================================================ */

    /** Un trait sous les onglets, qui avance à mesure qu'on descend dans la page. */
    function ajouterBarreLecture(groupe) {
        if (!groupe) { return; }
        var barre = document.createElement('div');
        barre.className = 'barre-lecture';
        barre.setAttribute('aria-hidden', 'true');
        var remplissage = document.createElement('span');
        barre.appendChild(remplissage);
        groupe.appendChild(barre);

        var prevu = false;
        function mesurer() {
            prevu = false;
            var max = document.documentElement.scrollHeight - window.innerHeight;
            var part = max > 0 ? Math.min(1, window.scrollY / max) : 0;
            remplissage.style.transform = 'scaleX(' + part + ')';
        }
        function planifier() {
            if (!prevu) { prevu = true; window.requestAnimationFrame(mesurer); }
        }
        window.addEventListener('scroll', planifier, { passive: true });
        window.addEventListener('resize', planifier);
        document.addEventListener('click', planifier);   // un changement d'onglet change la hauteur
        mesurer();
    }

    /* ============================================================
       Précédent / Suivant
       ============================================================ */

    /** Au bas de chaque onglet, de quoi passer au suivant sans remonter. */
    function ajouterNavigation(boutons) {
        if (boutons.length < 2) { return; }

        for (var i = 0; i < boutons.length; i++) {
            var contenu = document.getElementById(boutons[i].getAttribute('data-onglet'));
            if (!contenu) { continue; }

            var nav = document.createElement('nav');
            nav.className = 'suite-onglets';
            nav.setAttribute('aria-label', 'Passer à un autre onglet');
            if (i > 0) { nav.appendChild(boutonVers(boutons[i - 1], 'precedent')); }
            if (i < boutons.length - 1) { nav.appendChild(boutonVers(boutons[i + 1], 'suivant')); }
            contenu.appendChild(nav);
        }
    }

    function boutonVers(cible, sens) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'suite-' + sens;
        var libelle = cible.textContent.trim();
        b.textContent = sens === 'suivant' ? 'Suivant : ' + libelle + ' →' : '← ' + libelle;
        b.addEventListener('click', function () {
            ouvrirOnglet(cible.getAttribute('data-onglet'), cible);
            var onglets = document.querySelector('.tabs');
            var doux = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            (onglets || document.body).scrollIntoView({ behavior: doux ? 'smooth' : 'auto', block: 'start' });
            cible.focus({ preventScroll: true });
        });
        return b;
    }

    /* ============================================================
       🚀 Mission express (5e/mission.html)
       ============================================================ */

    function ajouterMission(groupe) {
        var programme = window.KarniellaProgramme;
        if (!groupe || !programme) { return; }
        var slug = window.location.pathname.split('/').pop().replace(/\.html$/, '');
        var trouvee = false;
        programme.matieres.forEach(function (m) {
            (m.lecons || []).forEach(function (l) { if (l.id === slug && l.mission) { trouvee = true; } });
        });
        if (!trouvee) { return; }
        var a = document.createElement('a');
        a.className = 'bouton-mission';
        a.href = 'mission.html?id=' + encodeURIComponent(slug);
        a.textContent = '🚀 Mission 3 min';
        a.setAttribute('title', 'La version express : une histoire, trois cartes, un quiz');
        groupe.appendChild(a);
    }

    /* ============================================================
       Cartes à retourner 🃏
       ============================================================ */

    // Ce qui ne fait pas une bonne carte : la mise en situation, la correction
    // et le quiz (des questions, pas des notions), et les consignes.
    var ONGLETS_EXCLUS = /quiz|situation|correction/i;
    var TITRES_EXCLUS = /^(ecoute|avant|entraine|fabrique|activite|questions?|correction|teste)/;
    var TEXTE_MAX = 260;

    function choisirCartes(detail) {
        var exclus = {};
        (detail.onglets || []).forEach(function (o) {
            if (ONGLETS_EXCLUS.test(o.libelle)) { exclus[o.id] = true; }
        });
        return (detail.notions || []).filter(function (n) {
            var titre = normaliser(n.titre);
            return !exclus[n.onglet] &&
                n.texte && n.texte.length <= TEXTE_MAX &&
                n.titre.length <= 50 &&
                !/[?/]/.test(n.titre) &&
                !TITRES_EXCLUS.test(titre);
        });
    }

    /** Charge les notions de la page ; le bouton 🃏 n'apparaît que s'il y a de quoi réviser. */
    function preparerCartes(groupe) {
        if (!groupe || typeof window.fetch !== 'function') { return; }
        var slug = window.location.pathname.split('/').pop().replace(/\.html$/, '');

        window.fetch('../data/chat/' + slug + '.json')
            .then(function (r) { return r.ok ? r.json() : null; })
            .catch(function () { return null; })
            .then(function (detail) {
                var cartes = detail ? choisirCartes(detail) : [];
                if (cartes.length < 3) { return; }

                var b = document.createElement('button');
                b.type = 'button';
                b.className = 'bouton-cartes';
                b.textContent = '🃏 Réviser en cartes';
                b.addEventListener('click', function () { ouvrirCartes(cartes, b); });
                groupe.insertBefore(b, groupe.querySelector('.barre-lecture'));
            });
    }

    function ouvrirCartes(cartes, declencheur) {
        var paquet = cartes.slice();
        var position = 0;

        var voile = document.createElement('div');
        voile.className = 'cartes-voile';

        var boite = document.createElement('div');
        boite.className = 'cartes-boite';
        boite.setAttribute('role', 'dialog');
        boite.setAttribute('aria-modal', 'true');
        boite.setAttribute('aria-label', 'Cartes de révision');

        var haut = document.createElement('div');
        haut.className = 'cartes-haut';
        var compte = document.createElement('span');
        compte.className = 'cartes-compte';
        compte.setAttribute('aria-live', 'polite');
        var melanger = document.createElement('button');
        melanger.type = 'button';
        melanger.className = 'cartes-outil';
        melanger.textContent = '🔀 Mélanger';
        var fermerBtn = document.createElement('button');
        fermerBtn.type = 'button';
        fermerBtn.className = 'cartes-outil';
        fermerBtn.textContent = 'Fermer';
        haut.appendChild(compte);
        haut.appendChild(melanger);
        haut.appendChild(fermerBtn);

        // La carte : un bouton, pour qu'Entrée ou Espace la retourne aussi.
        var carte = document.createElement('button');
        carte.type = 'button';
        carte.className = 'carte-revision';
        var recto = document.createElement('span');
        recto.className = 'carte-face carte-recto';
        var verso = document.createElement('span');
        verso.className = 'carte-face carte-verso';
        carte.appendChild(recto);
        carte.appendChild(verso);

        var bas = document.createElement('div');
        bas.className = 'cartes-bas';
        var precedente = document.createElement('button');
        precedente.type = 'button';
        precedente.className = 'cartes-nav';
        precedente.textContent = '← Précédente';
        var suivante = document.createElement('button');
        suivante.type = 'button';
        suivante.className = 'cartes-nav cartes-nav-suivante';
        suivante.textContent = 'Suivante →';
        bas.appendChild(precedente);
        bas.appendChild(suivante);

        var aide = document.createElement('p');
        aide.className = 'cartes-aide';
        aide.textContent = 'Essaie de répondre dans ta tête, puis touche la carte pour la retourner.';

        boite.appendChild(haut);
        boite.appendChild(carte);
        boite.appendChild(aide);
        boite.appendChild(bas);
        voile.appendChild(boite);
        document.body.appendChild(voile);
        document.documentElement.classList.add('cartes-ouvertes');

        function montrer() {
            var n = paquet[position];
            carte.classList.remove('retournee');
            recto.textContent = n.titre;
            verso.textContent = n.texte;
            // Une carte d'anglais doit être lue avec une voix anglaise.
            if (n.langue) { carte.setAttribute('lang', n.langue); } else { carte.removeAttribute('lang'); }
            carte.setAttribute('aria-label', n.titre + ' — touche pour voir la réponse');
            compte.textContent = 'Carte ' + (position + 1) + ' sur ' + paquet.length;
            precedente.disabled = position === 0;
            suivante.textContent = position === paquet.length - 1 ? 'Terminer ✓' : 'Suivante →';
        }

        function retourner() {
            var retournee = carte.classList.toggle('retournee');
            carte.setAttribute('aria-label', retournee
                ? paquet[position].texte
                : paquet[position].titre + ' — touche pour voir la réponse');
        }

        function fermer() {
            document.removeEventListener('keydown', clavier);
            document.documentElement.classList.remove('cartes-ouvertes');
            voile.parentNode.removeChild(voile);
            if (declencheur) { declencheur.focus(); }
        }

        function aller(sens) {
            if (sens > 0 && position === paquet.length - 1) {
                if (window.KarniellaFete) { window.KarniellaFete(); }
                fermer();
                return;
            }
            position = Math.max(0, Math.min(paquet.length - 1, position + sens));
            montrer();
            carte.focus();
        }

        function clavier(e) {
            if (e.key === 'Escape') { e.preventDefault(); fermer(); }
            else if (e.key === 'ArrowRight') { e.preventDefault(); aller(1); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); aller(-1); }
            else if (e.key === 'Tab') {
                var focusables = boite.querySelectorAll('button:not(:disabled)');
                var premier = focusables[0];
                var dernier = focusables[focusables.length - 1];
                if (e.shiftKey && document.activeElement === premier) { e.preventDefault(); dernier.focus(); }
                else if (!e.shiftKey && document.activeElement === dernier) { e.preventDefault(); premier.focus(); }
            }
        }

        carte.addEventListener('click', retourner);
        precedente.addEventListener('click', function () { aller(-1); });
        suivante.addEventListener('click', function () { aller(1); });
        fermerBtn.addEventListener('click', fermer);
        melanger.addEventListener('click', function () {
            for (var i = paquet.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                var t = paquet[i]; paquet[i] = paquet[j]; paquet[j] = t;
            }
            position = 0;
            montrer();
        });
        voile.addEventListener('mousedown', function (e) { if (e.target === voile) { fermer(); } });
        document.addEventListener('keydown', clavier);

        montrer();
        carte.focus();
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
