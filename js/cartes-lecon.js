/**
 * cartes-lecon.js — une leçon se lit carte par carte, plus en une longue page.
 *
 * Chargé en dernier sur les pages de leçon (après js/lecon-5e.js,
 * js/schema-interactif.js et js/a-completer.js). Rien à écrire de plus dans la
 * page : le script découpe chaque partie (onglet) en cartes.
 *
 *   - une carte « notion » : un titre et son texte (définition, liste, encadré) ;
 *   - une carte « schéma » : chaque schéma est à part, pas noyé dans le texte ;
 *   - une carte par exemple et par exercice.
 *
 * Avant « Carte suivante », Karniella agit :
 *   - notion ou schéma fixe : elle lit (un petit minuteur, selon la longueur) ;
 *   - schéma à manipuler : elle le touche au moins une fois ;
 *   - exemple : elle répond ; exercice : elle vérifie ou ouvre la correction.
 * À la fin d'une partie, une « question de passage » tirée du quiz (les
 * questions dont la notion est cette partie) : il faut une bonne réponse.
 * La partie suivante et le quiz ne s'ouvrent qu'après.
 *
 * Une partie déjà lue (js/progression.js) ou terminée reste libre : on s'y
 * promène sans minuteur. `?libre=1` dans l'adresse ouvre tout (pour un adulte).
 * `data-cartes="non"` sur une <section> la laisse en une page.
 */
(function () {
    'use strict';

    if (!document.body.classList.contains('lecon-5e')) { return; }

    var LIBRE = /[?&]libre=1\b/.test(window.location.search);
    var SLUG = window.location.pathname.split('/').pop().replace(/\.html$/, '');
    var CLE = 'karniella-cartes:' + SLUG;
    var parties = [];          // { id, section, bouton, cartes[], position, faite, quiz }
    var questions = null;      // data/section-questions.json, pour les questions de passage

    function creer(balise, classe, texte) {
        var e = document.createElement(balise);
        if (classe) { e.className = classe; }
        if (texte !== undefined) { e.textContent = texte; }
        return e;
    }

    function lire() {
        try { return JSON.parse(window.localStorage.getItem(CLE)) || {}; } catch (err) { return {}; }
    }
    function ecrire(etat) {
        try { window.localStorage.setItem(CLE, JSON.stringify(etat)); } catch (err) { /* rien à faire */ }
    }
    var memoire = lire();      // { faites: { tab1: true }, cartes: { tab1: 3 } }
    memoire.faites = memoire.faites || {};
    memoire.cartes = memoire.cartes || {};

    function estQuiz(bouton, section) {
        return /quiz|teste/i.test(bouton.textContent) || !!section.querySelector('[id^="quiz"]');
    }

    /* ============================================================
       Le découpage en cartes
       ============================================================ */

    function genre(el) {
        if (/^H[2-5]$/.test(el.tagName)) { return 'titre'; }
        if (el.classList.contains('exercice')) { return 'exercice'; }
        if (el.classList.contains('exemple-exo')) { return 'exemple'; }
        if (el.classList.contains('schema-interactif') || (el.tagName === 'FIGURE' && el.classList.contains('schema'))) { return 'schema'; }
        return 'texte';
    }

    function longueur(elements) {
        return elements.reduce(function (n, e) { return n + (/^H[2-5]$/.test(e.tagName) ? 0 : e.textContent.trim().length); }, 0);
    }

    function decouper(conteneur) {
        var enfants = Array.prototype.slice.call(conteneur.children);
        var cartes = [], courante = null, titres = [], nouveau = true;

        function ouvrir(type) {
            courante = { type: type, elements: titres.slice() };
            titres = [];
            cartes.push(courante);
            nouveau = false;
        }

        enfants.forEach(function (el) {
            var g = genre(el);
            if (g === 'titre') { titres.push(el); nouveau = true; return; }
            if (g === 'exercice' || g === 'exemple') { ouvrir(g); courante.elements.push(el); courante = null; nouveau = true; return; }
            if (g === 'schema') {
                // Une courte consigne juste avant (« Ouvre et ferme l'interrupteur ») reste avec son schéma.
                var courte = courante && courante.type === 'texte' && !titres.length && longueur(courante.elements) < 200 &&
                    !courante.elements.some(function (e) { return /-box|table/.test(e.className || '') || e.tagName === 'TABLE'; });
                if (courte) { courante.type = 'schema'; } else { ouvrir('schema'); }
                courante.elements.push(el);
                courante = null;
                nouveau = true;
                return;
            }
            // Du texte : une carte par titre ; une carte trop longue se coupe à l'encadré suivant.
            var bloc = /-box/.test(el.className || '') || el.tagName === 'TABLE' || el.tagName === 'UL' || el.tagName === 'OL';
            if (!courante || nouveau || courante.type !== 'texte' || (bloc && longueur(courante.elements) > 650)) { ouvrir('texte'); }
            courante.elements.push(el);
        });
        if (titres.length) {
            if (cartes.length) { cartes[cartes.length - 1].elements = cartes[cartes.length - 1].elements.concat(titres); }
            else { cartes.push({ type: 'texte', elements: titres }); }
        }
        return cartes;
    }

    var NOMS = { texte: 'Notion', schema: 'Schéma', exemple: 'Exemple', exercice: 'Exercice', passage: 'Question de passage' };
    var ICONES = { texte: '📘', schema: '🔌', exemple: '💡', exercice: '✏️', passage: '🎯' };

    /* ============================================================
       Ce qu'il faut faire sur une carte avant de continuer
       ============================================================ */

    /** Renvoie { consigne, attendre(fait) } : `fait()` est appelé quand la carte est acquise. */
    function exigence(carte) {
        var el = carte.el;
        var vivant = el.querySelector('.schema-interactif');
        if (carte.type === 'passage') {
            return { consigne: 'Réponds juste pour terminer cette partie.', attendre: function (fait) { carte.passage(fait); } };
        }
        if (vivant) {
            return {
                consigne: '👆 Touche le schéma pour continuer.',
                attendre: function (fait) { el.addEventListener('karniella:interaction', function une() { el.removeEventListener('karniella:interaction', une); fait(); }); }
            };
        }
        if (carte.type === 'exemple' && el.querySelector('.ac-exemple')) {
            return {
                consigne: '✍️ Réponds à l\'exemple pour continuer.',
                attendre: function (fait) {
                    var reste = el.querySelectorAll('.ac-exemple').length;
                    el.addEventListener('karniella:interaction', function () { reste--; if (reste <= 0) { fait(); } });
                }
            };
        }
        if (carte.type === 'exercice') {
            var details = el.querySelector('details');
            var actif = el.querySelector('.ac-verifier');
            return {
                consigne: actif ? '✍️ Remplis les cases et vérifie pour continuer.' : '✍️ Cherche, puis ouvre la correction pour continuer.',
                attendre: function (fait) {
                    var une = false;
                    function ok() { if (!une) { une = true; fait(); } }
                    el.addEventListener('karniella:interaction', ok);
                    if (details) { details.addEventListener('toggle', function () { if (details.open) { ok(); } }); }
                    if (!details && !actif) { ok(); }
                }
            };
        }
        // Une notion ou un schéma fixe : le temps de lire.
        var mots = el.textContent.trim().split(/\s+/).length;
        var secondes = Math.max(3, Math.min(12, Math.ceil(mots * 0.22)));
        return {
            consigne: null,
            secondes: secondes,
            attendre: function (fait, afficher) {
                var reste = secondes;
                afficher('📖 Lis la carte… ' + reste + ' s');
                carte.minuteur = window.setInterval(function () {
                    // Le temps ne compte que si la carte est à l'écran.
                    if (document.hidden || !el.offsetParent) { return; }
                    reste--;
                    if (reste > 0) { afficher('📖 Lis la carte… ' + reste + ' s'); return; }
                    window.clearInterval(carte.minuteur);
                    fait();
                }, 1000);
            }
        };
    }

    /* ============================================================
       La question de passage
       ============================================================ */

    function questionsDe(partie) {
        if (!questions) { return []; }
        var nom = partie.nom;
        var liste = [];
        Object.keys(questions).forEach(function (cle) {
            questions[cle].forEach(function (q) { if (q.options && q.notion === nom) { liste.push(q); } });
        });
        return liste;
    }

    function cartePassage(partie) {
        var liste = questionsDe(partie);
        if (!liste.length) { return null; }
        var el = creer('div', 'carte-lecon carte-passage');
        var zone = creer('div', 'passage-zone');
        el.appendChild(creer('h3', '', '🎯 Question de passage'));
        el.appendChild(creer('p', 'passage-consigne', 'Une bonne réponse, et la partie est terminée.'));
        el.appendChild(zone);
        var carte = { type: 'passage', el: el, elements: [] };
        var reste = liste.slice();

        carte.passage = function (fait) {
            function poser() {
                if (!reste.length) { reste = liste.slice(); }
                var q = reste.splice(Math.floor(Math.random() * reste.length), 1)[0];
                zone.textContent = '';
                var enonce = creer('p', 'passage-question');
                enonce.innerHTML = q.question;
                zone.appendChild(enonce);
                var choix = creer('div', 'ac-choix');
                var retour = creer('div', 'passage-retour');
                retour.setAttribute('role', 'status');
                q.options.forEach(function (option, k) {
                    var b = creer('button', 'ac-option');
                    b.type = 'button';
                    b.innerHTML = option;
                    b.addEventListener('click', function () {
                        choix.querySelectorAll('button').forEach(function (x) { x.disabled = true; });
                        var juste = k === q.correctAnswer;
                        b.classList.add(juste ? 'juste' : 'faux');
                        if (!juste) { choix.children[q.correctAnswer].classList.add('juste'); }
                        retour.className = 'passage-retour ' + (juste ? 'juste' : 'faux');
                        var titre = creer('strong', '', juste ? '✓ Bravo, c\'est ça !' : '✗ Pas encore.');
                        retour.appendChild(titre);
                        if (q.explanation) { var ex = creer('p'); ex.innerHTML = q.explanation; retour.appendChild(ex); }
                        if (juste) { fait(); return; }
                        var encore = creer('button', 'ac-verifier', 'Lis la correction…');
                        encore.type = 'button';
                        encore.disabled = true;
                        retour.appendChild(encore);
                        var secondes = 6;
                        var tic = window.setInterval(function () {
                            secondes--;
                            if (secondes > 0) { encore.textContent = 'Lis la correction… ' + secondes; return; }
                            window.clearInterval(tic);
                            encore.disabled = false;
                            encore.textContent = 'Une autre question →';
                        }, 1000);
                        encore.addEventListener('click', poser);
                    });
                    choix.appendChild(b);
                });
                zone.appendChild(choix);
                zone.appendChild(retour);
            }
            poser();
        };
        return carte;
    }

    /* ============================================================
       Une partie (un onglet) en cartes
       ============================================================ */

    function monter(partie) {
        var section = partie.section;
        var conteneur = section.querySelector(':scope > .container') || section;
        var morceaux = decouper(conteneur);
        if (morceaux.length < 2) { partie.cartes = []; return; }

        var barre = creer('div', 'cartes-barre');
        var compte = creer('span', 'cartes-compte-lecon');
        compte.setAttribute('aria-live', 'polite');
        var points = creer('div', 'cartes-points');
        points.setAttribute('aria-hidden', 'true');
        barre.appendChild(compte);
        barre.appendChild(points);

        var pile = creer('div', 'cartes-pile');
        morceaux.forEach(function (m) {
            var el = creer('div', 'carte-lecon carte-' + m.type);
            var etiquette = creer('span', 'carte-etiquette', ICONES[m.type] + ' ' + NOMS[m.type]);
            el.appendChild(etiquette);
            m.elements.forEach(function (e) { el.appendChild(e); });
            m.el = el;
            pile.appendChild(el);
        });

        var nav = creer('div', 'cartes-nav-lecon');
        var avant = creer('button', 'cartes-avant', '← Carte précédente');
        avant.type = 'button';
        var etat = creer('p', 'cartes-etat');
        etat.setAttribute('role', 'status');
        var apres = creer('button', 'cartes-apres', 'Carte suivante →');
        apres.type = 'button';
        nav.appendChild(avant);
        nav.appendChild(etat);
        nav.appendChild(apres);

        conteneur.appendChild(barre);
        conteneur.appendChild(pile);
        conteneur.appendChild(nav);
        section.classList.add('en-cartes');

        partie.cartes = morceaux;
        partie.pile = pile;
        partie.position = 0;
        partie.acquises = partie.faite || LIBRE ? morceaux.length : Math.min(memoire.cartes[partie.id] || 0, morceaux.length);
        partie.rendre = rendre;
        partie.aller = aller;

        morceaux.forEach(function () { points.appendChild(creer('i')); });

        function ajouterPassage() {
            if (partie.passagePose || partie.faite || LIBRE) { return; }
            var c = cartePassage(partie);
            partie.passagePose = true;
            if (!c) { return; }
            pile.appendChild(c.el);
            partie.cartes.push(c);
            points.appendChild(creer('i'));
        }

        function rendre() {
            var n = partie.cartes.length, i = partie.position, carte = partie.cartes[i];
            partie.cartes.forEach(function (c, k) { c.el.classList.toggle('active', k === i); });
            Array.prototype.forEach.call(points.children, function (p, k) {
                p.className = k === i ? 'ici' : (k < partie.acquises ? 'fait' : '');
            });
            compte.textContent = 'Carte ' + (i + 1) + ' sur ' + n;
            avant.disabled = i === 0;
            var derniere = i === n - 1;
            var acquise = i < partie.acquises || partie.faite || LIBRE;
            apres.textContent = derniere ? (partie.faite ? 'Partie terminée ✓' : 'Terminer la partie ✓') : 'Carte suivante →';
            apres.disabled = !acquise || (derniere && partie.faite);
            etat.textContent = '';
            if (acquise) { return; }

            if (!carte.exigence) {
                carte.exigence = exigence(carte);
                carte.exigence.attendre(function () {
                    carte.acquise = true;
                    if (partie.position === partie.cartes.indexOf(carte)) {
                        partie.acquises = Math.max(partie.acquises, partie.position + 1);
                        memoire.cartes[partie.id] = Math.min(partie.acquises, morceaux.length);
                        ecrire(memoire);
                        rendre();
                        apres.focus({ preventScroll: true });
                    }
                }, function (texte) { if (partie.cartes[partie.position] === carte) { etat.textContent = texte; } });
            } else if (carte.acquise) {
                partie.acquises = Math.max(partie.acquises, i + 1);
                rendre();
                return;
            }
            if (carte.exigence.consigne) { etat.textContent = carte.exigence.consigne; }
        }

        function aller(i, sansDefiler) {
            partie.position = Math.max(0, Math.min(partie.cartes.length - 1, i));
            rendre();
            if (sansDefiler) { return; }
            var haut = barre.getBoundingClientRect().top;
            if (haut < 60 || haut > window.innerHeight * 0.5) {
                var doux = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                var fixe = document.querySelector('.coquille-barre');
                var marge = (fixe ? fixe.offsetHeight : 0) + 70;
                window.scrollTo({ top: Math.max(0, haut + window.pageYOffset - marge), behavior: doux ? 'smooth' : 'auto' });
            }
        }

        avant.addEventListener('click', function () { aller(partie.position - 1); });
        apres.addEventListener('click', function () {
            var derniereDuCours = partie.position === morceaux.length - 1;
            if (derniereDuCours) { ajouterPassage(); }
            if (partie.position < partie.cartes.length - 1) { aller(partie.position + 1); return; }
            terminer(partie);
        });

        // Les flèches du clavier, quand on n'écrit pas.
        section.addEventListener('keydown', function (e) {
            if (/INPUT|TEXTAREA|SELECT|BUTTON/.test(e.target.tagName) || e.target.closest('[role="button"]')) { return; }
            if (e.key === 'ArrowRight' && !apres.disabled) { apres.click(); }
            if (e.key === 'ArrowLeft' && !avant.disabled) { avant.click(); }
        });

        // On reprend où elle s'était arrêtée.
        aller(partie.faite || LIBRE ? 0 : Math.min(partie.acquises, morceaux.length - 1), true);
    }

    function terminer(partie) {
        if (partie.faite) { return; }
        partie.faite = true;
        memoire.faites[partie.id] = true;
        ecrire(memoire);
        partie.section.classList.add('partie-faite');
        partie.acquises = partie.cartes.length;
        if (partie.rendre) { partie.rendre(); }
        majVerrous();
        // L'étape est lue : le repère de fin d'étape (js/lecon-5e.js) devient visible.
        var suite = partie.section.querySelector('.suite-suivant');
        if (suite) { suite.focus({ preventScroll: true }); }
        document.dispatchEvent(new CustomEvent('karniella:partie-faite', { detail: { id: partie.id } }));
    }

    /* ============================================================
       Les verrous : une partie après l'autre
       ============================================================ */

    /** La première partie de cours pas encore terminée, ou null. */
    function premiereAFaire() {
        for (var i = 0; i < parties.length; i++) {
            if (!parties[i].quiz && parties[i].cartes && parties[i].cartes.length && !parties[i].faite) { return parties[i]; }
        }
        return null;
    }

    function rangDe(id) {
        for (var i = 0; i < parties.length; i++) { if (parties[i].id === id) { return i; } }
        return -1;
    }

    /** true si l'onglet `id` est encore fermé (js/lecon-5e.js le demande avant d'ouvrir). */
    function ferme(id) {
        if (LIBRE) { return false; }
        var blocage = premiereAFaire();
        if (!blocage) { return false; }
        var cible = rangDe(id);
        if (cible === -1 || cible <= parties.indexOf(blocage)) { return false; }
        dire('🔒 Termine d\'abord « ' + blocage.nom + ' » : lis ses cartes jusqu\'à la dernière.');
        return true;
    }

    function majVerrous() {
        var blocage = premiereAFaire();
        var limite = blocage ? parties.indexOf(blocage) : parties.length;
        parties.forEach(function (p, i) {
            var verrou = !LIBRE && i > limite;
            p.bouton.classList.toggle('partie-verrou', verrou);
            p.bouton.classList.toggle('partie-terminee', !!p.faite);
            if (verrou) { p.bouton.setAttribute('aria-disabled', 'true'); } else { p.bouton.removeAttribute('aria-disabled'); }
            var suite = p.section.querySelector('.suite-suivant');
            if (suite) { suite.disabled = !LIBRE && !p.quiz && p.cartes && p.cartes.length > 0 && !p.faite; }
        });
    }

    var message = null;
    function dire(texte) {
        var active = document.querySelector('.tab-content.active');
        if (!active) { return; }
        if (!message) {
            message = creer('p', 'cartes-message');
            message.setAttribute('role', 'status');
        }
        message.textContent = texte;
        active.insertBefore(message, active.firstChild);
        window.clearTimeout(dire.fin);
        dire.fin = window.setTimeout(function () { if (message.parentNode) { message.parentNode.removeChild(message); } }, 6000);
    }

    /** Montre la carte qui contient `element` (un lien vers un exemple, une notion). */
    function montrer(element) {
        for (var i = 0; i < parties.length; i++) {
            var p = parties[i];
            if (!p.cartes || !p.section.contains(element)) { continue; }
            for (var k = 0; k < p.cartes.length; k++) {
                if (p.cartes[k].el.contains(element)) {
                    // Une carte pas encore atteinte reste fermée : on montre la dernière ouverte.
                    p.aller(Math.min(k, Math.max(p.acquises, 0)), true);
                    return;
                }
            }
        }
    }

    /* ============================================================
       Démarrage
       ============================================================ */

    function demarrer() {
        var boutons = document.querySelectorAll('.tab-button[data-onglet]');
        if (boutons.length < 2) { return; }
        Array.prototype.forEach.call(boutons, function (bouton) {
            var id = bouton.getAttribute('data-onglet');
            var section = document.getElementById(id);
            if (!section) { return; }
            parties.push({
                id: id, section: section, bouton: bouton,
                nom: (bouton.getAttribute('data-nom') || bouton.textContent).trim(),
                quiz: estQuiz(bouton, section),
                faite: !!memoire.faites[id]
            });
        });
        // Le nom de la partie avant que le parcours n'y ajoute son numéro.
        parties.forEach(function (p) {
            if (p.quiz || p.section.getAttribute('data-cartes') === 'non') { p.cartes = []; return; }
            monter(p);
            if (p.faite) { p.section.classList.add('partie-faite'); }
        });
        majVerrous();
        // Arrivée par un lien sur une partie encore fermée : on revient à celle à faire.
        var blocage = premiereAFaire(), ouverte = document.querySelector('.tab-content.active');
        if (!LIBRE && blocage && ouverte && rangDe(ouverte.id) > parties.indexOf(blocage)) { blocage.bouton.click(); }

        // Ce qu'elle avait déjà lu avant les cartes reste acquis (js/progression.js).
        var essais = 40;
        (function attendre() {
            var suivi = window.KarniellaProgression;
            if (!suivi) { if (essais-- > 0) { window.setTimeout(attendre, 250); } return; }
            var deja = suivi.pourPage(SLUG);
            var lues = deja && deja.etapesLues ? deja.etapesLues : [];
            var change = false;
            parties.forEach(function (p) {
                if (!p.faite && lues.indexOf(p.id) !== -1) {
                    p.faite = true; memoire.faites[p.id] = true; change = true;
                    p.section.classList.add('partie-faite');
                    if (p.cartes && p.cartes.length) { p.acquises = p.cartes.length; p.aller(0, true); }
                }
            });
            if (change) { ecrire(memoire); majVerrous(); }
        })();

        if (typeof window.fetch === 'function') {
            window.fetch('../data/section-questions.json')
                .then(function (r) { return r.json(); })
                .then(function (d) { questions = d[SLUG] || {}; })
                .catch(function () { questions = {}; });
        }
    }

    window.KarniellaCartes = { ferme: ferme, montrer: montrer, libre: LIBRE };

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', demarrer); } else { demarrer(); }
})();
