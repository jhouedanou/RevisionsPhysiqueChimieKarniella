/**
 * interro.js — Les interros surprises, matière par matière.
 *
 * Trois endroits :
 *   - l'accueil (#interro-surprise) : quand une matière a du nouveau
 *     contenu, une carte « ⚡ Interro surprise ! » invite à la faire ;
 *   - la page d'une matière (.interro-matiere) : la carte de l'interro,
 *     toujours là, avec « Nouveau ! » quand il y a du nouveau ;
 *   - 5e/interro.html?matiere=<id> : l'interro elle-même.
 *
 * Les questions sont dans data/interros/<slug>.json (docs/prompt-interros.md)
 * et l'index par matière dans js/interros-index.js (npm run build:interros).
 * Une interro tire 10 questions au hasard, vrai ou faux et questions de
 * cours : d'abord les erreurs de la dernière fois, puis la moitié sur la
 * leçon la plus récente. Elle se joue dans le quiz en étapes
 * (js/section-quiz.js), qui donne les XP, le score et la correction.
 *
 * Ce qui est fait est gardé dans la clé `karniella-interros` :
 *   { matieres: { <id>: { version, correct, total, date } }, reporte: 'AAAA-MM-JJ' }
 * Une matière est « à faire » tant que la version faite n'est pas celle de
 * l'index : chaque nouveauté relance l'interro.
 */
(function () {
    'use strict';

    var CLE = 'karniella-interros';
    var NB_QUESTIONS = 10;
    var MAX_ERREURS = 3;

    var RACINE = (function () {
        var script = document.currentScript;
        if (script && script.src) { return script.src.replace(/js\/interro\.js(\?.*)?$/, ''); }
        return '';
    })();

    function el(balise, classe, texte) {
        var e = document.createElement(balise);
        if (classe) { e.className = classe; }
        if (texte !== undefined) { e.textContent = texte; }
        return e;
    }

    function echapper(texte) {
        return String(texte === undefined || texte === null ? '' : texte)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function melanger(liste) {
        var l = liste.slice();
        for (var i = l.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = l[i]; l[i] = l[j]; l[j] = t;
        }
        return l;
    }

    /* ============================================================
       L'état : ce qui est fait, ce qui est à faire
       ============================================================ */

    function index() {
        return (window.KarniellaInterros && window.KarniellaInterros.matieres) || {};
    }

    function lireEtat() {
        try {
            var d = JSON.parse(window.localStorage.getItem(CLE) || '{}');
            if (!d || typeof d !== 'object') { d = {}; }
            if (!d.matieres || typeof d.matieres !== 'object') { d.matieres = {}; }
            return d;
        } catch (err) { return { matieres: {} }; }
    }

    function ecrireEtat(etat) {
        try { window.localStorage.setItem(CLE, JSON.stringify(etat)); return true; } catch (err) { return false; }
    }

    /** Sans stockage, on ne sait pas ce qui est fait : pas de surprise qui reviendrait sans cesse. */
    function stockageDisponible() {
        try {
            window.localStorage.setItem(CLE + '-test', '1');
            window.localStorage.removeItem(CLE + '-test');
            return true;
        } catch (err) { return false; }
    }

    function aujourdhui() {
        var d = new Date();
        return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    }

    function aFaire(id) {
        var m = index()[id];
        if (!m) { return false; }
        var fait = lireEtat().matieres[id];
        return !fait || fait.version !== m.version;
    }

    /** Les matières à faire, la nouveauté la plus récente d'abord. */
    function matieresAFaire() {
        var idx = index();
        var ordre = Object.keys(idx);
        return ordre.filter(aFaire).map(function (id) { return idx[id]; }).sort(function (a, b) {
            return b.date.localeCompare(a.date) || ordre.indexOf(a.id) - ordre.indexOf(b.id);
        });
    }

    function marquerFaite(id, correct, total) {
        var m = index()[id];
        if (!m) { return; }
        var etat = lireEtat();
        etat.matieres[id] = { version: m.version, correct: correct, total: total, date: Date.now() };
        ecrireEtat(etat);
    }

    function titreLecon(m, idLecon) {
        for (var i = 0; i < m.lecons.length; i++) {
            if (m.lecons[i].id === idLecon) { return m.lecons[i].titre; }
        }
        return '';
    }

    function lienInterro(id) {
        return RACINE + '5e/interro.html?matiere=' + encodeURIComponent(id);
    }

    /* ============================================================
       L'accueil : la carte « ⚡ Interro surprise ! »
       ============================================================ */

    function rendreAccueil(zone) {
        var liste = matieresAFaire();
        var etat = lireEtat();
        if (!liste.length || !stockageDisponible() || etat.reporte === aujourdhui()) { zone.hidden = true; return; }

        var m = liste[0];
        zone.textContent = '';
        zone.setAttribute('data-matiere', m.id);

        zone.appendChild(el('span', 'interro-eclair', '⚡')).setAttribute('aria-hidden', 'true');
        var texte = el('div', 'interro-texte');
        texte.appendChild(el('p', 'interro-etiquette', 'Interro surprise !'));
        texte.appendChild(el('p', 'interro-titre', m.icone + ' ' + m.nom));
        var fait = etat.matieres[m.id];
        texte.appendChild(el('p', 'interro-detail', fait
            ? 'Nouveau : « ' + titreLecon(m, m.nouvelle) + ' ». Montre ce que tu as retenu !'
            : 'Vrai ou faux et questions de cours sur « ' + titreLecon(m, m.nouvelle) + ' » et tes autres leçons.'));
        zone.appendChild(texte);

        var boutons = el('div', 'interro-boutons');
        var go = el('a', 'btn', 'C\'est parti');
        go.href = lienInterro(m.id);
        boutons.appendChild(go);
        var plusTard = el('button', 'btn btn-ghost', 'Plus tard');
        plusTard.type = 'button';
        plusTard.addEventListener('click', function () {
            var e = lireEtat();
            e.reporte = aujourdhui();
            ecrireEtat(e);
            zone.hidden = true;
        });
        boutons.appendChild(plusTard);
        zone.appendChild(boutons);

        // Trois liens au plus : au premier jour, toutes les matières sont à faire.
        if (liste.length > 1) {
            var autres = el('p', 'interro-autres', 'Aussi à faire : ');
            liste.slice(1, 4).forEach(function (a, i) {
                if (i > 0) { autres.appendChild(document.createTextNode(' · ')); }
                var lien = el('a', '', a.icone + ' ' + a.nom);
                lien.href = lienInterro(a.id);
                autres.appendChild(lien);
            });
            var reste = liste.length - 4;
            if (reste > 0) { autres.appendChild(document.createTextNode(' et ' + reste + (reste > 1 ? ' autres' : ' autre'))); }
            zone.appendChild(autres);
        }
        zone.hidden = false;
    }

    /* ============================================================
       La page d'une matière : la carte de l'interro
       ============================================================ */

    function rendreMatiere(zone) {
        var id = document.body.getAttribute('data-matiere');
        var m = index()[id];
        if (!m) { zone.hidden = true; return; }

        var fait = lireEtat().matieres[id];
        var nouveau = aFaire(id) && stockageDisponible();
        var nbQuestions = m.lecons.reduce(function (s, l) { return s + l.n; }, 0);

        zone.textContent = '';
        var carte = el('a', 'interro-carte' + (nouveau ? ' interro-carte-nouveau' : ''));
        carte.href = lienInterro(id);
        carte.appendChild(el('span', 'interro-eclair', '⚡')).setAttribute('aria-hidden', 'true');
        var texte = el('span', 'interro-texte');
        texte.appendChild(el('strong', 'interro-titre', 'Interro surprise'));
        texte.appendChild(el('span', 'interro-detail', m.lecons.length + (m.lecons.length > 1 ? ' leçons' : ' leçon') +
            ' · ' + Math.min(NB_QUESTIONS, nbQuestions) + ' questions : vrai ou faux et questions de cours'));
        if (fait && typeof fait.total === 'number') {
            texte.appendChild(el('span', 'interro-note', 'Dernière note : ' + fait.correct + '/' + fait.total));
        }
        carte.appendChild(texte);
        if (nouveau) { carte.appendChild(el('span', 'interro-nouveau', 'Nouveau !')); }
        carte.appendChild(el('span', 'interro-fleche', '→')).setAttribute('aria-hidden', 'true');
        zone.appendChild(carte);
        zone.hidden = false;
    }

    /* ============================================================
       La page de l'interro
       ============================================================ */

    /** Une question de data/interros/<slug>.json, au format de js/section-quiz.js. */
    function versQuiz(q, idLecon, vraiFaux) {
        var commun = { lecon: idLecon, langue: q.langue, reponseLangue: q.reponseLangue };
        if (vraiFaux) {
            return Object.assign(commun, {
                type: 'vrai-faux',
                question: echapper(q.affirmation),
                options: ['Vrai', 'Faux'],
                optionsLangue: 'fr',
                correctAnswer: q.vrai ? 0 : 1,
                explanation: echapper(q.correction)
            });
        }
        return Object.assign(commun, {
            type: q.accepte ? 'saisie' : 'cours',
            question: echapper(q.question),
            reponse: echapper(q.reponse),
            accepte: q.accepte,
            exact: Boolean(q.exact),
            explanation: q.explication ? echapper(q.explication) : ''
        });
    }

    /**
     * Les questions de l'interro. D'abord les erreurs de la dernière fois
     * (3 au plus), puis la moitié sur la leçon la plus récente, le reste
     * sur les autres leçons à tour de rôle. Les types alternent : autant de
     * vrai ou faux que de questions de cours.
     */
    function tirer(lecons, idNouvelle, erreurs) {
        var choisies = [];
        var prises = {};
        function prendre(q) {
            if (!q || prises[q.question]) { return false; }
            prises[q.question] = true;
            choisies.push(q);
            return true;
        }

        var toutes = [];
        lecons.forEach(function (l) { toutes = toutes.concat(l.questions); });
        melanger(toutes.filter(function (q) { return erreurs.indexOf(String(q.question).slice(0, 300)) !== -1; }))
            .slice(0, MAX_ERREURS).forEach(prendre);

        var typeSuivant = Math.random() < 0.5 ? 'vf' : 'cours';
        var reserves = lecons.map(function (l) {
            return {
                id: l.id,
                vf: melanger(l.questions.filter(function (q) { return q.type === 'vrai-faux'; })),
                cours: melanger(l.questions.filter(function (q) { return q.type !== 'vrai-faux'; }))
            };
        });
        function piocher(r) {
            var ordre = typeSuivant === 'vf' ? ['vf', 'cours'] : ['cours', 'vf'];
            for (var k = 0; k < ordre.length; k++) {
                while (r[ordre[k]].length) {
                    if (prendre(r[ordre[k]].shift())) {
                        typeSuivant = ordre[k] === 'vf' ? 'cours' : 'vf';
                        return true;
                    }
                }
            }
            return false;
        }

        var nouvelle = null;
        var autres = [];
        reserves.forEach(function (r) { if (r.id === idNouvelle) { nouvelle = r; } else { autres.push(r); } });
        var part = autres.length ? Math.ceil(NB_QUESTIONS / 2) : NB_QUESTIONS;
        var deja = choisies.filter(function (q) { return q.lecon === idNouvelle; }).length;
        while (nouvelle && deja < part && choisies.length < NB_QUESTIONS && piocher(nouvelle)) { deja++; }

        autres = melanger(autres);
        var encore = true;
        while (choisies.length < NB_QUESTIONS && encore) {
            encore = false;
            autres.forEach(function (r) {
                if (choisies.length < NB_QUESTIONS && piocher(r)) { encore = true; }
            });
        }
        while (nouvelle && choisies.length < NB_QUESTIONS && piocher(nouvelle)) { /* les autres leçons sont épuisées */ }
        return melanger(choisies);
    }

    function chargerLecons(m) {
        return Promise.all(m.lecons.map(function (l) {
            return window.fetch(RACINE + 'data/interros/' + encodeURIComponent(l.id) + '.json')
                .then(function (r) { return r.ok ? r.json() : null; })
                .catch(function () { return null; })
                .then(function (d) {
                    if (!d) { return null; }
                    var questions = (d.vrai_faux || []).map(function (q) { return versQuiz(q, l.id, true); })
                        .concat((d.restitution || []).map(function (q) { return versQuiz(q, l.id, false); }));
                    return { id: l.id, titre: l.titre, questions: questions };
                });
        })).then(function (lecons) { return lecons.filter(Boolean); });
    }

    function pageInterro(zone) {
        var id = new URLSearchParams(window.location.search).get('matiere') || '';
        var m = index()[id];
        var slug = 'interro-' + id;
        var lecons = [];

        function erreur(message) {
            zone.textContent = '';
            var p = el('p', 'interro-erreur', message + ' ');
            var a = el('a', '', 'Retour à l\'accueil');
            a.href = RACINE + 'index.html';
            p.appendChild(a);
            zone.appendChild(p);
        }

        function erreursPrecedentes() {
            var P = window.KarniellaProgression;
            return P && P.erreurs ? P.erreurs(slug) : [];
        }

        function lienRetour() {
            var p = el('p', 'interro-retour');
            var a = el('a', '', '↩ Revenir à ' + m.nom);
            a.href = RACINE + '5e/' + id + '.html';
            p.appendChild(a);
            return p;
        }

        function ecranDepart() {
            var nouveau = aFaire(id);
            var nbErreurs = erreursPrecedentes().length;
            zone.textContent = '';
            var carte = el('section', 'interro-depart');
            carte.appendChild(el('span', 'interro-etiquette', '⚡ Interro surprise'));
            carte.appendChild(el('h1', '', m.icone + ' ' + m.nom));
            carte.appendChild(el('p', '', 'Range ton cahier ! ' + NB_QUESTIONS + ' questions sur tes leçons : des vrai ou faux et des questions de cours.'));
            if (nouveau) { carte.appendChild(el('p', 'interro-nouveau-lecon', 'Nouveau : ' + titreLecon(m, m.nouvelle))); }
            if (nbErreurs) { carte.appendChild(el('p', 'interro-detail', 'Tes erreurs de la dernière fois reviennent.')); }
            var boutons = el('div', 'interro-boutons');
            var go = el('button', 'btn', 'Je suis prête →');
            go.type = 'button';
            go.addEventListener('click', lancer);
            boutons.appendChild(go);
            carte.appendChild(boutons);
            zone.appendChild(carte);
            zone.appendChild(lienRetour());
            var titre = carte.querySelector('h1');
            if (titre) { titre.setAttribute('tabindex', '-1'); }
        }

        function lancer() {
            var questions = tirer(lecons, m.nouvelle, erreursPrecedentes());
            if (!questions.length) { erreur('Pas encore de questions pour cette matière. 🐴'); return; }
            zone.textContent = '';
            var conteneur = el('div', 'interro-quiz');
            conteneur.id = 'interro-quiz';
            zone.appendChild(conteneur);
            var apres = el('div', 'interro-apres');
            apres.hidden = true;
            zone.appendChild(apres);
            // « Rejouer » et « Réviser mes erreurs » relancent le quiz : le bilan d'avant s'efface.
            conteneur.addEventListener('click', function (e) {
                if (e.target.closest && e.target.closest('.quiz-rejouer, .quiz-reviser')) { apres.hidden = true; }
            });
            zone.appendChild(lienRetour());
            window.scrollTo({ top: 0, behavior: 'auto' });

            var quiz = window.initSectionQuiz('interro-quiz', questions, {
                etapes: true,
                slug: slug,
                titre: 'Interro · ' + m.nom,
                reprise: false,
                accueil: false,
                finir: function (bilan) {
                    if (!bilan.revision) { marquerFaite(id, bilan.correct, bilan.total); }
                    rendreApres(apres, quiz);
                }
            });
        }

        /** Sous le résultat : les leçons à revoir et une autre interro. */
        function rendreApres(apres, quiz) {
            apres.textContent = '';
            var aRevoir = [];
            quiz.serie.forEach(function (i, k) {
                var q = quiz.questions[i];
                if (!quiz.reponses[k] && aRevoir.indexOf(q.lecon) === -1) { aRevoir.push(q.lecon); }
            });
            if (aRevoir.length) {
                apres.appendChild(el('p', 'interro-revoir-titre', aRevoir.length > 1 ? 'Leçons à relire :' : 'Leçon à relire :'));
                var liste = el('ul', 'interro-revoir');
                aRevoir.forEach(function (idLecon) {
                    var li = el('li');
                    var a = el('a', '', titreLecon(m, idLecon));
                    a.href = RACINE + '5e/' + idLecon + '.html';
                    li.appendChild(a);
                    liste.appendChild(li);
                });
                apres.appendChild(liste);
            }
            var autre = el('button', 'btn btn-ghost', '⚡ Une autre interro');
            autre.type = 'button';
            autre.addEventListener('click', lancer);
            apres.appendChild(autre);
            apres.hidden = false;
        }

        if (!m) { erreur('Cette interro n\'existe pas encore. 🐴'); return; }
        document.body.setAttribute('data-matiere', id);
        document.title = 'Interro surprise · ' + m.nom + ' - Révisions Karniella';
        if (window.KarniellaCoquille) { window.KarniellaCoquille.rafraichir(); }
        if (typeof window.fetch !== 'function' || typeof Promise === 'undefined') {
            erreur('Ce navigateur ne peut pas charger l\'interro.');
            return;
        }
        chargerLecons(m).then(function (chargees) {
            lecons = chargees;
            if (!lecons.length) { erreur('L\'interro n\'a pas pu se charger. Vérifie ta connexion.'); return; }
            ecranDepart();
        });
    }

    /* ============================================================
       Démarrage
       ============================================================ */

    function demarrer() {
        var page = document.getElementById('interro');
        if (page) { pageInterro(page); return; }
        var accueil = document.getElementById('interro-surprise');
        if (accueil) { rendreAccueil(accueil); }
        var matiere = document.querySelector('.interro-matiere');
        if (matiere) { rendreMatiere(matiere); }
    }

    window.KarniellaInterro = {
        aFaire: aFaire,
        matieresAFaire: matieresAFaire,
        marquerFaite: marquerFaite
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', demarrer);
    } else {
        demarrer();
    }
})();
