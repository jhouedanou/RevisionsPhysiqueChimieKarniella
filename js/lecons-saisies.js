/**
 * lecons-saisies.js — Les leçons que tonton tape sur saisie.html.
 *
 * Elles vivent dans la table `lecon_saisie` du projet Supabase « karniella »
 * (voir supabase/lecons-saisies.sql). Ce module :
 *   - lit les leçons visibles, avec la clé publique ;
 *   - garde la dernière liste reçue dans localStorage, pour le hors-ligne ;
 *   - transforme le texte tapé en HTML (titres, puces, gras, définitions) ;
 *   - sur le sommaire d'une matière, ajoute les cartes de ses leçons ;
 *   - sur 5e/lecon.html?id=…, affiche la leçon demandée.
 *
 * Si la table n'existe pas encore, ou sans réseau ni cache, il n'affiche
 * rien : le sommaire reste celui du programme.
 */
(function () {
    'use strict';

    if (window.KarniellaLeconsSaisies) { return; }

    var URL_SUPABASE = 'https://bpxhzpzybvldbyvbzslb.supabase.co';
    var CLE_PUBLIQUE = 'sb_publishable_llOCHVMS5NQBudZW4E4RXw_Y1NJhWAI';
    var CACHE = 'karniella-lecons-saisies';
    var DELAI_MS = 6000;

    function el(balise, classe, texte) {
        var e = document.createElement(balise);
        if (classe) { e.className = classe; }
        if (texte != null) { e.textContent = texte; }
        return e;
    }

    function lireCache() {
        try { return JSON.parse(window.localStorage.getItem(CACHE)) || []; } catch (err) { return []; }
    }

    function ecrireCache(lecons) {
        try { window.localStorage.setItem(CACHE, JSON.stringify(lecons)); } catch (err) { /* stockage refusé */ }
    }

    /* ============================================================
       Lecture
       ============================================================ */

    var demande = null;

    /** Toutes les leçons visibles. Sans réseau : la dernière liste reçue. */
    function toutes() {
        if (demande) { return demande; }
        if (typeof window.fetch !== 'function') { return Promise.resolve(lireCache()); }

        var arret = typeof AbortController === 'function' ? new AbortController() : null;
        var minuteur = arret ? setTimeout(function () { arret.abort(); }, DELAI_MS) : null;

        demande = window.fetch(URL_SUPABASE + '/rest/v1/lecon_saisie' +
            '?select=id,matiere,titre,contenu,cree_le,modifie_le&order=cree_le.asc', {
            headers: { 'apikey': CLE_PUBLIQUE },
            signal: arret ? arret.signal : undefined
        }).then(function (r) {
            if (!r.ok) { throw new Error('reseau'); }
            return r.json();
        }).then(function (lecons) {
            ecrireCache(lecons);
            return lecons;
        }).catch(function () {
            return lireCache();
        }).then(function (lecons) {
            if (minuteur) { clearTimeout(minuteur); }
            return lecons;
        });
        return demande;
    }

    /* ============================================================
       Mise en forme du texte tapé
       ============================================================
       Les règles sont rappelées sur saisie.html :
         # Titre        → grand titre de partie
         ## Sous-titre  → petit titre
         - élément      → puce
         > définition   → encadré de définition
         **mot**        → gras
         ligne vide     → nouveau paragraphe
       Tout passe par textContent : du HTML tapé s'affiche tel quel, il
       n'est jamais exécuté. */

    /** Ajoute le texte d'une ligne à `parent`, avec les **gras**. */
    function enLigne(parent, texte) {
        var morceaux = texte.split('**');
        // Un ** sans partenaire : on le laisse visible plutôt que de tout mettre en gras.
        if (morceaux.length % 2 === 0) {
            var dernier = morceaux.pop();
            morceaux[morceaux.length - 1] += '**' + dernier;
        }
        morceaux.forEach(function (m, i) {
            if (!m) { return; }
            parent.appendChild(i % 2 ? el('strong', '', m) : document.createTextNode(m));
        });
    }

    function rendre(texte, conteneur) {
        conteneur.textContent = '';
        var bloc = null;      // paragraphe, liste ou encadré en cours
        var sorte = '';

        function ouvrir(nouvelle, balise, classe) {
            if (sorte !== nouvelle) {
                bloc = conteneur.appendChild(el(balise, classe));
                sorte = nouvelle;
            }
            return bloc;
        }

        String(texte || '').replace(/\r\n?/g, '\n').split('\n').forEach(function (brute) {
            var ligne = brute.trim();
            var m;
            if (!ligne) { sorte = ''; return; }

            if ((m = /^(#{1,3})\s+(.+)$/.exec(ligne))) {
                sorte = '';
                enLigne(conteneur.appendChild(el(m[1].length === 1 ? 'h2' : 'h3')), m[2]);
            } else if ((m = /^[-*•]\s+(.+)$/.exec(ligne))) {
                enLigne(ouvrir('liste', 'ul').appendChild(el('li')), m[1]);
            } else if ((m = /^>\s?(.*)$/.exec(ligne))) {
                enLigne(ouvrir('encadre', 'div', 'definition-box').appendChild(el('p')), m[1]);
            } else {
                var p = ouvrir('para', 'p');
                if (p.childNodes.length) { p.appendChild(el('br')); }
                enLigne(p, ligne);
            }
        });
    }

    function dateCourte(iso) {
        var d = new Date(iso);
        if (isNaN(d.getTime())) { return ''; }
        return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
    }

    function matiereDe(id) {
        var p = window.KarniellaProgramme;
        var trouvee = null;
        ((p && p.matieres) || []).forEach(function (m) { if (m.id === id) { trouvee = m; } });
        return trouvee;
    }

    /* ============================================================
       Sommaire d'une matière : les cartes « Leçons ajoutées »
       ============================================================ */

    function remplirSommaire() {
        var matiere = document.body.getAttribute('data-matiere');
        var zone = document.querySelector('main .container');
        if (!matiere || !zone) { return; }

        toutes().then(function (lecons) {
            var miennes = lecons.filter(function (l) { return l.matiere === matiere; });
            if (!miennes.length) { return; }

            var section = el('div', 'lecons-saisies');
            section.appendChild(el('h2', '', '✍️ Leçons ajoutées'));
            var grille = section.appendChild(el('div', 'grille-lecons'));
            miennes.forEach(function (l) {
                var carte = grille.appendChild(el('a', 'carte-lecon'));
                carte.href = 'lecon.html?id=' + encodeURIComponent(l.id);
                carte.appendChild(el('span', 'icone', '✍️')).setAttribute('aria-hidden', 'true');
                carte.appendChild(el('span', 'etiquette prete', 'Disponible'));
                carte.appendChild(el('h3', '', l.titre));
                carte.appendChild(el('p', '', 'Ajoutée le ' + dateCourte(l.cree_le)));
            });

            // Le message « Pas encore de leçon ici » n'est plus vrai.
            var vide = zone.querySelector('.vide');
            if (vide) { vide.hidden = true; }
            zone.appendChild(section);
        });
    }

    /* ============================================================
       5e/lecon.html?id=… : une leçon
       ============================================================ */

    function afficherLecon() {
        var id = new URLSearchParams(window.location.search).get('id');
        var titre = document.getElementById('lecon-titre');
        var badge = document.getElementById('lecon-badge');
        var corps = document.getElementById('lecon-contenu');

        toutes().then(function (lecons) {
            var lecon = null;
            lecons.forEach(function (l) { if (String(l.id) === id) { lecon = l; } });

            if (!lecon) {
                titre.textContent = 'Leçon introuvable';
                corps.textContent = '';
                corps.appendChild(el('p', '', 'Cette leçon a été retirée, ou la connexion internet ne marche pas.'));
                var retour = corps.appendChild(el('a', '', 'Retour à l\'accueil'));
                retour.href = '../index.html';
                return;
            }

            var matiere = matiereDe(lecon.matiere);
            document.body.setAttribute('data-matiere', lecon.matiere);
            document.title = lecon.titre + ' - ' + (matiere ? matiere.nom + ' ' : '') + '5e';
            titre.textContent = (matiere ? matiere.icone + ' ' : '') + lecon.titre;
            badge.textContent = (matiere ? matiere.nom + ' · ' : '') + 'Classe de 5e';
            rendre(lecon.contenu, corps);
            if (window.KarniellaCoquille) { window.KarniellaCoquille.rafraichir(); }
        });
    }

    window.KarniellaLeconsSaisies = { toutes: toutes, rendre: rendre };

    function demarrer() {
        if (document.body.classList.contains('page-matiere')) { remplirSommaire(); }
        if (document.getElementById('lecon-contenu')) { afficherLecon(); }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', demarrer);
    } else {
        demarrer();
    }
})();
