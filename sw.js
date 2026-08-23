// Service Worker pour Révisions Karniella PWA
// Version 1.1.0

const CACHE_NAME = 'karniella-cache-v8';
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
    '/maths-lecon-1-calculs-algebriques.html',
    '/maths-lecon-2-diviseurs.html',
    '/maths-lecon-3-droites-points.html',
    '/maths-lecon-4-secantes-perpendiculaires.html',
    '/maths-lecon-5-droites-paralleles.html',
    '/maths-lecon-6-proprietes.html',
    '/maths-lecon-7-nombres-relatifs.html',
    '/maths-lecon-8-somme-relatifs.html',
    '/maths-lecon-segments.html',
    '/maths-lecon-cercles-disques.html',
    '/maths-lecon-fractions.html',
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

    // Leçons de Français
    '/francais-lecons.html',
    '/francais-groupe-nominal.html',
    '/francais-dictee.html',

    // Leçons Histoire-Géographie
    '/histoire-geographie-lecons.html',
    '/histoire-sources-histoire.html',
    '/histoire-sources-information.html',

    // TICE
    '/tice.html',

    // CSS
    '/css/section-quiz.css',
    '/css/lesson-viewer.css',
    '/css/quiz-viewer.css',
    '/css/karniella-theme.css',
    '/css/horse-theme.css',
    '/styles-math-lessons.css',

    // JavaScript
    '/js/section-quiz.js',
    '/js/lesson-viewer.js',
    '/js/quiz-viewer.js',
    '/js/chat-assistant.js',
    '/math-lessons-script.js',

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

/* ------------------------------------------------------------------
   Base de connaissances du chat (générée par `npm run build:chat`).
   On importe l'index pour en déduire la liste des pages : recopier 58
   chemins à la main ici, c'est se garantir qu'ils divergeront un jour.
   ------------------------------------------------------------------ */
let FICHIERS_CHAT = [];
try {
    importScripts('/js/chat-knowledge-index.js');
    const pages = (self.KarniellaChatKnowledge || {}).pages || {};
    FICHIERS_CHAT = ['/js/chat-knowledge-index.js'].concat(
        Object.keys(pages).map((slug) => '/data/chat/' + slug + '.json')
    );
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
