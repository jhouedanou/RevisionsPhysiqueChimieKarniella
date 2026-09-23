/**
 * lecture-vocale.js — Écouter le cours, pas seulement le lire.
 *
 * S'appuie sur la synthèse vocale du navigateur (Web Speech API) : aucune clé
 * d'API, aucun coût, et les voix sont installées sur l'appareil — donc ça
 * fonctionne hors-ligne, ce qui compte pour une PWA de révision.
 *
 * RÈGLE DU MODULE — un bouton prononce un passage dans la langue où ce passage
 * est écrit, et ne prononce jamais ce qui n'est pas de la parole : une formule
 * grammaticale (« like + V-ing »), une étiquette de colonne, un numéro de
 * question, l'émoji du bouton lui-même.
 *
 * Un même bouton enchaîne plusieurs langues, parce que le cours les mêle au
 * milieu d'une ligne : « upstairs — à l'étage », un énoncé de quiz français
 * avec des propositions anglaises. Une seule voix pour les deux obligerait à
 * en massacrer une ; on découpe donc en morceaux, chacun avec la sienne.
 *
 * Trois marqueurs pilotent ça depuis le HTML :
 *
 *   data-lire          « pose un bouton ici, lis ce qui est écrit ». À
 *                      préférer : cette forme ne peut pas diverger de la page.
 *                      Ne jamais l'imbriquer : l'ancêtre et le descendant
 *                      recevraient chacun un bouton.
 *   data-lire="texte"  « lis CECI à la place ». À réserver aux cas où
 *                      l'affichage contient du non-parlé.
 *   data-lire-ignore   ce sous-arbre n'est jamais prononcé, et aucun bouton
 *                      n'y est posé. Sur un <em>, une cellule, une ligne ou
 *                      une <table> entière — un seul sens à tous les niveaux.
 *
 * Sont muets d'office, sans rien écrire : <s> et <del>. Une forme fautive est
 * affichée barrée pour être reconnue ; la prononcer avec un accent impeccable
 * la ferait apprendre.
 *
 * La langue vient du `lang` ou du `data-lire-langue` le plus proche : une
 * question française dans un onglet anglais se marque `lang="fr"`.
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

    // Les codes courts viennent de l'attribut HTML standard, y compris du
    // <html lang="fr"> où la remontée finit toujours. Sans les compléter,
    // meilleureVoix() raterait sa comparaison exacte : elle perdrait la
    // préférence pour les voix locales — celles qui marchent hors-ligne — et
    // « en » tomberait sur la première voix en-* du système, souvent en-US,
    // sur une leçon qui écrit « practise sports ».
    var LANGUES_COURTES = { en: 'en-GB', fr: 'fr-FR' };

    function normaliserLangue(code) {
        if (!code) { return ''; }
        var propre = String(code).replace('_', '-');
        return LANGUES_COURTES[propre.toLowerCase()] || propre;
    }

    var LANGUE_PAGE = normaliserLangue(document.documentElement.lang) || 'fr-FR';

    // Chrome coupe les énoncés longs au bout d'une quinzaine de secondes. On
    // découpe donc le texte en phrases et on les enchaîne nous-mêmes.
    var LONGUEUR_MORCEAU = 180;

    // Une frontière de bloc vaut une fin de phrase. Sans ça, « …workers.<br>
    // Ex: … » se recollerait en « workers.Ex », et les cellules d'une ligne
    // partiraient en un seul énoncé sans respiration.
    var BLOCS = /^(P|DIV|LI|TR|TD|TH|SECTION|ARTICLE|BLOCKQUOTE|UL|OL|TABLE|BUTTON|H[1-6])$/;

    // <s>/<del> : voir l'en-tête. script/style ne sont pas du texte affiché.
    var MUETS = /^(SCRIPT|STYLE|S|DEL)$/;

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
       Découpage en morceaux prononçables
       ============================================================ */

    function aAttribut(el, nom) {
        return !!(el && el.hasAttribute && el.hasAttribute(nom));
    }

    /** Élément retiré de la lecture — ou descendant d'un tel élément. */
    function estIgnore(el) {
        var noeud = el;
        while (noeud && noeud.getAttribute) {
            if (aAttribut(noeud, 'data-lire-ignore')) { return true; }
            if (noeud.classList && noeud.classList.contains('kv-bouton')) { return true; }
            noeud = noeud.parentNode;
        }
        return false;
    }

    /** Langue à utiliser pour un élément : la plus proche déclarée au-dessus. */
    function langueDe(element) {
        var noeud = element;
        while (noeud && noeud.getAttribute) {
            var declaree = noeud.getAttribute('data-lire-langue') || noeud.getAttribute('lang');
            if (declaree) { return normaliserLangue(declaree); }
            noeud = noeud.parentNode;
        }
        return LANGUE_PAGE;
    }

    /**
     * Découpe un sous-arbre en morceaux { texte, langue }.
     *
     * C'est la primitive du module : tout ce qui est prononcé passe par là.
     * Les morceaux consécutifs de même langue fusionnent, pour qu'une phrase
     * coupée par un <strong> ne parte pas en trois énoncés hachés.
     */
    function segmentsDe(element, langueHeritee) {
        if (!element) { return []; }
        var segments = [];

        function ajouter(texte, langue) {
            // Les « … » ne se prononcent pas.
            texte = String(texte).replace(/…/g, ' ');
            if (!texte.replace(/\s+/g, ' ').trim()) { return; }

            var dernier = segments[segments.length - 1];
            if (dernier && dernier.langue === langue) {
                dernier.texte += texte;
            } else {
                segments.push({ texte: texte, langue: langue });
            }
        }

        function separer() {
            var dernier = segments[segments.length - 1];
            if (!dernier) { return; }
            if (!/[.!?:;]\s*$/.test(dernier.texte)) { dernier.texte += '.'; }
            dernier.texte += ' ';
        }

        (function parcourir(noeud, langue) {
            var enfants = noeud.childNodes;

            for (var i = 0; i < enfants.length; i++) {
                var enfant = enfants[i];

                if (enfant.nodeType === 3) { ajouter(enfant.nodeValue, langue); continue; }
                if (enfant.nodeType !== 1) { continue; }

                var nom = enfant.tagName;
                if (nom === 'BR') { separer(); continue; }
                if (MUETS.test(nom)) { continue; }
                if (aAttribut(enfant, 'data-lire-ignore')) { continue; }
                if (enfant.classList && enfant.classList.contains('kv-bouton')) { continue; }

                var declaree = enfant.getAttribute('data-lire-langue') || enfant.getAttribute('lang');
                var bloc = BLOCS.test(nom);

                if (bloc) { separer(); }
                parcourir(enfant, declaree ? normaliserLangue(declaree) : langue);
                if (bloc) { separer(); }
            }
        })(element, langueHeritee || langueDe(element));

        var propres = [];
        for (var i = 0; i < segments.length; i++) {
            var texte = segments[i].texte.replace(/\s+/g, ' ').trim();
            if (texte) { propres.push({ texte: texte, langue: segments[i].langue }); }
        }
        return propres;
    }

    /** Segments de plusieurs éléments, enchaînés comme autant de phrases. */
    function segmentsDeTous(elements) {
        var tous = [];
        for (var i = 0; i < elements.length; i++) {
            var part = segmentsDe(elements[i]);
            for (var j = 0; j < part.length; j++) {
                var dernier = tous[tous.length - 1];
                if (j === 0 && dernier && !/[.!?:;]$/.test(dernier.texte)) {
                    dernier.texte += '.';
                }
                if (dernier && dernier.langue === part[j].langue) {
                    dernier.texte += ' ' + part[j].texte;
                } else {
                    tous.push(part[j]);
                }
            }
        }
        return tous;
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
     * Prononce une suite de morceaux, chacun dans SA langue et à SON débit :
     * la file de la synthèse les enchaîne, donc l'anglais ralentit sans que le
     * français traîne, dans une même écoute.
     *
     * `bouton` sert à afficher l'état « en train de parler » et à permettre un
     * second clic pour arrêter.
     */
    function lireSegments(segments, bouton) {
        if (!DISPONIBLE) { return; }

        // Un clic sur le bouton qui parle déjà : on arrête.
        var memeBouton = (bouton && bouton === enCours);
        stop();
        if (memeBouton) { return; }

        var enonces = [];
        for (var i = 0; i < (segments || []).length; i++) {
            if (!segments[i] || !segments[i].texte) { continue; }
            var langue = segments[i].langue || LANGUE_PAGE;
            var morceaux = decouper(segments[i].texte);
            for (var j = 0; j < morceaux.length; j++) {
                enonces.push({ texte: morceaux[j], langue: langue });
            }
        }
        if (!enonces.length) { return; }

        if (bouton) { bouton.classList.add('kv-parle'); enCours = bouton; }

        enonces.forEach(function (enonce, i) {
            var v = meilleureVoix(enonce.langue);
            var u = new window.SpeechSynthesisUtterance(enonce.texte);
            u.lang = enonce.langue;
            if (v) { u.voice = v; }
            // Seul l'anglais est ralenti : c'est une langue qu'elle apprend.
            u.rate = enonce.langue.indexOf('en') === 0 ? vitesse() : 1;
            u.pitch = 1;

            if (i === enonces.length - 1) {
                u.onend = function () {
                    if (bouton) { bouton.classList.remove('kv-parle'); }
                    if (enCours === bouton) { enCours = null; }
                };
                u.onerror = u.onend;
            }
            try { synthese.speak(u); } catch (err) { /* voix indisponible */ }
        });
    }

    /** Forme simple : un texte, une langue. Gardée pour les appelants. */
    function lire(texte, langue, bouton) {
        lireSegments([{ texte: texte, langue: langue || LANGUE_PAGE }], bouton);
    }

    /* ============================================================
       Boutons
       ============================================================ */

    /** `fabriquer()` rend les segments à prononcer, évalués au clic. */
    function creerBouton(fabriquer, libelle) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'kv-bouton';
        b.textContent = '🔊';
        b.setAttribute('aria-label', libelle || 'Écouter');
        b.setAttribute('title', libelle || 'Écouter');
        b.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            lireSegments(fabriquer(), b);
        });
        return b;
    }

    /** Résumé court d'une suite de segments, pour l'étiquette d'accessibilité. */
    function resume(segments) {
        var texte = segments.length ? segments[0].texte : '';
        return texte.length > 60 ? texte.slice(0, 57) + '…' : texte;
    }

    /**
     * Ajoute les boutons dans une portion de page. Appelée au chargement, puis
     * par les composants qui produisent du contenu après coup (quiz, chat).
     * Idempotente : chaque accroche saute ce qui a déjà son bouton.
     */
    function equiper(racine) {
        if (!DISPONIBLE) { return; }
        racine = racine || document;

        // 1) Lignes de tableau. Toutes les cellules parlables sont prononcées,
        //    dans l'ordre : un tableau de vocabulaire lit le mot ET sa
        //    définition — c'est la phrase entière que le professeur fait
        //    répéter — un tableau à quatre colonnes n'en perd aucune, et un
        //    tableau « Construction | Example » ne lit que l'exemple, parce
        //    que sa première colonne porte data-lire-ignore.
        var lignes = racine.querySelectorAll('.table-vocab tbody tr');
        for (var i = 0; i < lignes.length; i++) {
            (function (ligne) {
                if (ligne.querySelector('.kv-bouton') || estIgnore(ligne)) { return; }

                var segments = segmentsDe(ligne);
                if (!segments.length) { return; }

                // Le bouton va dans la première cellule réellement lue, pas
                // dans la première tout court : sur les tables de construction
                // il doit être à côté de la phrase, pas de la formule.
                var hote = null;
                var cellules = ligne.querySelectorAll('td');
                for (var n = 0; n < cellules.length && !hote; n++) {
                    if (!estIgnore(cellules[n]) && segmentsDe(cellules[n]).length) {
                        hote = cellules[n];
                    }
                }
                if (!hote) { return; }

                hote.appendChild(creerBouton(function () {
                    return segmentsDe(ligne);
                }, 'Écouter : ' + resume(segments)));
            })(lignes[i]);
        }

        // 2) Tout élément explicitement marqué à lire.
        var marques = racine.querySelectorAll('[data-lire]');
        for (var j = 0; j < marques.length; j++) {
            (function (el) {
                if (el.querySelector('.kv-bouton') || estIgnore(el)) { return; }
                // Un data-lire imbriqué dans un autre donnerait deux boutons,
                // et celui du dessus prononcerait l'émoji de celui du dessous.
                if (ancetreMarque(el)) { return; }

                var explicite = el.getAttribute('data-lire');
                el.appendChild(creerBouton(function () {
                    return explicite
                        ? [{ texte: explicite, langue: langueDe(el) }]
                        : segmentsDe(el);
                }, 'Écouter ce passage'));
            })(marques[j]);
        }

        // 3) Questions de quiz : l'énoncé puis ses propositions. Le numéro
        //    « 1. » porte data-lire-ignore (posé par section-quiz.js) et le
        //    bouton lui-même est sauté, donc ni l'un ni l'autre n'est dit.
        var questions = racine.querySelectorAll('.section-quiz-question');
        for (var k = 0; k < questions.length; k++) {
            (function (q) {
                var hote = q.querySelector('.question-text');
                if (!hote || hote.querySelector('.kv-bouton') || estIgnore(q)) { return; }

                var aLire = [hote];
                var options = q.querySelectorAll('.option-label span');
                for (var n = 0; n < options.length; n++) { aLire.push(options[n]); }

                hote.appendChild(creerBouton(function () {
                    return segmentsDeTous(aLire);
                }, 'Écouter la question et les réponses'));
            })(questions[k]);
        }
    }

    function ancetreMarque(el) {
        var noeud = el.parentNode;
        while (noeud && noeud.getAttribute) {
            if (aAttribut(noeud, 'data-lire')) { return true; }
            noeud = noeud.parentNode;
        }
        return false;
    }

    /* ============================================================
       Réglage de vitesse — affiché seulement là où l'anglais est lu
       ============================================================ */

    function installerReglage() {
        if (!DISPONIBLE) { return; }
        if (document.querySelector('.kv-reglage')) { return; }

        // L'anglais peut être marqué par l'un ou l'autre attribut : chercher
        // le seul data-lire-langue ferait disparaître le réglage en silence
        // sur une page marquée en lang — c'est-à-dire la fonctionnalité pour
        // laquelle tout ce module existe.
        var zoneAnglaise = document.querySelector('[data-lire-langue^="en"], [lang^="en"]');
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
       Style — porté par le module, pour qu'il reste autonome
       ============================================================
       Les règles vivaient dans css/lecon-5e.css, que l'accueil ne charge pas :
       le 🔊 du chat y était un bouton natif nu. Ici, il est stylé partout où le
       module tourne. Le rose reprend la variable des leçons quand elle existe,
       avec sa valeur en repli. */

    var CSS = [
        // Couleurs du thème (css/theme.css), avec des replis pour les pages sans.
        '.kv-bouton{margin-left:6px;min-width:34px;min-height:34px;padding:2px 7px;',
        'border:1px solid var(--bord,rgba(157,47,92,.3));',
        'border-radius:9px;background:var(--surface,#fff);font-size:15px;line-height:1.5;cursor:pointer;',
        'vertical-align:middle;transition:background .15s ease,transform .15s ease}',
        '.kv-bouton:hover{background:var(--rose-pale,#FBE7EF)}',
        '.kv-bouton:focus-visible{outline:3px solid var(--focus,#8A2BE2);outline-offset:2px}',
        '.kv-bouton.kv-parle{background:var(--l5-fort,#9D2F5C);border-color:var(--l5-fort,#9D2F5C);',
        'animation:kv-pulse 1s ease-in-out infinite}',
        '@keyframes kv-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}',
        '@media (prefers-reduced-motion:reduce){.kv-bouton.kv-parle{animation:none}}',
        '.kv-reglage{display:flex;flex-wrap:wrap;align-items:center;gap:6px;max-width:900px;',
        'margin:12px auto 0;padding:0 16px;font-size:13px}',
        '.kv-vitesse{min-height:36px;padding:5px 14px;border:1px solid var(--bord,rgba(157,47,92,.3));border-radius:999px;',
        'background:var(--surface,#fff);color:var(--l5-rose,#9D2F5C);font-family:inherit;font-size:14px;',
        'font-weight:700;cursor:pointer}',
        '.kv-vitesse:hover{background:var(--rose-pale,#FBE7EF)}',
        '.kv-vitesse.actif{background:var(--l5-fort,#9D2F5C);border-color:var(--l5-fort,#9D2F5C);color:#fff}',
        '.kv-vitesse:focus-visible{outline:3px solid var(--focus,#8A2BE2);outline-offset:2px}'
    ].join('');

    function installerStyle() {
        if (!DISPONIBLE || document.getElementById('kv-style')) { return; }
        var style = document.createElement('style');
        style.id = 'kv-style';
        style.textContent = CSS;
        (document.head || document.documentElement).appendChild(style);
    }

    /* ============================================================
       Démarrage
       ============================================================ */

    function initialiser() {
        installerStyle();
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
        lireSegments: lireSegments,
        segmentsDe: segmentsDe,
        creerBouton: creerBouton,
        stop: stop,
        equiper: equiper,
        vitesse: vitesse,
        definirVitesse: definirVitesse
    };
})();
