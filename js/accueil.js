/**
 * accueil.js — Construit le sommaire des leçons et la recherche.
 *
 * Le catalogue vit dans js/programme-5e.js, généré depuis
 * data/programme-5e.json par `npm run build:programme`. Ce fichier-ci ne fait
 * que l'afficher : ajouter une leçon ne demande jamais d'y toucher.
 *
 * Le sommaire est groupé par matière. Les matières encore vides ne prennent
 * PAS un bloc chacune — elles sont réunies sur une ligne en bas de page.
 * Six blocs vides sur huit rendraient la page plus lourde, pas plus claire.
 */
(function () {
    'use strict';

    var ICONE_DEFAUT = '📄';

    function $(id) { return document.getElementById(id); }

    /** Minuscules sans accents, pour comparer une recherche à un titre. */
    function normaliser(texte) {
        return String(texte || '')
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .trim()
            .toLowerCase();
    }

    /* ============================================================
       Progression — le module arrive de façon asynchrone
       ============================================================ */

    function avancementMatiere(id) {
        if (!window.KarniellaProgression || !window.KarniellaChatKnowledge) { return null; }

        var lignes = window.KarniellaProgression.resume(window.KarniellaChatKnowledge.pages);
        for (var i = 0; i < lignes.length; i++) {
            if (lignes[i].matiere !== id) { continue; }
            var l = lignes[i];
            if (!l.total || !l.vues) { return null; }
            return l.vues + '/' + l.total + ' vues' +
                (l.scoreMoyen !== null ? ' · ' + l.scoreMoyen + '%' : '');
        }
        return null;
    }

    function scoreLecon(url) {
        if (!window.KarniellaProgression) { return null; }
        var slug = String(url || '').split('/').pop().replace(/\.html$/, '');
        var suivi = window.KarniellaProgression.pourPage(slug);
        if (!suivi || suivi.meilleurScore === null) { return null; }
        return '🎯 ' + suivi.meilleurScore + '%';
    }

    /* ============================================================
       Rendu
       ============================================================ */

    function lienLecon(lecon) {
        if (lecon.statut !== 'prete') {
            var attente = document.createElement('li');
            var bloc = document.createElement('div');
            bloc.className = 'a-venir';
            bloc.innerHTML = '<span class="icone" aria-hidden="true">⏳</span>' +
                '<span class="intitule"><strong></strong><small>à venir</small></span>';
            bloc.querySelector('strong').textContent = lecon.titre;
            attente.appendChild(bloc);
            return attente;
        }

        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = '5e/' + lecon.id + '.html';

        var icone = document.createElement('span');
        icone.className = 'icone';
        icone.setAttribute('aria-hidden', 'true');
        icone.textContent = lecon.icone || ICONE_DEFAUT;

        var intitule = document.createElement('span');
        intitule.className = 'intitule';
        var titre = document.createElement('strong');
        titre.textContent = lecon.titre;
        intitule.appendChild(titre);

        if (lecon.sousTitre) {
            var sous = document.createElement('small');
            sous.textContent = lecon.sousTitre;
            intitule.appendChild(sous);
        }

        a.appendChild(icone);
        a.appendChild(intitule);

        var score = scoreLecon(lecon.id);
        if (score) {
            var badge = document.createElement('span');
            badge.className = 'score-lecon';
            badge.textContent = score;
            badge.setAttribute('title', 'Ton meilleur score au quiz');
            a.appendChild(badge);
        }

        li.appendChild(a);
        return li;
    }

    /**
     * Titres des notions d'une leçon, tirés de l'index du chat.
     *
     * Sans eux, la recherche ne porterait que sur les titres de leçon : taper
     * « canteen » ou « dissolution » ne trouverait rien, alors que c'est
     * précisément ce qu'on cherche. L'index est facultatif — il arrive après
     * le premier rendu, qui est alors refait.
     */
    function notionsDe(idLecon) {
        var index = window.KarniellaChatKnowledge && window.KarniellaChatKnowledge.pages;
        var page = index && index[idLecon];
        if (!page || !page.notions) { return ''; }

        return page.notions.map(function (n) { return n.titre; }).join(' ');
    }

    function blocMatiere(matiere) {
        var section = document.createElement('section');
        section.className = 'bloc-matiere';

        // Sert à la recherche : tout le texte de la matière, normalisé.
        section.dataset.recherche = normaliser(
            [matiere.nom, matiere.description]
                .concat((matiere.lecons || []).map(function (l) {
                    return l.titre + ' ' + (l.sousTitre || '') + ' ' +
                        (l.description || '') + ' ' + notionsDe(l.id);
                }))
                .join(' ')
        );

        var titre = document.createElement('h2');
        titre.className = 'titre-matiere';

        var icone = document.createElement('span');
        icone.className = 'icone';
        icone.setAttribute('aria-hidden', 'true');
        icone.textContent = matiere.icone;

        var lien = document.createElement('a');
        lien.href = '5e/' + matiere.id + '.html';
        lien.textContent = matiere.nom;

        titre.appendChild(icone);
        titre.appendChild(lien);

        var avancement = avancementMatiere(matiere.id);
        if (avancement) {
            var badge = document.createElement('span');
            badge.className = 'avancement';
            badge.textContent = avancement;
            badge.setAttribute('title', 'Ton avancement dans cette matière');
            titre.appendChild(badge);
        }

        section.appendChild(titre);

        var liste = document.createElement('ul');
        liste.className = 'liste-lecons';
        (matiere.lecons || []).forEach(function (lecon) {
            liste.appendChild(lienLecon(lecon));
        });
        section.appendChild(liste);

        return section;
    }

    /** Les matières sans aucune leçon, réunies sur une seule ligne. */
    function blocAVenir(matieres) {
        var bloc = document.createElement('div');
        bloc.className = 'a-venir-matieres';
        bloc.dataset.recherche = normaliser(
            matieres.map(function (m) { return m.nom + ' ' + m.description; }).join(' ')
        );

        var intro = document.createElement('p');
        intro.innerHTML = '<strong>Bientôt</strong> — ces matières attendent leur ' +
            'première leçon. 🐴';
        bloc.appendChild(intro);

        var liste = document.createElement('ul');
        matieres.forEach(function (m) {
            var li = document.createElement('li');
            var a = document.createElement('a');
            a.href = '5e/' + m.id + '.html';
            a.textContent = m.icone + ' ' + m.nom;
            li.appendChild(a);
            liste.appendChild(li);
        });
        bloc.appendChild(liste);
        return bloc;
    }

    function rendre() {
        var conteneur = $('sommaire');
        var programme = window.KarniellaProgramme;
        if (!conteneur || !programme) { return; }

        conteneur.textContent = '';

        var pourvues = [];
        var vides = [];
        programme.matieres.forEach(function (m) {
            ((m.lecons && m.lecons.length) ? pourvues : vides).push(m);
        });

        pourvues.forEach(function (m) { conteneur.appendChild(blocMatiere(m)); });
        if (vides.length) { conteneur.appendChild(blocAVenir(vides)); }
    }

    /* ============================================================
       Recherche
       ============================================================ */

    function filtrer() {
        var champ = $('recherche');
        var vide = $('recherche-vide');
        if (!champ) { return; }

        var terme = normaliser(champ.value);
        var blocs = document.querySelectorAll('[data-recherche]');
        var visibles = 0;

        for (var i = 0; i < blocs.length; i++) {
            var correspond = !terme || blocs[i].dataset.recherche.indexOf(terme) !== -1;
            blocs[i].hidden = !correspond;
            if (correspond) { visibles++; }
        }

        if (vide) { vide.hidden = !(terme && visibles === 0); }
        var effacer = $('effacer-recherche');
        if (effacer) { effacer.hidden = !terme; }
    }

    function brancherRecherche() {
        var champ = $('recherche');
        if (champ) { champ.addEventListener('input', filtrer); }

        var effacer = $('effacer-recherche');
        if (effacer) {
            effacer.addEventListener('click', function () {
                champ.value = '';
                filtrer();
                champ.focus();
            });
        }
        filtrer();
    }

    /* ============================================================
       Démarrage
       ============================================================ */

    function initialiser() {
        rendre();
        brancherRecherche();

        // js/progression.js et l'index du chat sont chargés par le chat, donc
        // après ce premier rendu. On redessine à leur arrivée, sinon les
        // avancements n'apparaîtraient qu'au rechargement suivant.
        var essais = 15;
        (function attendre() {
            if (window.KarniellaProgression && window.KarniellaChatKnowledge) {
                rendre();
                filtrer();
                return;
            }
            if (essais-- > 0) { window.setTimeout(attendre, 300); }
        })();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialiser);
    } else {
        initialiser();
    }
})();
