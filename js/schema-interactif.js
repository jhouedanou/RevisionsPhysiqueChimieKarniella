/**
 * schema-interactif.js — les schémas de physique-chimie que Karniella manipule.
 *
 * Dans une leçon :
 *
 *     <div class="schema-interactif" data-schema="lampes" data-montage="serie"></div>
 *
 * Le script (à charger après js/lecon-5e.js) y dessine un schéma SVG, des
 * boutons et une phrase qui dit ce qu'on observe. Chaque clic redessine le
 * schéma. Mêmes règles que les schémas fixes (CLAUDE.md) : traits en
 * currentColor, accents avec les variables du thème, symboles normalisés,
 * lisible à 390 px.
 *
 * Schémas disponibles (data-schema) :
 *   - circuit   : pile, interrupteur, lampe. On ouvre et on ferme.
 *   - tension   : on choisit la pile et la lampe. Sous-tension, adaptée, surtension.
 *   - lampes    : deux lampes. data-montage="serie" ou "derivation".
 *                 On dévisse ou on court-circuite une lampe.
 *   - piles     : 1 à 3 piles de 1,5 V. data-retourner="non" pour ne pas
 *                 proposer de retourner une pile (concordance seulement).
 *   - melange   : du sucre ou du sable dans l'eau. On verse, on agite.
 *
 * Pour ajouter un schéma : une entrée de plus dans SCHEMAS, avec
 * depart(options), dessin(etat), commandes(etat, changer) et texte(etat).
 */
(function () {
    'use strict';

    var NS = 'http://www.w3.org/2000/svg';

    /* ---------- Les symboles ---------- */

    var TRAIT = '<g fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">';

    function nombre(v) { return String(v).replace('.', ','); }

    function texte(x, y, contenu, options) {
        var o = options || {};
        return '<text x="' + x + '" y="' + y + '" font-size="' + (o.taille || 13) + '"' +
            (o.gras ? ' font-weight="700"' : '') +
            ' text-anchor="' + (o.ancre || 'middle') + '"' +
            (o.couleur ? ' style="fill:var(' + o.couleur + ')"' : '') + '>' + contenu + '</text>';
    }

    /**
     * Une lampe. etat : eteinte, faible, normale, forte, grillee, devissee.
     * Des petits traits autour : elle brille. Croix coupée : elle est grillée.
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

    /** L'interrupteur K sur le fil de gauche (x = 40), entre y = 80 et y = 115. */
    function interrupteur(ferme) {
        return TRAIT + (ferme ? '<line x1="40" y1="115" x2="40" y2="80"/>' : '<line x1="40" y1="115" x2="20" y2="86"/>') + '</g>' +
            '<g fill="currentColor"><circle cx="40" cy="80" r="3.5"/><circle cx="40" cy="115" r="3.5"/></g>' +
            texte(ferme ? 24 : 14, ferme ? 103 : 110, 'K', { taille: 15, gras: true });
    }

    /* ---------- Les schémas ---------- */

    var SCHEMAS = {};

    /* --- Circuit simple : on ouvre, on ferme --- */
    SCHEMAS.circuit = {
        depart: function () { return { ferme: false }; },
        dessin: function (e) {
            return {
                vue: '0 0 320 200',
                label: 'Circuit simple : une pile, un interrupteur K ' + (e.ferme ? 'fermé' : 'ouvert') + ' et une lampe ' + (e.ferme ? 'qui brille.' : 'éteinte.'),
                svg: TRAIT + '<path d="M40 80 L40 45 L146 45 M174 45 L280 45 L280 150 L166 150 M154 150 L40 150 L40 115"/></g>' +
                    lampe(160, 45, e.ferme ? 'normale' : 'eteinte') + pile(160, 150, false) + interrupteur(e.ferme) +
                    (e.ferme ? courant(90, 150, true) : '') +
                    texte(200, 76, 'lampe', { ancre: 'start' }) + texte(160, 186, 'pile')
            };
        },
        commandes: function (e, changer) {
            return [{ boutons: [{ cle: 'k', texte: e.ferme ? 'Ouvrir l\'interrupteur' : 'Fermer l\'interrupteur', action: function () { e.ferme = !e.ferme; changer(); } }] }];
        },
        texte: function (e) {
            return e.ferme
                ? 'Circuit <strong>fermé</strong> : le courant passe. La lampe <strong>brille</strong>.'
                : 'Circuit <strong>ouvert</strong> : le courant ne passe pas. La lampe est <strong>éteinte</strong>.';
        }
    };

    /* --- Tension de la pile et tension de la lampe --- */
    SCHEMAS.tension = {
        depart: function () { return { pile: 4.5, lampe: 3.5, grillee: false }; },
        cas: function (e) {
            var rapport = e.pile / e.lampe;
            return rapport < 0.8 ? 'sous' : (rapport <= 1.3 ? 'adaptee' : 'sur');
        },
        dessin: function (e) {
            var cas = this.cas(e);
            var etat = cas === 'sous' ? 'faible' : (cas === 'adaptee' ? 'normale' : (e.grillee ? 'grillee' : 'forte'));
            return {
                vue: '0 0 320 200',
                label: 'Une pile de ' + nombre(e.pile) + ' volts alimente une lampe de ' + nombre(e.lampe) + ' volts. ' +
                    { faible: 'La lampe brille faiblement.', normale: 'La lampe brille normalement.', forte: 'La lampe brille très fort.', grillee: 'La lampe est grillée.' }[etat],
                svg: TRAIT + '<path d="M40 45 L146 45 M174 45 L280 45 L280 150 L166 150 M154 150 L40 150 L40 45"/></g>' +
                    lampe(160, 45, etat) + pile(160, 150, false) +
                    (etat === 'grillee' ? '' : courant(90, 150, true)) +
                    texte(160, 92, 'lampe : ' + nombre(e.lampe) + ' V', { gras: true }) +
                    texte(160, 186, 'pile : ' + nombre(e.pile) + ' V', { gras: true })
            };
        },
        commandes: function (e, changer) {
            function choix(cle, valeurs) {
                return valeurs.map(function (v) {
                    return { cle: cle + v, texte: nombre(v) + ' V', actif: e[cle] === v, action: function () { e[cle] = v; e.grillee = false; changer(); } };
                });
            }
            return [
                { titre: 'Pile', boutons: choix('pile', [1.5, 4.5, 9, 12]) },
                { titre: 'Lampe', boutons: choix('lampe', [3.5, 6]) }
            ];
        },
        /** En surtension, la lampe brille très fort, puis elle grille. */
        ensuite: function (e, changer) {
            if (this.cas(e) !== 'sur' || e.grillee) { return null; }
            return { delai: 1300, action: function () { e.grillee = true; changer(); } };
        },
        texte: function (e) {
            var cas = this.cas(e);
            if (cas === 'sous') { return '<strong>Sous-tension</strong> : la pile est trop faible. La lampe brille <strong>faiblement</strong>.'; }
            if (cas === 'adaptee') { return 'Lampe <strong>adaptée</strong> : les deux tensions sont voisines. La lampe brille <strong>normalement</strong>.'; }
            return e.grillee
                ? '<strong>Surtension</strong> : la pile est trop forte. La lampe a <strong>grillé</strong>.'
                : '<strong>Surtension</strong> : la lampe brille <strong>très fort</strong>…';
        }
    };

    /* --- Deux lampes, en série ou en dérivation --- */
    var ETATS_LAMPE = ['normale', 'devissee', 'court'];
    var NOM_ETAT = { normale: 'en place', devissee: 'dévissée', court: 'court-circuitée' };

    SCHEMAS.lampes = {
        depart: function (options) {
            return { montage: options.montage === 'derivation' ? 'derivation' : 'serie', l: ['normale', 'normale'] };
        },
        /** L'éclat de chaque lampe, et ce qui arrive au circuit. */
        resultat: function (e) {
            var courts = e.l.filter(function (x) { return x === 'court'; }).length;
            var devissees = e.l.filter(function (x) { return x === 'devissee'; }).length;
            var eclat;
            if (e.montage === 'serie') {
                if (devissees) { return { cas: 'coupe', eclat: ['eteinte', 'eteinte'] }; }
                if (courts === 2) { return { cas: 'danger', eclat: ['eteinte', 'eteinte'] }; }
                if (courts === 1) {
                    eclat = e.l.map(function (x) { return x === 'court' ? 'eteinte' : 'forte'; });
                    return { cas: 'court', eclat: eclat };
                }
                return { cas: 'normal', eclat: ['faible', 'faible'] };
            }
            if (courts) { return { cas: 'danger', eclat: ['eteinte', 'eteinte'] }; }
            eclat = e.l.map(function (x) { return x === 'devissee' ? 'eteinte' : 'normale'; });
            return { cas: devissees === 2 ? 'coupe' : (devissees ? 'panne' : 'normal'), eclat: eclat };
        },
        dessin: function (e) {
            var r = this.resultat(e), s = '', serie = e.montage === 'serie';
            function etatDessin(i) { return e.l[i] === 'devissee' ? 'devissee' : r.eclat[i]; }
            function pont(x, y) {   // le fil du court-circuit, par-dessus la lampe
                return '<path d="M' + (x - 30) + ' ' + y + ' C' + (x - 30) + ' ' + (y - 34) + ' ' + (x + 30) + ' ' + (y - 34) + ' ' + (x + 30) + ' ' + y +
                    '" fill="none" stroke-width="3" stroke-linecap="round" style="stroke:var(--rose)"/>' +
                    '<g style="fill:var(--rose)"><circle cx="' + (x - 30) + '" cy="' + y + '" r="3.5"/><circle cx="' + (x + 30) + '" cy="' + y + '" r="3.5"/></g>';
            }
            var passe = r.cas === 'normal' || r.cas === 'court' || r.cas === 'panne';
            if (serie) {
                s += TRAIT + '<path d="M40 150 L40 50 L86 50 M114 50 L206 50 M234 50 L280 50 L280 150 L166 150 M154 150 L40 150"/></g>';
                s += lampe(100, 50, etatDessin(0)) + lampe(220, 50, etatDessin(1));
                if (e.l[0] === 'court') { s += pont(100, 50); }
                if (e.l[1] === 'court') { s += pont(220, 50); }
                s += texte(100, 100, 'L1', { taille: 15, gras: true }) + texte(220, 100, 'L2', { taille: 15, gras: true });
                s += pile(160, 150, false) + (passe ? courant(90, 150, true) : '');
                return { vue: '0 0 320 190', svg: s, label: 'Deux lampes en série sur une pile. ' + this.phrase(e) };
            }
            s += TRAIT + '<path d="M50 190 L50 45 L146 45 M174 45 L270 45 L270 190 L166 190 M154 190 L50 190 M50 115 L146 115 M174 115 L270 115"/></g>';
            s += '<g fill="currentColor"><circle cx="50" cy="115" r="3.5"/><circle cx="270" cy="115" r="3.5"/></g>';
            s += lampe(160, 45, etatDessin(1)) + lampe(160, 115, etatDessin(0));
            if (e.l[1] === 'court') { s += pont(160, 45); }
            if (e.l[0] === 'court') { s += pont(160, 115); }
            s += texte(214, 38, 'L2', { taille: 15, gras: true }) + texte(214, 108, 'L1', { taille: 15, gras: true });
            s += texte(36, 120, 'A', { taille: 15, gras: true }) + texte(284, 120, 'B', { taille: 15, gras: true });
            s += pile(160, 190, false) + (passe ? courant(100, 190, true) : '');
            return { vue: '0 0 320 226', svg: s, label: 'Deux lampes en dérivation sur une pile, entre les nœuds A et B. ' + this.phrase(e) };
        },
        commandes: function (e, changer) {
            return [0, 1].map(function (i) {
                return {
                    titre: 'L' + (i + 1),
                    boutons: ETATS_LAMPE.map(function (etat) {
                        return { cle: 'l' + i + etat, texte: NOM_ETAT[etat], actif: e.l[i] === etat, action: function () { e.l[i] = etat; changer(); } };
                    })
                };
            });
        },
        phrase: function (e) { return this.texte(e).replace(/<[^>]+>/g, ''); },
        texte: function (e) {
            var r = this.resultat(e), autre;
            if (e.montage === 'serie') {
                if (r.cas === 'coupe') { return 'Une lampe est dévissée : la boucle est <strong>coupée</strong>. <strong>Toutes les lampes s\'éteignent</strong>.'; }
                if (r.cas === 'danger') { return '⚠️ Les deux lampes sont court-circuitées : c\'est un <strong>court-circuit de la pile</strong>. Danger !'; }
                if (r.cas === 'court') {
                    autre = e.l[0] === 'court' ? 'L2' : 'L1';
                    return 'La lampe court-circuitée <strong>s\'éteint</strong>. ' + autre + ' brille <strong>plus fort</strong>.';
                }
                return 'Une seule boucle : les deux lampes brillent <strong>faiblement</strong>.';
            }
            if (r.cas === 'danger') { return '⚠️ Le fil relie aussi les bornes de la pile : <strong>toutes les lampes s\'éteignent</strong>. Danger, la pile chauffe !'; }
            if (r.cas === 'coupe') { return 'Les deux lampes sont dévissées : aucune ne brille.'; }
            if (r.cas === 'panne') {
                autre = e.l[0] === 'devissee' ? 'L2' : 'L1';
                return 'Une lampe est dévissée. ' + autre + ' a sa propre branche : elle <strong>brille toujours</strong>.';
            }
            return 'Chaque lampe a sa branche : les deux lampes brillent <strong>normalement</strong>.';
        }
    };

    /* --- Des piles de 1,5 V en série --- */
    SCHEMAS.piles = {
        depart: function (options) {
            return { nombre: 2, retournee: [false, false, false], retourner: options.retourner !== 'non' };
        },
        /** Les signes des piles posées (+1 ou −1), le sens du courant et la tension. */
        calcul: function (e) {
            var signes = [], somme = 0, i;
            for (i = 0; i < e.nombre; i++) { signes.push(e.retournee[i] ? -1 : 1); somme += signes[i]; }
            return { signes: signes, somme: somme, u: Math.abs(somme) * 1.5 };
        },
        /** « U = 1,5 − 1,5 + 1,5 = 1,5 V » : on compte dans le sens du plus grand camp. */
        formule: function (e) {
            var c = this.calcul(e), sens = c.somme < 0 ? -1 : 1;
            var signes = c.signes.map(function (x) { return x * sens; });
            // On commence toujours par une pile comptée en plus.
            if (signes[0] < 0) { signes.sort(function (x, y) { return y - x; }); }
            var s = 'U = 1,5';
            for (var i = 1; i < signes.length; i++) { s += (signes[i] > 0 ? ' + ' : ' − ') + '1,5'; }
            return s + (e.nombre > 1 ? ' = ' + nombre(c.u) : '') + ' V';
        },
        dessin: function (e) {
            var c = this.calcul(e);
            var etat = ['eteinte', 'faible', 'normale', 'forte'][Math.round(c.u / 1.5)];
            var places = { 1: [160], 2: [127, 193], 3: [95, 160, 225] }[e.nombre];
            var fil = 'M40 150 L40 45 L146 45 M174 45 L280 45 L280 150 L' + (places[places.length - 1] + 6) + ' 150 M' + (places[0] - 6) + ' 150 L40 150';
            for (var i = 0; i < places.length - 1; i++) { fil += ' M' + (places[i] + 6) + ' 150 L' + (places[i + 1] - 6) + ' 150'; }
            var s = TRAIT + '<path d="' + fil + '"/></g>' + lampe(160, 45, etat);
            places.forEach(function (x, k) {
                s += pile(x, 150, e.retournee[k]) + texte(x, 186, '1,5 V');
            });
            if (c.somme > 0) { s += courant(62, 150, true); }
            if (c.somme < 0) { s += courant(258, 150, false); }
            s += texte(200, 76, 'lampe', { ancre: 'start' });
            s += texte(160, 110, this.formule(e), { taille: 15, gras: true, couleur: '--rose' });
            return {
                vue: '0 0 320 200',
                svg: s,
                label: e.nombre + (e.nombre > 1 ? ' piles' : ' pile') + ' de 1,5 volt en série et une lampe. ' + this.formule(e).replace('U =', 'Tension :') + '. ' +
                    { eteinte: 'La lampe est éteinte.', faible: 'La lampe brille faiblement.', normale: 'La lampe brille avec plus d\'éclat.', forte: 'La lampe brille fort.' }[etat]
            };
        },
        commandes: function (e, changer) {
            var groupes = [{
                titre: 'Piles',
                boutons: [1, 2, 3].map(function (n) {
                    return { cle: 'n' + n, texte: String(n), actif: e.nombre === n, action: function () { e.nombre = n; changer(); } };
                })
            }];
            if (e.retourner) {
                var boutons = [];
                for (var i = 0; i < e.nombre; i++) {
                    (function (k) {
                        boutons.push({ cle: 'r' + k, texte: 'pile ' + (k + 1), actif: e.retournee[k], bascule: true, action: function () { e.retournee[k] = !e.retournee[k]; changer(); } });
                    })(i);
                }
                groupes.push({ titre: 'Retourner', boutons: boutons });
            }
            return groupes;
        },
        texte: function (e) {
            var c = this.calcul(e);
            if (e.nombre === 1) { return 'Une seule pile : la lampe brille <strong>faiblement</strong>.'; }
            if (Math.abs(c.somme) === e.nombre) {
                return 'Série <strong>concordance</strong> : les tensions <strong>s\'ajoutent</strong>. La lampe brille ' +
                    (e.nombre === 2 ? 'avec <strong>plus d\'éclat</strong>.' : '<strong>fort</strong>.');
            }
            if (c.u === 0) { return 'Série <strong>opposition</strong> : les deux piles s\'annulent. La lampe est <strong>éteinte</strong>.'; }
            return 'Série <strong>opposition</strong> : la pile retournée <strong>se retranche</strong>. La lampe brille <strong>faiblement</strong>.';
        }
    };

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
        var figure = document.createElement('figure');
        figure.className = 'schema si-figure';

        var svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('role', 'img');
        figure.appendChild(svg);

        var commandes = document.createElement('div');
        commandes.className = 'si-commandes';
        figure.appendChild(commandes);

        var legende = document.createElement('figcaption');
        legende.setAttribute('aria-live', 'polite');
        figure.appendChild(legende);

        var attente = null;

        function dessiner() {
            var d = schema.dessin(etat);
            svg.setAttribute('viewBox', d.vue);
            svg.setAttribute('aria-label', d.label);
            svg.innerHTML = d.svg;
            legende.innerHTML = schema.texte(etat);

            var focus = document.activeElement && commandes.contains(document.activeElement) ? document.activeElement.dataset.cle : null;
            commandes.textContent = '';
            schema.commandes(etat, changer).forEach(function (groupe) {
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
                    if (groupe.titre) { bouton.setAttribute('aria-label', groupe.titre + ' : ' + b.texte); }
                    bouton.disabled = !!b.inactif;
                    bouton.addEventListener('click', b.action);
                    bloc.appendChild(bouton);
                    if (focus === b.cle && !b.inactif) { bouton.focus(); }
                });
                commandes.appendChild(bloc);
            });

            // Une suite qui arrive toute seule (la lampe en surtension grille).
            if (attente) { clearTimeout(attente); attente = null; }
            var suite = schema.ensuite ? schema.ensuite(etat, changer) : null;
            if (suite) { attente = setTimeout(function () { attente = null; suite.action(); }, suite.delai); }
        }

        function changer() { dessiner(); }

        hote.appendChild(figure);
        dessiner();
    }

    function demarrer() {
        var hotes = document.querySelectorAll('.schema-interactif[data-schema]');
        for (var i = 0; i < hotes.length; i++) { monter(hotes[i]); }
    }

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', demarrer); } else { demarrer(); }
})();
