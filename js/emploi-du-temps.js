/**
 * emploi-du-temps.js — L'emploi du temps de la 5e 2 (Collège Sainte Camille).
 *
 * Source : la photo du 18/10/2026, recopiée dans
 * docs/sources/emploi-du-temps-2026-10-18.md. Pour le changer : modifier
 * SEMAINE ci-dessous, puis incrémenter CACHE_NAME dans sw.js.
 *
 * Deux affichages, chacun seulement si son conteneur est dans la page :
 *   - #emploi-prochain (index.html) : les cours du prochain jour de classe,
 *     avec un lien vers chaque matière, pour réviser la veille ;
 *   - #emploi-semaine (5e/emploi-du-temps.html) : un jour au choix, puis
 *     toute la semaine.
 * data-base sur le conteneur : le chemin de la page vers le dossier 5e/.
 */
(function () {
    'use strict';

    var CRENEAUX = [
        { debut: '7h30', fin: '8h25' },
        { debut: '8h25', fin: '9h20' },
        { debut: '9h20', fin: '10h15' },
        { debut: '10h15', fin: '10h35', recreation: true },
        { debut: '10h40', fin: '11h35' },
        { debut: '11h35', fin: '12h30' }
    ];

    // Pas de cours l'après-midi : passé 12 h 30, on montre le jour suivant.
    var FIN_DES_COURS = 12 * 60 + 30;

    var JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'];

    // Une case par créneau ; null pour la récréation. d : ce qui est écrit au stylo.
    var SEMAINE = {
        lundi:    [{ m: 'svt' }, { m: 'svt' }, { m: 'francais', d: 'grammaire' }, null, { m: 'anglais' }, { m: 'histoire-geo' }],
        mardi:    [{ m: 'tice' }, { m: 'francais', d: 'expression' }, { m: 'devoir' }, null, { m: 'mathematiques' }, { m: 'francais', d: 'écrite' }],
        mercredi: [{ m: 'francais', d: 'étude d\'œuvre, étude de texte' }, { m: 'anglais' }, { m: 'histoire-geo' }, null, { m: 'mathematiques' }, { m: 'mathematiques' }],
        jeudi:    [{ m: 'eps' }, { m: 'eps' }, { m: 'anglais' }, null, { m: 'mathematiques' }, { m: 'francais', d: 'grammaire' }],
        vendredi: [{ m: 'edhc' }, { m: 'ap' }, { m: 'devoir' }, null, { m: 'mathematiques' }, { m: 'physique-chimie' }]
    };

    // Les abréviations du papier, pour le tableau de la semaine.
    var COURT = {
        svt: 'SVT', tice: 'TICE', francais: 'FR', anglais: 'ANG', 'histoire-geo': 'HG',
        mathematiques: 'Maths', 'physique-chimie': 'PC', edhc: 'EDHC',
        eps: 'EPS', ap: 'AP', devoir: 'Devoir'
    };

    // Ce qui n'est pas une matière du programme : pas de page à réviser.
    var AUTRES = {
        eps: { nom: 'EPS', icone: '🏃' },
        ap: { nom: 'AP', icone: '🎨' },
        devoir: { nom: 'Devoir', icone: '📝' }
    };

    function creer(balise, classe, texte) {
        var e = document.createElement(balise);
        if (classe) { e.className = classe; }
        if (texte !== undefined) { e.textContent = texte; }
        return e;
    }

    function majuscule(mot) { return mot.charAt(0).toUpperCase() + mot.slice(1); }

    /** Nom et icône d'une matière : ceux du programme (js/programme-5e.js). */
    function matiere(id) {
        if (AUTRES[id]) { return { nom: AUTRES[id].nom, icone: AUTRES[id].icone, page: false }; }
        var programme = window.KarniellaProgramme;
        var trouvee = programme && programme.matieres.filter(function (m) { return m.id === id; })[0];
        return {
            nom: trouvee ? trouvee.nom : COURT[id],
            icone: trouvee ? trouvee.icone : '📘',
            page: true
        };
    }

    /**
     * Le prochain jour de classe : aujourd'hui jusqu'à 12 h 30, sinon le jour
     * suivant (le lundi après un vendredi midi). ecart : dans combien de jours.
     */
    function prochainJour(maintenant) {
        var jour = maintenant.getDay();   // 0 = dimanche … 6 = samedi
        var minutes = maintenant.getHours() * 60 + maintenant.getMinutes();
        if (jour >= 1 && jour <= 5 && minutes < FIN_DES_COURS) { return { index: jour - 1, ecart: 0 }; }
        var ecart = 0;
        do { ecart++; jour = (jour + 1) % 7; } while (jour === 0 || jour === 6);
        return { index: jour - 1, ecart: ecart };
    }

    function nomDuJour(index, ecart) {
        if (ecart === 0) { return 'Aujourd\'hui, ' + JOURS[index]; }
        if (ecart === 1) { return 'Demain, ' + JOURS[index]; }
        return majuscule(JOURS[index]);
    }

    /** L'étiquette d'une matière : un lien vers sa page, sinon un simple texte. */
    function etiquette(id, base, texte) {
        var info = matiere(id);
        var e = creer(info.page ? 'a' : 'span', 'edt-matiere');
        if (info.page) {
            e.href = base + id + '.html';
            e.setAttribute('data-matiere', id);
        } else {
            e.classList.add('edt-' + id);
        }
        e.appendChild(creer('span', 'edt-icone', info.icone)).setAttribute('aria-hidden', 'true');
        e.appendChild(document.createTextNode(texte || info.nom));
        return e;
    }

    /* ============================================================
       Accueil : le prochain jour de classe
       ============================================================ */

    function rendreProchain(zone) {
        var base = zone.getAttribute('data-base') || '';
        var p = prochainJour(new Date());
        var cases = SEMAINE[JOURS[p.index]];

        zone.textContent = '';
        var tete = creer('div', 'edt-tete');
        tete.appendChild(creer('h2', 'edt-titre', '📅 ' + nomDuJour(p.index, p.ecart)));
        var lien = creer('a', 'edt-lien', 'Toute la semaine →');
        lien.href = base + 'emploi-du-temps.html';
        tete.appendChild(lien);
        zone.appendChild(tete);

        zone.appendChild(creer('p', 'edt-consigne', p.ecart === 0 ? 'Touche une matière pour revoir ses leçons.'
            : p.ecart === 1 ? 'Touche une matière pour la réviser ce soir.'
            : 'Touche une matière pour la réviser avant ' + JOURS[p.index] + '.'));

        // Chaque matière une seule fois, dans l'ordre de la journée.
        var liste = creer('ul', 'edt-matieres');
        var vues = {};
        cases.forEach(function (c) {
            if (!c || c.m === 'devoir' || vues[c.m]) { return; }
            vues[c.m] = true;
            var li = creer('li');
            li.appendChild(etiquette(c.m, base));
            liste.appendChild(li);
        });
        zone.appendChild(liste);

        cases.forEach(function (c, i) {
            if (c && c.m === 'devoir') {
                zone.appendChild(creer('p', 'edt-alerte-devoir', '📝 Devoir à ' + CRENEAUX[i].debut + ' : révise bien !'));
            }
        });
        zone.hidden = false;
    }

    /* ============================================================
       Page de l'emploi du temps : un jour, puis la semaine
       ============================================================ */

    function rendreJour(conteneur, index, p, base) {
        conteneur.textContent = '';
        var titre = majuscule(JOURS[index]);
        if (index === p.index) { titre += p.ecart === 0 ? ' · aujourd\'hui' : p.ecart === 1 ? ' · demain' : ''; }
        conteneur.appendChild(creer('h2', 'edt-titre', titre));

        var liste = creer('ol', 'edt-journee');
        SEMAINE[JOURS[index]].forEach(function (c, i) {
            var cr = CRENEAUX[i];
            var li = creer('li', cr.recreation ? 'edt-creneau edt-recreation' : 'edt-creneau');
            li.appendChild(creer('span', 'edt-heure', cr.debut + ' – ' + cr.fin));
            if (cr.recreation) {
                li.appendChild(creer('span', 'edt-recre', 'Récréation'));
            } else {
                var quoi = creer('span', 'edt-quoi');
                quoi.appendChild(etiquette(c.m, base));
                if (c.d) { quoi.appendChild(creer('span', 'edt-detail', c.d)); }
                li.appendChild(quoi);
            }
            liste.appendChild(li);
        });
        conteneur.appendChild(liste);
        conteneur.appendChild(creer('p', 'edt-apres-midi', 'Pas de cours l\'après-midi.'));
    }

    function tableauSemaine(base, choisi) {
        var table = creer('table', 'edt-semaine');
        var tete = creer('thead');
        var ligne = creer('tr');
        ligne.appendChild(creer('th', '', 'Heure'));
        JOURS.forEach(function (j, i) {
            var th = creer('th', i === choisi ? 'edt-choisi' : '', majuscule(j.slice(0, 3)) + '.');
            th.setAttribute('scope', 'col');
            th.setAttribute('aria-label', majuscule(j));
            ligne.appendChild(th);
        });
        tete.appendChild(ligne);
        table.appendChild(tete);

        var corps = creer('tbody');
        CRENEAUX.forEach(function (cr, i) {
            var tr = creer('tr', cr.recreation ? 'edt-recreation' : '');
            var th = creer('th', '', cr.debut);
            th.setAttribute('scope', 'row');
            tr.appendChild(th);
            if (cr.recreation) {
                var td = creer('td', '', 'Récréation');
                td.colSpan = 5;
                tr.appendChild(td);
            } else {
                JOURS.forEach(function (j, k) {
                    var c = SEMAINE[j][i];
                    var cell = creer('td', k === choisi ? 'edt-choisi' : '');
                    cell.appendChild(etiquette(c.m, base, COURT[c.m]));
                    tr.appendChild(cell);
                });
            }
            corps.appendChild(tr);
        });
        table.appendChild(corps);
        return table;
    }

    function rendreSemaine(zone) {
        var base = zone.getAttribute('data-base') || '';
        var p = prochainJour(new Date());
        var choisi = p.index;

        zone.textContent = '';
        var choix = creer('div', 'edt-choix');
        choix.setAttribute('role', 'group');
        choix.setAttribute('aria-label', 'Choisis un jour');
        var jour = creer('section', 'edt-jour');
        jour.setAttribute('aria-live', 'polite');
        var semaine = creer('div', 'edt-defile');

        function montrer(index) {
            choisi = index;
            Array.prototype.forEach.call(choix.children, function (b, i) {
                b.setAttribute('aria-pressed', i === index ? 'true' : 'false');
            });
            rendreJour(jour, index, p, base);
            semaine.textContent = '';
            semaine.appendChild(tableauSemaine(base, index));
        }

        JOURS.forEach(function (j, i) {
            var b = creer('button', 'edt-bouton-jour', majuscule(j.slice(0, 3)) + '.');
            b.type = 'button';
            b.setAttribute('aria-label', majuscule(j));
            b.addEventListener('click', function () { montrer(i); });
            choix.appendChild(b);
        });

        zone.appendChild(choix);
        zone.appendChild(jour);
        zone.appendChild(creer('h2', 'edt-titre', 'Toute la semaine'));
        zone.appendChild(semaine);
        montrer(choisi);
    }

    function demarrer() {
        var prochain = document.getElementById('emploi-prochain');
        if (prochain) { rendreProchain(prochain); }
        var semaine = document.getElementById('emploi-semaine');
        if (semaine) { rendreSemaine(semaine); }
    }

    window.KarniellaEmploiDuTemps = { semaine: SEMAINE, creneaux: CRENEAUX, prochainJour: prochainJour };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', demarrer);
    } else {
        demarrer();
    }
})();
