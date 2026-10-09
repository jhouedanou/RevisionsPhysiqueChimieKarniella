// Service Worker pour Révisions Karniella PWA
// Version 1.2.0
//
// Politique de cache : le RÉSEAU D'ABORD pour tout ce qui change quand on
// ajoute une leçon (pages, scripts, styles, données JSON). Le cache ne sert
// que de secours : hors-ligne, ou quand le réseau met plus de DELAI_RESEAU à
// répondre. Avant, scripts et styles étaient servis « cache d'abord » : le
// catalogue de l'accueil (js/programme-5e.js) restait l'ancien et les
// nouvelles leçons n'apparaissaient qu'après un rechargement forcé.
// Seules les images et les polices, qui ne changent jamais, restent
// « cache d'abord ».

const CACHE_NAME = 'karniella-cache-v40';
const DATA_CACHE_NAME = 'karniella-data-v1';

// Au-delà, on sert la copie en cache (si on en a une) et le réseau continue
// en arrière-plan pour mettre le cache à jour. Une connexion mobile lente ne
// doit pas laisser l'écran blanc.
const DELAI_RESEAU = 4000;

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
    '/js/traduction.js',
    '/js/xp.js',
    '/js/boutique.js',
    '/js/mission.js',
    '/js/suivi.js',

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
    // `cache: 'reload'` : on veut la version du serveur, pas une copie que le
    // cache HTTP du navigateur aurait gardée de la visite précédente.
    return Promise.all(urls.map((url) =>
        cache.add(new Request(url, { cache: 'reload' })).catch(() => {
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
                // Tolérant pour tout : un seul fichier en 404 ne doit pas bloquer
                // l'installation, sinon l'ancien service worker reste en place
                // pour toujours et plus rien ne se met à jour.
                return mettreEnCacheAuMieux(cache, FILES_TO_CACHE.concat(FICHIERS_CHAT));
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

/* ------------------------------------------------------------------
   Stratégies
   ------------------------------------------------------------------ */

/** Garde une copie d'une réponse valide. */
function garder(nomCache, requete, reponse) {
    if (!reponse || reponse.status !== 200 || reponse.type === 'error') { return; }
    const copie = reponse.clone();
    caches.open(nomCache).then((cache) => cache.put(requete, copie));
}

/**
 * Réseau d'abord. Si le réseau échoue, ou s'il tarde plus de DELAI_RESEAU et
 * qu'on a une copie, on sert la copie ; le réseau, lui, finit sa course et met
 * le cache à jour pour la prochaine fois.
 */
function reseauDAbord(event, nomCache, secours) {
    const requete = event.request;
    const reseau = fetch(requete).then((reponse) => {
        garder(nomCache, requete, reponse);
        return reponse;
    });
    // Le service worker ne doit pas s'arrêter avant la fin de la mise à jour.
    event.waitUntil(reseau.then(() => undefined, () => undefined));

    const copie = () => caches.match(requete).then((r) => r || (secours ? secours() : undefined));

    return new Promise((resoudre, rejeter) => {
        let fini = false;
        const minuterie = setTimeout(() => {
            caches.match(requete).then((r) => {
                if (r && !fini) { fini = true; resoudre(r); }
            });
        }, DELAI_RESEAU);

        reseau.then((reponse) => {
            clearTimeout(minuterie);
            if (!fini) { fini = true; resoudre(reponse); }
        }).catch(() => {
            clearTimeout(minuterie);
            if (fini) { return; }
            copie().then((r) => {
                fini = true;
                if (r) { resoudre(r); } else { rejeter(new Error('hors-ligne et pas en cache')); }
            });
        });
    });
}

/** Cache d'abord : pour ce qui ne change jamais (images, polices). */
function cacheDAbord(event) {
    const requete = event.request;
    return caches.match(requete).then((r) => r || fetch(requete).then((reponse) => {
        garder(CACHE_NAME, requete, reponse);
        return reponse;
    }));
}

const IMMUABLE = /\.(png|jpe?g|gif|webp|svg|ico|woff2?|ttf|eot)$/i;

self.addEventListener('fetch', (event) => {
    const requete = event.request;
    if (requete.method !== 'GET') { return; }

    const url = new URL(requete.url);

    // L'API (dont le repli IA du chat) ne doit jamais être mise en cache, ni
    // le suivi (js/suivi.js, suivi.html), qui parle directement à Supabase.
    if (url.pathname.startsWith('/api/') || url.hostname.endsWith('.supabase.co')) {
        return;
    }

    // Polices Google et autres ressources externes : elles ne changent pas.
    if (url.origin !== self.location.origin) {
        event.respondWith(cacheDAbord(event));
        return;
    }

    if (IMMUABLE.test(url.pathname) ||
            requete.destination === 'image' || requete.destination === 'font') {
        event.respondWith(cacheDAbord(event));
        return;
    }

    // Les données JSON gardent leur cache à part, conservé d'une version à
    // l'autre (questions, missions, chat : utiles hors-ligne).
    if (url.pathname.startsWith('/data/')) {
        event.respondWith(reseauDAbord(event, DATA_CACHE_NAME));
        return;
    }

    // Pages, scripts, styles, manifeste : réseau d'abord. Une page introuvable
    // hors-ligne retombe sur l'accueil.
    const estPage = requete.mode === 'navigate' || requete.destination === 'document';
    event.respondWith(reseauDAbord(event, CACHE_NAME,
        estPage ? () => caches.match('/index.html') : null));
});

// Gestion des messages du client
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
