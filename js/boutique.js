/**
 * boutique.js — Affiche le catalogue de js/xp.js et gère les achats.
 */
(function () {
    'use strict';

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
        zone.appendChild(el('span', 'etoile', '⭐')).setAttribute('aria-hidden', 'true');
        var bloc = el('div');
        bloc.appendChild(el('span', 'gros', X.solde() + ' XP'));
        bloc.appendChild(el('span', 'detail', X.total() + ' XP gagnés en tout'));
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

    function rendreArticles() {
        var X = window.KarniellaXP;
        var zone = $('articles');
        zone.textContent = '';
        var solde = X.solde();

        X.catalogue().forEach(function (a) {
            var carte = el('article', 'article' + (a.possede ? ' possede' : '') + (a.actif ? ' actif' : ''));
            var apercu = el('div', 'apercu ' + (a.type === 'theme' ? a.valeur : a.type), a.icone);
            apercu.setAttribute('aria-hidden', 'true');
            carte.appendChild(apercu);
            carte.appendChild(el('h2', '', a.nom));
            carte.appendChild(el('p', '', a.quoi));

            var bas = el('div', 'bas');
            var bouton;
            if (a.possede) {
                bas.appendChild(el('span', 'prix', a.actif ? '✓ Activé' : '✓ Débloqué'));
                if (a.type === 'theme') {
                    bouton = el('button', 'bouton second', a.actif ? 'Retirer' : 'Activer');
                    bouton.addEventListener('click', function () { X.activerTheme(a.actif ? null : a.id); rendre(); });
                } else if (a.type === 'avatar') {
                    bouton = el('button', 'bouton second', a.actif ? 'Retirer' : 'Utiliser');
                    bouton.addEventListener('click', function () { X.activerAvatar(a.actif ? null : a.id); rendre(); });
                }
            } else {
                bas.appendChild(el('span', 'prix', a.prix + ' XP'));
                if (solde >= a.prix) {
                    bouton = el('button', 'bouton', 'Débloquer');
                    bouton.addEventListener('click', function () {
                        if (X.acheter(a.id)) {
                            note('🎉 ' + a.nom + ' débloqué' + (a.type === 'theme' ? ' et activé' : '') + ' !');
                            if (window.KarniellaFete) { window.KarniellaFete(); }
                            rendre();
                        }
                    });
                } else {
                    bouton = el('button', 'bouton verrou', 'Encore ' + (a.prix - solde) + ' XP');
                    bouton.disabled = true;
                }
            }
            if (bouton) { bouton.type = 'button'; bas.appendChild(bouton); }
            carte.appendChild(bas);
            zone.appendChild(carte);
        });
    }

    function rendre() {
        if (!window.KarniellaXP) { return; }
        rendreSolde();
        rendreArticles();
    }

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', rendre); } else { rendre(); }
    window.addEventListener('karniella:xp', function () { window.setTimeout(rendre, 0); });
})();
