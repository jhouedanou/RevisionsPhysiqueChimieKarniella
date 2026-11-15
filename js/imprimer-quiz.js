/**
 * imprimer-quiz.js — tous les quiz d'une matière sur une feuille à imprimer.
 *
 * Page : 5e/imprimer-quiz.html?matiere=<id>. Les leçons viennent de
 * js/programme-5e.js, les questions de data/section-questions.json (les mêmes
 * que le quiz de chaque leçon). Les questions sont à cocher ; le corrigé est
 * à la fin, sur une page à part. Mise en page : css/imprimer-quiz.css.
 */
(function () {
    'use strict';

    var LETTRES = ['A', 'B', 'C', 'D', 'E', 'F'];
    var feuille = document.getElementById('iq-feuille');
    var bouton = document.getElementById('iq-imprimer');
    var caseCorrige = document.getElementById('iq-corrige');

    function creer(balise, classe, texte) {
        var e = document.createElement(balise);
        if (classe) { e.className = classe; }
        if (texte !== undefined) { e.textContent = texte; }
        return e;
    }

    function message(texte) {
        feuille.textContent = '';
        feuille.appendChild(creer('p', 'iq-message', texte));
    }

    /** Toutes les questions d'une leçon : un seul onglet de quiz par leçon. */
    function questionsDe(donnees, id) {
        var onglets = donnees[id] || {};
        var liste = [];
        Object.keys(onglets).forEach(function (cle) { liste = liste.concat(onglets[cle] || []); });
        return liste;
    }

    function afficher(matiere, donnees) {
        var lecons = (matiere.lecons || []).filter(function (l) { return l.statut === 'prete'; })
            .map(function (l) { return { lecon: l, questions: questionsDe(donnees, l.id) }; })
            .filter(function (x) { return x.questions.length; });

        if (!lecons.length) { message('Pas encore de quiz pour cette matière.'); return; }

        document.body.dataset.matiere = matiere.id;
        document.title = 'Quiz de ' + matiere.nom + ' à imprimer - Révisions Karniella';
        feuille.textContent = '';

        var total = lecons.reduce(function (n, x) { return n + x.questions.length; }, 0);
        var entete = creer('header', 'iq-entete');
        entete.appendChild(creer('h1', '', matiere.icone + ' Quiz de ' + matiere.nom));
        entete.appendChild(creer('p', 'iq-compte', lecons.length + (lecons.length > 1 ? ' leçons · ' : ' leçon · ') + total + ' questions · Coche la bonne réponse.'));
        entete.appendChild(creer('p', 'iq-nom', 'Nom : ……………………………   Date : ……………   Note : …… / ' + total));
        feuille.appendChild(entete);

        var corrige = creer('section', 'iq-corrige');
        corrige.appendChild(creer('h1', '', '✅ Corrigé — ' + matiere.nom));

        lecons.forEach(function (x, i) {
            var bloc = creer('section', 'iq-lecon');
            bloc.appendChild(creer('h2', '', (i + 1) + '. ' + x.lecon.titre));
            var liste = creer('ol', 'iq-questions');

            var blocCorrige = creer('div', 'iq-corrige-lecon');
            blocCorrige.appendChild(creer('h2', '', (i + 1) + '. ' + x.lecon.titre));
            var reponses = creer('ol', 'iq-reponses');

            x.questions.forEach(function (q) {
                var li = creer('li', 'iq-question');
                li.appendChild(creer('p', 'iq-enonce', q.question));
                var choix = creer('ul', 'iq-choix');
                (q.options || []).forEach(function (option, k) {
                    var c = creer('li');
                    c.appendChild(creer('span', 'iq-case'));
                    c.appendChild(creer('span', 'iq-lettre', LETTRES[k] + '.'));
                    c.appendChild(creer('span', '', option));
                    choix.appendChild(c);
                });
                li.appendChild(choix);
                liste.appendChild(li);

                var r = creer('li');
                r.appendChild(creer('strong', '', LETTRES[q.correctAnswer] + '. '));
                r.appendChild(document.createTextNode((q.options || [])[q.correctAnswer] || ''));
                reponses.appendChild(r);
            });

            bloc.appendChild(liste);
            feuille.appendChild(bloc);
            blocCorrige.appendChild(reponses);
            corrige.appendChild(blocCorrige);
        });

        feuille.appendChild(corrige);
        bouton.disabled = false;
    }

    caseCorrige.addEventListener('change', function () {
        document.body.classList.toggle('sans-corrige', !caseCorrige.checked);
    });
    bouton.addEventListener('click', function () { window.print(); });

    var id = new URLSearchParams(location.search).get('matiere');
    var programme = window.KarniellaProgramme || { matieres: [] };
    var matiere = programme.matieres.filter(function (m) { return m.id === id; })[0];

    if (!matiere) { message('Matière introuvable. Reviens à l\'accueil et choisis une matière.'); return; }

    fetch('../data/section-questions.json')
        .then(function (r) { return r.json(); })
        .then(function (donnees) { afficher(matiere, donnees); })
        .catch(function () { message('Les quiz ne se chargent pas. Vérifie ta connexion, puis recharge la page.'); });
})();
