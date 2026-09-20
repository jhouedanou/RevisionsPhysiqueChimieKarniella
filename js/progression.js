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
            return true;
        } catch (err) {
            return false;   // quota atteint ou stockage refusé : sans conséquence
        }
    }

    function entree(donnees, slug) {
        if (!donnees.pages[slug]) {
            donnees.pages[slug] = { visites: 0, matiere: null, quiz: [], questions: 0 };
        }
        return donnees.pages[slug];
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
    function enregistrerQuiz(slug, correct, total, serie) {
        if (!slug || !total) { return; }
        var donnees = lire();
        var page = entree(donnees, slug);
        var dernier = page.quiz[page.quiz.length - 1];

        if (serie && dernier && dernier.serie === serie) {
            dernier.correct = correct;
            dernier.total = total;
            dernier.date = Date.now();
        } else {
            page.quiz.push({ correct: correct, total: total, date: Date.now(), serie: serie || null });
            page.quiz = page.quiz.slice(-MAX_QUIZ_GARDES);
        }
        ecrire(donnees);
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
        pourPage: pourPage,
        resume: resume,
        reinitialiser: reinitialiser,
        disponible: disponible
    };
})();
