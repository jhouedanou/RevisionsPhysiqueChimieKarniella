/**
 * schema-interactif.js — les schémas de physique-chimie que Karniella manipule.
 *
 * Dans une leçon :
 *
 *     <div class="schema-interactif" data-schema="montage" data-piles="4.5"
 *          data-lampes="2" data-montage="serie" data-inter="ferme">
 *       <p class="si-legende">Schéma 1 : deux lampes en série.</p>
 *     </div>
 *
 * Le script (à charger après js/lecon-5e.js) dessine le circuit et le rend
 * vivant : Karniella touche un fil pour l'enlever, une lampe pour la dévisser,
 * l'interrupteur pour l'ouvrir, une pile pour la retourner. Le circuit est
 * recalculé (loi des nœuds) : l'éclat des lampes, la flèche du courant et la
 * phrase d'observation suivent. La légende écrite dans la page reste sous le
 * schéma. Aya (js/jeu.js) dit l'observation dans sa bulle et change de pose :
 * elle saute de joie quand tout brille, réfléchit quand le circuit est ouvert,
 * s'alarme au court-circuit.
 *
 * data-schema="montage" — tout circuit de piles, de lampes et d'interrupteurs :
 *   data-piles="1.5,1.5"       tension de chaque pile, en volts (défaut : 4.5)
 *   data-retournees="2"        piles retournées au départ (numéros à partir de 1)
 *   data-lampes="2"            nombre de lampes, 1 à 3 (défaut : 1)
 *   data-montage="derivation"  lampes en dérivation (défaut : serie)
 *   data-nominal="3.8"         tension d'usage des lampes (défaut : 3.8)
 *   data-inter="ouvert|ferme"  un interrupteur K sur la branche principale
 *   data-inter-branches="ouvert,ferme"  un interrupteur par branche (dérivation)
 *   data-devissees="1"  data-grillees="2"  data-court="1"   état de départ des lampes
 *   data-voltmetre             un voltmètre à la place des lampes
 *   data-options="retourner nombre choix grille"
 *        retourner : toucher une pile la retourne ;  nombre : choisir 1 à 3 piles ;
 *        choix : choisir la tension de la pile et de la lampe ;
 *        grille : en surtension, la lampe brille très fort puis grille.
 *
 * Raccourcis : data-schema="circuit", "tension", "lampes" (data-montage),
 * "piles" (data-retourner="non"). Et data-schema="melange" : du sucre ou du
 * sable dans l'eau.
 *
 * Mathématiques, même logique (un curseur à glisser, Aya explique) :
 *   data-schema="angles"  data-figure="adjacents | complementaires |
 *                         supplementaires | opposes | triangle"
 *   data-schema="segment" data-figure="milieu | mediatrice"
 *   data-schema="droite"      un nombre relatif, son opposé, sa distance à zéro
 *   data-schema="puissance"   aⁿ écrit en produit de facteurs
 *   data-schema="diviseurs"   premier ou pas : n points rangés en rectangle
 *
 * Chaque schéma fournit texte(etat) : l'observation, puis
 * <span class="si-pourquoi"> avec l'explication (« Pourquoi ? »).
 *
 * Mêmes règles que les schémas fixes (CLAUDE.md) : traits en currentColor,
 * accents avec les variables du thème, symboles normalisés, lisible à 390 px.
 */
(function () {
    'use strict';

    var NS = 'http://www.w3.org/2000/svg';

    /* ---------- Les symboles ---------- */

    var TRAIT = '<g fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">';

    function nombre(v) { return String(Math.round(v * 10) / 10).replace('.', ','); }

    function texte(x, y, contenu, options) {
        var o = options || {};
        return '<text x="' + x + '" y="' + y + '" font-size="' + (o.taille || 13) + '"' +
            (o.gras ? ' font-weight="700"' : '') +
            ' text-anchor="' + (o.ancre || 'middle') + '"' +
            (o.couleur ? ' style="fill:var(' + o.couleur + ')"' : '') + '>' + contenu + '</text>';
    }

    /** Une zone qu'on peut toucher : un groupe SVG qui se comporte en bouton. */
    function touche(action, label, dessin, zone) {
        return '<g class="si-clic" tabindex="0" role="button" data-act="' + action + '" aria-label="' + label + '">' +
            dessin + zone + '</g>';
    }

    function zoneRonde(cx, cy, r) {
        return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="transparent" stroke="none"/>';
    }

    function zoneTrait(d) {
        return '<path d="' + d + '" fill="none" stroke="transparent" stroke-width="24" stroke-linejoin="round" pointer-events="stroke"/>';
    }

    /**
     * Une lampe. etat : eteinte, faible, normale, forte, grillee, devissee.
     * Des petits traits autour : elle brille. Croix coupée : elle est grillée.
     * Cercle en pointillé : elle est dévissée.
     */
    function lampe(cx, cy, etat) {
        var r = 14, d = r * 0.707, s = '';
        var lueur = { faible: 0.3, normale: 0.65, forte: 1 }[etat];
        if (lueur) {
            s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" stroke="none" style="fill:var(--surligne);fill-opacity:' + lueur + '"/>';
        }
        s += TRAIT;
        if (etat === 'devissee') {
            s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" stroke-dasharray="3 5"/>';
        } else {
            s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '"/>';
            if (etat === 'grillee') {
                s += '<path d="M' + (cx - d) + ' ' + (cy - d) + ' l5 5 M' + (cx + d) + ' ' + (cy + d) + ' l-5 -5 M' +
                    (cx + d) + ' ' + (cy - d) + ' l-5 5 M' + (cx - d) + ' ' + (cy + d) + ' l5 -5"/>';
            } else {
                s += '<path d="M' + (cx - d) + ' ' + (cy - d) + ' L' + (cx + d) + ' ' + (cy + d) + ' M' +
                    (cx + d) + ' ' + (cy - d) + ' L' + (cx - d) + ' ' + (cy + d) + '"/>';
            }
        }
        s += '</g>';
        var rayon = { faible: 5, normale: 8, forte: 12 }[etat];
        if (rayon) {
            s += '<g class="si-rayons" stroke-width="' + (etat === 'forte' ? 3 : 2.5) + '" stroke-linecap="round" style="stroke:var(--boite-important-texte)"' +
                (etat === 'faible' ? ' opacity="0.6" stroke-dasharray="2 3"' : '') + '>';
            for (var i = 0; i < 8; i++) {
                var a = (i + 0.5) * Math.PI / 4, c = Math.cos(a), n = Math.sin(a);
                s += '<line x1="' + (cx + c * (r + 4)).toFixed(1) + '" y1="' + (cy + n * (r + 4)).toFixed(1) +
                    '" x2="' + (cx + c * (r + 4 + rayon)).toFixed(1) + '" y2="' + (cy + n * (r + 4 + rayon)).toFixed(1) + '"/>';
            }
            s += '</g>';
        }
        return s;
    }

    /**
     * Une pile sur un fil horizontal, centrée en x. Grand trait fin : borne +.
     * Petit trait épais : borne −. Non retournée : la borne + est à gauche.
     */
    function pile(x, y, retournee) {
        var plus = retournee ? x + 6 : x - 6, moins = retournee ? x - 6 : x + 6;
        return TRAIT +
            '<line x1="' + plus + '" y1="' + (y - 16) + '" x2="' + plus + '" y2="' + (y + 16) + '"/>' +
            '<line x1="' + moins + '" y1="' + (y - 8) + '" x2="' + moins + '" y2="' + (y + 8) + '" stroke-width="6"/></g>' +
            texte(plus + (retournee ? 9 : -9), y - 20, '+', { taille: 15, gras: true }) +
            texte(moins + (retournee ? -9 : 9), y - 12, '−', { taille: 15, gras: true });
    }

    /** La flèche du courant, sur un fil horizontal. Elle sort de la borne +. */
    function courant(x, y, versLaGauche) {
        return '<path class="si-courant' + (versLaGauche ? '' : ' si-courant-droite') + '" d="M' + x + ' ' + y + (versLaGauche ? ' l10 -5 v10 z' : ' l-10 -5 v10 z') + '" style="fill:var(--rose)"/>' +
            texte(x + (versLaGauche ? 6 : -6), y - 9, 'I', { gras: true, couleur: '--rose' });
    }

    /* ---------- Le circuit : son plan, son calcul ---------- */

    function liste(v) {   // "1,3" → [1, 3]
        return String(v || '').split(/[ ,;]+/).filter(Boolean).map(Number);
    }

    /** L'état de départ, lu dans les attributs data-… de la page. */
    function etatMontage(d) {
        var options = String(d.options || '').split(/[ ,]+/).filter(Boolean);
        var tensions = d.piles ? liste(d.piles) : [4.5];
        var retournees = liste(d.retournees), devissees = liste(d.devissees), grillees = liste(d.grillees), court = liste(d.court);
        var voltmetre = d.voltmetre !== undefined;
        var n = voltmetre ? 0 : Math.max(1, Math.min(3, Number(d.lampes) || 1));
        var e = {
            piles: tensions.map(function (t, j) { return { e: t, ret: retournees.indexOf(j + 1) >= 0 }; }),
            lampes: [], ponts: [],
            derivation: d.montage === 'derivation' && n > 1,
            nominal: Number(d.nominal) || 3.8,
            voltmetre: voltmetre,
            inter: d.inter ? d.inter === 'ferme' : null,
            interB: d.interBranches ? d.interBranches.split(/[ ,]+/).map(function (x) { return x === 'ferme'; }) : null,
            fils: {},
            options: {}
        };
        for (var i = 0; i < n; i++) {
            e.lampes.push(grillees.indexOf(i + 1) >= 0 ? 'grillee' : (devissees.indexOf(i + 1) >= 0 ? 'devissee' : 'ok'));
            e.ponts.push(court.indexOf(i + 1) >= 0);
        }
        options.forEach(function (o) { e.options[o] = true; });
        if (n > 1) { e.options.pont = true; }
        return e;
    }

    /**
     * Le plan du circuit : où sont les fils, les lampes, les piles. Chaque
     * élément relie deux bornes (a et b). Un fil est une ligne brisée.
     */
    function plan(e) {
        var elements = [], n = e.lampes.length, m = e.piles.length, k = 0;
        var haut = e.voltmetre ? 1 : n;
        var xp = { 1: [160], 2: [127, 193], 3: [95, 160, 225] }[m];

        function fil(points, a, b) { elements.push({ type: 'fil', id: 'f' + (k++), points: points, a: a, b: b }); }
        function piles(y) {
            for (var j = 0; j < m; j++) {
                elements.push({ type: 'pile', j: j, x: xp[j], y: y, a: 'p' + j + 'g', b: 'p' + j + 'd' });
                if (j < m - 1) { fil([[xp[j] + 6, y], [xp[j + 1] - 6, y]], 'p' + j + 'd', 'p' + (j + 1) + 'g'); }
            }
        }

        if (!e.derivation) {
            var yH = 50, yB = 150, xs = [];
            for (var i = 0; i < haut; i++) { xs.push(Math.round(40 + 240 * (i + 0.5) / haut)); }
            if (e.inter !== null) {
                fil([[xp[0] - 6, yB], [40, yB], [40, 115]], 'p0g', 'kb');
                elements.push({ type: 'inter', cle: 'K', nom: 'K', p1: [40, 115], p2: [40, 80], a: 'kb', b: 'kh' });
                fil([[40, 80], [40, yH], [xs[0] - 14, yH]], 'kh', 'l0g');
            } else {
                fil([[xp[0] - 6, yB], [40, yB], [40, yH], [xs[0] - 14, yH]], 'p0g', 'l0g');
            }
            for (i = 0; i < haut; i++) {
                elements.push(e.voltmetre
                    ? { type: 'volt', cx: xs[i], cy: yH, a: 'l0g', b: 'l0d' }
                    : { type: 'lampe', i: i, cx: xs[i], cy: yH, a: 'l' + i + 'g', b: 'l' + i + 'd', nomX: xs[i], nomY: yH + (haut > 1 ? 48 : 42) });
                if (i < haut - 1) { fil([[xs[i] + 14, yH], [xs[i + 1] - 14, yH]], 'l' + i + 'd', 'l' + (i + 1) + 'g'); }
            }
            fil([[xs[haut - 1] + 14, yH], [280, yH], [280, yB], [xp[m - 1] + 6, yB]], 'l' + (haut - 1) + 'd', 'p' + (m - 1) + 'd');
            piles(yB);
            return { elements: elements, vue: '0 0 320 200', yPiles: yB, xGauche: 40, noeuds: [], formuleY: 115 };
        }

        // En dérivation : deux rails, une branche par lampe. L1 est la plus proche de la pile.
        var yP = 45 + 70 * n, noeuds = [];
        function yb(b) { return 45 + 70 * (n - 1 - b); }
        if (e.inter !== null) {
            fil([[xp[0] - 6, yP], [50, yP], [50, yP - 16]], 'p0g', 'kb');
            elements.push({ type: 'inter', cle: 'K', nom: 'K', p1: [50, yP - 16], p2: [50, yP - 50], a: 'kb', b: 'kh' });
            fil([[50, yP - 50], [50, yb(0)]], 'kh', 'jg0');
        } else {
            fil([[xp[0] - 6, yP], [50, yP], [50, yb(0)]], 'p0g', 'jg0');
        }
        fil([[xp[m - 1] + 6, yP], [270, yP], [270, yb(0)]], 'p' + (m - 1) + 'd', 'jd0');
        for (var b = 0; b < n; b++) {
            var y = yb(b), cx = e.interB ? 185 : 160;
            if (b < n - 1) {
                fil([[50, y], [50, yb(b + 1)]], 'jg' + b, 'jg' + (b + 1));
                fil([[270, y], [270, yb(b + 1)]], 'jd' + b, 'jd' + (b + 1));
                noeuds.push([50, y], [270, y]);
            }
            if (e.interB) {
                fil([[50, y], [90, y]], 'jg' + b, 'kb' + b);
                elements.push({ type: 'inter', cle: 'K' + b, nom: 'K' + (b + 1), b_: b, p1: [90, y], p2: [124, y], a: 'kb' + b, b: 'kh' + b, horizontal: true });
                fil([[124, y], [cx - 14, y]], 'kh' + b, 'l' + b + 'g');
            } else {
                fil([[50, y], [cx - 14, y]], 'jg' + b, 'l' + b + 'g');
            }
            elements.push({ type: 'lampe', i: b, cx: cx, cy: y, a: 'l' + b + 'g', b: 'l' + b + 'd', nomX: cx + 52, nomY: y - 8 });
            fil([[cx + 14, y], [270, y]], 'l' + b + 'd', 'jd' + b);
        }
        piles(yP);
        return { elements: elements, vue: '0 0 320 ' + (yP + 40), yPiles: yP, xGauche: 50, noeuds: noeuds, etiquettes: [[36, yb(0) + 5, 'A'], [284, yb(0) + 5, 'B']], formuleY: null };
    }

    /**
     * Le calcul du circuit (loi des nœuds). Les fils, les interrupteurs fermés
     * et les fils de court-circuit soudent leurs deux bornes. Une lampe est une
     * résistance. Une pile pousse sa tension, avec une toute petite résistance :
     * un court-circuit donne alors un courant énorme, qu'on sait repérer.
     */
    function calculer(e, p) {
        var parent = {};
        function racine(x) {
            if (parent[x] === undefined) { parent[x] = x; }
            while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
            return x;
        }
        function souder(a, b) { parent[racine(a)] = racine(b); }

        p.elements.forEach(function (el) {
            racine(el.a); racine(el.b);
            if (el.type === 'fil' && !e.fils[el.id]) { souder(el.a, el.b); }
            if (el.type === 'inter' && (el.cle === 'K' ? e.inter : e.interB[el.b_])) { souder(el.a, el.b); }
            if (el.type === 'lampe' && e.ponts[el.i]) { souder(el.a, el.b); }
        });

        var index = {}, taille = 0;
        Object.keys(parent).forEach(function (x) { var r = racine(x); if (index[r] === undefined) { index[r] = taille++; } });
        function n(x) { return index[racine(x)]; }

        var G = [], I = [], i, j;
        for (i = 0; i < taille; i++) { G.push([]); I.push(0); for (j = 0; j < taille; j++) { G[i].push(i === j ? 1e-9 : 0); } }
        function resistance(a, b, g) {
            a = n(a); b = n(b);
            if (a === b) { return; }
            G[a][a] += g; G[b][b] += g; G[a][b] -= g; G[b][a] -= g;
        }
        var R_PILE = 0.05, rLampe = e.nominal / 0.3;
        p.elements.forEach(function (el) {
            if (el.type === 'lampe' && e.lampes[el.i] === 'ok') { resistance(el.a, el.b, 1 / rLampe); }
            if (el.type === 'volt') { resistance(el.a, el.b, 1e-6); }
            if (el.type === 'pile') {
                var pl = e.piles[el.j], plus = n(pl.ret ? el.b : el.a), moins = n(pl.ret ? el.a : el.b);
                resistance(el.a, el.b, 1 / R_PILE);
                I[plus] += pl.e / R_PILE; I[moins] -= pl.e / R_PILE;
            }
        });

        // Élimination de Gauss.
        var V = I.slice(), c, l, f, pivot;
        for (c = 0; c < taille; c++) {
            pivot = c;
            for (l = c + 1; l < taille; l++) { if (Math.abs(G[l][c]) > Math.abs(G[pivot][c])) { pivot = l; } }
            f = G[c]; G[c] = G[pivot]; G[pivot] = f; f = V[c]; V[c] = V[pivot]; V[pivot] = f;
            for (l = c + 1; l < taille; l++) {
                f = G[l][c] / G[c][c];
                if (!f) { continue; }
                for (j = c; j < taille; j++) { G[l][j] -= f * G[c][j]; }
                V[l] -= f * V[c];
            }
        }
        for (c = taille - 1; c >= 0; c--) {
            for (j = c + 1; j < taille; j++) { V[c] -= G[c][j] * V[j]; }
            V[c] /= G[c][c];
        }
        function tension(a, b) { return V[n(a)] - V[n(b)]; }

        var r = { eclat: [], court: false, sortParLaGauche: null, volt: 0 };
        p.elements.forEach(function (el) {
            if (el.type === 'lampe') {
                var etat = e.lampes[el.i], u = Math.abs(tension(el.a, el.b)) / e.nominal;
                r.eclat[el.i] = etat !== 'ok' ? etat : (u < 0.08 ? 'eteinte' : (u < 0.8 ? 'faible' : (u <= 1.3 ? 'normale' : 'forte')));
            }
            if (el.type === 'volt') { r.volt = Math.abs(tension(el.a, el.b)); }
            if (el.type === 'pile') {
                var pl = e.piles[el.j];
                var debit = (pl.e - (pl.ret ? tension(el.b, el.a) : tension(el.a, el.b))) / R_PILE;   // > 0 : il sort par la borne +
                if (Math.abs(debit) > 3) { r.court = true; }
                if (el.j === 0 && Math.abs(debit) > 0.02) { r.sortParLaGauche = (debit > 0) !== pl.ret; }
            }
        });
        return r;
    }

    /** « U = 1,5 − 1,5 + 1,5 = 1,5 V » : on compte dans le sens du plus grand camp. */
    function formule(e) {
        var somme = 0;
        e.piles.forEach(function (pl) { somme += pl.ret ? -pl.e : pl.e; });
        var sens = somme < 0 ? -1 : 1;
        var termes = e.piles.map(function (pl) { return (pl.ret ? -pl.e : pl.e) * sens; });
        if (termes[0] < 0) { termes.sort(function (x, y) { return y - x; }); }   // on commence par une pile comptée en plus
        var s = 'U = ' + nombre(termes[0]);
        for (var i = 1; i < termes.length; i++) { s += (termes[i] > 0 ? ' + ' : ' − ') + nombre(Math.abs(termes[i])); }
        return s + (termes.length > 1 ? ' = ' + nombre(Math.abs(somme)) : '') + ' V';
    }

    var MOT = {
        eteinte: 'est <strong>éteinte</strong>', faible: 'brille <strong>faiblement</strong>', normale: 'brille <strong>normalement</strong>',
        forte: 'brille <strong>très fort</strong>', grillee: 'est <strong>grillée</strong>', devissee: 'est <strong>dévissée</strong>'
    };

    var SCHEMAS = {};

    SCHEMAS.montage = {
        depart: function (d) { return etatMontage(d); },

        dessin: function (e) {
            var p = plan(e), r = calculer(e, p), s = '', n = e.lampes.length;
            e.resultat = r;
            // Les fils d'abord : les lampes, les piles et les interrupteurs passent dessus,
            // pour que le doigt les attrape avant le fil d'à côté.
            var ordre = p.elements.filter(function (el) { return el.type === 'fil'; })
                .concat(p.elements.filter(function (el) { return el.type !== 'fil'; }));
            ordre.forEach(function (el) {
                var d;
                if (el.type === 'fil') {
                    d = 'M' + el.points.map(function (pt) { return pt[0] + ' ' + pt[1]; }).join(' L');
                    var enleve = !!e.fils[el.id];
                    s += touche('fil:' + el.id, enleve ? 'Fil enlevé. Le remettre.' : 'Fil. L\'enlever.',
                        '<path d="' + d + '" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"' +
                        (enleve ? ' stroke-dasharray="2 7" opacity="0.4"' : '') + '/>', zoneTrait(d));
                }
                if (el.type === 'lampe') {
                    var etat = e.lampes[el.i], nom = n > 1 ? 'L' + (el.i + 1) : 'lampe';
                    if (e.ponts[el.i]) {   // le fil du court-circuit, par-dessus la lampe
                        d = 'M' + (el.cx - 24) + ' ' + el.cy + ' C' + (el.cx - 24) + ' ' + (el.cy - 34) + ' ' + (el.cx + 24) + ' ' + (el.cy - 34) + ' ' + (el.cx + 24) + ' ' + el.cy;
                        s += touche('pont:' + el.i, 'Fil aux bornes de ' + nom + '. L\'enlever.',
                            '<path d="' + d + '" fill="none" stroke-width="3" stroke-linecap="round" style="stroke:var(--rose)"/>' +
                            '<g style="fill:var(--rose)"><circle cx="' + (el.cx - 24) + '" cy="' + el.cy + '" r="3.5"/><circle cx="' + (el.cx + 24) + '" cy="' + el.cy + '" r="3.5"/></g>', zoneTrait(d));
                    }
                    s += touche('lampe:' + el.i,
                        nom + ' ' + MOT[r.eclat[el.i]].replace(/<[^>]+>/g, '') + '. ' + (etat === 'ok' ? 'La dévisser.' : (etat === 'grillee' ? 'La remplacer.' : 'La revisser.')),
                        lampe(el.cx, el.cy, r.eclat[el.i]), zoneRonde(el.cx, el.cy, 22));
                    s += texte(el.nomX, el.nomY, n > 1 ? nom : (e.options.choix ? 'lampe : ' + nombre(e.nominal) + ' V' : 'lampe'), { taille: n > 1 ? 15 : 13, gras: n > 1 || e.options.choix });
                }
                if (el.type === 'volt') {
                    s += TRAIT + '<circle cx="' + el.cx + '" cy="' + el.cy + '" r="14"/></g>' + texte(el.cx, el.cy + 5, 'V', { taille: 15, gras: true }) +
                        texte(el.cx, el.cy + 44, nombre(r.volt) + ' V', { taille: 17, gras: true, couleur: '--rose' });
                }
                if (el.type === 'pile') {
                    var pl = e.piles[el.j], dessinPile = pile(el.x, el.y, pl.ret) + texte(el.x, el.y + 36, nombre(pl.e) + ' V');
                    s += e.options.retourner
                        ? touche('pile:' + el.j, 'Pile ' + (el.j + 1) + ' de ' + nombre(pl.e) + ' volt. La retourner.', dessinPile, zoneRonde(el.x, el.y, 22))
                        : dessinPile;
                }
                if (el.type === 'inter') {
                    var ferme = el.cle === 'K' ? e.inter : e.interB[el.b_], x1 = el.p1[0], y1 = el.p1[1], x2 = el.p2[0], y2 = el.p2[1];
                    var bout = ferme ? [x2, y2] : (el.horizontal ? [x2 - 5, y2 - 20] : [x2 - 20, y2 + 6]);
                    s += touche('inter:' + el.cle, 'Interrupteur ' + el.nom + (ferme ? ' fermé. L\'ouvrir.' : ' ouvert. Le fermer.'),
                        TRAIT + '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + bout[0] + '" y2="' + bout[1] + '"/></g>' +
                        '<g fill="currentColor"><circle cx="' + x1 + '" cy="' + y1 + '" r="3.5"/><circle cx="' + x2 + '" cy="' + y2 + '" r="3.5"/></g>' +
                        (el.horizontal ? texte((x1 + x2) / 2, y1 + 20, el.nom, { taille: 15, gras: true }) : texte(x1 + 18, (y1 + y2) / 2 + 5, el.nom, { taille: 15, gras: true })),
                        zoneRonde((x1 + x2) / 2, (y1 + y2) / 2, 24));
                }
            });
            p.noeuds.forEach(function (pt) { s += '<circle cx="' + pt[0] + '" cy="' + pt[1] + '" r="3.5" fill="currentColor"/>'; });
            (p.etiquettes || []).forEach(function (t) { s += texte(t[0], t[1], t[2], { taille: 15, gras: true }); });
            if (r.sortParLaGauche !== null && !r.court) {
                var x0 = p.elements.filter(function (el) { return el.type === 'pile'; })[0].x;
                s += r.sortParLaGauche ? courant(Math.round((p.xGauche + x0) / 2) - 4, p.yPiles, true) : courant(Math.round((320 - p.xGauche + x0 + 130) / 2), p.yPiles, false);
            }
            if (p.formuleY && !e.voltmetre && (e.piles.length > 1 || e.options.nombre)) {
                s += texte(160, p.formuleY, formule(e), { taille: 15, gras: true, couleur: '--rose' });
            }
            return { vue: p.vue, svg: s, label: 'Schéma à manipuler. ' + this.texte(e).replace(/<[^>]+>/g, '') };
        },

        commandes: function (e, changer, depart) {
            var groupes = [];
            function choix(titre, valeurs, lire, ecrire) {
                groupes.push({
                    titre: titre, boutons: valeurs.map(function (v) {
                        return { cle: titre + v, texte: e.options.nombre && titre === 'Piles' ? String(v) : nombre(v) + ' V', actif: lire() === v, action: function () { ecrire(v); changer(); } };
                    })
                });
            }
            if (e.options.choix) {
                choix('Pile', [1.5, 4.5, 9, 12], function () { return e.piles[0].e; }, function (v) { e.piles[0].e = v; e.lampes[0] = 'ok'; });
                choix('Lampe', [3.5, 6], function () { return e.nominal; }, function (v) { e.nominal = v; e.lampes[0] = 'ok'; });
            }
            if (e.options.nombre) {
                choix('Piles', [1, 2, 3], function () { return e.piles.length; }, function (v) {
                    while (e.piles.length < v) { e.piles.push({ e: e.piles[0].e, ret: false }); }
                    e.piles.length = v; e.fils = {};
                });
            }
            if (e.options.pont) {
                groupes.push({
                    titre: 'Ajouter un fil sur', boutons: e.lampes.map(function (x, i) {
                        return { cle: 'pont' + i, texte: 'L' + (i + 1), actif: e.ponts[i], action: function () { e.ponts[i] = !e.ponts[i]; changer(); } };
                    })
                });
            }
            groupes.push({ boutons: [{ cle: 'depart', texte: '↺ Tout remettre', inactif: JSON.stringify(sansResultat(e)) === depart, action: function () { changer(JSON.parse(depart)); } }] });
            return groupes;
        },

        /** En surtension, la lampe brille très fort, puis elle grille. */
        ensuite: function (e, changer) {
            if (!e.options.grille) { return null; }
            var i = e.resultat.eclat.indexOf('forte');
            return i < 0 ? null : { delai: 1300, action: function () { e.lampes[i] = 'grillee'; changer(); } };
        },

        /** La pose d'Aya : wave au départ, cheer, point, think, ou alerte (court-circuit). */
        pose: function (e, auDepart) {
            var r = e.resultat;
            if (r.court) { return 'alerte'; }
            if (auDepart) { return 'wave'; }
            if (e.voltmetre) { return 'point'; }
            var allumees = r.eclat.filter(function (x) { return x === 'faible' || x === 'normale' || x === 'forte'; }).length;
            if (!allumees) { return 'think'; }
            return allumees === r.eclat.length && r.eclat.indexOf('faible') < 0 ? 'cheer' : 'point';
        },

        aide: function (e) {
            var gestes = ['un fil pour l\'enlever'];
            if (e.lampes.length) { gestes.push('une lampe pour la dévisser'); }
            if (e.inter !== null || e.interB) { gestes.push('l\'interrupteur'); }
            if (e.options.retourner) { gestes.push('une pile pour la retourner'); }
            return '👆 Touche ' + gestes.join(', ') + '.';
        },

        /** Le « Pourquoi ? » d'Aya : la cause de ce qu'on observe, en une ou deux phrases. */
        pourquoi: function (e, r) {
            var n = e.lampes.length, somme = 0, concordance = true, i;
            e.piles.forEach(function (pl) { somme += pl.ret ? -pl.e : pl.e; if (pl.ret !== e.piles[0].ret) { concordance = false; } });
            var uPiles = formule(e), manque = Object.keys(e.fils).length > 0;
            if (r.court) {
                return 'Un fil n\'a presque pas de résistance. Tout le courant passe par lui, sans lampe pour le freiner : il devient très fort. La pile et les fils chauffent.';
            }
            if (e.voltmetre) {
                if (manque) { return 'Il manque un fil : le voltmètre n\'est plus relié aux deux bornes de l\'association.'; }
                if (e.piles.length === 1) { return 'Le voltmètre mesure la tension aux bornes de la pile.'; }
                return concordance
                    ? 'Les piles sont en concordance (+ contre −) : leurs tensions s\'ajoutent. ' + uPiles + '.'
                    : 'Une pile est retournée (opposition) : sa tension se retranche. ' + uPiles + '.';
            }
            var allumees = r.eclat.filter(function (x) { return x === 'faible' || x === 'normale' || x === 'forte'; }).length;
            var rapport = Math.abs(somme) / e.nominal;
            if (!allumees) {
                if (n === 1 && e.lampes[0] === 'grillee' && e.options.grille && rapport > 1.3) {
                    return 'La lampe a reçu ' + nombre(Math.abs(somme)) + ' V au lieu de ' + nombre(e.nominal) + ' V. Cette surtension a fait fondre son filament : le circuit est coupé.';
                }
                if (!somme && e.piles.length > 1 && !manque) { return 'Les piles sont en opposition et de même tension : elles poussent l\'une contre l\'autre. ' + uPiles + '.'; }
                var causes = [];
                if (e.inter === false) { causes.push('l\'interrupteur K est ouvert'); }
                if (e.interB && e.interB.indexOf(true) < 0) { causes.push('les interrupteurs sont ouverts'); }
                if (manque) { causes.push('il manque un fil'); }
                if (e.lampes.indexOf('devissee') >= 0) { causes.push('une lampe est dévissée'); }
                if (e.lampes.indexOf('grillee') >= 0) { causes.push('une lampe est grillée'); }
                var cause = causes.length ? causes.join(' et ') : 'la boucle est coupée';
                return cause.charAt(0).toUpperCase() + cause.slice(1) + ' : la boucle n\'est plus fermée. Le courant a besoin d\'un chemin complet, de la borne + à la borne −.' +
                    (n > 1 && !e.derivation ? ' En série, il n\'y a qu\'un seul chemin : tout s\'éteint.' : '');
            }
            if (n > 1 && !e.derivation) {
                i = e.ponts.indexOf(true);
                if (i >= 0) {
                    return 'Le courant passe par le fil plutôt que par L' + (i + 1) + ' : L' + (i + 1) + ' est court-circuitée. L\'autre lampe reçoit alors toute la tension de la pile : son éclat augmente.';
                }
                return 'En série, il n\'y a qu\'une seule boucle. Les lampes se partagent la tension de la pile : chacune en reçoit une partie, donc elle brille moins qu\'une lampe seule.';
            }
            if (n > 1) {
                if (allumees < n) {
                    return 'Chaque lampe a sa propre branche. Le courant ne passe plus dans une branche, mais il passe toujours dans ' + (allumees > 1 ? 'les autres' : 'l\'autre') + ' : c\'est l\'intérêt de la dérivation.';
                }
                return 'Chaque lampe a sa propre branche, entre les nœuds A et B. Elle reçoit toute la tension de la pile, comme si elle était seule.';
            }
            if (e.piles.length > 1 || e.options.nombre) {
                if (e.piles.length === 1) { return 'Une seule pile : la lampe reçoit ' + nombre(Math.abs(somme)) + ' V. Ajoute une pile pour voir.'; }
                return concordance
                    ? 'Les piles sont en concordance (+ contre −) : elles poussent dans le même sens, leurs tensions s\'ajoutent. ' + uPiles + '.'
                    : 'Une pile est retournée (opposition) : elle pousse dans l\'autre sens, sa tension se retranche. ' + uPiles + '.';
            }
            if (e.inter !== null && !e.options.grille && !e.options.choix) {
                return 'L\'interrupteur K est fermé : la boucle est complète. Le courant circule de la borne + vers la borne −, à l\'extérieur de la pile.';
            }
            var comparaison = 'pile : ' + nombre(Math.abs(somme)) + ' V, lampe : ' + nombre(e.nominal) + ' V';
            if (rapport < 0.8) { return 'La pile donne moins que la tension d\'usage de la lampe (' + comparaison + ') : c\'est une <strong>sous-tension</strong>.'; }
            if (rapport <= 1.3) { return 'La tension de la pile est voisine de la tension d\'usage de la lampe (' + comparaison + ') : la lampe est <strong>adaptée</strong>.'; }
            return 'La pile donne beaucoup plus que la tension d\'usage de la lampe (' + comparaison + ') : c\'est une <strong>surtension</strong>.' + (e.options.grille ? ' La lampe va griller.' : '');
        },

        texte: function (e) {
            var r = e.resultat || calculer(e, plan(e));
            return this.observation(e, r) + '<span class="si-pourquoi"><strong>Pourquoi ?</strong> ' + SCHEMAS.montage.pourquoi(e, r) + '</span>';
        },

        observation: function (e, r) {
            var n = e.lampes.length;
            if (r.court) {
                return '⚠️ <strong>Court-circuit</strong> : le courant passe par le fil, sans traverser de lampe. La pile chauffe : danger !' +
                    (n ? (n > 1 ? ' Les lampes sont éteintes.' : ' La lampe est éteinte.') : '');
            }
            if (e.voltmetre) { return 'Le voltmètre affiche <strong>' + nombre(r.volt) + ' V</strong>.'; }
            var lampes = r.eclat.map(function (etat, i) { return (n > 1 ? 'L' + (i + 1) : 'La lampe') + ' ' + MOT[etat] + '.'; }).join(' ');
            var passe = r.eclat.some(function (etat) { return etat === 'faible' || etat === 'normale' || etat === 'forte'; });
            if (r.eclat.indexOf('grillee') >= 0) { lampes += ' Touche la lampe grillée pour la remplacer.'; }
            if (passe) { return 'Le courant passe. ' + lampes; }
            var somme = 0;
            e.piles.forEach(function (pl) { somme += pl.ret ? -pl.e : pl.e; });
            if (!somme && e.piles.length > 1) { return 'Les piles s\'annulent : le courant ne passe pas. ' + lampes; }
            return 'Le circuit est <strong>ouvert</strong> : le courant ne passe pas. ' + lampes;
        },

        agir: function (e, action) {
            var quoi = action.split(':')[0], qui = action.split(':')[1];
            if (quoi === 'fil') { e.fils[qui] = !e.fils[qui]; if (!e.fils[qui]) { delete e.fils[qui]; } }
            if (quoi === 'lampe') { e.lampes[qui] = e.lampes[qui] === 'ok' ? 'devissee' : 'ok'; }
            if (quoi === 'pont') { e.ponts[qui] = false; }
            if (quoi === 'pile') { e.piles[qui].ret = !e.piles[qui].ret; }
            if (quoi === 'inter') { if (qui === 'K') { e.inter = !e.inter; } else { e.interB[Number(qui.slice(1))] = !e.interB[Number(qui.slice(1))]; } }
        }
    };

    function sansResultat(e) { var c = {}; Object.keys(e).forEach(function (k) { if (k !== 'resultat') { c[k] = e[k]; } }); return c; }

    /* Les raccourcis : un montage tout prêt. */
    function raccourci(attributs) {
        return {
            depart: function (d) {
                var a = attributs(d), copie = {};
                Object.keys(a).forEach(function (k) { copie[k] = a[k]; });
                return etatMontage(copie);
            },
            dessin: function (e) { return SCHEMAS.montage.dessin(e); },
            commandes: SCHEMAS.montage.commandes, ensuite: SCHEMAS.montage.ensuite, aide: SCHEMAS.montage.aide, pose: SCHEMAS.montage.pose,
            texte: SCHEMAS.montage.texte, observation: SCHEMAS.montage.observation, agir: SCHEMAS.montage.agir
        };
    }
    SCHEMAS.circuit = raccourci(function () { return { piles: '4.5', inter: 'ouvert' }; });
    SCHEMAS.tension = raccourci(function () { return { piles: '4.5', nominal: '3.5', options: 'choix grille' }; });
    SCHEMAS.lampes = raccourci(function (d) { return { piles: '4.5', lampes: '2', montage: d.montage, nominal: d.montage === 'derivation' ? '3.8' : '3.3' }; });
    SCHEMAS.piles = raccourci(function (d) { return { piles: '1.5,1.5', nominal: '3', options: 'nombre' + (d.retourner === 'non' ? '' : ' retourner') }; });

    /* --- Du sucre ou du sable dans l'eau --- */
    var GRAINS = [[128, 168], [141, 171], [154, 167], [167, 171], [180, 168], [193, 171], [135, 162], [150, 161], [163, 163], [176, 161], [188, 163], [158, 156]];

    SCHEMAS.melange = {
        depart: function () { return { produit: 'sucre', etape: 0 }; },   // 0 : eau seule, 1 : versé, 2 : agité
        dessin: function (e) {
            var sable = e.produit === 'sable';
            var s = '<path d="M112 70 L112 176 Q112 182 118 182 L202 182 Q208 182 208 176 L208 70 Z" stroke="none" style="fill:var(--boite-exemple)"/>';
            s += TRAIT + '<path d="M106 40 L112 46 L112 176 Q112 182 118 182 L202 182 Q208 182 208 176 L208 46 L214 40"/>' +
                '<path d="M112 70 L208 70" stroke-width="1.5"/></g>';
            // Le sucre agité ne se voit plus ; le sable reste au fond.
            var grains = (e.etape === 1 || (e.etape === 2 && sable)) ? GRAINS : [];
            var style = sable ? 'fill:var(--boite-important-texte)' : 'fill:var(--surface);stroke:currentColor;stroke-width:1.2';
            grains.forEach(function (g) {
                s += sable
                    ? '<circle cx="' + g[0] + '" cy="' + (g[1] + 6) + '" r="3.2" style="' + style + '"/>'
                    : '<rect x="' + (g[0] - 3.5) + '" y="' + (g[1] + 2.5) + '" width="7" height="7" rx="1" style="' + style + '"/>';
            });
            if (e.etape === 2) {   // la cuillère qui a agité
                s += '<g fill="none" stroke-linecap="round" style="stroke:var(--rose)"><path d="M228 22 L172 132" stroke-width="3"/><ellipse cx="169" cy="138" rx="5" ry="8" transform="rotate(27 169 138)" stroke-width="2.5"/></g>';
            }
            s += texte(160, 204, 'eau' + (e.etape ? ' + ' + e.produit : ''), { gras: true });
            var vu = ['Un verre d\'eau.', 'Le ' + e.produit + ' est au fond du verre.',
                sable ? 'Après agitation, le sable est encore au fond.' : 'Après agitation, on ne voit plus le sucre.'][e.etape];
            return { vue: '0 0 320 214', svg: s, label: 'Un verre d\'eau. ' + (e.etape ? vu : '') };
        },
        commandes: function (e, changer) {
            return [
                {
                    titre: 'Je verse', boutons: ['sucre', 'sable'].map(function (p) {
                        return { cle: p, texte: 'du ' + p, actif: e.etape > 0 && e.produit === p, action: function () { e.produit = p; e.etape = 1; changer(); } };
                    })
                },
                {
                    boutons: [
                        { cle: 'agiter', texte: 'Agiter', inactif: e.etape !== 1, action: function () { e.etape = 2; changer(); } },
                        { cle: 'vider', texte: 'Recommencer', inactif: e.etape === 0, action: function () { e.etape = 0; changer(); } }
                    ]
                }
            ];
        },
        pose: function (e) { return e.etape === 0 ? 'wave' : (e.etape === 1 ? 'point' : (e.produit === 'sucre' ? 'cheer' : 'think')); },
        texte: function (e) {
            if (e.etape === 0) { return 'Un verre d\'eau. Verse du sucre ou du sable.'; }
            if (e.etape === 1) { return 'Le ' + e.produit + ' tombe au fond. Maintenant, <strong>agite</strong>.'; }
            return e.produit === 'sucre'
                ? 'On ne voit plus le sucre : il s\'est <strong>dissous</strong>. C\'est un mélange <strong>homogène</strong>.' +
                    '<span class="si-pourquoi"><strong>Pourquoi ?</strong> Le sucre est soluble dans l\'eau. Ses grains se séparent en morceaux trop petits pour être vus. Il n\'a pas disparu : l\'eau est sucrée.</span>'
                : 'On voit encore le sable : il ne se dissout pas. C\'est un mélange <strong>hétérogène</strong>.' +
                    '<span class="si-pourquoi"><strong>Pourquoi ?</strong> Le sable n\'est pas soluble dans l\'eau. Ses grains restent entiers et retombent au fond : on distingue deux constituants.</span>';
        }
    };

    /* ============================================================
       Mathématiques : la même logique. Karniella bouge un curseur,
       la figure suit, Aya explique.
       ============================================================ */

    /** Un point à la distance r du centre, dans la direction a (en degrés, sens des maths). */
    function pt(cx, cy, r, a) {
        var t = a * Math.PI / 180;
        return [Math.round((cx + r * Math.cos(t)) * 10) / 10, Math.round((cy - r * Math.sin(t)) * 10) / 10];
    }
    function demiDroite(cx, cy, r, a, couleur) {
        var p = pt(cx, cy, r, a);
        return '<line x1="' + cx + '" y1="' + cy + '" x2="' + p[0] + '" y2="' + p[1] + '" stroke-width="' + (couleur ? 4 : 2.5) + '" stroke-linecap="round" ' +
            (couleur ? 'style="stroke:var(' + couleur + ')"' : 'stroke="currentColor"') + '/>';
    }
    /** Le secteur d'un angle, de la direction a1 à la direction a2 (a2 > a1), avec son arc. */
    function secteur(cx, cy, r, a1, a2, couleur) {
        var p1 = pt(cx, cy, r, a1), p2 = pt(cx, cy, r, a2), grand = a2 - a1 > 180 ? 1 : 0;
        var arc = 'M' + p1[0] + ' ' + p1[1] + ' A' + r + ' ' + r + ' 0 ' + grand + ' 0 ' + p2[0] + ' ' + p2[1];
        return '<path d="M' + cx + ' ' + cy + ' L' + arc.slice(1) + ' Z" stroke="none" style="fill:var(' + couleur + ');fill-opacity:.18"/>' +
            '<path d="' + arc + '" fill="none" stroke-width="2.5" style="stroke:var(' + couleur + ')"/>';
    }
    function mesure(cx, cy, r, a, valeur, couleur) {
        var p = pt(cx, cy, r, a);
        return texte(p[0], p[1] + 5, valeur + '°', { taille: 14, gras: true, couleur: couleur });
    }
    function lettre(x, y, nom) { return texte(x, y, nom, { taille: 16, gras: true }); }
    function curseur(cle, titre, e, champ, min, max, pas, unite, changer, apres) {
        return {
            curseur: {
                cle: cle, min: min, max: max, pas: pas, valeur: e[champ],
                libelle: titre + ' : ' + nombre(e[champ]).replace('-', '−') + (unite || ''),
                action: function (v) { e[champ] = v; if (apres) { apres(); } changer(true); }
            }
        };
    }
    var ROSE = '--rose', ORANGE = '--orange-encre', MATIERE = '--l5-rose';

    /* --- Les angles : data-figure="complementaires", "supplementaires", "opposes", "triangle", "adjacents" --- */
    SCHEMAS.angles = {
        depart: function (d) {
            var f = d.figure || 'complementaires';
            return { figure: f, a: { complementaires: 35, supplementaires: 120, opposes: 50, triangle: 60, adjacents: 40 }[f], b: f === 'triangle' ? 40 : 30 };
        },
        dessin: function (e) {
            var s = '', O, a = e.a, b = e.b;
            if (e.figure === 'complementaires') {
                O = [70, 170];
                s += secteur(O[0], O[1], 46, 0, a, ROSE) + secteur(O[0], O[1], 62, a, 90, ORANGE);
                s += demiDroite(O[0], O[1], 222, 0) + demiDroite(O[0], O[1], 150, 90) + demiDroite(O[0], O[1], Math.min(210, 150 / Math.sin(a * Math.PI / 180)), a, MATIERE);
                s += '<path d="M70 152 L88 152 L88 170" fill="none" stroke="currentColor" stroke-width="2"/>';
                s += mesure(O[0], O[1], 66, a / 2, a, ROSE) + mesure(O[0], O[1], 84, (a + 90) / 2, 90 - a, ORANGE);
                s += lettre(302, 176, 'x') + lettre(56, 30, 'z') + lettre(56, 190, 'O');
                var y = pt(O[0], O[1], Math.min(222, 162 / Math.sin(a * Math.PI / 180)), a);
                s += lettre(Math.min(304, y[0] + 8), Math.max(16, y[1] - 4), 'y');
                return { vue: '0 0 320 200', svg: s, label: 'Angle droit xOz partagé par la demi-droite [Oy). ' + this.phrase(e) };
            }
            if (e.figure === 'supplementaires') {
                O = [160, 150];
                s += secteur(O[0], O[1], 52, 180 - a, 180, ROSE) + secteur(O[0], O[1], 40, 0, 180 - a, ORANGE);
                s += '<line x1="20" y1="150" x2="300" y2="150" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>' + demiDroite(O[0], O[1], 118, 180 - a, MATIERE);
                s += mesure(O[0], O[1], 74, 180 - a / 2, a, ROSE) + mesure(O[0], O[1], 62, (180 - a) / 2, 180 - a, ORANGE);
                var B = pt(O[0], O[1], 134, 180 - a);
                s += lettre(22, 172, 'A') + lettre(160, 174, 'O') + lettre(298, 172, 'C') + lettre(B[0], B[1] + 4, 'B');
                return { vue: '0 0 320 186', svg: s, label: 'Les points A, O et C sont alignés. La demi-droite [OB) forme deux angles. ' + this.phrase(e) };
            }
            if (e.figure === 'opposes') {
                O = [160, 105];
                var d1 = 15, d2 = 15 + a;
                s += secteur(O[0], O[1], 36, d1, d2, ROSE) + secteur(O[0], O[1], 36, d1 + 180, d2 + 180, ROSE);
                s += secteur(O[0], O[1], 24, d2, d1 + 180, ORANGE) + secteur(O[0], O[1], 24, d2 + 180, d1 + 360, ORANGE);
                s += demiDroite(O[0], O[1], 135, d1) + demiDroite(O[0], O[1], 135, d1 + 180) + demiDroite(O[0], O[1], 96, d2, MATIERE) + demiDroite(O[0], O[1], 96, d2 + 180, MATIERE);
                s += mesure(O[0], O[1], 56, (d1 + d2) / 2, a, ROSE) + mesure(O[0], O[1], 56, (d1 + d2) / 2 + 180, a, ROSE);
                s += mesure(O[0], O[1], 46, (d2 + d1 + 180) / 2, 180 - a, ORANGE) + mesure(O[0], O[1], 46, (d2 + d1 + 180) / 2 + 180, 180 - a, ORANGE);
                var x = pt(O[0], O[1], 148, d1), x2 = pt(O[0], O[1], 148, d1 + 180), yy = pt(O[0], O[1], 110, d2), y2 = pt(O[0], O[1], 110, d2 + 180);
                s += lettre(x[0], x[1] + 5, 'x') + lettre(x2[0], x2[1] + 5, 'x\'') + lettre(yy[0], yy[1] + 5, 'y') + lettre(y2[0], y2[1] + 5, 'y\'');
                return { vue: '0 0 320 210', svg: s, label: 'Les droites (xx\') et (yy\') se coupent en O. ' + this.phrase(e) };
            }
            if (e.figure === 'triangle') {
                var c = 180 - a - b, ra = a * Math.PI / 180, rb = b * Math.PI / 180;
                var base = 240, h = base * Math.sin(ra) * Math.sin(rb) / Math.sin(ra + rb), f = h > 140 ? 140 / h : 1;
                var A = [Math.round(160 - 120 * f), 172], Bp = [Math.round(160 + 120 * f), 172];
                var AC = (Bp[0] - A[0]) * Math.sin(rb) / Math.sin(ra + rb), C = pt(A[0], A[1], AC, a);
                s += secteur(A[0], A[1], 26, 0, a, ROSE) + secteur(Bp[0], Bp[1], 26, 180 - b, 180, ORANGE) + secteur(C[0], C[1], 22, 180 + a, 360 - b, MATIERE);
                s += '<path d="M' + A[0] + ' ' + A[1] + ' L' + Bp[0] + ' ' + Bp[1] + ' L' + C[0] + ' ' + C[1] + ' Z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>';
                s += mesure(A[0], A[1], 44, a / 2, a, ROSE) + mesure(Bp[0], Bp[1], 46, 180 - b / 2, b, ORANGE) + mesure(C[0], C[1], 40, (180 + a + 360 - b) / 2, c, MATIERE);
                s += lettre(A[0] - 12, 190, 'A') + lettre(Bp[0] + 12, 190, 'B') + lettre(C[0], C[1] - 8, 'C');
                return { vue: '0 0 320 200', svg: s, label: 'Triangle ABC. ' + this.phrase(e) };
            }
            // adjacents : AÔB et BÔC, de part et d'autre de [OB)
            O = [150, 185];
            s += secteur(O[0], O[1], 44, 12, 12 + b, ORANGE) + secteur(O[0], O[1], 38, 12 + b, 12 + b + a, ROSE);
            s += demiDroite(O[0], O[1], 150, 12) + demiDroite(O[0], O[1], 140, 12 + b + a) + demiDroite(O[0], O[1], 150, 12 + b, MATIERE);
            s += mesure(O[0], O[1], 66, 12 + b / 2, b, ORANGE) + mesure(O[0], O[1], 60, 12 + b + a / 2, a, ROSE);
            var pa = pt(O[0], O[1], 154, 12 + b + a), pb = pt(O[0], O[1], 164, 12 + b), pc = pt(O[0], O[1], 164, 12);
            s += lettre(pa[0], pa[1] + 4, 'A') + lettre(pb[0], pb[1] + 4, 'B') + lettre(pc[0], pc[1] + 4, 'C') + lettre(150, 206, 'O');
            return { vue: '0 0 320 214', svg: s, label: 'Les angles AOB et BOC, de part et d\'autre du côté commun [OB). ' + this.phrase(e) };
        },
        commandes: function (e, changer) {
            if (e.figure === 'complementaires') { return [curseur('a', 'Angle xÔy', e, 'a', 5, 85, 5, '°', changer)]; }
            if (e.figure === 'supplementaires') { return [curseur('a', 'Angle AÔB', e, 'a', 10, 170, 5, '°', changer)]; }
            if (e.figure === 'opposes') { return [curseur('a', 'Angle xÔy', e, 'a', 20, 160, 5, '°', changer)]; }
            if (e.figure === 'triangle') {
                return [
                    curseur('a', 'Angle Â', e, 'a', 20, 120, 5, '°', changer, function () { e.b = Math.min(e.b, 160 - e.a); }),
                    curseur('b', 'Angle B̂', e, 'b', 20, 120, 5, '°', changer, function () { e.a = Math.min(e.a, 160 - e.b); })
                ];
            }
            return [curseur('a', 'Angle AÔB', e, 'a', 10, 80, 5, '°', changer), curseur('b', 'Angle BÔC', e, 'b', 10, 80, 5, '°', changer)];
        },
        pose: function (e, auDepart) {
            if (auDepart) { return 'wave'; }
            if (e.figure === 'triangle' && (e.a === 60 && e.b === 60 || e.a === 90 || e.b === 90)) { return 'cheer'; }
            if ((e.figure === 'complementaires' && e.a === 45) || (e.figure !== 'complementaires' && e.figure !== 'triangle' && e.figure !== 'adjacents' && e.a === 90)) { return 'cheer'; }
            return 'point';
        },
        aide: function () { return '👆 Fais glisser le curseur.'; },
        phrase: function (e) { return this.texte(e).replace(/<[^>]+>/g, ''); },
        texte: function (e) {
            var a = e.a, b = e.b;
            if (e.figure === 'complementaires') {
                return '<strong>' + a + '° + ' + (90 - a) + '° = 90°</strong> : xÔy et yÔz sont <strong>complémentaires</strong>.' +
                    '<span class="si-pourquoi"><strong>Pourquoi ?</strong> Les deux angles remplissent ensemble l\'angle droit xÔz. Quand l\'un grandit, l\'autre diminue d\'autant.' +
                    (a === 45 ? ' Ici, ils sont égaux : 45° chacun.' : '') + '</span>';
            }
            if (e.figure === 'supplementaires') {
                return '<strong>' + a + '° + ' + (180 - a) + '° = 180°</strong> : AÔB et BÔC sont <strong>supplémentaires</strong>.' +
                    '<span class="si-pourquoi"><strong>Pourquoi ?</strong> A, O et C sont alignés : les deux angles forment ensemble un angle plat, 180°.' +
                    (a === 90 ? ' Ici, ce sont deux angles droits.' : '') + '</span>';
            }
            if (e.figure === 'opposes') {
                return 'xÔy = x\'Ôy\' = <strong>' + a + '°</strong>. Les deux autres angles mesurent <strong>' + (180 - a) + '°</strong>.' +
                    '<span class="si-pourquoi"><strong>Pourquoi ?</strong> Deux angles opposés par le sommet ont la même mesure. Et xÔy et yÔx\' sont supplémentaires : ' + a + '° + ' + (180 - a) + '° = 180°.</span>';
            }
            if (e.figure === 'triangle') {
                var c = 180 - a - b;
                return '<strong>' + a + '° + ' + b + '° + ' + c + '° = 180°</strong>.' +
                    '<span class="si-pourquoi"><strong>Pourquoi ?</strong> Dans un triangle, la somme des trois angles est toujours 180°. Donc Ĉ = 180° − (' + a + '° + ' + b + '°) = ' + c + '°.' +
                    (a === 60 && b === 60 ? ' Trois angles de 60° : le triangle est équilatéral.' : (a === 90 || b === 90 || c === 90 ? ' Un angle de 90° : le triangle est rectangle.' : '')) + '</span>';
            }
            return 'mes AÔC = ' + a + '° + ' + b + '° = <strong>' + (a + b) + '°</strong>.' +
                '<span class="si-pourquoi"><strong>Pourquoi ?</strong> AÔB et BÔC sont adjacents : même sommet O, côté commun [OB), un angle de chaque côté. Leurs mesures s\'ajoutent.</span>';
        }
    };

    /* --- Les segments : data-figure="milieu" ou "mediatrice" --- */
    SCHEMAS.segment = {
        depart: function (d) { return d.figure === 'mediatrice' ? { figure: 'mediatrice', h: 2 } : { figure: 'milieu', am: 3 }; },
        dessin: function (e) {
            var s = '';
            if (e.figure === 'milieu') {
                var x = 40 + 24 * e.am, milieu = e.am === 5;
                s += '<line x1="40" y1="110" x2="' + x + '" y2="110" stroke-width="4" stroke-linecap="round" style="stroke:var(' + ROSE + ')"/>' +
                    '<line x1="' + x + '" y1="110" x2="280" y2="110" stroke-width="4" stroke-linecap="round" style="stroke:var(' + ORANGE + ')"/>';
                s += TRAIT + '<path d="M40 102 L40 118 M280 102 L280 118 M' + x + ' 100 L' + x + ' 120"/>';
                if (milieu) { s += '<path d="M97 104 L103 116 M217 104 L223 116" stroke-width="2"/>'; }
                s += '</g>' + lettre(40, 142, 'A') + lettre(280, 142, 'B') + lettre(x, 92, 'M');
                if (e.am > 0.5) { s += texte((40 + x) / 2, 76, nombre(e.am) + ' cm', { taille: 14, gras: true, couleur: ROSE }); }
                if (e.am < 9.5) { s += texte((x + 280) / 2, 76, nombre(10 - e.am) + ' cm', { taille: 14, gras: true, couleur: ORANGE }); }
                s += texte(160, 172, 'AB = 10 cm', { taille: 14, gras: true });
                return { vue: '0 0 320 186', svg: s, label: 'Le point M sur le segment [AB]. ' + this.phrase(e) };
            }
            var P = [160, 150 - 30 * e.h], d = Math.sqrt(9 + e.h * e.h);
            s += '<line x1="160" y1="12" x2="160" y2="188" stroke-width="3" stroke-linecap="round" style="stroke:var(' + MATIERE + ')"/>';
            s += TRAIT + '<path d="M70 150 L250 150 M112 144 L118 156 M202 144 L208 156"/><path d="M160 138 L172 138 L172 150" stroke-width="2"/></g>';
            if (e.h > 0) {
                s += '<path d="M70 150 L' + P[0] + ' ' + P[1] + ' L250 150" fill="none" stroke-width="2.5" stroke-dasharray="5 5" style="stroke:var(' + ROSE + ')"/>';
                s += texte((70 + P[0]) / 2 - 16, (150 + P[1]) / 2 - 4, nombre(d) + ' cm', { taille: 13, gras: true, couleur: ROSE }) +
                    texte((250 + P[0]) / 2 + 16, (150 + P[1]) / 2 - 4, nombre(d) + ' cm', { taille: 13, gras: true, couleur: ROSE });
            }
            s += '<circle cx="' + P[0] + '" cy="' + P[1] + '" r="5" style="fill:var(' + ROSE + ')"/>';
            s += lettre(60, 170, 'A') + lettre(260, 170, 'B') + lettre(148, 168, 'I') + lettre(174, P[1] + (e.h ? -6 : -10), 'P') + texte(176, 24, '(Δ)', { taille: 14, gras: true, couleur: MATIERE });
            return { vue: '0 0 320 196', svg: s, label: 'La médiatrice (Δ) du segment [AB] et un point P sur elle. ' + this.phrase(e) };
        },
        commandes: function (e, changer) {
            return e.figure === 'milieu'
                ? [curseur('am', 'AM', e, 'am', 0, 10, 0.5, ' cm', changer)]
                : [curseur('h', 'Distance de P à I', e, 'h', 0, 4, 0.5, ' cm', changer)];
        },
        pose: function (e, auDepart) { return auDepart ? 'wave' : (e.figure === 'milieu' && e.am === 5 ? 'cheer' : 'point'); },
        aide: function () { return '👆 Fais glisser le curseur.'; },
        phrase: function (e) { return this.texte(e).replace(/<[^>]+>/g, ''); },
        texte: function (e) {
            if (e.figure === 'milieu') {
                var mb = 10 - e.am;
                return 'AM + MB = ' + nombre(e.am) + ' + ' + nombre(mb) + ' = <strong>10 cm = AB</strong>.' +
                    '<span class="si-pourquoi"><strong>Pourquoi ?</strong> M appartient au segment [AB] : les deux morceaux mis bout à bout redonnent tout le segment. ' +
                    (e.am === 5 ? 'Ici AM = MB = 5 cm : M est le <strong>milieu</strong> de [AB].' : 'Ici AM ≠ MB : M n\'est pas le milieu.') + '</span>';
            }
            var d = nombre(Math.sqrt(9 + e.h * e.h));
            return 'PA = PB = <strong>' + d + ' cm</strong>.' +
                '<span class="si-pourquoi"><strong>Pourquoi ?</strong> (Δ) est la médiatrice de [AB] : elle est perpendiculaire à [AB] et passe par son milieu I. Tout point de la médiatrice est à la même distance de A et de B.' +
                (e.h === 0 ? ' Ici, P est au milieu I : PA = PB = 3 cm.' : '') + '</span>';
        }
    };

    /* --- La droite graduée : un nombre relatif, son opposé, sa distance à zéro --- */
    SCHEMAS.droite = {
        depart: function () { return { v: -4 }; },
        dessin: function (e) {
            var s = TRAIT + '<path d="M12 110 L308 110 M300 104 L308 110 L300 116"/>', i, x = function (v) { return 160 + 14 * v; };
            for (i = -10; i <= 10; i++) { s += '<line x1="' + x(i) + '" y1="' + (i % 5 ? 105 : 101) + '" x2="' + x(i) + '" y2="' + (i % 5 ? 115 : 119) + '"/>'; }
            s += '</g>';
            [-10, -5, 0, 5, 10].forEach(function (g) { s += texte(x(g), 138, (g > 0 ? '+' : (g < 0 ? '−' : '')) + Math.abs(g), { taille: 13, gras: g === 0 }); });
            if (e.v !== 0) {
                s += '<line x1="160" y1="78" x2="' + x(e.v) + '" y2="78" stroke-width="3" stroke-linecap="round" style="stroke:var(' + ROSE + ')"/>' +
                    texte((160 + x(e.v)) / 2, 68, 'distance : ' + nombre(Math.abs(e.v)), { taille: 13, gras: true, couleur: ROSE });
                s += '<circle cx="' + x(-e.v) + '" cy="110" r="6" style="fill:var(' + ORANGE + ')"/>' + texte(x(-e.v), 164, 'opposé', { taille: 12, couleur: ORANGE }) +
                    texte(x(-e.v), 180, (e.v < 0 ? '+' : '−') + nombre(Math.abs(e.v)), { taille: 14, gras: true, couleur: ORANGE });
            }
            s += '<circle cx="' + x(e.v) + '" cy="110" r="7" style="fill:var(' + ROSE + ')"/>' +
                texte(x(e.v), e.v === 0 ? 90 : 164, e.v === 0 ? '0' : 'nombre', { taille: 12, couleur: ROSE, gras: e.v === 0 }) +
                (e.v === 0 ? '' : texte(x(e.v), 180, (e.v > 0 ? '+' : '−') + nombre(Math.abs(e.v)), { taille: 14, gras: true, couleur: ROSE }));
            return { vue: '0 0 320 190', svg: s, label: 'Droite graduée de moins 10 à plus 10. ' + this.phrase(e) };
        },
        commandes: function (e, changer) { return [curseur('v', 'Nombre', e, 'v', -10, 10, 0.5, '', changer)]; },
        pose: function (e, auDepart) { return auDepart ? 'wave' : (e.v === 0 ? 'think' : 'point'); },
        aide: function () { return '👆 Fais glisser le curseur.'; },
        phrase: function (e) { return this.texte(e).replace(/<[^>]+>/g, ''); },
        texte: function (e) {
            var n = nombre(Math.abs(e.v));
            if (e.v === 0) {
                return '<strong>0</strong> est à la fois positif et négatif.<span class="si-pourquoi"><strong>Pourquoi ?</strong> 0 est la frontière : les négatifs sont à sa gauche, les positifs à sa droite. Son opposé, c\'est lui-même.</span>';
            }
            var signe = e.v > 0 ? '+' : '−', autre = e.v > 0 ? '−' : '+';
            return '<strong>' + signe + n + '</strong> est ' + (e.v > 0 ? 'positif : à droite du 0.' : 'négatif : à gauche du 0.') + ' Distance à zéro : <strong>' + n + '</strong>. Opposé : <strong>' + autre + n + '</strong>.' +
                '<span class="si-pourquoi"><strong>Pourquoi ?</strong> Le signe dit de quel côté du 0 on est. La distance à zéro, c\'est le nombre sans son signe. Deux nombres opposés sont à la même distance du 0, un de chaque côté.</span>';
        }
    };

    /* --- Une puissance : aⁿ, c'est n facteurs égaux à a --- */
    var EXPOSANTS = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶'];
    SCHEMAS.puissance = {
        depart: function () { return { a: 2, n: 3 }; },
        valeur: function (e) { return Math.pow(e.a, e.n); },
        dessin: function (e) {
            var facteurs = [], i;
            for (i = 0; i < e.n; i++) { facteurs.push(e.a); }
            var s = texte(160, 58, e.a + EXPOSANTS[e.n], { taille: 44, gras: true, couleur: MATIERE });
            s += texte(160, 104, '= ' + facteurs.join(' × '), { taille: 22, gras: true });
            s += texte(160, 146, '= ' + String(this.valeur(e)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '), { taille: 26, gras: true, couleur: ROSE });
            return { vue: '0 0 320 166', svg: s, label: this.phrase(e) };
        },
        commandes: function (e, changer) {
            function choix(titre, champ, valeurs) {
                return { titre: titre, boutons: valeurs.map(function (v) { return { cle: champ + v, texte: String(v), actif: e[champ] === v, action: function () { e[champ] = v; changer(); } }; }) };
            }
            return [choix('Nombre a', 'a', [2, 3, 4, 5, 10]), choix('Exposant n', 'n', [1, 2, 3, 4, 5])];
        },
        pose: function (e, auDepart) { return auDepart ? 'wave' : (e.n === 1 ? 'think' : 'point'); },
        phrase: function (e) { return this.texte(e).replace(/<[^>]+>/g, ''); },
        texte: function (e) {
            var facteurs = [], i, valeur = String(this.valeur(e)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
            for (i = 0; i < e.n; i++) { facteurs.push(e.a); }
            return e.a + EXPOSANTS[e.n] + ' se lit « ' + e.a + ' exposant ' + e.n + ' » : ' + (e.n > 1 ? facteurs.join(' × ') + ' = ' : '') + '<strong>' + valeur + '</strong>.' +
                '<span class="si-pourquoi"><strong>Pourquoi ?</strong> ' +
                (e.n === 1 ? 'Avec l\'exposant 1, il n\'y a qu\'un seul facteur : a¹ = a.'
                    : 'L\'exposant ' + e.n + ' dit combien de fois on écrit le facteur ' + e.a + '.' +
                        (e.a * e.n === Math.pow(e.a, e.n) ? '' : ' Attention : ' + e.a + EXPOSANTS[e.n] + ' n\'est pas ' + e.a + ' × ' + e.n + ' = ' + (e.a * e.n) + '.')) +
                (e.a === 10 ? ' Avec 10, on écrit 1 suivi de ' + e.n + ' zéro' + (e.n > 1 ? 's' : '') + '.' : '') + '</span>';
        }
    };

    /* --- Premier ou pas : on range n points en rectangle --- */
    SCHEMAS.diviseurs = {
        depart: function () { return { n: 12 }; },
        diviseurs: function (n) { var d = [], i; for (i = 1; i <= n; i++) { if (n % i === 0) { d.push(i); } } return d; },
        dessin: function (e) {
            var d = this.diviseurs(e.n), lignes = d.length > 2 ? d[1] : 1, colonnes = e.n / lignes;
            var pas = Math.min(16, 284 / colonnes), r = Math.min(5.5, pas / 2.6), s = '', i, j;
            var x0 = 160 - pas * (colonnes - 1) / 2, y0 = 78 - pas * (lignes - 1) / 2;
            for (i = 0; i < lignes; i++) {
                for (j = 0; j < colonnes; j++) {
                    s += '<circle cx="' + (x0 + j * pas).toFixed(1) + '" cy="' + (y0 + i * pas).toFixed(1) + '" r="' + r.toFixed(1) + '" style="fill:var(' + (lignes > 1 ? ORANGE : ROSE) + ')"/>';
                }
            }
            s += texte(160, 150, lignes > 1 ? e.n + ' = ' + lignes + ' × ' + colonnes : e.n + ' = 1 × ' + e.n, { taille: 20, gras: true });
            return { vue: '0 0 320 166', svg: s, label: this.phrase(e) };
        },
        commandes: function (e, changer) { return [curseur('n', 'Nombre', e, 'n', 2, 40, 1, '', changer)]; },
        pose: function (e, auDepart) { return auDepart ? 'wave' : (this.diviseurs(e.n).length === 2 ? 'cheer' : 'point'); },
        aide: function () { return '👆 Fais glisser le curseur.'; },
        phrase: function (e) { return this.texte(e).replace(/<[^>]+>/g, ''); },
        texte: function (e) {
            var d = this.diviseurs(e.n);
            if (d.length === 2) {
                return '<strong>' + e.n + ' est premier</strong>. Ses diviseurs : 1 et ' + e.n + '.' +
                    '<span class="si-pourquoi"><strong>Pourquoi ?</strong> ' + e.n + ' points ne se rangent qu\'en une seule ligne : pas de rectangle possible. Un nombre premier a exactement deux diviseurs, 1 et lui-même.</span>';
            }
            return '<strong>' + e.n + ' n\'est pas premier</strong>. Ses diviseurs : ' + d.join(', ') + '.' +
                '<span class="si-pourquoi"><strong>Pourquoi ?</strong> ' + e.n + ' points se rangent en rectangle : ' + d[1] + ' lignes de ' + (e.n / d[1]) + '. Donc ' + d[1] + ' divise ' + e.n + ' : il a plus de deux diviseurs.</span>';
        }
    };

    /* ---------- Le montage dans la page ---------- */

    function monter(hote) {
        var schema = SCHEMAS[hote.dataset.schema];
        if (!schema || hote.dataset.pret) { return; }
        hote.dataset.pret = '1';

        var etat = schema.depart(hote.dataset);
        var depart = JSON.stringify(etat);
        var figure = document.createElement('figure');
        figure.className = 'schema si-figure';

        var svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('role', 'group');
        figure.appendChild(svg);

        // La légende écrite dans la page reste sous le schéma.
        var legende = hote.querySelector('.si-legende');
        if (legende) {
            var fixe = document.createElement('figcaption');
            fixe.innerHTML = legende.innerHTML;
            figure.appendChild(fixe);
            legende.remove();
        }

        // L'observation : dans la bulle d'Aya dès que js/jeu.js est arrivé, dans un
        // simple paragraphe en attendant (ou sur une page sans la coquille).
        var observation = document.createElement('p');
        observation.className = 'si-observation';
        observation.setAttribute('aria-live', 'polite');
        figure.appendChild(observation);
        var aya = null;

        function dire(html, pose) {
            if (!aya && window.KarniellaJeu && window.KarniellaJeu.guide) {
                aya = window.KarniellaJeu.guide({ taille: 84 });
                aya.el.classList.add('si-aya');
                figure.replaceChild(aya.el, observation);
            }
            if (!aya) { observation.innerHTML = html; return; }
            var phrase = document.createElement('p');
            phrase.innerHTML = html;
            aya.dire(phrase, pose === 'alerte' ? 'think' : pose);
            aya.el.classList.toggle('si-alerte', pose === 'alerte');
        }

        var commandes = document.createElement('div');
        commandes.className = 'si-commandes';
        figure.appendChild(commandes);

        if (schema.aide) {
            var aide = document.createElement('p');
            aide.className = 'si-aide';
            aide.textContent = schema.aide(etat);
            figure.appendChild(aide);
        }

        var attente = null;

        /** garderCommandes : pendant qu'on fait glisser un curseur, on ne le reconstruit pas. */
        function dessiner(garderCommandes) {
            var actif = document.activeElement, focus = null;
            if (actif && figure.contains(actif)) { focus = actif.dataset.cle ? '[data-cle="' + actif.dataset.cle + '"]' : (actif.dataset.act ? '[data-act="' + actif.dataset.act + '"]' : null); }

            var d = schema.dessin(etat);
            svg.setAttribute('viewBox', d.vue);
            svg.setAttribute('aria-label', d.label);
            svg.innerHTML = d.svg;
            dire(schema.texte(etat), schema.pose ? schema.pose(etat, JSON.stringify(sansResultat(etat)) === depart) : 'idle');

            var groupes = schema.commandes(etat, changer, depart);
            if (garderCommandes) {   // seulement l'étiquette et la valeur des curseurs
                groupes.forEach(function (groupe) {
                    if (!groupe.curseur) { return; }
                    var champ = commandes.querySelector('input[data-cle="' + groupe.curseur.cle + '"]');
                    if (!champ) { return; }
                    if (champ !== document.activeElement) { champ.value = groupe.curseur.valeur; }
                    champ.previousElementSibling.textContent = groupe.curseur.libelle;
                });
            } else { commandes.textContent = ''; }
            (garderCommandes ? [] : groupes).forEach(function (groupe) {
                var bloc = document.createElement('div');
                bloc.className = 'si-groupe';
                if (groupe.curseur) {
                    var c = groupe.curseur, etiquette = document.createElement('label');
                    etiquette.className = 'si-curseur';
                    var nom = document.createElement('span');
                    nom.textContent = c.libelle;
                    var champ = document.createElement('input');
                    champ.type = 'range';
                    champ.min = c.min; champ.max = c.max; champ.step = c.pas; champ.value = c.valeur;
                    champ.dataset.cle = c.cle;
                    champ.addEventListener('input', function () { c.action(Number(champ.value)); });
                    etiquette.appendChild(nom);
                    etiquette.appendChild(champ);
                    bloc.appendChild(etiquette);
                    commandes.appendChild(bloc);
                    return;
                }
                if (groupe.titre) {
                    var titre = document.createElement('span');
                    titre.className = 'si-titre';
                    titre.textContent = groupe.titre + ' :';
                    bloc.appendChild(titre);
                }
                groupe.boutons.forEach(function (b) {
                    var bouton = document.createElement('button');
                    bouton.type = 'button';
                    bouton.className = 'si-bouton';
                    bouton.dataset.cle = b.cle;
                    bouton.textContent = b.texte;
                    if (b.actif !== undefined) { bouton.setAttribute('aria-pressed', b.actif ? 'true' : 'false'); }
                    if (groupe.titre) { bouton.setAttribute('aria-label', groupe.titre + ' ' + b.texte); }
                    bouton.disabled = !!b.inactif;
                    bouton.addEventListener('click', b.action);
                    bloc.appendChild(bouton);
                });
                commandes.appendChild(bloc);
            });

            if (focus && !garderCommandes) {
                var cible = figure.querySelector(focus);
                if (cible && !cible.disabled) { cible.focus(); }
            }

            // Une suite qui arrive toute seule (la lampe en surtension grille).
            if (attente) { clearTimeout(attente); attente = null; }
            var suite = schema.ensuite ? schema.ensuite(etat, changer) : null;
            if (suite) { attente = setTimeout(function () { attente = null; suite.action(); }, suite.delai); }
        }

        /** Redessine. Avec un état en argument : on repart de cet état. Avec true : on garde les curseurs. */
        function changer(nouvelEtat) {
            if (nouvelEtat === true) { dessiner(true); return; }
            if (nouvelEtat) { etat = nouvelEtat; }
            dessiner();
        }

        // Toucher un élément du schéma (souris, doigt, ou Entrée / Espace au clavier).
        function toucher(evenement) {
            var cible = evenement.target.closest ? evenement.target.closest('[data-act]') : null;
            if (!cible || !schema.agir) { return; }
            if (evenement.type === 'keydown') {
                if (evenement.key !== 'Enter' && evenement.key !== ' ') { return; }
                evenement.preventDefault();
            }
            schema.agir(etat, cible.dataset.act);
            dessiner();
        }
        svg.addEventListener('click', toucher);
        svg.addEventListener('keydown', toucher);

        // Karniella a manipulé le schéma : les cartes de la leçon l'attendent
        // avant d'ouvrir la suivante (js/cartes-lecon.js).
        function signaler() { hote.dispatchEvent(new CustomEvent('karniella:interaction', { bubbles: true })); }
        figure.addEventListener('click', function (e) {
            if (e.target.closest && e.target.closest('.si-bouton, [data-act]')) { signaler(); }
        });
        figure.addEventListener('input', signaler);
        figure.addEventListener('keydown', function (e) {
            if ((e.key === 'Enter' || e.key === ' ') && e.target.closest && e.target.closest('[data-act]')) { signaler(); }
        });

        hote.appendChild(figure);
        dessiner();
        // js/jeu.js (Aya) est chargé par la coquille, parfois après ce script.
        if (!aya) { window.addEventListener('load', function () { if (!aya) { dessiner(); } }); }
    }

    function demarrer() {
        var hotes = document.querySelectorAll('.schema-interactif[data-schema]');
        for (var i = 0; i < hotes.length; i++) { monter(hotes[i]); }
    }

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', demarrer); } else { demarrer(); }
})();
