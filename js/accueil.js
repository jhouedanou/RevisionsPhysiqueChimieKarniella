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
 *
 * Au-dessus du sommaire : la série de jours, l'objectif du jour et la leçon à
 * reprendre. En dessous : les badges (js/badges.js). Les deux restent cachés
 * tant que js/progression.js n'est pas là, ou si le navigateur refuse le
 * stockage — sans suivi, une série à 0 découragerait plus qu'autre chose.
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

    /** Une carte de leçon. Un <a> quand la page existe, un <div> sinon. */
    function carteLecon(lecon) {
        var li = document.createElement('li');
        var prete = lecon.statut === 'prete';

        var carte = document.createElement(prete ? 'a' : 'div');
        carte.className = prete ? 'carte' : 'carte a-venir';
        if (prete) { carte.href = '5e/' + lecon.id + '.html'; }

        var icone = document.createElement('span');
        icone.className = 'icone';
        icone.setAttribute('aria-hidden', 'true');
        icone.textContent = prete ? (lecon.icone || ICONE_DEFAUT) : '⏳';
        carte.appendChild(icone);

        var titre = document.createElement('span');
        titre.className = 'titre';
        titre.textContent = lecon.titre;
        carte.appendChild(titre);

        var sous = document.createElement('span');
        sous.className = 'sous';
        sous.textContent = prete ? (lecon.sousTitre || '') : 'à venir';
        if (sous.textContent) { carte.appendChild(sous); }

        var score = prete ? scoreLecon(lecon.id) : null;
        if (score) {
            var badge = document.createElement('span');
            badge.className = 'score-lecon';
            badge.textContent = score;
            badge.setAttribute('title', 'Ton meilleur score au quiz');
            carte.appendChild(badge);
        }

        li.appendChild(carte);
        li.dataset.recherche = normaliser(
            lecon.titre + ' ' + (lecon.sousTitre || '') + ' ' +
            (lecon.description || '') + ' ' + notionsDe(lecon.id)
        );
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

        // Sert à la recherche. Le NOM de la matière montre toutes ses leçons ;
        // sinon chaque carte est filtrée sur son propre texte (voir filtrer()).
        // Pas la description : « circuit » y figure pour la physique-chimie, et
        // ramènerait « Les mélanges », qui n'en parle pas.
        section.dataset.rechercheMatiere = normaliser(matiere.nom);

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
            liste.appendChild(carteLecon(lecon));
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

    /** Chaque mot cherché doit se trouver dans le texte, dans n'importe quel ordre. */
    function correspond(texte, motsCherches) {
        for (var i = 0; i < motsCherches.length; i++) {
            if (texte.indexOf(motsCherches[i]) === -1) { return false; }
        }
        return true;
    }

    /**
     * Filtre carte par carte. Une matière reste affichée tant qu'une de ses
     * leçons correspond ; si c'est son NOM qui correspond (« anglais »), on
     * montre toutes ses leçons.
     */
    function filtrer() {
        var champ = $('recherche');
        if (!champ) { return; }

        var terme = normaliser(champ.value);
        var motsCherches = terme ? terme.split(/\s+/) : [];
        var lecons = 0;

        var blocs = document.querySelectorAll('.bloc-matiere');
        for (var i = 0; i < blocs.length; i++) {
            var toute = !terme || correspond(blocs[i].dataset.rechercheMatiere || '', motsCherches);
            var cartes = blocs[i].querySelectorAll('li[data-recherche]');
            var visibles = 0;
            for (var j = 0; j < cartes.length; j++) {
                var montre = toute || correspond(cartes[j].dataset.recherche, motsCherches);
                cartes[j].hidden = !montre;
                if (montre) { visibles++; }
            }
            blocs[i].hidden = visibles === 0;
            lecons += visibles;
        }

        var bientot = document.querySelector('.a-venir-matieres');
        if (bientot) { bientot.hidden = Boolean(terme) && !correspond(bientot.dataset.recherche, motsCherches); }

        var compte = $('recherche-compte');
        if (compte) {
            compte.hidden = !terme || lecons === 0;
            compte.textContent = lecons + (lecons > 1 ? ' leçons trouvées' : ' leçon trouvée');
        }

        var vide = $('recherche-vide');
        if (vide) { vide.hidden = !(terme && lecons === 0); }
        var effacer = $('effacer-recherche');
        if (effacer) { effacer.hidden = !terme; }

        majRecherchePartout(champ.value.trim());
    }

    /**
     * Le bouton qui passe le même mot à la recherche complète (js/recherche.js) :
     * elle fouille aussi le texte des leçons et les quiz, et mène à l'endroit
     * exact de la leçon.
     */
    function majRecherchePartout(terme) {
        var bouton = $('recherche-partout');
        var R = window.KarniellaRecherche;
        if (!bouton) { return; }
        if (!R || terme.length < 2) { bouton.hidden = true; return; }

        bouton.hidden = false;
        bouton.textContent = '🔎 Chercher « ' + terme + ' » dans le texte des leçons';
        R.charger(function (ok) {
            // La saisie a pu changer pendant le chargement de l'index.
            if (!ok || $('recherche').value.trim() !== terme) { return; }
            var total = R.chercher(terme).total;
            bouton.textContent = total
                ? '🔎 ' + total + (total > 1 ? ' passages' : ' passage') + ' parlent de « ' + terme + ' » — les voir'
                : '🐴 Rien dans les leçons sur « ' + terme + ' » — demande au poney';
        });
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

        var partout = $('recherche-partout');
        if (partout) {
            partout.addEventListener('click', function () {
                if (window.KarniellaRecherche) { window.KarniellaRecherche.ouvrir(champ.value.trim()); }
            });
        }
        filtrer();
    }

    /* ============================================================
       Ma série — série de jours, objectif du jour, leçon à reprendre
       ============================================================ */

    function suiviDisponible() {
        return window.KarniellaProgression && window.KarniellaProgression.disponible();
    }

    function creer(balise, classe, texte) {
        var e = document.createElement(balise);
        if (classe) { e.className = classe; }
        if (texte !== undefined) { e.textContent = texte; }
        return e;
    }

    /** La leçon ouverte le plus récemment, parmi celles du programme. */
    function leconAReprendre() {
        var pages = window.KarniellaProgression.pages();
        var meilleure = null;
        window.KarniellaProgramme.matieres.forEach(function (m) {
            (m.lecons || []).forEach(function (l) {
                var p = pages[l.id];
                if (l.statut !== 'prete' || !p || !p.derniereVisite) { return; }
                if (!meilleure || p.derniereVisite > meilleure.date) {
                    meilleure = { lecon: l, date: p.derniereVisite };
                }
            });
        });
        return meilleure && meilleure.lecon;
    }

    function salutation() {
        var heure = new Date().getHours();
        if (heure >= 18 || heure < 5) { return 'Bonsoir Karniella 🌙'; }
        return 'Salut Karniella 👋';
    }

    function etapeObjectif(fait, texte) {
        var li = creer('li', fait ? 'fait' : '');
        li.appendChild(creer('span', 'coche', fait ? '✓' : '')).setAttribute('aria-hidden', 'true');
        li.appendChild(document.createTextNode(texte));
        if (fait) { li.appendChild(creer('span', 'lecteur-seul', ' (fait)')); }
        return li;
    }

    function rendreGalop() {
        var zone = $('mon-galop');
        if (!zone) { return; }
        if (!suiviDisponible()) { zone.hidden = true; return; }

        var serie = window.KarniellaProgression.serie();
        var jour = serie.aujourdhui;
        var actifAujourdhui = jour.lecons + jour.quiz > 0;
        zone.textContent = '';

        zone.appendChild(creer('h2', 'salut', salutation()));

        var grille = creer('div', 'galop-grille');

        // -- La série
        var carteSerie = creer('div', 'galop-carte galop-serie' + (serie.actuelle ? '' : ' eteinte'));
        carteSerie.appendChild(creer('span', 'flamme', serie.actuelle ? '🔥' : '🐴')).setAttribute('aria-hidden', 'true');
        var bloc = creer('div');
        if (serie.actuelle) {
            bloc.appendChild(creer('strong', 'chiffre', serie.actuelle + (serie.actuelle > 1 ? ' jours de suite' : ' jour de suite')));
            bloc.appendChild(creer('span', 'detail', actifAujourdhui
                ? (serie.actuelle >= serie.record ? 'C\'est ton record !' : 'Ton record : ' + serie.record + ' jours')
                : 'Révise aujourd\'hui pour la continuer !'));
        } else {
            bloc.appendChild(creer('strong', 'chiffre', 'Lance ta série !'));
            bloc.appendChild(creer('span', 'detail', 'Une leçon par jour, et la flamme s\'allume.'));
        }
        carteSerie.appendChild(bloc);
        grille.appendChild(carteSerie);

        // -- L'objectif du jour
        var carteObjectif = creer('div', 'galop-carte galop-objectif');
        var fini = jour.lecons > 0 && jour.quiz > 0;
        carteObjectif.appendChild(creer('strong', 'titre-carte', fini ? 'Objectif du jour atteint ! 🎉' : '🎯 Objectif du jour'));
        var etapes = creer('ul', 'etapes');
        etapes.appendChild(etapeObjectif(jour.lecons > 0, 'Ouvrir une leçon'));
        etapes.appendChild(etapeObjectif(jour.quiz > 0, 'Faire un quiz'));
        carteObjectif.appendChild(etapes);
        grille.appendChild(carteObjectif);

        // -- La leçon à reprendre
        var lecon = leconAReprendre();
        if (lecon) {
            var reprendre = creer('a', 'galop-carte galop-reprendre');
            reprendre.href = '5e/' + lecon.id + '.html';
            reprendre.appendChild(creer('span', 'icone', lecon.icone || ICONE_DEFAUT)).setAttribute('aria-hidden', 'true');
            var texte = creer('span');
            texte.appendChild(creer('span', 'detail', 'Reprendre'));
            texte.appendChild(creer('strong', 'titre-carte', lecon.titre));
            reprendre.appendChild(texte);
            reprendre.appendChild(creer('span', 'fleche', '→')).setAttribute('aria-hidden', 'true');
            grille.appendChild(reprendre);
        }

        zone.appendChild(grille);
        zone.hidden = false;
    }

    /* ============================================================
       Mes badges
       ============================================================ */

    function rendreBadges() {
        var zone = $('mes-badges');
        var liste = $('liste-badges');
        if (!zone || !liste) { return; }
        if (!suiviDisponible() || !window.KarniellaBadges) { zone.hidden = true; return; }

        var badges = window.KarniellaBadges.liste();
        if (!badges.length) { zone.hidden = true; return; }

        var gagnes = badges.filter(function (b) { return b.obtenu; }).length;
        $('badges-compte').textContent = gagnes
            ? gagnes + ' sur ' + badges.length + ' — continue, il en reste à gagner !'
            : 'Aucun pour l\'instant : ouvre une leçon pour gagner le premier !';
        if (gagnes === badges.length) { $('badges-compte').textContent = 'Tous gagnés ! Tu es la reine de l\'écurie. 👑'; }

        liste.textContent = '';
        badges.forEach(function (b) {
            var li = creer('li', 'badge' + (b.obtenu ? ' obtenu' : ''));
            li.appendChild(creer('span', 'badge-icone', b.obtenu ? b.icone : '🔒')).setAttribute('aria-hidden', 'true');
            li.appendChild(creer('strong', 'badge-nom', b.nom));
            li.appendChild(creer('span', 'badge-quoi', b.quoi));
            li.appendChild(creer('span', 'lecteur-seul', b.obtenu ? ' — gagné' : ' — pas encore gagné'));
            liste.appendChild(li);
        });
        zone.hidden = false;
    }

    function rendreSuivi() {
        rendreGalop();
        rendreBadges();
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
                rendreSuivi();
                return;
            }
            if (essais-- > 0) { window.setTimeout(attendre, 300); }
        })();

        // Les badges arrivent par le chat eux aussi, et la progression change
        // quand Karniella fait un quiz depuis le chat de l'accueil.
        window.addEventListener('karniella:progression', function () {
            // Après js/badges.js, qui écoute le même événement pour enregistrer
            // le badge gagné avant qu'on l'affiche.
            window.setTimeout(rendreSuivi, 0);
        });
        var essaisBadges = 20;
        (function attendreBadges() {
            if (window.KarniellaBadges && window.KarniellaProgression) { rendreSuivi(); return; }
            if (essaisBadges-- > 0) { window.setTimeout(attendreBadges, 300); }
        })();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialiser);
    } else {
        initialiser();
    }
})();
