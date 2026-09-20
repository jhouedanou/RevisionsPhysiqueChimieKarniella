/**
 * inscrire-sw.js — Enregistre le service worker.
 *
 * Tenait dans un <script> en dur au bas de l'accueil. Sorti ici pour que la
 * page ne porte plus aucun script inline, et parce que toute page voulant
 * rendre le site installable peut désormais le charger.
 */
(function () {
    'use strict';

    if (!('serviceWorker' in navigator)) { return; }

    window.addEventListener('load', function () {
        navigator.serviceWorker.register('/sw.js')
            .catch(function (err) {
                // En http:// ou en navigation privée, l'enregistrement échoue :
                // le site fonctionne, il n'est simplement pas installable.
                console.warn('Service worker non enregistré :', err.message);
            });
    });
})();
