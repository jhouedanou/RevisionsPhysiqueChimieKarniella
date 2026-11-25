/**
 * a-completer.js — les exemples et les exercices à trous deviennent actifs.
 *
 * Chargé après js/section-quiz.js sur les pages de leçon. Rien à écrire de
 * plus dans la page : le script lit le balisage habituel.
 *
 * 1. Les exemples (« 💡 Exemples pour les exercices », .exemple-exo)
 *    La réponse est cachée. Karniella la tape quand elle est courte
 *    (« des animaux », « 65° », « am »), ou la choisit parmi les réponses du
 *    quiz quand elle est longue. Deux essais, puis la réponse et l'explication
 *    s'affichent. data-mode="choix" ou "saisie" sur l'exemple force un mode ;
 *    data-mode="lecture" le laisse tel quel.
 *
 * 2. Les exercices à trous (.exercice avec <span class="trou">…</span>)
 *    Chaque trou devient une case à remplir. La réponse attendue est lue dans
 *    « Voir la correction » : même ligne, <strong> dans l'ordre des trous, ou
 *    le texte de la ligne (séparé par « · » s'il y a plusieurs trous). Une
 *    ligne dont la correction ne se lit pas ainsi, ou dont la réponse est une
 *    phrase, reste comme avant. Le bouton « Vérifier » colore les cases.
 */
(function () {
    'use strict';

    function creer(balise, classe, texte) {
        var e = document.createElement(balise);
        if (classe) { e.className = classe; }
        if (texte !== undefined) { e.textContent = texte; }
        return e;
    }

    /** Sans majuscules, accents, ponctuation ni article du début (comme le quiz). */
    function reduire(texte) {
        if (typeof window.normaliserReponse === 'function') { return window.normaliserReponse(texte); }
        if (typeof normaliserReponse === 'function') { return normaliserReponse(texte); }   // eslint-disable-line no-undef
        var t = String(texte || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
        t = t.replace(/[^a-z0-9+\-.,°]/g, ' ').replace(/\s+/g, ' ').trim();
        return t.replace(/^(l |le |la |les |un |une |des |du |the |a |an )/, '').replace(/\s/g, '');
    }

    /** Une faute de frappe passe si le mot est long (comme dans le quiz). */
    function estJuste(donnee, attendues) {
        var d = reduire(donnee);
        if (!d) { return false; }
        for (var i = 0; i < attendues.length; i++) {
            var a = reduire(attendues[i]);
            if (!a) { continue; }
            if (a === d) { return true; }
            if (a.length >= 6 && !/\d/.test(a) && typeof distanceMots === 'function' && distanceMots(d, a) <= 1) { return true; }   // eslint-disable-line no-undef
        }
        return false;
    }

    function courte(reponse) {
        var t = String(reponse).trim();
        return t.length > 0 && t.length <= 24 && t.split(/\s+/).length <= 3;
    }

    function champ(etiquette) {
        var c = creer('input', 'ac-champ');
        c.type = 'text';
        c.autocomplete = 'off';
        c.autocapitalize = 'off';
        c.spellcheck = false;
        c.setAttribute('aria-label', etiquette);
        return c;
    }

    /* ============================================================
       1. Les exemples
       ============================================================ */

    function texteDe(p, etiquette) {
        var copie = p.cloneNode(true);
        var fort = copie.querySelector('strong');
        if (fort && fort.textContent.indexOf(etiquette) === 0) { fort.remove(); }
        return copie;
    }

    function activerExemple(bloc, parQuestion) {
        if (bloc.dataset.mode === 'lecture' || bloc.dataset.actif) { return; }
        var lignes = bloc.querySelectorAll(':scope > p');
        for (var i = 0; i + 1 < lignes.length; i += 2) { activerPaire(bloc, lignes[i], lignes[i + 1], parQuestion); }
        bloc.dataset.actif = '1';
    }

    function activerPaire(bloc, pQuestion, pReponse, parQuestion) {
        var enonce = texteDe(pQuestion, 'Question').textContent.trim();
        var copie = texteDe(pReponse, 'Réponse');
        var saut = copie.querySelector('br');
        var bonne = '';
        // La réponse : ce qui précède le saut de ligne ; l'explication vient après.
        for (var n = copie.firstChild; n && n !== saut; n = n.nextSibling) { bonne += n.textContent; }
        bonne = bonne.trim();
        if (!bonne) { return; }
        var q = parQuestion[enonce];
        var mode = bloc.dataset.mode || (courte(bonne) || !q ? 'saisie' : 'choix');
        if (mode === 'saisie' && !courte(bonne) && !q) { return; }   // une phrase, sans choix à proposer : on laisse lire
        if (mode === 'saisie' && !courte(bonne)) { mode = 'choix'; }

        pReponse.hidden = true;
        var zone = creer('div', 'ac-exemple');
        var retour = creer('p', 'ac-retour');
        retour.setAttribute('role', 'status');
        var essais = 0;

        function finir(trouve) {
            // Les cartes de la leçon attendent cette réponse (js/cartes-lecon.js).
            bloc.dispatchEvent(new CustomEvent('karniella:interaction', { bubbles: true }));
            zone.querySelectorAll('input, button').forEach(function (e) { e.disabled = true; });
            retour.className = 'ac-retour ' + (trouve ? 'juste' : 'faux');
            retour.textContent = trouve ? '✓ Bravo, c\'est ça !' : 'La réponse est juste en dessous. Lis bien l\'explication.';
            pReponse.hidden = false;
            pReponse.classList.add('ac-devoilee');
        }
        function rate(element) {
            essais++;
            if (element) { element.classList.add('faux'); }
            if (essais >= 2) { finir(false); return; }
            retour.className = 'ac-retour faux';
            retour.textContent = '✗ Pas tout à fait. Essaie encore une fois.';
        }

        if (mode === 'choix') {
            var groupe = creer('div', 'ac-choix');
            q.options.forEach(function (option, k) {
                var b = creer('button', 'ac-option');
                b.type = 'button';
                b.innerHTML = option;
                b.addEventListener('click', function () {
                    if (k === q.correctAnswer) { b.classList.add('juste'); finir(true); } else { b.disabled = true; rate(b); }
                });
                groupe.appendChild(b);
            });
            zone.appendChild(groupe);
        } else {
            var ligne = creer('div', 'ac-ligne');
            var c = champ('Ta réponse');
            c.placeholder = 'Ta réponse';
            var verifier = creer('button', 'ac-verifier', 'Vérifier');
            verifier.type = 'button';
            var valider = function () {
                if (!c.value.trim()) { c.focus(); return; }
                c.classList.remove('faux');
                if (estJuste(c.value, [bonne])) { c.classList.add('juste'); finir(true); } else { rate(c); if (essais < 2) { c.select(); } }
            };
            verifier.addEventListener('click', valider);
            c.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); valider(); } });
            ligne.appendChild(c);
            ligne.appendChild(verifier);
            zone.appendChild(ligne);
        }
        zone.appendChild(retour);
        pQuestion.insertAdjacentElement('afterend', zone);
    }

    /* ============================================================
       2. Les exercices à trous
       ============================================================ */

    /** Le texte d'une ligne de correction, sans les remarques entre parenthèses. */
    function propre(texte) {
        return String(texte).replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
    }

    /**
     * Les réponses attendues pour les trous d'une ligne, lues dans la ligne de
     * correction. null si on ne sait pas les lire sans risque.
     */
    function reponsesDe(correction, nombre) {
        var forts = correction.querySelectorAll('strong, b');
        var libre = /n'importe quel ordre/i.test(correction.textContent);
        var liste = null;
        if (forts.length === nombre) {
            liste = Array.prototype.map.call(forts, function (f) { return propre(f.textContent); });
        } else if (!forts.length) {
            var texte = propre(correction.textContent);
            if (nombre === 1) { liste = [texte.split(/\s[:—]\s/)[0]]; }
            else {
                var morceaux = texte.split(/\s*[·;]\s*|\s+\/\s+|\s*…\s*/).filter(Boolean);
                if (morceaux.length === nombre) { liste = morceaux; }
            }
        }
        if (!liste || liste.some(function (r) { return !courte(r) && r.split(/\s+/).length > 4; })) { return null; }
        return { reponses: liste, libre: libre };
    }

    function activerExercice(exercice) {
        if (exercice.dataset.actif) { return; }
        var details = exercice.querySelector(':scope > details');
        if (!details) { return; }
        var corps = Array.prototype.filter.call(exercice.querySelectorAll('.trou'), function (t) { return !details.contains(t); });
        if (!corps.length) { return; }

        // Les lignes de l'énoncé et celles de la correction, dans le même ordre.
        var lignes = Array.prototype.filter.call(exercice.querySelectorAll('li, p'), function (l) {
            // Une ligne de liste, ou un paragraphe qui n'est pas dans une ligne de liste.
            return !details.contains(l) && l.querySelector('.trou') && (l.tagName === 'LI' || !l.closest('li'));
        });
        var corrections = details.querySelectorAll('li');
        var enonces = Array.prototype.filter.call(exercice.querySelectorAll('li'), function (l) { return !details.contains(l) && !l.closest('.aide-memoire'); });
        var cases = [];

        lignes.forEach(function (ligne) {
            var trous = ligne.querySelectorAll('.trou');
            var rang = enonces.indexOf(ligne);
            var correction = rang >= 0 ? corrections[rang] : (lignes.length === 1 && corrections.length <= 1 ? (corrections[0] || details) : null);
            if (enonces.length !== corrections.length && rang >= 0) { correction = null; }
            var lu = correction ? reponsesDe(correction, trous.length) : null;
            if (!lu) { return; }
            var deLaLigne = [];
            Array.prototype.forEach.call(trous, function (trou, k) {
                var c = champ('Mot à compléter');
                c.className = 'ac-champ ac-trou';
                c.size = Math.max(5, Math.min(18, lu.reponses[k].length + 2));
                trou.replaceWith(c);
                var entree = { champ: c, attendues: lu.libre ? lu.reponses.slice() : [lu.reponses[k]], libre: lu.libre, groupe: deLaLigne };
                deLaLigne.push(entree);
                cases.push(entree);
            });
        });
        if (!cases.length) { return; }
        exercice.dataset.actif = '1';

        var barre = creer('div', 'ac-barre');
        var verifier = creer('button', 'ac-verifier', 'Vérifier mes réponses');
        verifier.type = 'button';
        var bilan = creer('p', 'ac-retour');
        bilan.setAttribute('role', 'status');
        barre.appendChild(verifier);
        barre.appendChild(bilan);
        details.insertAdjacentElement('beforebegin', barre);

        function verifierTout() {
            exercice.dispatchEvent(new CustomEvent('karniella:interaction', { bubbles: true }));
            var justes = 0, vides = 0;
            cases.forEach(function (c) {
                c.champ.classList.remove('juste', 'faux');
                if (!c.champ.value.trim()) { vides++; return; }
                var ok = estJuste(c.champ.value, c.attendues);
                // Dans n'importe quel ordre : la même réponse ne compte pas deux fois.
                if (ok && c.libre) {
                    var avant = c.groupe.slice(0, c.groupe.indexOf(c)).some(function (autre) { return reduire(autre.champ.value) === reduire(c.champ.value); });
                    if (avant) { ok = false; }
                }
                c.champ.classList.add(ok ? 'juste' : 'faux');
                if (ok) { justes++; }
            });
            var total = cases.length;
            bilan.className = 'ac-retour ' + (justes === total ? 'juste' : 'faux');
            bilan.textContent = justes === total
                ? '✓ Tout est juste, bravo !'
                : justes + ' sur ' + total + '. ' + (vides ? 'Remplis les cases vides. ' : '') + (total - justes - vides > 0 ? 'Corrige les cases rouges, puis vérifie encore.' : '');
        }
        verifier.addEventListener('click', verifierTout);
        cases.forEach(function (c) {
            c.champ.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); verifierTout(); } });
            c.champ.addEventListener('input', function () { c.champ.classList.remove('juste', 'faux'); });
        });
    }

    /* ============================================================
       Démarrage
       ============================================================ */

    function demarrer() {
        var exercices = document.querySelectorAll('.exercice');
        for (var i = 0; i < exercices.length; i++) {
            try { activerExercice(exercices[i]); } catch (err) { /* cet exercice reste comme avant */ }
        }

        var exemples = document.querySelectorAll('.exemple-exo');
        if (!exemples.length) { return; }
        var slug = window.location.pathname.split('/').pop().replace(/\.html$/, '');
        function lancer(parQuestion) {
            for (var k = 0; k < exemples.length; k++) {
                try { activerExemple(exemples[k], parQuestion); } catch (err) { /* cet exemple reste lisible */ }
            }
        }
        fetch('../data/section-questions.json')
            .then(function (r) { return r.json(); })
            .then(function (donnees) {
                var index = {};
                var groupes = donnees[slug] || {};
                Object.keys(groupes).forEach(function (cle) {
                    groupes[cle].forEach(function (q) {
                        var p = document.createElement('p');
                        p.innerHTML = q.question;
                        if (q.options) { index[p.textContent.trim()] = q; }
                    });
                });
                lancer(index);
            })
            .catch(function () { lancer({}); });   // hors-ligne sans cache : seulement les réponses courtes
    }

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', demarrer); } else { demarrer(); }
})();
