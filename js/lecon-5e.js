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
 *   - les liens directs vers une notion, posés par la recherche ;
 *   - le suivi de lecture : la mission 🚀 n'apparaît qu'une fois la leçon lue ;
 *   - la fiche à imprimer 🖨️, un bouton dans le bandeau de la leçon.
 *
 * L'onglet ouvert est écrit dans l'adresse (#tab3) : si le téléphone recharge
 * la page, Karniella revient où elle en était.
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
            // Un seul onglet dans l'ordre de tabulation : les flèches font le reste.
            if (bouton) { boutons[j].setAttribute('tabindex', estActif ? '0' : '-1'); }
            if (estActif) { rang = j + 1; }
        }
        majTitreParcours(rang, boutons.length);
        montrerOngletActif(bouton);
        ecrireAncre(id);
        etapeOuverte(id);
    }

    function mouvementDoux() {
        return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    /**
     * Sur téléphone, la rangée d'onglets est bien plus large que l'écran :
     * on la fait défiler pour garder l'onglet actif au milieu. Sinon, après
     * quelques « Suivant », l'onglet ouvert n'était plus visible.
     */
    function montrerOngletActif(bouton) {
        var groupe = bouton && bouton.parentNode;
        if (!groupe || groupe.scrollWidth <= groupe.clientWidth + 1) { return; }
        var g = groupe.getBoundingClientRect();
        var b = bouton.getBoundingClientRect();
        var decalage = b.left - g.left - (g.width - b.width) / 2;
        if (Math.abs(decalage) < 2) { return; }
        if (typeof groupe.scrollBy === 'function') {
            groupe.scrollBy({ left: decalage, behavior: mouvementDoux() ? 'smooth' : 'auto' });
        } else {
            groupe.scrollLeft += decalage;
        }
    }

    /** #tab3 dans l'adresse, sans ajouter d'entrée à l'historique. */
    function ecrireAncre(id) {
        if (!id || !window.history || typeof window.history.replaceState !== 'function') { return; }
        if (window.location.hash.slice(1) === id) { return; }
        try { window.history.replaceState(null, '', '#' + id); } catch (err) { /* file:// */ }
    }

    /**
     * Un dégradé sur le bord de la rangée quand il reste des onglets cachés de
     * ce côté (css : .tabs.suite-droite / .suite-gauche). Sans lui, rien ne
     * disait que le Quiz, les cartes et la mission étaient plus loin à droite.
     */
    function majBordsOnglets() {
        var groupe = document.querySelector('.tabs');
        if (!groupe) { return; }
        var reste = groupe.scrollWidth - groupe.clientWidth - groupe.scrollLeft;
        groupe.classList.toggle('suite-droite', reste > 4);
        groupe.classList.toggle('suite-gauche', groupe.scrollLeft > 4);
    }

    function brancherBordsOnglets(groupe) {
        if (!groupe) { return; }
        var prevu = false;
        function planifier() {
            if (prevu) { return; }
            prevu = true;
            window.requestAnimationFrame(function () { prevu = false; majBordsOnglets(); });
        }
        groupe.addEventListener('scroll', planifier, { passive: true });
        window.addEventListener('resize', planifier);
        window.addEventListener('load', function () {
            montrerOngletActif(groupe.querySelector('.tab-button.active'));
            planifier();
        });
        planifier();
    }

    /**
     * Flèches du clavier dans la rangée d'onglets (gauche / droite ; haut / bas
     * quand les onglets sont en colonne, sur grand écran), Début et Fin.
     */
    function brancherClavier(groupe) {
        if (!groupe) { return; }
        groupe.addEventListener('keydown', function (e) {
            var cible = e.target;
            if (!cible.classList || !cible.classList.contains('tab-button')) { return; }
            var boutons = Array.prototype.slice.call(groupe.querySelectorAll('.tab-button[data-onglet]'));
            var i = boutons.indexOf(cible);
            if (i === -1) { return; }
            var colonne = window.getComputedStyle(groupe).flexDirection === 'column';
            var suivant = colonne ? 'ArrowDown' : 'ArrowRight';
            var precedent = colonne ? 'ArrowUp' : 'ArrowLeft';
            var j = null;
            if (e.key === suivant) { j = (i + 1) % boutons.length; }
            else if (e.key === precedent) { j = (i - 1 + boutons.length) % boutons.length; }
            else if (e.key === 'Home') { j = 0; }
            else if (e.key === 'End') { j = boutons.length - 1; }
            if (j === null) { return; }
            e.preventDefault();
            ouvrirOnglet(boutons[j].getAttribute('data-onglet'), boutons[j]);
            boutons[j].focus();
        });
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
    /**
     * Remonte au début de l'onglet qui vient de s'ouvrir, juste sous la barre du
     * haut (et sous les onglets quand ils collent en haut, sur téléphone).
     * scrollIntoView sur .tabs ne marchait pas : un élément collant (sticky)
     * est toujours « visible », donc le navigateur ne bougeait pas.
     */
    function remonterAuDebut() {
        var section = document.querySelector('.tab-content.active') || document.querySelector('main.content');
        if (!section) { return; }
        var barre = document.querySelector('.coquille-barre');
        var haut = barre ? Math.max(0, barre.getBoundingClientRect().bottom) : 0;
        var onglets = document.querySelector('.tabs');
        if (onglets && window.getComputedStyle(onglets).position === 'sticky' &&
                onglets.getBoundingClientRect().width > window.innerWidth * 0.6) {
            haut += onglets.offsetHeight;
        }
        var cible = section.getBoundingClientRect().top + window.pageYOffset - haut - 12;
        var doux = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: Math.max(0, cible), behavior: doux ? 'smooth' : 'auto' });
    }

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
                    remonterAuDebut();
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
                var id = bouton.getAttribute('data-onglet');
                var actif = bouton.classList.contains('active');
                bouton.setAttribute('role', 'tab');
                bouton.setAttribute('aria-controls', id);
                bouton.setAttribute('aria-selected', actif ? 'true' : 'false');
                bouton.setAttribute('tabindex', actif ? '0' : '-1');
                if (!bouton.id) { bouton.id = 'onglet-' + id; }
                var panneau = document.getElementById(id);
                if (panneau) {
                    panneau.setAttribute('role', 'tabpanel');
                    panneau.setAttribute('aria-labelledby', bouton.id);
                }
                bouton.addEventListener('click', function () {
                    ouvrirOnglet(id, bouton);
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
        preparerEtapesFiche(boutons);
        ajouterBoutonFiche();
        ajouterSuiteParcours(groupe, boutons);
        majTitreParcours(rangActif, boutons.length);
        brancherClavier(groupe);
        suivreLecture(boutons);

        suivreAncre();
        window.addEventListener('hashchange', suivreAncre);
        brancherBordsOnglets(groupe);
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
            remonterAuDebut();
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
        // Cachée tant que la leçon n'est pas lue (voir « Suivi de lecture »).
        a.hidden = !lecture.lue;
        lecture.mission = a;
        groupe.appendChild(a);
        majBordsOnglets();
    }

    /* ============================================================
       Suivi de lecture — débloque la mission 🚀
       ============================================================
       Une étape est lue quand Karniella a vu le BAS de l'onglet (un repère
       invisible y est posé). La leçon est lue quand toutes les étapes avant le
       quiz le sont : alors seulement la mission apparaît. Ouvrir les onglets un
       à un sans les lire ne suffit pas.

       C'est js/progression.js qui s'en souvient (chargé par le chat, donc un
       peu après cette page). En attendant, ou si le navigateur refuse le
       stockage, on compte en mémoire : la mission se débloque quand même
       pendant la visite. */

    var lecture = { slug: null, etapes: [], lues: {}, lue: false, enAttente: [], mission: null };

    /** L'onglet du quiz n'est pas à « lire » : c'est l'épreuve, pas la leçon. */
    function estOngletQuiz(bouton) {
        var id = bouton.getAttribute('data-onglet');
        var contenu = id && document.getElementById(id);
        if (/quiz|teste/i.test(bouton.textContent)) { return true; }
        return !!(contenu && contenu.querySelector('[id^="quiz"]'));
    }

    function suivreLecture(boutons) {
        lecture.slug = window.location.pathname.split('/').pop().replace(/\.html$/, '');
        for (var i = 0; i < boutons.length; i++) {
            if (!estOngletQuiz(boutons[i])) { lecture.etapes.push(boutons[i].getAttribute('data-onglet')); }
        }
        // Rien à lire avant le quiz : la mission est ouverte d'emblée.
        if (!lecture.etapes.length) { lecture.lue = true; majMission(false); return; }

        // Ce que progression.js a déjà retenu des visites précédentes.
        var essais = 40;
        (function attendre() {
            var suivi = window.KarniellaProgression;
            if (suivi) {
                var deja = suivi.pourPage(lecture.slug);
                if (deja) {
                    (deja.etapesLues || []).forEach(function (e) { lecture.lues[e] = true; });
                    if (deja.lue) { lecture.lue = true; }
                }
                var file = lecture.enAttente;
                lecture.enAttente = [];
                file.forEach(function (e) { noterEtape(e); });
                majMission(false);
                return;
            }
            if (essais-- > 0) { window.setTimeout(attendre, 250); }
        })();

        if (!('IntersectionObserver' in window)) { return; }   // repli : etapeOuverte()
        var observateur = new window.IntersectionObserver(function (entrees) {
            entrees.forEach(function (entree) {
                if (entree.isIntersecting) { noterEtape(entree.target.getAttribute('data-etape')); }
            });
        });
        lecture.etapes.forEach(function (id) {
            var contenu = document.getElementById(id);
            if (!contenu) { return; }
            var repere = document.createElement('div');
            repere.className = 'fin-etape';
            repere.setAttribute('aria-hidden', 'true');
            repere.setAttribute('data-etape', id);
            contenu.appendChild(repere);
            observateur.observe(repere);
        });
    }

    /** Sans IntersectionObserver (vieux navigateur), ouvrir l'onglet compte. */
    function etapeOuverte(id) {
        if (lecture.slug && !('IntersectionObserver' in window)) { noterEtape(id); }
    }

    function noterEtape(id) {
        if (!id || lecture.etapes.indexOf(id) === -1) { return; }
        var nouvelle = !lecture.lues[id];
        lecture.lues[id] = true;
        var suivi = window.KarniellaProgression;
        if (suivi) {
            if (suivi.marquerLecture(lecture.slug, id, lecture.etapes)) { lecture.lue = true; }
        } else if (nouvelle) {
            lecture.enAttente.push(id);
        }
        if (!lecture.lue && lecture.etapes.every(function (e) { return lecture.lues[e]; })) {
            lecture.lue = true;
        }
        majMission(true);
    }

    function majMission(fete) {
        var a = lecture.mission;
        if (!a || !lecture.lue || !a.hidden) { return; }
        a.hidden = false;
        if (fete) {
            a.classList.add('debloquee');
            a.setAttribute('title', 'Mission débloquée : tu as lu toute la leçon !');
        }
        majBordsOnglets();
    }

    /* ============================================================
       Cartes à retourner 🃏
       ============================================================ */

    // Ce qui ne fait pas une bonne carte : la mise en situation, la correction
    // et le quiz (des questions, pas des notions), et les consignes.
    var ONGLETS_EXCLUS = /quiz|situation|correction|practice|exercice/i;   // les exercices ne sont pas des notions
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
                majBordsOnglets();
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
       Fiche à imprimer 🖨️
       ============================================================
       Le bouton du bandeau ouvre une petite fenêtre : on coche les étapes à
       mettre sur papier, puis on imprime. Une fiche doit tenir en peu de
       pages, donc au départ seul l'essentiel est coché :
         1. l'onglet « À retenir » / « Retiens l'essentiel », s'il existe ;
         2. sinon « Mon cahier » (le cours du professeur) ;
         3. sinon toutes les étapes du cours.
       Les exercices s'impriment sans leurs corrigés, pour être faits au
       stylo. Le quiz s'imprime en questions à cocher, le corrigé en une
       ligne à la fin (quizSurPapier). Ni l'un ni l'autre n'est coché au
       départ.

       La mise en page du papier est dans css/lecon-5e.css (@media print) :
       deux colonnes, petite police, presque pas de marges. Les étapes
       cochées au départ portent data-fiche-defaut : un Ctrl+P sans passer
       par le bouton imprime la même fiche.

       Une fiche = une feuille A4. Avant d'imprimer, mesurerFiche() calcule
       le zoom qui fait tout tenir sur une page ; la fenêtre dit si ça tient. */

    var ONGLETS_ENTRAINEMENT = /exercice|practice|entra[iî]n/i;
    var ONGLETS_ESSENTIEL = /retiens|retenir|essentiel/i;
    var LETTRES = 'ABCDEFGH';
    var fiche = { etapes: [], prete: false, detailsOuverts: [], regle: null };

    // La feuille A4 moins les marges de @page (8 mm de chaque côté), en px CSS.
    // 2 % de hauteur en moins : le navigateur arrondit un peu en imprimant.
    var MM = 96 / 25.4;
    var PAGE_HAUTEUR = (297 - 16) * MM * 0.98;
    // En dessous, le texte devient illisible : la fiche passe alors sur 2 feuilles.
    var ZOOM_MIN = 0.55;

    function preparerEtapesFiche(boutons) {
        for (var i = 0; i < boutons.length; i++) {
            var id = boutons[i].getAttribute('data-onglet');
            var contenu = document.getElementById(id);
            if (!contenu) { continue; }
            var libelle = boutons[i].textContent.trim();
            var role = estOngletQuiz(boutons[i]) ? 'quiz'
                : ONGLETS_ENTRAINEMENT.test(libelle) ? 'exercices' : 'cours';
            if (role === 'quiz') { contenu.setAttribute('data-fiche-quiz', ''); }
            fiche.etapes.push({ id: id, libelle: libelle, role: role, defaut: false });
        }
        if (!fiche.etapes.length) { return; }

        // « 🔊 Écoute avant de répéter » parle des boutons de l'écran.
        var titres = document.querySelectorAll('main h4');
        for (var j = 0; j < titres.length; j++) {
            var boite = titres[j].closest('.note-box, .example-box');
            if (boite && /^\s*🔊/.test(titres[j].textContent)) { boite.classList.add('fiche-ecran'); }
        }

        var cours = fiche.etapes.filter(function (e) { return e.role === 'cours'; });
        var essentiel = cours.filter(function (e) { return ONGLETS_ESSENTIEL.test(e.libelle); });
        var cahier = cours.filter(function (e) { return e.id === 'cahier'; });
        var parDefaut = essentiel.length ? essentiel : cahier.length ? cahier : cours.length ? cours : fiche.etapes;
        parDefaut.forEach(function (e) {
            e.defaut = true;
            document.getElementById(e.id).setAttribute('data-fiche-defaut', '');
        });
        document.documentElement.classList.add('fiche-roles');
    }

    function bandeauLecon() {
        return document.querySelector('body > header:not(.coquille-barre)');
    }

    function ajouterBoutonFiche() {
        var bandeau = bandeauLecon();
        if (!bandeau || !fiche.etapes.length || typeof window.print !== 'function') { return; }
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'bouton-fiche';
        b.textContent = '🖨️ Fiche à imprimer';
        b.addEventListener('click', function () { ouvrirChoixFiche(b); });
        bandeau.appendChild(b);
    }

    /** L'essentiel coché ; les traductions si elles sont affichées à l'écran. */
    function choixFicheParDefaut() {
        var etapes = {};
        fiche.etapes.forEach(function (e) { etapes[e.id] = e.defaut; });
        return { etapes: etapes, traductions: !!document.querySelector('.trad-tout[aria-pressed="true"]') };
    }

    /** Met la page dans l'état de la fiche choisie (étapes, traductions, quiz…). */
    function appliquerChoix(choix) {
        var racine = document.documentElement;
        fiche.etapes.forEach(function (e) {
            var contenu = document.getElementById(e.id);
            if (choix.etapes[e.id]) { contenu.setAttribute('data-fiche', ''); } else { contenu.removeAttribute('data-fiche'); }
        });
        racine.classList.add('fiche-choix');
        racine.classList.toggle('fiche-traductions', !!choix.traductions);
        fiche.etapes.forEach(function (e) {
            var contenu = document.getElementById(e.id);
            if (e.role === 'quiz' && choix.etapes[e.id] && !quizSurPapier(contenu)) {
                contenu.removeAttribute('data-fiche');   // questions pas encore chargées
            }
        });

        // Sur papier, on ne peut pas déplier : les <details> du cours s'ouvrent.
        // Pas ceux des exercices, qui cachent les corrigés.
        var details = document.querySelectorAll('main details:not([open])');
        for (var i = 0; i < details.length; i++) {
            if (!details[i].closest('.exercice')) {
                details[i].open = true;
                fiche.detailsOuverts.push(details[i]);
            }
        }

        var bandeau = bandeauLecon();
        var mention = bandeau && bandeau.querySelector('.fiche-mention');
        if (bandeau && !mention) {
            mention = document.createElement('p');
            mention.className = 'fiche-mention';
            bandeau.insertBefore(mention, bandeau.firstChild);
        }
        if (mention) { mention.textContent = '📝 Fiche de révision · imprimée le ' + new Date().toLocaleDateString('fr-FR'); }
    }

    /** La règle @media print de css/lecon-5e.css (celle qui contient @page). */
    function regleImpression() {
        if (fiche.regle) { return fiche.regle; }
        var feuilles = document.styleSheets;
        for (var i = 0; i < feuilles.length; i++) {
            if (!/\/css\/lecon-5e\.css(\?|$)/.test(feuilles[i].href || '')) { continue; }
            var regles;
            try { regles = feuilles[i].cssRules; } catch (err) { return null; }
            for (var j = 0; j < regles.length; j++) {
                var r = regles[j];
                if (!r.media || r.media.mediaText !== 'print' || !r.cssRules) { continue; }
                for (var k = 0; k < r.cssRules.length; k++) {
                    if (r.cssRules[k].type === 6) { fiche.regle = r; return r; }   // 6 : @page
                }
            }
        }
        return null;
    }

    /**
     * Le zoom qui fait tenir la fiche sur une feuille. On applique un instant
     * les règles @media print à l'écran, sur une page large comme la feuille
     * (html.fiche-mesure), on mesure, puis on remet tout : rien ne s'affiche
     * entre les deux. Renvoie { zoom, tient }.
     */
    function mesurerFiche() {
        var regle = regleImpression();
        if (!regle) { return { zoom: 1, tient: true }; }
        var racine = document.documentElement;
        var avant = racine.style.getPropertyValue('--fiche-zoom');
        function hauteur(zoom) {
            racine.style.setProperty('--fiche-zoom', String(zoom));
            return document.body.getBoundingClientRect().height;
        }
        var resultat = { zoom: 1, tient: true };
        regle.media.mediaText = 'all';
        racine.classList.add('fiche-mesure');
        try {
            if (hauteur(1) > PAGE_HAUTEUR) {
                if (hauteur(ZOOM_MIN) > PAGE_HAUTEUR) {
                    resultat = { zoom: ZOOM_MIN, tient: false };
                } else {
                    var bas = ZOOM_MIN;
                    var haut = 1;
                    for (var i = 0; i < 7; i++) {
                        var milieu = (bas + haut) / 2;
                        if (hauteur(milieu) <= PAGE_HAUTEUR) { bas = milieu; } else { haut = milieu; }
                    }
                    resultat = { zoom: Math.floor(bas * 100) / 100, tient: true };
                }
            }
        } finally {
            racine.classList.remove('fiche-mesure');
            regle.media.mediaText = 'print';
            if (avant) { racine.style.setProperty('--fiche-zoom', avant); } else { racine.style.removeProperty('--fiche-zoom'); }
        }
        return resultat;
    }

    function preparerFiche(choix) {
        appliquerChoix(choix);
        document.documentElement.style.setProperty('--fiche-zoom', String(mesurerFiche().zoom));
        fiche.prete = true;
    }

    /** Pour la fenêtre : la taille de la fiche, sans rien imprimer. */
    function estimerFiche(choix) {
        appliquerChoix(choix);
        var taille = mesurerFiche();
        retirerChoix();
        return taille;
    }

    /**
     * Le quiz de l'onglet en une liste à cocher : l'énoncé, les propositions
     * A, B, C, D sur une ligne, et le corrigé en une ligne à la fin. Les
     * questions sont celles que la page a passées à initSectionQuiz
     * (js/section-quiz.js les garde dans window.sectionQuizInstances).
     * Construite une fois, cachée à l'écran par css/lecon-5e.css.
     */
    function quizSurPapier(contenu) {
        if (contenu.querySelector('.fiche-quiz')) { return true; }
        var instances = window.sectionQuizInstances || {};
        var questions = [];
        var hote = null;
        Object.keys(instances).forEach(function (cle) {
            var quiz = instances[cle];
            if (quiz && quiz.container && quiz.questions && contenu.contains(quiz.container)) {
                questions = questions.concat(quiz.questions);
                hote = hote || quiz.container;
            }
        });
        if (!questions.length) { return false; }

        var bloc = document.createElement('div');
        bloc.className = 'fiche-quiz';
        var liste = document.createElement('ol');
        var corrige = [];
        questions.forEach(function (q, n) {
            var li = document.createElement('li');
            if (q.langue) { li.lang = q.langue; }
            var enonce = document.createElement('span');
            enonce.className = 'fiche-quiz-question';
            enonce.textContent = q.question;
            var propositions = document.createElement('span');
            propositions.className = 'fiche-quiz-options';
            if (q.optionsLangue || q.langue) { propositions.lang = q.optionsLangue || q.langue; }
            (q.options || []).forEach(function (o, k) {
                var proposition = document.createElement('span');
                proposition.textContent = '☐ ' + LETTRES.charAt(k) + '. ' + o;
                propositions.appendChild(proposition);
                propositions.appendChild(document.createTextNode(' '));
            });
            li.appendChild(enonce);
            li.appendChild(propositions);
            liste.appendChild(li);
            corrige.push((n + 1) + ' ' + (LETTRES.charAt(q.correctAnswer) || '?'));
        });
        var ligne = document.createElement('p');
        ligne.className = 'fiche-quiz-corrige';
        ligne.textContent = 'Corrigé : ' + corrige.join(' · ');
        bloc.appendChild(liste);
        bloc.appendChild(ligne);
        hote.parentNode.insertBefore(bloc, hote.nextSibling);
        return true;
    }

    function retirerChoix() {
        var racine = document.documentElement;
        racine.classList.remove('fiche-choix');
        racine.classList.remove('fiche-traductions');
        fiche.etapes.forEach(function (e) { document.getElementById(e.id).removeAttribute('data-fiche'); });
        fiche.detailsOuverts.forEach(function (d) { d.open = false; });
        fiche.detailsOuverts = [];
    }

    function rangerFiche() {
        retirerChoix();
        document.documentElement.style.removeProperty('--fiche-zoom');
        fiche.prete = false;
    }

    // Ctrl+P ou le menu du navigateur : la fiche par défaut.
    window.addEventListener('beforeprint', function () {
        if (!fiche.prete && fiche.etapes.length) { preparerFiche(choixFicheParDefaut()); }
    });
    window.addEventListener('afterprint', function () {
        if (fiche.prete) { rangerFiche(); }
    });

    function caseACocher(libelle, coche, valeur) {
        var label = document.createElement('label');
        label.className = 'fiche-option';
        var input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = coche;
        if (valeur) { input.value = valeur; }
        var texte = document.createElement('span');
        texte.textContent = libelle;
        label.appendChild(input);
        label.appendChild(texte);
        return label;
    }

    function ouvrirChoixFiche(declencheur) {
        var defaut = choixFicheParDefaut();

        var voile = document.createElement('div');
        voile.className = 'cartes-voile';

        var boite = document.createElement('div');
        boite.className = 'cartes-boite fiche-boite';
        boite.setAttribute('role', 'dialog');
        boite.setAttribute('aria-modal', 'true');
        boite.setAttribute('aria-labelledby', 'fiche-titre');

        var titre = document.createElement('h2');
        titre.id = 'fiche-titre';
        titre.className = 'fiche-titre';
        titre.textContent = '🖨️ Fiche à imprimer';

        var groupe = document.createElement('fieldset');
        groupe.className = 'fiche-etapes';
        var legende = document.createElement('legend');
        legende.className = 'fiche-legende';
        legende.textContent = 'Coche ce que tu veux sur ta fiche :';
        groupe.appendChild(legende);
        var precisions = { exercices: ' (sans les corrigés)', quiz: ' (questions à cocher, corrigé à la fin)' };
        fiche.etapes.forEach(function (e) {
            groupe.appendChild(caseACocher(e.libelle + (precisions[e.role] || ''), defaut.etapes[e.id], e.id));
        });

        // Leçon d'anglais : la traduction sous chaque phrase, au choix.
        var caseTraductions = null;
        if (document.querySelector('[data-fr]')) {
            caseTraductions = caseACocher('Avec la traduction en français de chaque phrase', defaut.traductions);
            caseTraductions.classList.add('fiche-option-traductions');
        }

        var taille = document.createElement('p');
        taille.className = 'fiche-taille';
        taille.setAttribute('aria-live', 'polite');

        var bas = document.createElement('div');
        bas.className = 'cartes-bas';
        var annuler = document.createElement('button');
        annuler.type = 'button';
        annuler.className = 'cartes-outil';
        annuler.textContent = 'Annuler';
        var imprimer = document.createElement('button');
        imprimer.type = 'button';
        imprimer.className = 'cartes-nav cartes-nav-suivante';
        imprimer.textContent = '🖨️ Imprimer';
        bas.appendChild(annuler);
        bas.appendChild(imprimer);

        boite.appendChild(titre);
        boite.appendChild(groupe);
        if (caseTraductions) { boite.appendChild(caseTraductions); }
        boite.appendChild(taille);
        boite.appendChild(bas);
        voile.appendChild(boite);
        document.body.appendChild(voile);
        document.documentElement.classList.add('cartes-ouvertes');

        var cases = groupe.querySelectorAll('input[type="checkbox"]');
        function lireChoix() {
            var choix = { etapes: {}, traductions: !!(caseTraductions && caseTraductions.querySelector('input').checked) };
            for (var i = 0; i < cases.length; i++) { choix.etapes[cases[i].value] = cases[i].checked; }
            return choix;
        }
        function majFenetre() {
            var une = false;
            for (var i = 0; i < cases.length; i++) { if (cases[i].checked) { une = true; } }
            imprimer.disabled = !une;
            if (!une) { taille.textContent = ''; return; }
            var t = estimerFiche(lireChoix());
            taille.classList.toggle('trop-long', !t.tient);
            taille.textContent = !t.tient ? '⚠️ Trop long pour une feuille. Décoche une étape.'
                : t.zoom < 1 ? '📄 Tient sur 1 feuille, texte réduit à ' + Math.round(t.zoom * 100) + ' %.'
                : '📄 Tient sur 1 feuille.';
        }
        boite.addEventListener('change', majFenetre);
        majFenetre();

        function fermer() {
            document.removeEventListener('keydown', clavier);
            document.documentElement.classList.remove('cartes-ouvertes');
            voile.parentNode.removeChild(voile);
            if (declencheur) { declencheur.focus(); }
        }

        function clavier(e) {
            if (e.key === 'Escape') { e.preventDefault(); fermer(); }
            else if (e.key === 'Tab') {
                var focusables = boite.querySelectorAll('input, button:not(:disabled)');
                var premier = focusables[0];
                var dernier = focusables[focusables.length - 1];
                if (e.shiftKey && document.activeElement === premier) { e.preventDefault(); dernier.focus(); }
                else if (!e.shiftKey && document.activeElement === dernier) { e.preventDefault(); premier.focus(); }
            }
        }

        annuler.addEventListener('click', fermer);
        imprimer.addEventListener('click', function () {
            var choix = lireChoix();
            fermer();
            preparerFiche(choix);
            window.print();
        });
        voile.addEventListener('mousedown', function (e) { if (e.target === voile) { fermer(); } });
        document.addEventListener('keydown', clavier);

        if (cases[0]) { cases[0].focus(); }
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
