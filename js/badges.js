/**
 * badges.js — Les badges fer à cheval 🐴 et les félicitations de la série de jours.
 *
 * Chargé par chat-assistant.js : aucune page HTML à modifier.
 *
 * Les badges se DÉDUISENT de js/progression.js (leçons ouvertes, quiz, série de
 * jours). Une fois gagné, un badge est gardé pour de bon, dans sa propre clé :
 * une leçon ajoutée plus tard au programme ne doit pas reprendre à Karniella le
 * badge « tout vu » qu'elle avait déjà.
 *
 * À chaque progrès, progression.js émet `karniella:progression` : on recalcule,
 * et un petit message annonce le badge gagné ou la série qui continue.
 */
(function () {
    'use strict';

    if (window.KarniellaBadges) { return; }

    var RACINE = (function () {
        var script = document.currentScript;
        if (script && script.src) {
            return script.src.replace(/js\/badges\.js(\?.*)?$/, '');
        }
        return '';
    })();

    var CLE = 'karniella-badges';
    var QUESTIONS_MIN_QUIZ = 3;   // en dessous, une série du chat n'est pas un vrai quiz

    /* ============================================================
       Les badges
       ============================================================ */

    var FIXES = [
        { id: 'premier-galop', icone: '🐴', nom: 'Premier galop',
          quoi: 'Ouvre ta première leçon.', test: function (s) { return s.lecons >= 1; } },
        { id: 'curieuse', icone: '💬', nom: 'Curieuse',
          quoi: 'Pose une question au poney.', test: function (s) { return s.questions >= 1; } },
        { id: 'premier-quiz', icone: '🎯', nom: 'Premier quiz',
          quoi: 'Termine un quiz.', test: function (s) { return s.quiz >= 1; } },
        { id: 'sans-faute', icone: '🏆', nom: 'Sans faute',
          quoi: 'Fais 100 % à un quiz.', test: function (s) { return s.sansFaute >= 1; } },
        { id: 'cavaliere-quiz', icone: '🎖️', nom: 'Cavalière des quiz',
          quoi: 'Termine 10 quiz.', test: function (s) { return s.quiz >= 10; } },
        { id: 'exploratrice', icone: '🧭', nom: 'Exploratrice',
          quoi: 'Révise dans 3 matières différentes.', test: function (s) { return s.matieres >= 3; } },
        { id: 'serie-3', icone: '🔥', nom: 'Trois jours au trot',
          quoi: 'Révise 3 jours de suite.', test: function (s) { return s.record >= 3; } },
        { id: 'serie-7', icone: '🌟', nom: 'Une semaine au galop',
          quoi: 'Révise 7 jours de suite.', test: function (s) { return s.record >= 7; } },
        { id: 'serie-30', icone: '👑', nom: 'Reine de l\'écurie',
          quoi: 'Révise 30 jours de suite.', test: function (s) { return s.record >= 30; } }
    ];

    /** Un badge « tout vu » par matière qui a au moins une leçon prête. */
    function badgesMatieres(programme) {
        return ((programme && programme.matieres) || []).map(function (m) {
            var ids = (m.lecons || [])
                .filter(function (l) { return l.statut === 'prete'; })
                .map(function (l) { return l.id; });
            if (!ids.length) { return null; }
            return {
                id: 'matiere-' + m.id,
                icone: m.icone,
                nom: m.nom + ' : tout vu',
                quoi: 'Ouvre toutes les leçons de ' + m.nom + '.',
                test: function (s) {
                    return ids.every(function (id) { return s.pages[id] && s.pages[id].visites > 0; });
                }
            };
        }).filter(Boolean);
    }

    /* ============================================================
       Calcul
       ============================================================ */

    /** Ce qu'il faut savoir pour décider de chaque badge. */
    function statistiques(programme) {
        var P = window.KarniellaProgression;
        var pages = P.pages();
        var serie = P.serie();

        var lecons = {};
        ((programme && programme.matieres) || []).forEach(function (m) {
            (m.lecons || []).forEach(function (l) { lecons[l.id] = m.id; });
        });

        var s = { pages: pages, lecons: 0, matieres: 0, questions: 0, quiz: 0, sansFaute: 0, record: serie.record };
        var matieres = {};

        Object.keys(pages).forEach(function (slug) {
            var p = pages[slug];
            s.questions += p.questions || 0;
            (p.quiz || []).forEach(function (q) {
                if (q.total < QUESTIONS_MIN_QUIZ) { return; }
                s.quiz += 1;
                if (q.correct === q.total) { s.sansFaute += 1; }
            });
            if (lecons[slug] && p.visites > 0) {
                s.lecons += 1;
                matieres[lecons[slug]] = true;
            }
        });
        s.matieres = Object.keys(matieres).length;
        return s;
    }

    function lireStock() {
        try {
            var brut = JSON.parse(window.localStorage.getItem(CLE));
            if (brut && brut.obtenus) { return brut; }
        } catch (err) { /* stockage refusé ou illisible */ }
        return { obtenus: {}, serieAnnoncee: null };
    }

    function ecrireStock(stock) {
        try { window.localStorage.setItem(CLE, JSON.stringify(stock)); } catch (err) { /* sans conséquence */ }
    }

    /**
     * Tous les badges, gagnés ou non, dans l'ordre d'affichage.
     * Avec `enregistrer`, garde ceux qui viennent d'être gagnés et les renvoie à
     * part. Sans, se contente de lire : l'accueil qui affiche la liste ne doit
     * pas « consommer » un badge avant qu'on ait pu en féliciter Karniella.
     */
    function calculer(enregistrer) {
        var programme = window.KarniellaProgramme;
        var stock = lireStock();
        var s = statistiques(programme);
        var nouveaux = [];

        var liste = FIXES.concat(badgesMatieres(programme)).map(function (b) {
            var obtenu = Boolean(stock.obtenus[b.id]);
            if (!obtenu && b.test(s)) {
                obtenu = true;
                if (enregistrer) {
                    stock.obtenus[b.id] = Date.now();
                    nouveaux.push(b);
                }
            }
            return { id: b.id, icone: b.icone, nom: b.nom, quoi: b.quoi, obtenu: obtenu, date: stock.obtenus[b.id] || null };
        });

        if (nouveaux.length) { ecrireStock(stock); }
        return { liste: liste, nouveaux: nouveaux, stock: stock };
    }

    /* ============================================================
       Félicitations
       ============================================================ */

    var elToast = null;
    var minuteur = null;

    function feliciter(icone, titre, texte) {
        if (!elToast) {
            elToast = document.createElement('a');
            elToast.className = 'badge-toast';
            elToast.href = RACINE + 'index.html#mes-badges';
            elToast.setAttribute('role', 'status');
            elToast.setAttribute('aria-live', 'polite');
            document.body.appendChild(elToast);
        }
        elToast.textContent = '';

        var i = document.createElement('span');
        i.className = 'badge-toast-icone';
        i.setAttribute('aria-hidden', 'true');
        i.textContent = icone;
        var corps = document.createElement('span');
        var t = document.createElement('strong');
        t.textContent = titre;
        var p = document.createElement('span');
        p.textContent = texte;
        corps.appendChild(t);
        corps.appendChild(p);
        elToast.appendChild(i);
        elToast.appendChild(corps);

        elToast.classList.remove('badge-toast-visible');
        void elToast.offsetWidth;   // relance l'animation d'entrée
        elToast.classList.add('badge-toast-visible');
        elToast.tabIndex = 0;

        window.clearTimeout(minuteur);
        minuteur = window.setTimeout(function () {
            elToast.classList.remove('badge-toast-visible');
            elToast.tabIndex = -1;   // invisible : la touche Tab ne doit plus s'y arrêter
        }, 6000);
    }

    /**
     * Pluie de confettis 🎉 : quiz réussi, nouveau badge, paquet de cartes fini.
     * Rien du tout pour qui a demandé moins d'animations.
     */
    var CONFETTIS = ['🎉', '⭐', '🐴', '💖', '✨', '🏆', '🌸'];

    function feter() {
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }
        var pluie = document.createElement('div');
        pluie.className = 'confettis';
        pluie.setAttribute('aria-hidden', 'true');
        // La pluie achetée dans la boutique (js/xp.js), sinon celle de base.
        var formes = (window.KarniellaXP && window.KarniellaXP.confettis()) || CONFETTIS;
        for (var i = 0; i < 32; i++) {
            var c = document.createElement('span');
            c.textContent = formes[i % formes.length];
            c.style.left = (Math.random() * 100) + '%';
            c.style.animationDelay = (Math.random() * 0.6) + 's';
            c.style.animationDuration = (1.8 + Math.random() * 1.4) + 's';
            c.style.fontSize = (16 + Math.random() * 18) + 'px';
            c.style.setProperty('--derive', (Math.random() * 160 - 80) + 'px');
            pluie.appendChild(c);
        }
        document.body.appendChild(pluie);
        window.setTimeout(function () {
            if (pluie.parentNode) { pluie.parentNode.removeChild(pluie); }
        }, 3800);
    }

    /** Recalcule après un progrès, et félicite s'il y a de quoi. */
    function verifier() {
        if (!window.KarniellaProgression || !window.KarniellaProgramme) { return; }
        var r = calculer(true);

        if (r.nouveaux.length) { feter(); }
        if (r.nouveaux.length === 1) {
            var b = r.nouveaux[0];
            feliciter(b.icone, 'Nouveau badge : ' + b.nom + ' !', b.quoi + ' C\'est fait. 🎉');
            return;
        }
        if (r.nouveaux.length > 1) {
            feliciter('🎉', r.nouveaux.length + ' nouveaux badges !',
                r.nouveaux.map(function (x) { return x.icone; }).join(' ') + ' Va les voir sur l\'accueil.');
            return;
        }

        // La série ne s'annonce qu'une fois par jour, au premier progrès du jour.
        var serie = window.KarniellaProgression.serie();
        var actif = serie.aujourdhui.lecons + serie.aujourdhui.quiz > 0;
        if (actif && serie.actuelle >= 2 && r.stock.serieAnnoncee !== serie.jour) {
            r.stock.serieAnnoncee = serie.jour;
            ecrireStock(r.stock);
            feliciter('🔥', serie.actuelle + ' jours de suite !',
                serie.actuelle >= serie.record ? 'C\'est ton record. Continue comme ça !' : 'Ton record : ' + serie.record + ' jours.');
        }
    }

    /* ============================================================
       Démarrage
       ============================================================ */

    /** Le catalogue n'est chargé que sur l'accueil : on va le chercher ailleurs. */
    function chargerProgramme(suite) {
        if (window.KarniellaProgramme) { suite(); return; }
        var script = document.createElement('script');
        script.src = RACINE + 'js/programme-5e.js';
        script.onload = suite;
        script.onerror = suite;
        document.head.appendChild(script);
    }

    function initialiser() {
        var feuille = document.createElement('link');
        feuille.rel = 'stylesheet';
        feuille.href = RACINE + 'css/badges.css';
        document.head.appendChild(feuille);

        chargerProgramme(function () {
            window.addEventListener('karniella:progression', verifier);

            // progression.js arrive par le même chemin que nous, dans un ordre
            // qu'on ne maîtrise pas : on l'attend un peu.
            var essais = 20;
            (function attendre() {
                if (window.KarniellaProgression) { verifier(); return; }
                if (essais-- > 0) { window.setTimeout(attendre, 250); }
            })();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialiser);
    } else {
        initialiser();
    }

    window.KarniellaFete = feter;

    window.KarniellaBadges = {
        /** Tous les badges, gagnés ou non. Vide tant que la progression manque. */
        liste: function () {
            if (!window.KarniellaProgression) { return []; }
            return calculer(false).liste;
        },
        verifier: verifier
    };
})();
