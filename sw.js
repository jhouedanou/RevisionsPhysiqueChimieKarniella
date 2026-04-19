// Service Worker pour Révisions Karniella PWA
// Version 1.0.0

const CACHE_NAME = 'karniella-cache-v4';
const DATA_CACHE_NAME = 'karniella-data-v1';

// Fichiers à mettre en cache lors de l'installation
const FILES_TO_CACHE = [
    '/',
    '/index.html',
    '/mathematiques.html',
    '/physique.html',
    '/svt.html',
    '/histoire-geographie.html',
    '/education-civique.html',

    // Leçons ECM
    '/ecm-lecon-8-securite-routiere.html',
    '/ecm-lecon-9-secteur-primaire.html',
    '/ecm-lecon-10-puberte.html',
    '/ecm-lecon-11-abstinence.html',

    // Leçons Informatique
    '/informatique-lecon-3-apercu-impression.html',
    '/informatique-culture-numerique-internet.html',

    // Leçons de Mathématiques
    '/maths-lecon-geometrie-triangle.html',
    '/maths-lecon-proportionnalite.html',
    '/maths-lecon-symetrie-centrale.html',

    // Leçons de Physique
    '/le-circuit-electrique.html',
    '/les-commandes-electriques.html',
    '/lecon-3-court-circuit.html',
    '/lecon-4-solides-liquides.html',

    // Quiz de Physique
    '/le-circuit-electrique-quiz.html',
    '/les-commandes-electriques-quiz.html',
    '/lecon-3-court-circuit-quiz.html',

    // Leçons de SVT
    '/svt-lecons.html',
    '/svt-graine-germe.html',
    '/svt-reproduction-mammiferes.html',
    '/svt-reproduction-oiseaux.html',
    '/svt-croissance-plantes.html',
    '/svt-croissance-vertebres.html',

    // CSS
    '/css/section-quiz.css',
    '/css/lesson-viewer.css',
    '/css/quiz-viewer.css',

    // JavaScript
    '/js/section-quiz.js',
    '/js/lesson-viewer.js',
    '/js/quiz-viewer.js',

    // Data JSON (avec stratégie Network First)
    '/data/subjects.json',
    '/data/lessons.json',
    '/data/quizzes.json',
    '/data/section-questions.json',

    // Manifest
    '/manifest.json',

    // Icons
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
    console.log('[ServiceWorker] Installation');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[ServiceWorker] Mise en cache des fichiers');
                return cache.addAll(FILES_TO_CACHE);
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
                        // Si pas de réseau, utiliser le cache
                        return cache.match(event.request);
                    });
            })
        );
        return;
    }

    // Pour le reste : Cache First, Network Fallback
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
