/**
 * theme.js — Thème du site et texte plus grand A+.
 *
 * Chargé SANS defer dans le <head> de chaque page, juste après css/theme.css :
 * il pose `data-theme` sur <html> avant le premier affichage.
 *
 * Le mode sombre est désactivé (demandé le 15/11) : le site est toujours en
 * clair, même si l'appareil est en sombre, et le bouton 🌙 n'existe plus.
 * Seuls les thèmes foncés achetés dans la boutique gardent leurs couleurs.
 */
(function () {
    'use strict';

    if (window.KarniellaTheme) { return; }

    var CLE_TEXTE = 'karniella-texte';
    var html = document.documentElement;

    function lire(cle) {
        try { return window.localStorage.getItem(cle); } catch (err) { return null; }
    }

    function ecrire(cle, valeur) {
        try { window.localStorage.setItem(cle, valeur); } catch (err) { /* choix oublié au rechargement */ }
    }

    /* Les thèmes de la boutique. Ceux « de jour » gardent le mode clair,
       les autres imposent le sombre (leurs surfaces sont foncées). */
    var SKINS = {
        'theme-cyberpunk-rose': { valeur: 'cyberpunk-rose', clair: false },
        'theme-espace-profond': { valeur: 'espace-profond', clair: false },
        'theme-foret-enchantee': { valeur: 'foret-enchantee', clair: false },
        'theme-ocean': { valeur: 'ocean', clair: true },
        'theme-bonbon': { valeur: 'bonbon', clair: true },
        'theme-or-royal': { valeur: 'or-royal', clair: false }
    };

    /** Le thème acheté et activé dans la boutique (js/xp.js), ou null. */
    function skinActif() {
        try {
            var xp = JSON.parse(window.localStorage.getItem('karniella-xp'));
            if (!xp) { return null; }
            var id = xp.actifs ? xp.actifs.theme : null;
            if (!id && xp.skin) { id = 'theme-' + xp.skin; }   // ancien format
            if (!id || !SKINS[id] || (xp.achats || []).indexOf(id) === -1) { return null; }
            return SKINS[id];
        } catch (err) { return null; }
    }

    function estSombre() {
        // Plus de mode sombre : seul un thème foncé de la boutique assombrit le site.
        var skin = skinActif();
        return skin ? !skin.clair : false;
    }

    var boutonTexte = null;

    /** Le fond du thème en mode sombre (thèmes de la boutique compris), le rose sinon. */
    function couleurBarre(sombre) {
        if (!sombre) { return '#B9366C'; }
        var fond = '';
        try { fond = window.getComputedStyle(html).getPropertyValue('--fond').trim(); } catch (err) { /* vieux navigateur */ }
        return fond || '#1B1418';
    }

    function appliquer() {
        var sombre = estSombre();
        html.setAttribute('data-theme', sombre ? 'dark' : 'light');
        var skin = skinActif();
        if (skin) { html.setAttribute('data-skin', skin.valeur); } else { html.removeAttribute('data-skin'); }
        html.setAttribute('data-texte', lire(CLE_TEXTE) === 'grand' ? 'grand' : 'normal');

        // La barre du navigateur, sur téléphone, suit le thème. Les pages de 5e/
        // n'ont pas la balise : on la crée, plutôt que de l'écrire dans 24 pages.
        var meta = document.querySelector('meta[name="theme-color"]');
        if (!meta && document.head) {
            meta = document.createElement('meta');
            meta.setAttribute('name', 'theme-color');
            document.head.appendChild(meta);
        }
        if (meta) { meta.setAttribute('content', couleurBarre(sombre)); }

        if (boutonTexte) {
            boutonTexte.setAttribute('aria-pressed', lire(CLE_TEXTE) === 'grand' ? 'true' : 'false');
        }
    }

    /** Retire le thème de la boutique : retour au thème clair de base. */
    function basculerTheme() {
        if (skinActif() && window.KarniellaXP) { window.KarniellaXP.desactiver('theme'); }
        appliquer();
    }

    function basculerTexte() {
        ecrire(CLE_TEXTE, lire(CLE_TEXTE) === 'grand' ? 'normal' : 'grand');
        appliquer();
    }

    appliquer();

    /**
     * Le bouton A+, dans la barre du haut (js/coquille.js). Sans elle —
     * une vieille page qui ne la charge pas — il va dans l'en-tête.
     */
    function ajouterBoutons() {
        var zone = window.KarniellaCoquille ? window.KarniellaCoquille.zoneOutils() : null;
        var entete = zone || document.querySelector('.accueil-entete, body.lecon-5e > header');
        if (!entete || entete.querySelector('.reglages')) { return; }

        var groupe = document.createElement('div');
        groupe.className = 'reglages';

        boutonTexte = document.createElement('button');
        boutonTexte.type = 'button';
        boutonTexte.className = 'reglage';
        boutonTexte.textContent = 'A+';
        boutonTexte.setAttribute('data-reglage', 'texte');
        boutonTexte.setAttribute('aria-label', 'Texte plus grand');
        boutonTexte.setAttribute('title', 'Texte plus grand');
        boutonTexte.addEventListener('click', basculerTexte);

        groupe.appendChild(boutonTexte);
        if (!zone) { entete.style.position = entete.style.position || 'relative'; }
        entete.appendChild(groupe);
        if (window.KarniellaCoquille) { window.KarniellaCoquille.ranger(); }
        appliquer();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ajouterBoutons);
    } else {
        ajouterBoutons();
    }

    window.KarniellaTheme = { basculerTheme: basculerTheme, basculerTexte: basculerTexte, appliquer: appliquer };
})();
