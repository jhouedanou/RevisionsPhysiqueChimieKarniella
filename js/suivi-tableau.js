/**
 * suivi-tableau.js — Le tableau de bord de suivi.html, pour tonton.
 *
 * Lit les lignes de la table `activite` (Supabase « karniella ») par la
 * fonction `tableau_suivi(mdp)` : sans le bon mot de passe, la base ne rend
 * rien. Le mot de passe reste dans sessionStorage le temps de l'onglet.
 */
(function () {
    'use strict';

    var URL_SUPABASE = 'https://bpxhzpzybvldbyvbzslb.supabase.co';
    var CLE_PUBLIQUE = 'sb_publishable_llOCHVMS5NQBudZW4E4RXw_Y1NJhWAI';
    var CLE_MDP = 'karniella-suivi-mdp';
    var ARRET = 'karniella-suivi-off';
    var JOUR_MS = 86400000;

    var lignes = [];
    var demande = 0;      // seule la réponse à la dernière demande compte
    var appareilChoisi = '';

    function $(id) { return document.getElementById(id); }

    function stock(type) {
        try { return window[type]; } catch (err) { return null; }
    }

    function lire(type, cle) {
        var s = stock(type);
        try { return s ? s.getItem(cle) : null; } catch (err) { return null; }
    }

    function ecrire(type, cle, valeur) {
        var s = stock(type);
        try {
            if (!s) { return; }
            if (valeur === null) { s.removeItem(cle); } else { s.setItem(cle, valeur); }
        } catch (err) { /* stockage refusé : on redemandera le mot de passe */ }
    }

    function el(balise, classe, texte) {
        var e = document.createElement(balise);
        if (classe) { e.className = classe; }
        if (texte != null) { e.textContent = texte; }
        return e;
    }

    /* ============================================================
       Noms lisibles : leçons et matières du programme
       ============================================================ */

    var LECONS = {};
    var MATIERES = {};
    (function () {
        var p = window.KarniellaProgramme;
        if (!p) { return; }
        p.matieres.forEach(function (m) {
            MATIERES[m.id] = m;
            (m.lecons || []).forEach(function (l) { LECONS[l.id] = { titre: l.titre, icone: l.icone, matiere: m.id, statut: l.statut }; });
        });
    })();

    function nomPage(page) {
        if (!page) { return '—'; }
        if (page === 'accueil' || page === '5e-accueil') { return '🏠 Accueil'; }
        if (page.indexOf('mission-') === 0) {
            var l = LECONS[page.slice(8)];
            return '🚀 Mission : ' + (l ? l.titre : page.slice(8));
        }
        if (LECONS[page]) { return (LECONS[page].icone || '📘') + ' ' + LECONS[page].titre; }
        if (MATIERES[page]) { return (MATIERES[page].icone || '') + ' Sommaire ' + MATIERES[page].nom; }
        return page;
    }

    function matiereDe(ligne) {
        if (ligne.matiere && MATIERES[ligne.matiere]) { return ligne.matiere; }
        var p = ligne.page || '';
        if (p.indexOf('mission-') === 0) { p = p.slice(8); }
        if (LECONS[p]) { return LECONS[p].matiere; }
        if (MATIERES[p]) { return p; }
        return ligne.matiere || 'autre';
    }

    /* ============================================================
       Dates
       ============================================================ */

    function dateDe(ligne) { return new Date(ligne.date_client || ligne.cree_le); }

    function cleJour(d) {
        return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    }

    function debutDuJour(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

    function heure(d) {
        return d.toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    }

    function ilYa(d) {
        var min = Math.round((Date.now() - d.getTime()) / 60000);
        if (min < 1) { return 'à l\'instant'; }
        if (min < 60) { return 'il y a ' + min + ' min'; }
        var h = Math.round(min / 60);
        if (h < 24) { return 'il y a ' + h + ' h'; }
        var j = Math.round(h / 24);
        return j === 1 ? 'hier' : 'il y a ' + j + ' jours';
    }

    function duree(s) {
        s = Math.round(s || 0);
        if (s < 60) { return s + ' s'; }
        var m = Math.round(s / 60);
        if (m < 60) { return m + ' min'; }
        return Math.floor(m / 60) + ' h ' + ('0' + (m % 60)).slice(-2);
    }

    /* ============================================================
       Chargement
       ============================================================ */

    function charger(mdp) {
        $('erreur').hidden = true;
        var numero = ++demande;
        return window.fetch(URL_SUPABASE + '/rest/v1/rpc/tableau_suivi', {
            method: 'POST',
            headers: { 'apikey': CLE_PUBLIQUE, 'Content-Type': 'application/json' },
            body: JSON.stringify({ mdp: mdp })
        }).then(function (r) {
            if (r.status === 403 || r.status === 401) { throw new Error('mdp'); }
            if (!r.ok) { throw new Error('reseau'); }
            return r.json();
        }).then(function (donnees) {
            if (numero !== demande) { return; }
            ecrire('sessionStorage', CLE_MDP, mdp);
            lignes = (donnees || []).sort(function (a, b) { return dateDe(b) - dateDe(a); });
            $('ecran-connexion').hidden = true;
            $('tableau').hidden = false;
            rendre();
        }).catch(function (err) {
            if (numero !== demande) { return; }
            ecrire('sessionStorage', CLE_MDP, null);
            $('ecran-connexion').hidden = false;
            $('tableau').hidden = true;
            $('erreur').textContent = err.message === 'mdp'
                ? 'Mot de passe incorrect.'
                : 'Impossible de joindre la base. Vérifie la connexion internet.';
            $('erreur').hidden = false;
        });
    }

    /* ============================================================
       Rendu
       ============================================================ */

    function lignesChoisies() {
        return appareilChoisi ? lignes.filter(function (l) { return l.appareil === appareilChoisi; }) : lignes;
    }

    function rendreAppareils() {
        var compte = {};
        lignes.forEach(function (l) { compte[l.appareil] = (compte[l.appareil] || 0) + 1; });
        var ids = Object.keys(compte);
        var choix = $('choix-appareil');
        choix.hidden = ids.length < 2;
        choix.innerHTML = '';
        choix.appendChild(new Option('Tous les appareils', ''));
        ids.forEach(function (id, i) {
            choix.appendChild(new Option('Appareil ' + (i + 1) + ' (' + compte[id] + ' lignes)', id));
        });
        choix.value = appareilChoisi;
    }

    function rendreTuiles(L) {
        var zone = $('tuiles');
        zone.innerHTML = '';
        var maintenant = Date.now();
        var d7 = maintenant - 7 * JOUR_MS;
        var d30 = maintenant - 30 * JOUR_MS;

        var jours7 = {}, jours30 = {}, temps7 = 0, quiz7 = 0, somme7 = 0;
        L.forEach(function (l) {
            var t = dateDe(l).getTime();
            if (t >= d30) { jours30[cleJour(dateDe(l))] = true; }
            if (t < d7) { return; }
            jours7[cleJour(dateDe(l))] = true;
            if (l.type === 'temps') { temps7 += l.duree || 0; }
        });
        quizUniques(L).forEach(function (q) {
            if (dateDe(q).getTime() >= d7 && q.total) { quiz7 += 1; somme7 += q.score / q.total; }
        });

        var derniere = L.length ? dateDe(L[0]) : null;
        var tuiles = [
            [derniere ? ilYa(derniere) : 'jamais', 'Dernière activité'],
            [Object.keys(jours7).length + ' / 7', 'Jours actifs cette semaine'],
            [duree(temps7), 'Temps passé (7 jours)'],
            [quiz7 ? quiz7 + ' · ' + Math.round(100 * somme7 / quiz7) + ' %' : '0', 'Quiz finis (7 jours) · moyenne'],
            [Object.keys(jours30).length + ' / 30', 'Jours actifs sur 30 jours']
        ];
        tuiles.forEach(function (t) {
            var d = el('div', 'tuile');
            d.appendChild(el('div', 'valeur', t[0]));
            d.appendChild(el('div', 'libelle', t[1]));
            zone.appendChild(d);
        });
    }

    function rendreCalendrier(L) {
        var zone = $('calendrier');
        zone.innerHTML = '';
        ['L', 'M', 'M', 'J', 'V', 'S', 'D'].forEach(function (j) { zone.appendChild(el('div', 'jour-nom', j)); });

        var minutes = {}, actif = {};
        L.forEach(function (l) {
            var k = cleJour(dateDe(l));
            actif[k] = true;
            if (l.type === 'temps') { minutes[k] = (minutes[k] || 0) + (l.duree || 0) / 60; }
        });

        var aujourdhui = debutDuJour(new Date());
        var lundi = new Date(aujourdhui);
        lundi.setDate(lundi.getDate() - ((lundi.getDay() + 6) % 7) - 28);
        for (var i = 0; i < 35; i++) {
            var d = new Date(lundi);
            d.setDate(lundi.getDate() + i);
            if (d > aujourdhui) { zone.appendChild(el('div', 'case vide')); continue; }
            var k = cleJour(d);
            var m = Math.round(minutes[k] || 0);
            var niveau = m >= 45 ? 4 : m >= 20 ? 3 : m >= 5 ? 2 : (m > 0 || actif[k]) ? 1 : 0;
            var c = el('div', 'case' + (niveau ? ' n' + niveau : ''), m ? String(m) : '');
            var etiquette = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) +
                ' : ' + (m ? m + ' min' : actif[k] ? 'moins d\'une minute' : 'pas d\'activité');
            c.title = etiquette;
            c.setAttribute('aria-label', etiquette);
            zone.appendChild(c);
        }
    }

    function rendreMatieres(L) {
        var zone = $('matieres');
        zone.innerHTML = '';
        var d30 = Date.now() - 30 * JOUR_MS;
        var parMatiere = {};
        L.forEach(function (l) {
            if (l.type !== 'temps' || dateDe(l).getTime() < d30) { return; }
            var m = matiereDe(l);
            parMatiere[m] = (parMatiere[m] || 0) + (l.duree || 0);
        });
        var liste = Object.keys(parMatiere).map(function (m) { return [m, parMatiere[m]]; })
            .sort(function (a, b) { return b[1] - a[1]; });
        if (!liste.length) { zone.appendChild(el('p', 'sous', 'Pas encore de temps enregistré.')); return; }
        var max = liste[0][1];
        liste.forEach(function (x) {
            var info = MATIERES[x[0]];
            var nom = info ? (info.icone + ' ' + info.nom) : (x[0] === 'autre' ? 'Autres pages' : x[0]);
            var b = el('div', 'barre');
            b.title = nom + ' : ' + duree(x[1]);
            b.appendChild(el('span', '', nom));
            var piste = el('div', 'piste');
            var plein = el('div', 'plein');
            plein.style.width = Math.max(1, Math.round(100 * x[1] / max)) + '%';
            piste.appendChild(plein);
            b.appendChild(piste);
            b.appendChild(el('span', 'chiffre', duree(x[1])));
            zone.appendChild(b);
        });
    }

    /** Un quiz du chat envoie une ligne par réponse : on garde la dernière de chaque série. */
    function quizUniques(L) {
        var vus = {};
        return L.filter(function (l) {
            if (l.type !== 'quiz') { return false; }
            if (!l.serie) { return true; }
            var k = l.appareil + '|' + l.serie;
            if (vus[k]) { return false; }
            vus[k] = true;
            return true;
        });
    }

    function pastille(score, total) {
        var p = total ? Math.round(100 * score / total) : 0;
        var classe = p >= 80 ? 'bon' : p >= 50 ? 'moyen' : 'faible';
        return el('span', 'pastille ' + classe, score + '/' + total + ' · ' + p + ' %');
    }

    function tableau(table, entetes, rangees, vide) {
        table.innerHTML = '';
        if (!rangees.length) {
            var r = table.insertRow();
            var c = r.insertCell();
            c.textContent = vide;
            return;
        }
        var tete = table.createTHead().insertRow();
        entetes.forEach(function (e) { var th = el('th', '', e[0]); if (e[1]) { th.style.textAlign = 'right'; } tete.appendChild(th); });
        var corps = table.createTBody();
        rangees.forEach(function (cellules) {
            var r = corps.insertRow();
            cellules.forEach(function (x, i) {
                var c = r.insertCell();
                c.setAttribute('data-libelle', entetes[i][0]);
                if (entetes[i][1]) { c.className = 'nombre'; }
                if (x && x.nodeType) { c.appendChild(x); } else { c.textContent = x == null ? '' : x; }
            });
        });
    }

    /** La leçon, et sous elle, en dépliant : chaque question, sa réponse, la bonne. */
    function celluleQuiz(q) {
        var titre = nomPage(q.page) + (q.serie ? ' (chat)' : '');
        if (!q.details || !q.details.length) { return titre; }
        var bloc = el('details', 'reponses');
        bloc.appendChild(el('summary', '', titre));
        var ol = el('ol', 'reponses');
        q.details.forEach(function (d) {
            var li = el('li');
            li.appendChild(el('span', d.ok ? 'ok' : 'ko', d.ok ? '✓ ' : '✗ '));
            li.appendChild(document.createTextNode(d.q || ''));
            li.appendChild(el('br'));
            li.appendChild(el('span', 'muet', 'Sa réponse : '));
            li.appendChild(document.createTextNode(d.r || '—'));
            if (!d.ok) {
                li.appendChild(el('br'));
                li.appendChild(el('span', 'muet', 'Bonne réponse : '));
                li.appendChild(document.createTextNode(d.b || '—'));
            }
            ol.appendChild(li);
        });
        bloc.appendChild(ol);
        return bloc;
    }

    function rendreErreurs(L) {
        var rangees = [];
        quizUniques(L).forEach(function (q) {
            (q.details || []).forEach(function (d) {
                if (!d.ok && rangees.length < 30) {
                    rangees.push([heure(dateDe(q)), nomPage(q.page), d.q || '', d.r || '—', d.b || '—']);
                }
            });
        });
        tableau($('erreurs'), [['Quand'], ['Leçon'], ['Question'], ['Sa réponse'], ['Bonne réponse']], rangees,
            'Aucune erreur enregistrée pour l\'instant.');
    }

    function rendreQuiz(L) {
        var rangees = quizUniques(L).slice(0, 25).map(function (q) {
            return [
                heure(dateDe(q)),
                celluleQuiz(q),
                q.duree ? duree(q.duree) : '',
                pastille(q.score || 0, q.total || 0)
            ];
        });
        tableau($('quiz'), [['Quand'], ['Leçon'], ['Durée', true], ['Score', true]], rangees, 'Aucun quiz pour l\'instant.');
    }

    function rendreJamais(L) {
        var zone = $('jamais');
        zone.innerHTML = '';
        var vues = {};
        L.forEach(function (l) { if (l.page) { vues[l.page] = true; } });
        var ul = el('ul', 'jamais');
        Object.keys(LECONS).forEach(function (id) {
            if (LECONS[id].statut !== 'prete' || vues[id]) { return; }
            var m = MATIERES[LECONS[id].matiere];
            ul.appendChild(el('li', '', (m ? m.icone + ' ' : '') + LECONS[id].titre));
        });
        if (!ul.children.length) { zone.appendChild(el('p', 'sous', 'Elle a ouvert toutes les leçons prêtes. 🎉')); return; }
        zone.appendChild(el('p', 'sous', ul.children.length + ' leçon(s) prête(s) jamais ouverte(s) sur les 120 derniers jours :'));
        zone.appendChild(ul);
    }

    var TYPES = { visite: '📖 A ouvert', temps: '⏱️ Est restée', quiz: '🎯 Quiz', question: '💬 Question au chat' };

    function rendreJournal(L) {
        var rangees = L.slice(0, 60).map(function (l) {
            var detail = '';
            if (l.type === 'temps') { detail = duree(l.duree); }
            if (l.type === 'quiz') { detail = (l.score || 0) + '/' + (l.total || 0); }
            return [heure(dateDe(l)), TYPES[l.type] || l.type, nomPage(l.page), detail];
        });
        tableau($('journal'), [['Quand'], ['Quoi'], ['Page'], ['', true]], rangees, 'Rien pour l\'instant : elle n\'a pas encore utilisé l\'app depuis la mise en route du suivi.');
    }

    function rendreBoutonCompter() {
        var off = lire('localStorage', ARRET) === '1';
        $('ne-pas-compter').textContent = off
            ? '✅ Cet appareil n\'est pas compté (recompter)'
            : '🚫 Ne pas compter cet appareil';
    }

    function rendre() {
        rendreAppareils();
        rendreBoutonCompter();
        var L = lignesChoisies();
        rendreTuiles(L);
        rendreCalendrier(L);
        rendreMatieres(L);
        rendreQuiz(L);
        rendreErreurs(L);
        rendreJamais(L);
        rendreJournal(L);
    }

    /* ============================================================
       Démarrage
       ============================================================ */

    $('form-connexion').addEventListener('submit', function (e) {
        e.preventDefault();
        charger($('mdp').value);
    });
    $('rafraichir').addEventListener('click', function () {
        var mdp = lire('sessionStorage', CLE_MDP);
        if (mdp) { charger(mdp); }
    });
    $('deconnexion').addEventListener('click', function () {
        ecrire('sessionStorage', CLE_MDP, null);
        lignes = [];
        $('mdp').value = '';
        $('tableau').hidden = true;
        $('ecran-connexion').hidden = false;
    });
    $('choix-appareil').addEventListener('change', function () {
        appareilChoisi = this.value;
        rendre();
    });
    $('ne-pas-compter').addEventListener('click', function () {
        var off = lire('localStorage', ARRET) === '1';
        ecrire('localStorage', ARRET, off ? null : '1');
        rendreBoutonCompter();
    });

    var memo = lire('sessionStorage', CLE_MDP);
    if (memo) { charger(memo); }
})();
