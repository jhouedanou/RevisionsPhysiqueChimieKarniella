/**
 * inscrire-sw.js — Enregistre le service worker et le tient à jour.
 *
 * Chargé par l'accueil et la boutique, et par js/coquille.js sur toutes les
 * autres pages : une leçon ouverte directement (lien partagé, favori) inscrit
 * aussi le service worker.
 *
 * Mise à jour : le navigateur ne vérifie sw.js qu'en changeant de page. Une
 * application restée ouverte des jours sur le téléphone ne le ferait jamais :
 * on le vérifie donc aussi chaque fois que la page revient à l'écran.
 */
(function () {
    'use strict';

    if (!('serviceWorker' in navigator) || window.KarniellaSW) { return; }
    window.KarniellaSW = true;

    function inscrire() {
        // updateViaCache: 'none' — sw.js et le script qu'il importe
        // (js/chat-knowledge-index.js, qui change à chaque nouvelle leçon) sont
        // toujours redemandés au serveur, jamais pris dans le cache HTTP.
        navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
            .then(function (inscription) {
                document.addEventListener('visibilitychange', function () {
                    if (document.visibilityState === 'visible') {
                        inscription.update().catch(function () { /* hors-ligne */ });
                    }
                });
            })
            .catch(function (err) {
                // En http:// ou en navigation privée, l'enregistrement échoue :
                // le site fonctionne, il n'est simplement pas installable.
                console.warn('Service worker non enregistré :', err.message);
            });
    }

    // Chargé après coup par coquille.js, l'événement load peut être passé.
    if (document.readyState === 'complete') {
        inscrire();
    } else {
        window.addEventListener('load', inscrire);
    }
})();
