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
 * schéma.
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
            s += '<g stroke-width="' + (etat === 'forte' ? 3 : 2.5) + '" stroke-linecap="round" style="stroke:var(--boite-important-texte)"' +
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
        return '<path d="M' + x + ' ' + y + (versLaGauche ? ' l10 -5 v10 z' : ' l-10 -5 v10 z') + '" style="fill:var(--rose)"/>' +
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

        aide: function (e) {
            var gestes = ['un fil pour l\'enlever'];
            if (e.lampes.length) { gestes.push('une lampe pour la dévisser'); }
            if (e.inter !== null || e.interB) { gestes.push('l\'interrupteur'); }
            if (e.options.retourner) { gestes.push('une pile pour la retourner'); }
            return '👆 Touche ' + gestes.join(', ') + '.';
        },

        texte: function (e) {
            var r = e.resultat || calculer(e, plan(e)), n = e.lampes.length;
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
            commandes: SCHEMAS.montage.commandes, ensuite: SCHEMAS.montage.ensuite, aide: SCHEMAS.montage.aide,
            texte: SCHEMAS.montage.texte, agir: SCHEMAS.montage.agir
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
        texte: function (e) {
            if (e.etape === 0) { return 'Un verre d\'eau. Verse du sucre ou du sable.'; }
            if (e.etape === 1) { return 'Le ' + e.produit + ' tombe au fond. Maintenant, <strong>agite</strong>.'; }
            return e.produit === 'sucre'
                ? 'On ne voit plus le sucre : il s\'est <strong>dissous</strong>. C\'est un mélange <strong>homogène</strong>.'
                : 'On voit encore le sable : il ne se dissout pas. C\'est un mélange <strong>hétérogène</strong>.';
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

        var observation = document.createElement('p');
        observation.className = 'si-observation';
        observation.setAttribute('aria-live', 'polite');
        figure.appendChild(observation);

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

        function dessiner() {
            var actif = document.activeElement, focus = null;
            if (actif && figure.contains(actif)) { focus = actif.dataset.cle ? '[data-cle="' + actif.dataset.cle + '"]' : (actif.dataset.act ? '[data-act="' + actif.dataset.act + '"]' : null); }

            var d = schema.dessin(etat);
            svg.setAttribute('viewBox', d.vue);
            svg.setAttribute('aria-label', d.label);
            svg.innerHTML = d.svg;
            observation.innerHTML = schema.texte(etat);

            commandes.textContent = '';
            schema.commandes(etat, changer, depart).forEach(function (groupe) {
                var bloc = document.createElement('div');
                bloc.className = 'si-groupe';
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

            if (focus) {
                var cible = figure.querySelector(focus);
                if (cible && !cible.disabled) { cible.focus(); }
            }

            // Une suite qui arrive toute seule (la lampe en surtension grille).
            if (attente) { clearTimeout(attente); attente = null; }
            var suite = schema.ensuite ? schema.ensuite(etat, changer) : null;
            if (suite) { attente = setTimeout(function () { attente = null; suite.action(); }, suite.delai); }
        }

        /** Redessine. Avec un état en argument : on repart de cet état. */
        function changer(nouvelEtat) {
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

        hote.appendChild(figure);
        dessiner();
    }

    function demarrer() {
        var hotes = document.querySelectorAll('.schema-interactif[data-schema]');
        for (var i = 0; i < hotes.length; i++) { monter(hotes[i]); }
    }

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', demarrer); } else { demarrer(); }
})();
