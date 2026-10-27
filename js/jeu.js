/**
 * jeu.js — Les mécanismes de jeu repris de brikelec et d'expertenergie.
 *
 * Chargé sur toutes les pages par js/coquille.js. Expose window.KarniellaJeu :
 *   sons      : petits sons synthétisés (Web Audio), coupables d'un bouton ;
 *   niveau    : À reprendre, Acquis ou Niveau expert, d'après un score ;
 *   etoiles   : 1 à 3 étoiles, d'après le niveau ;
 *   medaille  : la médaille dessinée d'une récompense ;
 *   recompense: la bannière « Récompense débloquée » ;
 *   guide     : Aya, l'élève dessinée qui guide Karniella, et sa bulle ;
 *   jauge     : la barre de progression d'une matière ou de l'année.
 *
 * Les styles sont dans css/jeu.css. Pas d'emoji dans les commandes : des
 * pictogrammes au trait (window.KarniellaIcones, js/coquille.js).
 */
(function () {
    'use strict';

    if (window.KarniellaJeu) { return; }

    function creer(balise, classe, texte) {
        var e = document.createElement(balise);
        if (classe) { e.className = classe; }
        if (texte !== undefined) { e.textContent = texte; }
        return e;
    }

    function icone(nom, taille) {
        return window.KarniellaIcones ? window.KarniellaIcones.svg(nom, taille) : '';
    }

    var mouvementReduit = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ============================================================
       Sons (Web Audio) — repris de useSound.js de brikelec
       ============================================================
       Un oscillateur par note, avec une enveloppe courte. Le contexte audio
       n'est créé qu'au premier son : les navigateurs l'exigent après un geste. */

    var CLE_SON = 'karniella-son';
    var contexte = null;
    var maitre = null;

    function sonCoupe() {
        try { return window.localStorage.getItem(CLE_SON) === 'off'; } catch (err) { return false; }
    }

    function audio() {
        if (contexte) {
            if (contexte.state === 'suspended') { contexte.resume(); }
            return contexte;
        }
        var Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) { return null; }
        contexte = new Ctx();
        maitre = contexte.createGain();
        maitre.gain.value = 0.35;
        maitre.connect(contexte.destination);
        return contexte;
    }

    /** Une note : fréquence f (Hz), départ t0 et durée (s). */
    function note(f, t0, duree, o) {
        o = o || {};
        var c = contexte;
        var osc = c.createOscillator();
        var g = c.createGain();
        var debut = c.currentTime + t0;
        var attaque = o.attaque || 0.008;
        osc.type = o.type || 'sine';
        osc.frequency.setValueAtTime(f, debut);
        if (o.vers) { osc.frequency.exponentialRampToValueAtTime(o.vers, debut + duree); }
        g.gain.setValueAtTime(0.0001, debut);
        g.gain.exponentialRampToValueAtTime(o.volume || 0.5, debut + attaque);
        g.gain.exponentialRampToValueAtTime(0.0001, debut + duree);
        osc.connect(g);
        g.connect(maitre);
        osc.start(debut);
        osc.stop(debut + duree + 0.05);
    }

    var DO5 = 523.25, MI5 = 659.25, SOL5 = 783.99, DO6 = 1046.5;

    var SONS = {
        // Choisir une réponse
        choix: function () { note(520, 0, 0.07, { type: 'triangle', vers: 640, volume: 0.25 }); },
        // Bonne réponse
        juste: function () {
            note(880, 0, 0.18, { volume: 0.25 });
            note(1320, 0.05, 0.22, { volume: 0.15 });
        },
        // Mauvaise réponse
        faux: function () {
            note(220, 0, 0.18, { type: 'sawtooth', vers: 160, volume: 0.12 });
            note(180, 0.16, 0.26, { type: 'sawtooth', vers: 120, volume: 0.12 });
        },
        // Quiz terminé
        fini: function () {
            [DO5, MI5, SOL5, DO6].forEach(function (f, i) { note(f, i * 0.11, 0.45, { type: 'triangle', volume: 0.35 }); });
        },
        // Quiz terminé au niveau expert
        fanfare: function () {
            [[DO5, 0], [MI5, 0.16], [SOL5, 0.32], [DO6, 0.5], [SOL5, 0.74], [DO6, 0.9]].forEach(function (n) {
                note(n[0], n[1], 0.5, { type: 'triangle', volume: 0.3 });
                note(n[0] / 2, n[1], 0.5, { volume: 0.15 });
            });
        },
        // Récompense débloquée
        recompense: function () {
            note(1568, 0, 0.12, { volume: 0.18 });
            note(2093, 0.09, 0.3, { volume: 0.16 });
        },
        // Son remis
        clic: function () {
            note(300, 0, 0.09, { type: 'square', vers: 180, volume: 0.12 });
            note(900, 0, 0.05, { volume: 0.15 });
        }
    };

    function jouer(nom) {
        if (sonCoupe() || !SONS[nom]) { return; }
        try {
            if (!audio()) { return; }
            SONS[nom]();
        } catch (err) { /* pas de son, pas de souci */ }
    }

    var boutonsSon = [];

    function majBoutonsSon() {
        var coupe = sonCoupe();
        boutonsSon.forEach(function (b) {
            b.setAttribute('aria-pressed', coupe ? 'false' : 'true');
            b.setAttribute('aria-label', coupe ? 'Remettre le son' : 'Couper le son');
            b.title = coupe ? 'Son coupé' : 'Son activé';
            b.innerHTML = icone(coupe ? 'muet' : 'son', 20);
        });
    }

    function basculerSon() {
        var coupe = !sonCoupe();
        try { window.localStorage.setItem(CLE_SON, coupe ? 'off' : 'on'); } catch (err) { /* sans conséquence */ }
        majBoutonsSon();
        if (!coupe) { jouer('clic'); }
    }

    /** Un bouton « son » de plus (barre du haut, quiz). */
    function boutonSon(classe) {
        var b = creer('button', classe || 'reglage');
        b.type = 'button';
        b.setAttribute('data-reglage', 'son');
        b.addEventListener('click', basculerSon);
        boutonsSon.push(b);
        majBoutonsSon();
        return b;
    }

    /* ============================================================
       Niveau et étoiles — le barème d'expertenergie
       ============================================================
       Ramené sur 15 : 12 à 15 niveau expert, 8 à 11 acquis, 0 à 7 à reprendre.
       Le même barème s'applique au prorata à un quiz de 10 ou de 18. */

    var NIVEAUX = {
        'expert': { nom: 'Niveau expert', etoiles: 3, message: 'Tu maîtrises cette leçon.' },
        'acquis': { nom: 'Acquis', etoiles: 2, message: 'Quelques points à revoir, et ce sera parfait.' },
        'a-reprendre': { nom: 'À reprendre', etoiles: 1, message: 'Relis la leçon, puis révise tes erreurs.' }
    };

    function niveau(correct, total) {
        if (!total) { return null; }
        var id = correct * 15 >= 12 * total ? 'expert' : correct * 15 >= 8 * total ? 'acquis' : 'a-reprendre';
        var n = NIVEAUX[id];
        return { id: id, nom: n.nom, etoiles: n.etoiles, message: n.message };
    }

    /** La pastille du niveau, en élément. */
    function pastilleNiveau(n, grande) {
        var p = creer('span', 'niveau niveau-' + n.id + (grande ? ' niveau-grand' : ''));
        if (n.id === 'expert') { p.innerHTML = icone('etoile', grande ? 20 : 16); }
        p.appendChild(document.createTextNode(n.nom));
        return p;
    }

    var ETOILE = 'M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z';

    /** Trois étoiles, dont `n` allumées. */
    function etoiles(n, grandes) {
        var e = creer('span', 'etoiles' + (grandes ? ' etoiles-grandes' : ''));
        e.setAttribute('role', 'img');
        e.setAttribute('aria-label', n + (n > 1 ? ' étoiles' : ' étoile') + ' sur 3');
        var html = '';
        for (var i = 1; i <= 3; i++) {
            html += '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path class="' + (i <= n ? 'on' : 'off') +
                '" d="' + ETOILE + '" stroke-width="1.4" stroke-linejoin="round"/></svg>';
        }
        e.innerHTML = html;
        return e;
    }

    /* ============================================================
       Médailles des récompenses — un disque coloré, un pictogramme blanc
       ============================================================ */

    var GLYPHES = {
        etincelle: 'M24 12 L26.5 21.5 L36 24 L26.5 26.5 L24 36 L21.5 26.5 L12 24 L21.5 21.5 Z',
        coche: 'M14 24.5 L21 31.5 L34 17',
        cible: 'M24 13 A11 11 0 1 0 24.01 13 M24 19 A5 5 0 1 0 24.01 19 M24 24 L35 13',
        bulle: 'M13 16 H35 V29 H22 L16 34 V29 H13 Z',
        medaille: 'M24 12 A7 7 0 1 0 24.01 12 M19.5 25 L17 36 L24 32 L31 36 L28.5 25',
        boussole: 'M24 12 A12 12 0 1 0 24.01 12 M28.5 19.5 L26 26 L19.5 28.5 L22 22 Z',
        flamme: 'M24 12 C27 17 32 20 32 27 A8 8 0 0 1 16 27 C16 23 18 21 20 19 C20 23 22 24 24 24 C22 20 22 16 24 12 Z',
        couronne: 'M13 31 L15 17 L20.5 23 L24 15 L27.5 23 L33 17 L35 31 Z',
        livre: 'M13 15 H21 A3 3 0 0 1 24 18 V34 A3 3 0 0 0 21 31 H13 Z M35 15 H27 A3 3 0 0 0 24 18 V34 A3 3 0 0 1 27 31 H35 Z',
        eclair: 'M26 11 L16 26 H23 L21 37 L32 21 H25 Z',
        serie: 'M12 32 L19 25 L24 29 L35 17 M28 17 H35 V24',
        etoile: 'M24 12 L27.6 19.4 L35.6 20.5 L29.8 26.1 L31.2 34.1 L24 30.3 L16.8 34.1 L18.2 26.1 L12.4 20.5 L20.4 19.4 Z',
        revision: 'M33 21 A10 10 0 0 0 15 19 M15 13 V19 H21 M15 27 A10 10 0 0 0 33 29 M33 35 V29 H27'
    };

    // L'identifiant d'une récompense → son pictogramme et sa couleur.
    var MEDAILLES = {
        'premier-galop': ['etincelle', '#E1A801'],
        'curieuse': ['bulle', '#3F80C4'],
        'premier-quiz': ['cible', '#E1A801'],
        'sans-faute': ['coche', '#3F9B5A'],
        'cavaliere-quiz': ['medaille', '#C08A00'],
        'exploratrice': ['boussole', '#26456F'],
        'serie-3': ['flamme', '#E1A801'],
        'serie-7': ['flamme', '#C8553D'],
        'serie-30': ['couronne', '#C08A00'],
        'eclair': ['eclair', '#E1A801'],
        'serie-5': ['serie', '#3F9B5A'],
        'expert': ['etoile', '#C08A00'],
        'revision': ['revision', '#3F80C4']
    };

    /**
     * La médaille d'une récompense. `id` : celui du badge ; `teinte` remplace
     * la couleur (les badges « matière » prennent celle de leur matière).
     */
    function medaille(id, taille, verrouillee, teinte) {
        var m = MEDAILLES[id] || (/^matiere-/.test(id) ? ['livre', '#26456F'] : ['medaille', '#6B7B8B']);
        var t = taille || 44;
        var couleur = teinte || m[1];
        return '<svg class="medaille' + (verrouillee ? ' verrouillee' : '') + '" width="' + t + '" height="' + t +
            '" viewBox="0 0 48 48" style="--teinte:' + couleur + '" aria-hidden="true" focusable="false">' +
            '<circle cx="24" cy="24" r="22" stroke-width="2"/><path d="' + GLYPHES[m[0]] + '"/></svg>';
    }

    /* ============================================================
       La bannière « Récompense débloquée » — RewardToast de brikelec
       ============================================================ */

    var pile = null;

    function recompense(r) {
        if (!document.body) { return; }
        if (!pile) {
            pile = creer('div', 'toasts');
            pile.setAttribute('aria-live', 'polite');
            document.body.appendChild(pile);
        }
        var carte = creer('div', 'toast');
        carte.setAttribute('role', 'status');
        var med = creer('span', 'toast-medaille');
        med.innerHTML = r.medaille || medaille(r.id, 44, false, r.teinte);
        carte.appendChild(med);
        var corps = creer('div', 'toast-corps');
        corps.appendChild(creer('span', 'toast-etiquette', r.etiquette || 'Récompense débloquée'));
        corps.appendChild(creer('strong', 'toast-nom', r.nom));
        if (r.quoi) { corps.appendChild(creer('span', 'toast-quoi', r.quoi)); }
        carte.appendChild(corps);
        var fermer = creer('button', 'toast-fermer');
        fermer.type = 'button';
        fermer.setAttribute('aria-label', 'Fermer');
        fermer.innerHTML = icone('croix', 18);
        carte.appendChild(fermer);
        pile.appendChild(carte);

        function retirer() {
            if (!carte.parentNode) { return; }
            carte.classList.add('toast-sortie');
            window.setTimeout(function () { if (carte.parentNode) { carte.parentNode.removeChild(carte); } }, mouvementReduit ? 0 : 300);
        }
        fermer.addEventListener('click', retirer);
        window.setTimeout(retirer, r.duree || 4500);
        if (r.son !== false) { jouer('recompense'); }
    }

    /* ============================================================
       Aya, l'élève qui guide Karniella — même dessin plat que les
       techniciens CIPREL de brikelec, en uniforme de collège.
       ============================================================
       Repère SVG 160 × 196 (viewBox 0 14 160 196), pieds à y = 206.
       Poses : idle, wave (salue), cheer (saute de joie), point (montre),
       think (réfléchit). Les mouvements sont dans css/jeu.css. */

    var ENCRE = '#1f2832';
    var PEAU = '#8a5a34';
    var JOUE = '#a86c45';
    var CHEVEUX = '#22160e';
    var JUPE = '#26456f';
    var ORANGE = '#ed7f06';
    var VERT = '#0d9330';

    var POSES = { idle: '', wave: ' qui te salue', cheer: ' qui saute de joie', point: ' qui te montre la suite', think: ' qui réfléchit' };

    function bras(cote, pose) {
        var x = cote === 'g' ? 62 : 98;
        var doigt = pose === 'point' && cote === 'd'
            ? '<line x1="' + x + '" y1="136" x2="' + x + '" y2="144" stroke="' + ENCRE + '" stroke-width="7" stroke-linecap="round"/>' +
              '<line x1="' + x + '" y1="136" x2="' + x + '" y2="144" stroke="' + PEAU + '" stroke-width="3.4" stroke-linecap="round"/>'
            : '';
        return '<g class="aya-bras aya-bras-' + cote + '">' +
            '<line x1="' + x + '" y1="93" x2="' + x + '" y2="114" stroke="' + ENCRE + '" stroke-width="13" stroke-linecap="round"/>' +
            '<line x1="' + x + '" y1="93" x2="' + x + '" y2="114" stroke="' + PEAU + '" stroke-width="9" stroke-linecap="round"/>' +
            '<line x1="' + x + '" y1="93" x2="' + x + '" y2="103" stroke="' + ENCRE + '" stroke-width="16" stroke-linecap="round"/>' +
            '<line x1="' + x + '" y1="93" x2="' + x + '" y2="103" stroke="#fff" stroke-width="12" stroke-linecap="round"/>' +
            '<g class="aya-avant-bras">' +
            '<line x1="' + x + '" y1="113" x2="' + x + '" y2="131" stroke="' + ENCRE + '" stroke-width="13" stroke-linecap="round"/>' +
            '<line x1="' + x + '" y1="113" x2="' + x + '" y2="131" stroke="' + PEAU + '" stroke-width="9" stroke-linecap="round"/>' +
            doigt +
            '<circle cx="' + x + '" cy="134.5" r="5.8" fill="' + PEAU + '" stroke="' + ENCRE + '" stroke-width="2"/>' +
            '</g></g>';
    }

    function tete(pose) {
        var bouche = (pose === 'cheer' || pose === 'wave')
            ? '<path d="M73.8,69.4 Q80,78.6 86.2,69.4 Z" fill="' + ENCRE + '" stroke="' + ENCRE + '" stroke-width="1.4" stroke-linejoin="round"/>'
            : pose === 'think'
                ? '<path d="M76,72.4 Q80.5,70.6 84.5,71" fill="none" stroke="' + ENCRE + '" stroke-width="2" stroke-linecap="round"/>'
                : '<path d="M74.6,69.8 Q80,75 85.4,69.8" fill="none" stroke="' + ENCRE + '" stroke-width="2.2" stroke-linecap="round"/>';
        return '<g class="aya-tete">' +
            // deux macarons, avec leurs élastiques orange et vert
            '<circle cx="60" cy="39" r="11" fill="' + CHEVEUX + '" stroke="' + ENCRE + '" stroke-width="1.8"/>' +
            '<circle cx="100" cy="39" r="11" fill="' + CHEVEUX + '" stroke="' + ENCRE + '" stroke-width="1.8"/>' +
            '<path d="M63.5,48.5 L69,44" stroke="' + ORANGE + '" stroke-width="3.4" stroke-linecap="round"/>' +
            '<path d="M96.5,48.5 L91,44" stroke="' + VERT + '" stroke-width="3.4" stroke-linecap="round"/>' +
            // tresses fines, perles au bout
            '<path d="M57,57 V80 M61,62 V82 M99,62 V82 M103,57 V80" stroke="' + CHEVEUX + '" stroke-width="3.2" stroke-linecap="round"/>' +
            '<circle cx="57" cy="82" r="2.1" fill="' + ORANGE + '" stroke="' + ENCRE + '" stroke-width="1"/>' +
            '<circle cx="61" cy="84" r="2.1" fill="' + VERT + '" stroke="' + ENCRE + '" stroke-width="1"/>' +
            '<circle cx="99" cy="84" r="2.1" fill="' + VERT + '" stroke="' + ENCRE + '" stroke-width="1"/>' +
            '<circle cx="103" cy="82" r="2.1" fill="' + ORANGE + '" stroke="' + ENCRE + '" stroke-width="1"/>' +
            '<circle cx="58.5" cy="61" r="4.6" fill="' + PEAU + '" stroke="' + ENCRE + '" stroke-width="2"/>' +
            '<circle cx="101.5" cy="61" r="4.6" fill="' + PEAU + '" stroke="' + ENCRE + '" stroke-width="2"/>' +
            '<circle cx="58.5" cy="66.4" r="1.6" fill="' + ORANGE + '"/>' +
            '<circle cx="101.5" cy="66.4" r="1.6" fill="' + ORANGE + '"/>' +
            '<circle cx="80" cy="58" r="22" fill="' + PEAU + '" stroke="' + ENCRE + '" stroke-width="2"/>' +
            // cheveux tirés, raie au milieu
            '<path d="M58.2,57 Q57.5,36 80,35.5 Q102.5,36 101.8,57 Q99,46 89,45.5 Q83,45.5 80,49 Q77,45.5 71,45.5 Q61,46 58.2,57 Z" fill="' + CHEVEUX + '"/>' +
            '<circle cx="69" cy="68.5" r="3" fill="' + JOUE + '"/>' +
            '<circle cx="91" cy="68.5" r="3" fill="' + JOUE + '"/>' +
            '<path class="aya-sourcil aya-sourcil-g" d="M68.5,57.6 Q72,55.6 75.5,57.4" fill="none" stroke="' + ENCRE + '" stroke-width="1.8" stroke-linecap="round"/>' +
            '<path class="aya-sourcil aya-sourcil-d" d="M84.5,57.4 Q88,55.6 91.5,57.6" fill="none" stroke="' + ENCRE + '" stroke-width="1.8" stroke-linecap="round"/>' +
            '<g class="aya-yeux"><g class="aya-pupilles">' +
            '<circle cx="72" cy="62.5" r="2.8" fill="' + ENCRE + '"/><circle cx="88" cy="62.5" r="2.8" fill="' + ENCRE + '"/>' +
            '<circle cx="72.9" cy="61.6" r=".95" fill="#fff"/><circle cx="88.9" cy="61.6" r=".95" fill="#fff"/></g>' +
            '<path d="M69.6,61 L67.6,59.6 M90.4,61 L92.4,59.6" stroke="' + ENCRE + '" stroke-width="1.4" stroke-linecap="round"/></g>' +
            bouche + '</g>';
    }

    function torse() {
        var chemise = 'M58,98 Q58,84 72,83 H88 Q102,84 102,98 V124 H58 Z';
        return '<g>' +
            '<path d="' + chemise + '" fill="#fff" stroke="' + ENCRE + '" stroke-width="2" stroke-linejoin="round"/>' +
            // bretelles du sac à dos
            '<line x1="67" y1="84" x2="65" y2="121" stroke="' + ENCRE + '" stroke-width="7.5" stroke-linecap="round"/>' +
            '<line x1="67" y1="84" x2="65" y2="121" stroke="' + ORANGE + '" stroke-width="4.5" stroke-linecap="round"/>' +
            '<line x1="93" y1="84" x2="95" y2="121" stroke="' + ENCRE + '" stroke-width="7.5" stroke-linecap="round"/>' +
            '<line x1="93" y1="84" x2="95" y2="121" stroke="' + ORANGE + '" stroke-width="4.5" stroke-linecap="round"/>' +
            // col
            '<path d="M71,83 L80,93 L70,96 Z M89,83 L80,93 L90,96 Z" fill="#fff" stroke="' + ENCRE + '" stroke-width="1.6" stroke-linejoin="round"/>' +
            // écusson du collège
            '<path d="M82.5,101 H91 V107 Q91,111 86.75,112.5 Q82.5,111 82.5,107 Z" fill="' + VERT + '" stroke="' + ENCRE + '" stroke-width="1.4" stroke-linejoin="round"/>' +
            '<path d="M84.6,105.5 L86.4,107.4 L89,103.8" fill="none" stroke="#fff" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>' +
            // jupe plissée
            '<path d="M59,121 H101 L107,148 Q80,153 53,148 Z" fill="' + JUPE + '" stroke="' + ENCRE + '" stroke-width="2" stroke-linejoin="round"/>' +
            '<path d="M70,124 L66.5,149.5 M80,124 V151 M90,124 L93.5,149.5" stroke="#17304f" stroke-width="1.3" stroke-linecap="round"/>' +
            '</g>';
    }

    function jambe(cote) {
        var x = cote === 'g' ? 72 : 88;
        var chaussure = cote === 'g'
            ? 'M66,194 H79 V204 H61 Q57,204 57,200 Q57,194 66,194 Z'
            : 'M94,194 H81 V204 H99 Q103,204 103,200 Q103,194 94,194 Z';
        return '<g class="aya-jambe aya-jambe-' + cote + '">' +
            '<line x1="' + x + '" y1="140" x2="' + x + '" y2="190" stroke="' + ENCRE + '" stroke-width="12" stroke-linecap="round"/>' +
            '<line x1="' + x + '" y1="140" x2="' + x + '" y2="190" stroke="' + PEAU + '" stroke-width="8" stroke-linecap="round"/>' +
            '<rect x="' + (x - 6) + '" y="182" width="12" height="13" rx="2.5" fill="#fff" stroke="' + ENCRE + '" stroke-width="1.6"/>' +
            '<path d="' + chaussure + '" fill="' + ENCRE + '" stroke="' + ENCRE + '" stroke-width="2" stroke-linejoin="round"/>' +
            '</g>';
    }

    /** Le dessin d'Aya, en SVG. `taille` : hauteur en px. */
    function dessin(pose, taille) {
        pose = POSES.hasOwnProperty(pose) ? pose : 'idle';
        var h = taille || 120;
        var l = Math.round(h * 160 / 196);
        var couches = pose === 'think'
            ? [bras('d', pose), '<rect x="74" y="72" width="12" height="16" rx="3" fill="' + PEAU + '" stroke="' + ENCRE + '" stroke-width="2"/>', torse(), tete(pose), bras('g', pose)]
            : [bras('g', pose), bras('d', pose), '<rect x="74" y="72" width="12" height="16" rx="3" fill="' + PEAU + '" stroke="' + ENCRE + '" stroke-width="2"/>', torse(), tete(pose)];
        var pensees = pose === 'think'
            ? '<g class="aya-pensees">' +
              '<circle class="aya-pensee" cx="113" cy="36" r="2.3" fill="#fff" stroke="' + ENCRE + '" stroke-width="1.6"/>' +
              '<circle class="aya-pensee" cx="119.5" cy="28" r="3.1" fill="#fff" stroke="' + ENCRE + '" stroke-width="1.6"/>' +
              '<circle class="aya-pensee" cx="127.5" cy="19.5" r="3.9" fill="#fff" stroke="' + ENCRE + '" stroke-width="1.6"/></g>'
            : '';
        return '<svg class="aya aya-' + pose + '" viewBox="0 14 160 196" width="' + l + '" height="' + h + '" role="img" ' +
            'aria-label="Aya, ta guide' + POSES[pose] + '" xmlns="http://www.w3.org/2000/svg">' +
            '<g class="aya-corps">' + jambe('g') + jambe('d') + '<g class="aya-haut">' + couches.join('') + '</g></g>' +
            pensees + '</svg>';
    }

    /** Le visage d'Aya seul, pour le logo de la barre du haut. */
    function visage(taille) {
        var t = taille || 32;
        return '<svg class="aya aya-idle aya-visage" viewBox="46 26 68 66" width="' + t + '" height="' + t + '" aria-hidden="true" focusable="false">' +
            tete('idle') + '</svg>';
    }

    /**
     * Aya et sa bulle. Renvoie { el, dire(texte, pose) }.
     * options : pose, taille, texte, titre (en gras au début de la bulle).
     */
    function guide(options) {
        options = options || {};
        var el = creer('div', 'guide');
        var interieur = creer('div', 'guide-interieur');
        var perso = creer('div', 'guide-perso');
        var bulle = creer('div', 'guide-bulle');
        bulle.setAttribute('aria-live', 'polite');
        interieur.appendChild(perso);
        interieur.appendChild(bulle);
        el.appendChild(interieur);

        function dire(texte, pose, titre) {
            perso.innerHTML = dessin(pose || options.pose || 'idle', options.taille || 110);
            bulle.textContent = '';
            if (titre) { bulle.appendChild(creer('strong', 'guide-titre', titre)); }
            if (texte) {
                if (typeof texte === 'string') { bulle.appendChild(creer('p', '', texte)); }
                else { bulle.appendChild(texte); }
            }
        }
        dire(options.texte || '', options.pose, options.titre);
        return { el: el, dire: dire };
    }

    /* ============================================================
       La jauge — PowerGauge de brikelec
       ============================================================
       o : { titre, pct (0 à 100), aide, icone }. */

    function jauge(o) {
        var pct = Math.max(0, Math.min(100, Math.round(o.pct || 0)));
        var bloc = creer('div', 'jauge-bloc');
        var tete = creer('div', 'jauge-tete');
        var titre = creer('strong');
        titre.innerHTML = icone(o.icone || 'eclair', 20);
        titre.appendChild(document.createTextNode(o.titre));
        tete.appendChild(titre);
        tete.appendChild(creer('span', 'jauge-pct', pct + ' %'));
        bloc.appendChild(tete);
        var barre = creer('div', 'jauge');
        barre.setAttribute('role', 'progressbar');
        barre.setAttribute('aria-valuemin', '0');
        barre.setAttribute('aria-valuemax', '100');
        barre.setAttribute('aria-valuenow', String(pct));
        barre.setAttribute('aria-label', o.titre);
        var rempli = creer('div', 'jauge-remplie');
        barre.appendChild(rempli);
        bloc.appendChild(barre);
        if (o.aide) { bloc.appendChild(creer('p', 'jauge-aide', o.aide)); }
        // Remplie juste après l'affichage, pour voir la barre monter.
        window.requestAnimationFrame(function () {
            window.requestAnimationFrame(function () { rempli.style.width = pct + '%'; });
        });
        return bloc;
    }

    window.KarniellaJeu = {
        jauge: jauge,
        sons: { jouer: jouer, coupe: sonCoupe, basculer: basculerSon, bouton: boutonSon },
        niveau: niveau,
        pastilleNiveau: pastilleNiveau,
        etoiles: etoiles,
        medaille: medaille,
        recompense: recompense,
        guide: guide,
        dessin: dessin,
        visage: visage
    };
})();
