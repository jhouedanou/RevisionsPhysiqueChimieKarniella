/**
 * progression.js — Ce que Karniella a déjà révisé.
 *
 * Avant ce module, aucun score n'était conservé nulle part : chaque quiz du
 * site calculait un pourcentage, l'affichait, et l'oubliait au rechargement.
 *
 * Tout tient dans une seule clé localStorage. Chaque accès est protégé : en
 * navigation privée stricte, dans un iframe cloisonné ou avec le stockage
 * désactivé, `localStorage` lève au lieu de renvoyer null. Le site doit rester
 * parfaitement utilisable dans ce cas — on perd le suivi, rien d'autre.
 *
 * Chargé automatiquement par chat-assistant.js : aucune page HTML à modifier.
 */
(function () {
    'use strict';

    if (window.KarniellaProgression) { return; }

    var CLE = 'karniella-progression';
    var VERSION = 1;
    var MAX_QUIZ_GARDES = 10;   // par page : de quoi voir une évolution, pas un journal
    var MAX_JOURS_GARDES = 60;  // assez pour la série en cours ; le record est gardé à part

    /* ============================================================
       Stockage
       ============================================================ */

    function lire() {
        try {
            var brut = JSON.parse(window.localStorage.getItem(CLE));
            if (!brut || brut.version !== VERSION) { return { version: VERSION, pages: {} }; }
            if (!brut.pages) { brut.pages = {}; }
            return brut;
        } catch (err) {
            return { version: VERSION, pages: {} };
        }
    }

    function ecrire(donnees) {
        try {
            window.localStorage.setItem(CLE, JSON.stringify(donnees));
        } catch (err) {
            return false;   // quota atteint ou stockage refusé : sans conséquence
        }
        // Les badges (js/badges.js) écoutent pour féliciter au bon moment.
        try {
            window.dispatchEvent(new CustomEvent('karniella:progression'));
        } catch (err) { /* très vieux navigateur : pas de félicitations, rien d'autre */ }
        return true;
    }

    function entree(donnees, slug) {
        if (!donnees.pages[slug]) {
            donnees.pages[slug] = { visites: 0, matiere: null, quiz: [], questions: 0 };
        }
        return donnees.pages[slug];
    }

    /* ============================================================
       Jours de révision — pour la série de jours
       ============================================================ */

    /** « 2026-09-23 », à l'heure de Karniella et pas en UTC. */
    function jourDe(date) {
        var d = date || new Date();
        var mois = d.getMonth() + 1;
        var jour = d.getDate();
        return d.getFullYear() + '-' + (mois < 10 ? '0' : '') + mois + '-' + (jour < 10 ? '0' : '') + jour;
    }

    function veilleDe(cle) {
        var morceaux = cle.split('-');
        return jourDe(new Date(+morceaux[0], +morceaux[1] - 1, +morceaux[2] - 1));
    }

    /** Longueur de la série qui se termine le jour `cle`. */
    function serieFinissantLe(jours, cle) {
        var n = 0;
        while (jours[cle]) { n++; cle = veilleDe(cle); }
        return n;
    }

    /** Compte une activité (`lecons` ou `quiz`) pour aujourd'hui. */
    function noterJour(donnees, quoi) {
        var jours = donnees.jours || (donnees.jours = {});
        var aujourdhui = jourDe();
        var jour = jours[aujourdhui] || (jours[aujourdhui] = { lecons: 0, quiz: 0 });
        jour[quoi] += 1;

        donnees.record = Math.max(donnees.record || 0, serieFinissantLe(jours, aujourdhui));

        var cles = Object.keys(jours).sort();
        cles.slice(0, Math.max(0, cles.length - MAX_JOURS_GARDES)).forEach(function (c) {
            delete jours[c];
        });
    }

    /* ============================================================
       Écriture
       ============================================================ */

    /** Karniella a ouvert cette leçon. */
    function marquerVisite(slug, matiere) {
        if (!slug) { return; }
        var donnees = lire();
        var page = entree(donnees, slug);
        page.visites += 1;
        page.derniereVisite = Date.now();
        if (matiere) { page.matiere = matiere; }
        noterJour(donnees, 'lecons');
        ecrire(donnees);
    }

    /**
     * Elle a répondu à un quiz — dans le chat ou dans la page.
     *
     * `serie` permet d'enregistrer au fil des réponses plutôt qu'à la fin :
     * dans le chat, une leçon peut compter 20 questions et Karniella s'arrête
     * quand elle veut. Tant que l'identifiant de série ne change pas, on met à
     * jour la même entrée au lieu d'en empiler une par question.
     */
    function enregistrerQuiz(slug, correct, total, serie, extra) {
        if (!slug || !total) { return; }
        var donnees = lire();
        var page = entree(donnees, slug);
        var dernier = page.quiz[page.quiz.length - 1];

        if (serie && dernier && dernier.serie === serie) {
            dernier.correct = correct;
            dernier.total = total;
            dernier.date = Date.now();
        } else {
            var tentative = { correct: correct, total: total, date: Date.now(), serie: serie || null };
            // Mode Ghost 👻 : le temps mis, en secondes, et si c'était une course contre le fantôme.
            if (extra && typeof extra.temps === 'number') { tentative.temps = Math.round(extra.temps); }
            if (extra && extra.fantome) { tentative.fantome = true; }
            page.quiz.push(tentative);
            page.quiz = page.quiz.slice(-MAX_QUIZ_GARDES);
            // Un quiz compte une fois, pas à chaque réponse d'une même série.
            noterJour(donnees, 'quiz');
            // Le record sert au fantôme : gardé à part, il survit à la coupe des 10 derniers.
            if (typeof tentative.temps === 'number') { majRecord(page, tentative); }
        }
        ecrire(donnees);
    }

    /** Meilleure tentative chronométrée : d'abord le score, puis le temps le plus court. */
    function majRecord(page, t) {
        var r = page.record;
        if (!r || t.correct > r.correct || (t.correct === r.correct && t.temps < r.temps)) {
            page.record = { correct: t.correct, total: t.total, temps: t.temps, date: t.date };
        }
    }

    /** Le record chronométré d'une page — pour le mode Ghost 👻 — ou null. */
    function record(slug) {
        var page = lire().pages[slug];
        return (page && page.record) ? page.record : null;
    }

    /** Elle a posé une question au chat sur cette leçon. */
    function enregistrerQuestion(slug) {
        if (!slug) { return; }
        var donnees = lire();
        entree(donnees, slug).questions += 1;
        ecrire(donnees);
    }

    /* ============================================================
       Lecture
       ============================================================ */

    /** Meilleur pourcentage obtenu sur une page, ou null. */
    function meilleurScore(page) {
        if (!page || !page.quiz.length) { return null; }
        var meilleur = 0;
        for (var i = 0; i < page.quiz.length; i++) {
            var pct = Math.round((page.quiz[i].correct / page.quiz[i].total) * 100);
            if (pct > meilleur) { meilleur = pct; }
        }
        return meilleur;
    }

    function pourPage(slug) {
        var page = lire().pages[slug];
        if (!page) { return null; }
        return {
            visites: page.visites,
            questions: page.questions,
            quiz: page.quiz,
            meilleurScore: meilleurScore(page),
            derniereVisite: page.derniereVisite || null
        };
    }

    /**
     * Résumé par matière. `catalogue` est l'index du chat
     * (window.KarniellaChatKnowledge.pages) : sans lui on ne connaît que les
     * pages déjà visitées, donc on ne saurait pas dire ce qu'il RESTE à voir.
     */
    function resume(catalogue) {
        var donnees = lire();
        var matieres = {};

        function bucket(matiere) {
            if (!matieres[matiere]) {
                matieres[matiere] = { total: 0, vues: 0, quiz: 0, sommeScores: 0, nbScores: 0 };
            }
            return matieres[matiere];
        }

        if (catalogue) {
            Object.keys(catalogue).forEach(function (slug) {
                var matiere = catalogue[slug].matiere;
                if (!matiere || matiere === 'general') { return; }
                bucket(matiere).total += 1;
            });
        }

        Object.keys(donnees.pages).forEach(function (slug) {
            var page = donnees.pages[slug];
            var matiere = (catalogue && catalogue[slug] && catalogue[slug].matiere) || page.matiere;
            if (!matiere || matiere === 'general') { return; }

            var b = bucket(matiere);
            if (page.visites > 0) { b.vues += 1; }
            if (page.quiz.length) {
                b.quiz += page.quiz.length;
                var score = meilleurScore(page);
                if (score !== null) { b.sommeScores += score; b.nbScores += 1; }
            }
        });

        return Object.keys(matieres).map(function (matiere) {
            var b = matieres[matiere];
            return {
                matiere: matiere,
                total: b.total,
                vues: b.vues,
                quiz: b.quiz,
                scoreMoyen: b.nbScores ? Math.round(b.sommeScores / b.nbScores) : null
            };
        }).sort(function (a, b) { return b.vues - a.vues; });
    }

    /**
     * La série de jours de révision.
     *   actuelle    : jours d'affilée jusqu'à aujourd'hui — ou jusqu'à hier, tant
     *                 qu'aujourd'hui n'est pas fini : la série n'est pas perdue à 8 h
     *   record      : la plus longue série jamais faite
     *   aujourdhui  : { lecons, quiz } faits aujourd'hui
     */
    function serie() {
        var donnees = lire();
        var jours = donnees.jours || {};
        var aujourdhui = jourDe();
        var actuelle = jours[aujourdhui]
            ? serieFinissantLe(jours, aujourdhui)
            : serieFinissantLe(jours, veilleDe(aujourdhui));
        return {
            actuelle: actuelle,
            record: Math.max(donnees.record || 0, actuelle),
            aujourdhui: jours[aujourdhui] || { lecons: 0, quiz: 0 },
            jour: aujourdhui
        };
    }

    /** Toutes les pages suivies — pour les badges et la carte « Reprendre ». */
    function pages() {
        var brutes = lire().pages;
        var liste = {};
        Object.keys(brutes).forEach(function (slug) {
            var p = brutes[slug];
            liste[slug] = {
                visites: p.visites,
                questions: p.questions,
                quiz: p.quiz,
                meilleurScore: meilleurScore(p),
                derniereVisite: p.derniereVisite || null,
                matiere: p.matiere
            };
        });
        return liste;
    }

    function reinitialiser() {
        try { window.localStorage.removeItem(CLE); } catch (err) { /* rien à faire */ }
    }

    /** Le stockage est-il réellement disponible ? (affichage conditionnel) */
    function disponible() {
        try {
            window.localStorage.setItem(CLE + '-test', '1');
            window.localStorage.removeItem(CLE + '-test');
            return true;
        } catch (err) {
            return false;
        }
    }

    window.KarniellaProgression = {
        marquerVisite: marquerVisite,
        enregistrerQuiz: enregistrerQuiz,
        enregistrerQuestion: enregistrerQuestion,
        record: record,
        pourPage: pourPage,
        resume: resume,
        serie: serie,
        pages: pages,
        reinitialiser: reinitialiser,
        disponible: disponible
    };
})();
