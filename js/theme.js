/**
 * theme.js — Mode sombre 🌙 et texte plus grand A+.
 *
 * Chargé SANS defer dans le <head> de chaque page, juste après css/theme.css :
 * il pose `data-theme` sur <html> avant le premier affichage, sinon la page
 * clignoterait en blanc avant de passer en sombre.
 *
 * Tant que Karniella n'a rien choisi, le site suit le réglage de l'appareil.
 * Son choix, une fois fait, est gardé.
 */
(function () {
    'use strict';

    if (window.KarniellaTheme) { return; }

    var CLE_THEME = 'karniella-theme';
    var CLE_TEXTE = 'karniella-texte';
    var html = document.documentElement;
    var media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

    function lire(cle) {
        try { return window.localStorage.getItem(cle); } catch (err) { return null; }
    }

    function ecrire(cle, valeur) {
        try { window.localStorage.setItem(cle, valeur); } catch (err) { /* choix oublié au rechargement */ }
    }

    /** Le thème acheté dans la boutique (js/xp.js), ou null. */
    function skinActif() {
        try {
            var xp = JSON.parse(window.localStorage.getItem('karniella-xp'));
            return (xp && xp.skin) || null;
        } catch (err) { return null; }
    }

    function estSombre() {
        // Les thèmes de la boutique sont des thèmes de nuit : ils imposent le sombre.
        if (skinActif()) { return true; }
        var choix = lire(CLE_THEME);
        if (choix === 'dark' || choix === 'light') { return choix === 'dark'; }
        return Boolean(media && media.matches);
    }

    var boutonTheme = null;
    var boutonTexte = null;

    function appliquer() {
        var sombre = estSombre();
        html.setAttribute('data-theme', sombre ? 'dark' : 'light');
        var skin = skinActif();
        if (skin) { html.setAttribute('data-skin', skin); } else { html.removeAttribute('data-skin'); }
        html.setAttribute('data-texte', lire(CLE_TEXTE) === 'grand' ? 'grand' : 'normal');

        // La barre du navigateur, sur téléphone, suit le thème.
        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta) { meta.setAttribute('content', sombre ? '#1B1418' : '#B9366C'); }

        if (boutonTheme) {
            boutonTheme.textContent = sombre ? '☀️' : '🌙';
            boutonTheme.setAttribute('aria-label', sombre ? 'Passer en mode clair' : 'Passer en mode sombre');
            boutonTheme.setAttribute('title', sombre ? 'Mode clair' : 'Mode sombre');
        }
        if (boutonTexte) {
            boutonTexte.setAttribute('aria-pressed', lire(CLE_TEXTE) === 'grand' ? 'true' : 'false');
        }
    }

    function basculerTheme() {
        // Avec un thème de boutique, 🌙 ramène au thème de base en clair.
        if (skinActif() && window.KarniellaXP) { window.KarniellaXP.activerTheme(null); ecrire(CLE_THEME, 'light'); appliquer(); return; }
        ecrire(CLE_THEME, estSombre() ? 'light' : 'dark');
        appliquer();
    }

    function basculerTexte() {
        ecrire(CLE_TEXTE, lire(CLE_TEXTE) === 'grand' ? 'normal' : 'grand');
        appliquer();
    }

    appliquer();
    if (media) {
        var suivre = function () { if (!lire(CLE_THEME)) { appliquer(); } };
        if (media.addEventListener) { media.addEventListener('change', suivre); }
        else if (media.addListener) { media.addListener(suivre); }
    }

    /**
     * Les deux boutons, dans la barre du haut (js/coquille.js). Sans elle —
     * une vieille page qui ne la charge pas — ils vont dans l'en-tête.
     */
    function ajouterBoutons() {
        var zone = window.KarniellaCoquille ? window.KarniellaCoquille.zoneOutils() : null;
        var entete = zone || document.querySelector('.accueil-entete, body.lecon-5e > header');
        if (!entete || entete.querySelector('.reglages')) { return; }

        var groupe = document.createElement('div');
        groupe.className = 'reglages';

        boutonTheme = document.createElement('button');
        boutonTheme.type = 'button';
        boutonTheme.className = 'reglage';
        boutonTheme.addEventListener('click', basculerTheme);

        boutonTexte = document.createElement('button');
        boutonTexte.type = 'button';
        boutonTexte.className = 'reglage';
        boutonTexte.textContent = 'A+';
        boutonTexte.setAttribute('data-reglage', 'texte');
        boutonTexte.setAttribute('aria-label', 'Texte plus grand');
        boutonTexte.setAttribute('title', 'Texte plus grand');
        boutonTexte.addEventListener('click', basculerTexte);

        groupe.appendChild(boutonTheme);
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
