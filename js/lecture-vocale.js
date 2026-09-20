/**
 * lecture-vocale.js — Écouter le cours, pas seulement le lire.
 *
 * S'appuie sur la synthèse vocale du navigateur (Web Speech API) : aucune clé
 * d'API, aucun coût, et les voix sont installées sur l'appareil — donc ça
 * fonctionne hors-ligne, ce qui compte pour une PWA de révision.
 *
 * Trois usages :
 *   • le vocabulaire d'anglais, lu en anglais (c'est là que c'est le plus utile :
 *     Karniella entend la prononciation au lieu de la deviner) ;
 *   • les questions de quiz, lues dans la langue de la question ;
 *   • les réponses du chat.
 *
 * Deux vitesses pour l'anglais : normale et lente. Apprendre une prononciation
 * demande souvent de ralentir, et le réglage est mémorisé.
 *
 * Si le navigateur ne sait pas parler, aucun bouton n'apparaît : rien ne casse,
 * la page reste exactement ce qu'elle était.
 */
(function () {
    'use strict';

    if (window.LectureVocale) { return; }

    var synthese = window.speechSynthesis;
    var DISPONIBLE = !!(synthese && window.SpeechSynthesisUtterance);

    var CLE_VITESSE = 'karniella-vitesse-voix';
    var LANGUE_PAGE = (document.documentElement.lang || 'fr').indexOf('en') === 0
        ? 'en-GB' : 'fr-FR';

    // Chrome coupe les énoncés longs au bout d'une quinzaine de secondes. On
    // découpe donc le texte en phrases et on les enchaîne nous-mêmes.
    var LONGUEUR_MORCEAU = 180;

    var enCours = null;   // le bouton qui parle, pour lui rendre son état

    /* ============================================================
       Voix
       ============================================================ */

    var voix = [];

    function chargerVoix() {
        try { voix = synthese.getVoices() || []; } catch (err) { voix = []; }
    }

    if (DISPONIBLE) {
        chargerVoix();
        // Sur Chrome la liste arrive de façon asynchrone : sans cet écouteur,
        // les premières lectures utiliseraient la voix par défaut du système.
        if (typeof synthese.addEventListener === 'function') {
            synthese.addEventListener('voiceschanged', chargerVoix);
        }
    }

    /** Meilleure voix disponible pour une langue (« en-GB », « fr-FR »). */
    function meilleureVoix(langue) {
        if (!voix.length) { chargerVoix(); }
        var court = langue.split('-')[0];

        var exacte = null;
        var approchante = null;

        for (var i = 0; i < voix.length; i++) {
            var v = voix[i];
            if (!v.lang) { continue; }
            var l = v.lang.replace('_', '-');
            if (l.toLowerCase() === langue.toLowerCase()) {
                // Une voix locale fonctionne hors-ligne : on la préfère.
                if (v.localService) { return v; }
                if (!exacte) { exacte = v; }
            } else if (l.toLowerCase().indexOf(court) === 0 && !approchante) {
                approchante = v;
            }
        }
        return exacte || approchante || null;
    }

    /* ============================================================
       Vitesse
       ============================================================ */

    function vitesse() {
        try {
            var v = parseFloat(window.localStorage.getItem(CLE_VITESSE));
            return (v >= 0.5 && v <= 1.2) ? v : 1;
        } catch (err) { return 1; }
    }

    function definirVitesse(v) {
        try { window.localStorage.setItem(CLE_VITESSE, String(v)); } catch (err) { /* sans suivi */ }
    }

    /* ============================================================
       Lecture
       ============================================================ */

    /** Découpe en morceaux prononçables, sur les fins de phrase. */
    function decouper(texte) {
        // Découpage sans lookbehind : celui-ci n'existe pas avant Safari 16.4,
        // et une erreur de syntaxe ferait échouer TOUT le fichier au chargement.
        var phrases = String(texte).replace(/\s+/g, ' ').trim()
            .replace(/([.!?…])\s+/g, '$1\u0000').split('\u0000');
        var morceaux = [];
        var courant = '';

        for (var i = 0; i < phrases.length; i++) {
            if ((courant + ' ' + phrases[i]).length > LONGUEUR_MORCEAU && courant) {
                morceaux.push(courant.trim());
                courant = phrases[i];
            } else {
                courant += ' ' + phrases[i];
            }
        }
        if (courant.trim()) { morceaux.push(courant.trim()); }
        return morceaux;
    }

    function stop() {
        if (!DISPONIBLE) { return; }
        try { synthese.cancel(); } catch (err) { /* rien à faire */ }
        if (enCours) { enCours.classList.remove('kv-parle'); enCours = null; }
    }

    /**
     * Lit un texte. `bouton` sert seulement à afficher l'état « en train de
     * parler » et à permettre un second clic pour arrêter.
     */
    function lire(texte, langue, bouton) {
        if (!DISPONIBLE || !texte) { return; }

        // Un clic sur le bouton qui parle déjà : on arrête.
        var memeBouton = (bouton && bouton === enCours);
        stop();
        if (memeBouton) { return; }

        langue = langue || LANGUE_PAGE;
        var v = meilleureVoix(langue);
        var morceaux = decouper(texte);
        // Seul l'anglais est ralenti : c'est une langue qu'elle apprend.
        var debit = langue.indexOf('en') === 0 ? vitesse() : 1;

        if (bouton) { bouton.classList.add('kv-parle'); enCours = bouton; }

        morceaux.forEach(function (morceau, i) {
            var u = new window.SpeechSynthesisUtterance(morceau);
            u.lang = langue;
            if (v) { u.voice = v; }
            u.rate = debit;
            u.pitch = 1;

            if (i === morceaux.length - 1) {
                u.onend = function () {
                    if (bouton) { bouton.classList.remove('kv-parle'); }
                    if (enCours === bouton) { enCours = null; }
                };
                u.onerror = u.onend;
            }
            try { synthese.speak(u); } catch (err) { /* voix indisponible */ }
        });
    }

    /* ============================================================
       Boutons
       ============================================================ */

    /** Langue à utiliser pour un élément : la plus proche déclarée au-dessus. */
    function langueDe(element) {
        var noeud = element;
        while (noeud && noeud.getAttribute) {
            var declaree = noeud.getAttribute('data-lire-langue');
            if (declaree) { return declaree; }
            noeud = noeud.parentNode;
        }
        return LANGUE_PAGE;
    }

    function creerBouton(texte, langue, libelle) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'kv-bouton';
        b.textContent = '🔊';
        b.setAttribute('aria-label', libelle || 'Écouter');
        b.setAttribute('title', libelle || 'Écouter');
        b.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            lire(typeof texte === 'function' ? texte() : texte, langue, b);
        });
        return b;
    }

    /**
     * Ajoute les boutons dans une portion de page. Appelée au chargement, puis
     * par les composants qui produisent du contenu après coup (quiz, chat).
     */
    function equiper(racine) {
        if (!DISPONIBLE) { return; }
        racine = racine || document;

        // 1) Lignes de vocabulaire : on lit le mot ET sa définition, parce que
        //    c'est la phrase entière que le professeur fait répéter.
        var lignes = racine.querySelectorAll('.table-vocab tbody tr');
        for (var i = 0; i < lignes.length; i++) {
            (function (ligne) {
                if (ligne.querySelector('.kv-bouton')) { return; }
                var cellules = ligne.querySelectorAll('td');
                if (cellules.length < 2) { return; }

                var langue = langueDe(ligne);
                var bouton = creerBouton(function () {
                    var mot = cellules[0].textContent.trim();
                    var def = cellules[1].textContent.replace(/…/g, '').trim();
                    return mot + '. ' + def;
                }, langue, 'Écouter : ' + cellules[0].textContent.trim());
                cellules[0].appendChild(bouton);
            })(lignes[i]);
        }

        // 2) Tout élément explicitement marqué à lire.
        var marques = racine.querySelectorAll('[data-lire]');
        for (var j = 0; j < marques.length; j++) {
            (function (el) {
                if (el.querySelector('.kv-bouton')) { return; }
                el.appendChild(creerBouton(function () {
                    return el.getAttribute('data-lire') || el.textContent;
                }, langueDe(el), 'Écouter ce passage'));
            })(marques[j]);
        }

        // 3) Questions de quiz : l'énoncé et ses propositions.
        var questions = racine.querySelectorAll('.section-quiz-question');
        for (var k = 0; k < questions.length; k++) {
            (function (q) {
                var enonce = q.querySelector('.question-text');
                if (!enonce || enonce.querySelector('.kv-bouton')) { return; }

                var langue = langueDe(q);
                enonce.appendChild(creerBouton(function () {
                    var texte = enonce.textContent.trim();
                    var options = q.querySelectorAll('.option-label span');
                    for (var n = 0; n < options.length; n++) {
                        texte += '. ' + options[n].textContent.trim();
                    }
                    return texte;
                }, langue, 'Écouter la question et les réponses'));
            })(questions[k]);
        }
    }

    /* ============================================================
       Réglage de vitesse — affiché seulement là où l'anglais est lu
       ============================================================ */

    function installerReglage() {
        if (!DISPONIBLE) { return; }
        if (document.querySelector('.kv-reglage')) { return; }

        var zoneAnglaise = document.querySelector('[data-lire-langue^="en"]');
        if (!zoneAnglaise) { return; }

        var conteneur = document.querySelector('.tabs');
        if (!conteneur || !conteneur.parentNode) { return; }

        var bloc = document.createElement('div');
        bloc.className = 'kv-reglage';

        var etiquette = document.createElement('span');
        etiquette.textContent = '🔊 Vitesse de lecture :';
        bloc.appendChild(etiquette);

        [['Normale', 1], ['Lente', 0.7], ['Très lente', 0.55]].forEach(function (choix) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'kv-vitesse';
            b.textContent = choix[0];
            b.setAttribute('aria-pressed', vitesse() === choix[1] ? 'true' : 'false');
            if (vitesse() === choix[1]) { b.classList.add('actif'); }

            b.addEventListener('click', function () {
                definirVitesse(choix[1]);
                var tous = bloc.querySelectorAll('.kv-vitesse');
                for (var i = 0; i < tous.length; i++) {
                    tous[i].classList.remove('actif');
                    tous[i].setAttribute('aria-pressed', 'false');
                }
                b.classList.add('actif');
                b.setAttribute('aria-pressed', 'true');
                stop();
            });
            bloc.appendChild(b);
        });

        conteneur.parentNode.insertBefore(bloc, conteneur.nextSibling);
    }

    /* ============================================================
       Démarrage
       ============================================================ */

    function initialiser() {
        equiper(document);
        installerReglage();

        // Changer de page en laissant une voix parler est désagréable.
        window.addEventListener('pagehide', stop);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialiser);
    } else {
        initialiser();
    }

    window.LectureVocale = {
        disponible: function () { return DISPONIBLE; },
        lire: lire,
        stop: stop,
        equiper: equiper,
        vitesse: vitesse,
        definirVitesse: definirVitesse
    };
})();
