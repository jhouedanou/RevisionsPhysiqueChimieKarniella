/**
 * mission.js — Une mission de 3 minutes, façon jeu : 5e/mission.html?id=<slug>
 *
 * Lit data/missions/<slug>.json (format du prompt de docs/prompt-missions.md) :
 *   story_context, micro_learning_blocks[], quiz[]
 * et l'affiche en trois écrans, une carte à la fois, jamais de scroll :
 *   1. l'histoire (la mission) ;
 *   2. les micro-leçons, une carte par bloc ;
 *   3. le quiz en étapes (js/section-quiz.js : chrono, XP, fantôme 👻).
 *
 * Chargé dans le <head> avant js/coquille.js : il pose data-matiere sur <body>
 * dès que possible, pour que le fil d'Ariane et les couleurs soient bons.
 */
(function () {
    'use strict';

    var RACINE = (function () {
        var script = document.currentScript;
        if (script && script.src) { return script.src.replace(/js\/mission\.js(\?.*)?$/, ''); }
        return '../';
    })();

    var id = new URLSearchParams(window.location.search).get('id') || '';
    var mission = null;
    var etape = 0;       // 0 = histoire, 1..n = blocs, n+1 = quiz
    var zone = null;

    function el(balise, classe, texte) {
        var e = document.createElement(balise);
        if (classe) { e.className = classe; }
        if (texte !== undefined) { e.textContent = texte; }
        return e;
    }

    function matiereDe(idLecon) {
        var programme = window.KarniellaProgramme;
        if (!programme) { return null; }
        for (var i = 0; i < programme.matieres.length; i++) {
            var m = programme.matieres[i];
            for (var j = 0; j < (m.lecons || []).length; j++) {
                if (m.lecons[j].id === idLecon) { return m; }
            }
        }
        return null;
    }

    function poserMatiere() {
        var m = matiereDe(id);
        if (m) { document.body.setAttribute('data-matiere', m.id); }
    }

    /* ============================================================
       Les écrans
       ============================================================ */

    function etapes() {
        var total = 2 + mission.micro_learning_blocks.length;   // histoire + blocs + quiz
        var e = el('div', 'mission-etapes');
        e.setAttribute('aria-label', 'Étape ' + (etape + 1) + ' sur ' + total);
        e.appendChild(el('span', '', etape === 0 ? 'Mission' : (etape > mission.micro_learning_blocks.length ? 'Quiz' : 'Leçon')));
        for (var i = 0; i < total; i++) { e.appendChild(el('i', i <= etape ? 'on' : '')); }
        e.appendChild(el('span', '', (etape + 1) + '/' + total));
        return e;
    }

    function bouton(texte, plein, action) {
        var b = el('button', 'mission-btn' + (plein ? ' mission-btn-plein' : ''), texte);
        b.type = 'button';
        b.addEventListener('click', action);
        return b;
    }

    function ecranHistoire() {
        var carte = el('section', 'mission-carte mission-histoire');
        carte.appendChild(el('span', 'mission-etiquette', 'Étape 1 · Ta mission'));
        carte.appendChild(el('h1', '', mission.titre || 'Mission'));
        carte.appendChild(el('p', '', mission.story_context));
        carte.appendChild(el('span', 'mission-duree', '⏱ ' + (mission.duree_minutes || 3) + ' minutes'));
        carte.appendChild(el('span', 'deco', '🚀')).setAttribute('aria-hidden', 'true');
        var boutons = el('div', 'mission-boutons');
        boutons.appendChild(bouton('Accepter la mission →', true, function () { aller(1); }));
        carte.appendChild(boutons);
        return carte;
    }

    function ecranBloc(n) {
        var bloc = mission.micro_learning_blocks[n - 1];
        var carte = el('section', 'mission-carte mission-bloc');
        carte.appendChild(el('span', 'mission-etiquette', 'Étape 2 · Micro-leçon ' + n + ' sur ' + mission.micro_learning_blocks.length));
        carte.appendChild(el('h2', '', bloc.titre));
        carte.appendChild(el('p', '', bloc.contenu));
        var boutons = el('div', 'mission-boutons');
        boutons.appendChild(bouton('← Retour', false, function () { aller(n - 1); }));
        var dernier = n === mission.micro_learning_blocks.length;
        boutons.appendChild(bouton(dernier ? 'Au quiz ! →' : 'Suivant →', true, function () { aller(n + 1); }));
        carte.appendChild(boutons);
        return carte;
    }

    function ecranQuiz() {
        var carte = el('section', 'mission-carte');
        carte.appendChild(el('span', 'mission-etiquette', 'Étape 3 · Le quiz de validation'));
        var conteneur = el('div');
        conteneur.id = 'mission-quiz';
        carte.appendChild(conteneur);
        var boutons = el('div', 'mission-boutons');
        boutons.appendChild(bouton('← Relire', false, function () { aller(mission.micro_learning_blocks.length); }));
        carte.appendChild(boutons);

        window.setTimeout(function () {
            if (!window.initSectionQuiz) { conteneur.textContent = 'Le quiz n\'a pas pu se charger.'; return; }
            var questions = mission.quiz.map(function (q) {
                return { question: q.question, options: q.options, correctAnswer: q.correct_answer_index, explanation: q.explanation };
            });
            window.initSectionQuiz('mission-quiz', questions, {
                etapes: true,
                slug: 'mission-' + id,
                titre: '🎯 Valide ta mission'
            });
        }, 0);
        return carte;
    }

    function aller(n) {
        etape = n;
        rendre();
        window.scrollTo({ top: 0, behavior: 'auto' });
    }

    function rendre() {
        zone.textContent = '';
        zone.appendChild(etapes());
        var nBlocs = mission.micro_learning_blocks.length;
        if (etape === 0) { zone.appendChild(ecranHistoire()); }
        else if (etape <= nBlocs) { zone.appendChild(ecranBloc(etape)); }
        else { zone.appendChild(ecranQuiz()); }

        var retour = el('p', 'mission-retour');
        var a = el('a', '', '↩ Revenir à la leçon complète');
        a.href = RACINE + '5e/' + (mission.lecon || id) + '.html';
        retour.appendChild(a);
        zone.appendChild(retour);

        var titre = zone.querySelector('h1, h2, .quiz-etapes-haut h4');
        if (titre && etape > 0) { titre.setAttribute('tabindex', '-1'); titre.focus({ preventScroll: true }); }
    }

    function erreur(message) {
        zone.textContent = '';
        var p = el('p', 'mission-erreur', message + ' ');
        var a = el('a', '', 'Retour à l\'accueil');
        a.href = RACINE + 'index.html';
        p.appendChild(a);
        zone.appendChild(p);
    }

    function charger() {
        zone = document.getElementById('mission');
        poserMatiere();
        if (!id) { erreur('Aucune mission demandée.'); return; }
        if (typeof window.fetch !== 'function') { erreur('Ce navigateur ne peut pas charger la mission.'); return; }

        window.fetch(RACINE + 'data/missions/' + encodeURIComponent(id) + '.json')
            .then(function (r) { return r.ok ? r.json() : null; })
            .catch(function () { return null; })
            .then(function (donnees) {
                if (!donnees || !donnees.quiz || !donnees.micro_learning_blocks) { erreur('Cette mission n\'existe pas encore. 🐴'); return; }
                mission = donnees;
                document.title = (mission.titre || 'Mission') + ' - Révisions Karniella';
                if (mission.matiere) { document.body.setAttribute('data-matiere', mission.matiere); }
                if (window.KarniellaCoquille) { window.KarniellaCoquille.rafraichir(); }
                rendre();
            });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', charger);
    } else {
        charger();
    }
})();
