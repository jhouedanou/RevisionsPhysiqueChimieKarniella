/**
 * chemin.js — Le chemin des leçons d'une page de matière (5e/<matiere>.html).
 *
 * Comme la liste des étapes de brikelec : chaque leçon est un rond numéroté,
 * relié au suivant. Le rond prend la couleur de la matière quand le quiz de
 * la leçon est fait, et la prochaine leçon à faire est entourée. Chaque
 * carte reçoit ses étoiles, son niveau, son meilleur score et ses erreurs à
 * réviser. La jauge du haut fait la moyenne des meilleurs scores.
 *
 * La progression (js/progression.js) arrive avec le chat et le jeu
 * (js/jeu.js) avec la barre du haut : on les attend un peu. Sans eux, la
 * page reste la liste simple produite par scripts/build-programme-5e.js.
 */
(function () {
    'use strict';

    function creer(balise, classe, texte) {
        var e = document.createElement(balise);
        if (classe) { e.className = classe; }
        if (texte !== undefined) { e.textContent = texte; }
        return e;
    }

    function pluriel(n, mot) {
        return n + ' ' + mot + (n > 1 ? 's' : '');
    }

    function rendre() {
        var P = window.KarniellaProgression;
        var J = window.KarniellaJeu;
        var etapes = document.querySelectorAll('.chemin-etape[data-lecon]');
        if (!P || !J || !etapes.length) { return false; }

        var somme = 0;
        var acquises = 0;
        var faites = 0;
        var suivanteTrouvee = false;

        Array.prototype.forEach.call(etapes, function (li) {
            var p = P.pourPage(li.getAttribute('data-lecon'));
            var carte = li.querySelector('.carte-lecon');
            var ancien = carte.querySelector('.chemin-infos');
            if (ancien) { carte.removeChild(ancien); }
            var etat = li.querySelector('.chemin-etat');
            if (etat) { li.removeChild(etat); }
            li.classList.remove('faite', 'suivante');

            var meilleur = p ? p.meilleurScore : null;
            var infos = creer('span', 'chemin-infos');
            var action;
            var principal = false;

            if (meilleur !== null) {
                var niv = J.niveau(meilleur, 100);
                somme += meilleur;
                faites++;
                if (niv.id !== 'a-reprendre') { acquises++; }
                li.classList.add('faite');
                infos.appendChild(J.etoiles(niv.etoiles));
                infos.appendChild(J.pastilleNiveau(niv));
                infos.appendChild(creer('span', 'chip', 'Meilleur score : ' + meilleur + ' %'));
                if (p.erreurs) {
                    infos.appendChild(creer('span', 'chip chip-mauvais', pluriel(p.erreurs, 'erreur') + ' à réviser'));
                }
                action = 'Refaire';
            } else {
                action = p && (p.visites || p.etapesLues.length) ? 'Continuer' : 'Commencer';
                if (!suivanteTrouvee) {
                    suivanteTrouvee = true;
                    principal = true;
                    li.classList.add('suivante');
                }
            }

            var bouton = creer('span', 'btn btn-petit chemin-action' + (principal ? '' : ' btn-ghost'), action);
            infos.appendChild(bouton);
            carte.appendChild(infos);

            var lu = creer('span', 'lecteur-seul chemin-etat',
                meilleur !== null ? 'Quiz fait. ' : principal ? 'Prochaine leçon à faire. ' : '');
            li.insertBefore(lu, carte);
        });

        var zone = document.querySelector('.chemin-jauge');
        if (zone) {
            zone.textContent = '';
            var n = etapes.length;
            zone.appendChild(J.jauge({
                titre: 'Ma jauge',
                pct: somme / n,
                aide: faites
                    ? acquises + ' sur ' + pluriel(n, 'leçon') + ' ' + (acquises > 1 ? 'acquises' : 'acquise') + ' au quiz.'
                    : 'Fais le quiz d\'une leçon pour remplir ta jauge.'
            }));
            zone.hidden = false;
        }
        return true;
    }

    function demarrer() {
        var essais = 25;
        (function attendre() {
            if (rendre()) { return; }
            if (essais-- > 0) { window.setTimeout(attendre, 300); }
        })();
        window.addEventListener('karniella:progression', function () { window.setTimeout(rendre, 0); });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', demarrer);
    } else {
        demarrer();
    }
})();
