// Service Worker pour Révisions Karniella PWA
// Version 1.1.0

const CACHE_NAME = 'karniella-cache-v20';
const DATA_CACHE_NAME = 'karniella-data-v1';

// Fichiers à mettre en cache lors de l'installation
// Coquille du site : ce qu'il faut pour qu'une page s'affiche.
// Les pages de leçon, elles, ne sont PAS listées ici — elles sont dérivées de
// l'index du chat plus bas, pour qu'ajouter une leçon ne demande pas de penser
// à venir éditer ce fichier.
const FILES_TO_CACHE = [
    '/',
    '/index.html',
    '/boutique.html',
    '/5e/mission.html',

    '/css/theme.css',
    '/css/matieres.css',
    '/css/coquille.css',
    '/css/boutique.css',
    '/css/mission.css',
    '/css/accueil.css',
    '/css/lecon-5e.css',
    '/css/section-quiz.css',
    '/css/recherche.css',
    '/css/badges.css',

    '/js/accueil.js',
    '/js/programme-5e.js',
    '/js/inscrire-sw.js',
    '/js/chat-assistant.js',
    '/js/section-quiz.js',
    '/js/lecon-5e.js',
    '/js/lecture-vocale.js',
    '/js/recherche.js',
    '/js/recherche-index.js',
    '/js/badges.js',
    '/js/theme.js',
    '/js/coquille.js',
    '/js/xp.js',
    '/js/boutique.js',
    '/js/mission.js',

    '/data/section-questions.json',
    '/data/programme-5e.json',

    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png'
];

/* ------------------------------------------------------------------
   Base de connaissances du chat (générée par `npm run build:chat`).
   On importe l'index pour en déduire la liste des pages : recopier 58
   chemins à la main ici, c'est se garantir qu'ils divergeront un jour.
   ------------------------------------------------------------------ */
let FICHIERS_CHAT = [];
try {
    importScripts('/js/chat-knowledge-index.js');
    const pages = (self.KarniellaChatKnowledge || {}).pages || {};
    FICHIERS_CHAT = ['/js/chat-knowledge-index.js', '/js/progression.js'];

    // L'index du chat liste exactement les pages de 5e du site : sommaires de
    // matière et leçons. On en déduit à la fois les pages à précacher et leur
    // base de connaissances, sans liste à tenir à jour à la main.
    for (const slug of Object.keys(pages)) {
        FICHIERS_CHAT.push('/5e/' + slug + '.html');
        FICHIERS_CHAT.push('/data/chat/' + slug + '.json');
    }
} catch (err) {
    // Index pas encore généré : le chat retombera sur sa base en dur.
    console.warn('[ServiceWorker] base du chat absente', err);
}

/**
 * Précache tolérant aux absences : `cache.addAll` échoue en bloc dès qu'une
 * seule URL renvoie 404. Les fichiers du chat sont facultatifs — ils ne doivent
 * pas pouvoir faire échouer l'installation du service worker.
 */
function mettreEnCacheAuMieux(cache, urls) {
    return Promise.all(urls.map((url) =>
        cache.add(url).catch(() => {
            console.warn('[ServiceWorker] non mis en cache :', url);
        })
    ));
}

// Installation du Service Worker
self.addEventListener('install', (event) => {
    console.log('[ServiceWorker] Installation');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[ServiceWorker] Mise en cache des fichiers');
                return cache.addAll(FILES_TO_CACHE)
                    .then(() => mettreEnCacheAuMieux(cache, FICHIERS_CHAT));
            })
            .then(() => {
                return self.skipWaiting();
            })
    );
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
    console.log('[ServiceWorker] Activation');

    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
                    console.log('[ServiceWorker] Suppression ancien cache', key);
                    return caches.delete(key);
                }
            }));
        })
    );

    return self.clients.claim();
});

// Stratégie de récupération
self.addEventListener('fetch', (event) => {
    // L'API (dont le repli IA du chat) ne doit jamais être mise en cache.
    if (event.request.url.includes('/api/')) {
        return;
    }

    // Pour les données JSON : Network First, Cache Fallback
    if (event.request.url.includes('/data/')) {
        event.respondWith(
            caches.open(DATA_CACHE_NAME).then((cache) => {
                return fetch(event.request)
                    .then((response) => {
                        // Mettre en cache la nouvelle version
                        cache.put(event.request, response.clone());
                        return response;
                    })
                    .catch(() => {
                        // Si pas de réseau, utiliser le cache. `caches.match`
                        // (global) et non `cache.match` : les fichiers du chat
                        // sont précachés dans CACHE_NAME, pas dans le cache de
                        // données, et resteraient introuvables hors-ligne.
                        return caches.match(event.request);
                    });
            })
        );
        return;
    }

    // Pour les pages : Network First afin qu'une mise à jour soit visible
    // dès la prochaine ouverture, avec le cache comme secours hors-ligne.
    if (event.request.mode === 'navigate' || event.request.destination === 'document') {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    if (response && response.status === 200) {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => cache.put(event.request, responseToCache));
                    }
                    return response;
                })
                .catch(async () => {
                    return (await caches.match(event.request)) || caches.match('/index.html');
                })
        );
        return;
    }

    // Pour les ressources statiques : Cache First, Network Fallback
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }

                return fetch(event.request).then((response) => {
                    // Ne pas mettre en cache les requêtes non-GET
                    if (event.request.method !== 'GET') {
                        return response;
                    }

                    // Ne pas mettre en cache les erreurs
                    if (!response || response.status !== 200 || response.type === 'error') {
                        return response;
                    }

                    // Clone la réponse
                    const responseToCache = response.clone();

                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseToCache);
                        });

                    return response;
                });
            })
            .catch(() => {
                // Page de fallback pour les pages HTML
                if (event.request.destination === 'document') {
                    return caches.match('/index.html');
                }
            })
    );
});

// Gestion des messages du client
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
