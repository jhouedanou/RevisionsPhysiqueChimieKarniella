/**
 * boutique.js — Affiche le catalogue de js/xp.js, par catégorie, et gère
 * les achats et l'activation.
 */
(function () {
    'use strict';

    var ORDRE = ['badge', 'theme', 'avatar', 'cadre', 'confettis', 'titre'];
    var filtre = 'tous';

    function $(id) { return document.getElementById(id); }

    function el(balise, classe, texte) {
        var e = document.createElement(balise);
        if (classe) { e.className = classe; }
        if (texte !== undefined) { e.textContent = texte; }
        return e;
    }

    function note(texte) {
        var n = $('boutique-note');
        n.textContent = texte;
        n.hidden = false;
    }

    function rendreSolde() {
        var X = window.KarniellaXP;
        var zone = $('solde');
        zone.textContent = '';
        var etoile = el('span', 'etoile');
        etoile.innerHTML = window.KarniellaIcones ? window.KarniellaIcones.svg('etoile', 34) : '⭐';
        etoile.setAttribute('aria-hidden', 'true');
        zone.appendChild(etoile);
        var bloc = el('div');
        bloc.appendChild(el('span', 'gros', X.solde() + ' XP'));
        var achats = X.catalogue().filter(function (a) { return a.possede; }).length;
        bloc.appendChild(el('span', 'detail', X.total() + ' XP gagnés en tout · ' + achats + ' récompense' + (achats > 1 ? 's' : '') + ' sur ' + X.catalogue().length));
        zone.appendChild(bloc);

        var p = X.prochain();
        if (p) {
            var prochain = el('div', 'prochain');
            var texte = el('span');
            texte.appendChild(document.createTextNode('Prochain : '));
            texte.appendChild(el('strong', '', p.icone + ' ' + p.nom));
            prochain.appendChild(texte);
            var jauge = el('div', 'jauge');
            jauge.setAttribute('role', 'progressbar');
            jauge.setAttribute('aria-valuemin', '0');
            jauge.setAttribute('aria-valuemax', String(p.prix));
            jauge.setAttribute('aria-valuenow', String(Math.min(p.prix, X.solde())));
            var i = el('i');
            i.style.width = Math.min(100, Math.round(X.solde() / p.prix * 100)) + '%';
            jauge.appendChild(i);
            prochain.appendChild(jauge);
            prochain.appendChild(el('span', '', Math.min(p.prix, X.solde()) + ' / ' + p.prix + ' XP'));
            zone.appendChild(prochain);
        } else {
            zone.appendChild(el('div', 'prochain', 'Tout est débloqué ! 👑'));
        }
    }

    function rendreFiltres() {
        var X = window.KarniellaXP;
        var zone = $('filtres');
        zone.textContent = '';
        var tous = [{ id: 'tous', nom: 'Tout' }].concat(ORDRE.map(function (t) { return { id: t, nom: X.TYPES[t].nom }; }));
        tous.forEach(function (f) {
            var b = el('button', 'filtre' + (filtre === f.id ? ' actif' : ''), f.nom);
            b.type = 'button';
            b.setAttribute('aria-pressed', filtre === f.id ? 'true' : 'false');
            b.addEventListener('click', function () { filtre = f.id; rendre(); });
            zone.appendChild(b);
        });
    }

    function carteArticle(a, solde) {
        var X = window.KarniellaXP;
        var carte = el('article', 'article' + (a.possede ? ' possede' : '') + (a.actif ? ' actif' : '') + (!a.possede && solde < a.prix ? ' verrouille' : ''));
        var apercu = el('div', 'apercu apercu-' + (a.type === 'theme' ? 'theme-' + a.valeur : a.type), a.icone);
        apercu.setAttribute('aria-hidden', 'true');
        carte.appendChild(apercu);
        carte.appendChild(el('span', 'categorie', X.TYPES[a.type].nom));
        carte.appendChild(el('h3', '', a.nom));
        carte.appendChild(el('p', '', a.quoi));

        var bas = el('div', 'bas');
        var bouton;
        if (a.possede) {
            bas.appendChild(el('span', 'prix', a.actif ? '✓ Activé' : '✓ Débloqué'));
            if (a.type !== 'badge') {
                bouton = el('button', 'bouton second', a.actif ? 'Retirer' : 'Activer');
                bouton.addEventListener('click', function () {
                    if (a.actif) { X.desactiver(a.type); } else { X.activer(a.id); }
                    rendre();
                });
            }
        } else {
            bas.appendChild(el('span', 'prix', a.prix + ' XP'));
            if (solde >= a.prix) {
                bouton = el('button', 'bouton', 'Débloquer');
                bouton.addEventListener('click', function () {
                    if (X.acheter(a.id)) {
                        note('🎉 ' + a.nom + ' débloqué' + (a.type !== 'badge' ? ' et activé' : '') + ' !');
                        if (window.KarniellaFete) { window.KarniellaFete(); }
                        rendre();
                    }
                });
            } else {
                bouton = el('button', 'bouton verrou', 'Encore ' + (a.prix - solde) + ' XP');
                bouton.disabled = true;
                bouton.setAttribute('aria-label', a.nom + ' : il te manque ' + (a.prix - solde) + ' XP');
            }
        }
        if (bouton) { bouton.type = 'button'; bas.appendChild(bouton); }
        carte.appendChild(bas);
        return carte;
    }

    function rendreArticles() {
        var X = window.KarniellaXP;
        var zone = $('articles');
        zone.textContent = '';
        var solde = X.solde();
        var articles = X.catalogue();

        ORDRE.forEach(function (type) {
            if (filtre !== 'tous' && filtre !== type) { return; }
            var section = el('section', 'rayon');
            var tete = el('div', 'rayon-tete');
            tete.appendChild(el('h2', '', X.TYPES[type].nom));
            tete.appendChild(el('p', '', X.TYPES[type].quoi));
            section.appendChild(tete);
            var grille = el('div', 'grille');
            articles.filter(function (a) { return a.type === type; })
                .sort(function (a, b) { return a.prix - b.prix; })
                .forEach(function (a) { grille.appendChild(carteArticle(a, solde)); });
            section.appendChild(grille);
            zone.appendChild(section);
        });
    }

    function rendre() {
        if (!window.KarniellaXP) { return; }
        rendreSolde();
        rendreFiltres();
        rendreArticles();
    }

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', rendre); } else { rendre(); }
    window.addEventListener('karniella:xp', function () { window.setTimeout(rendre, 0); });
})();
