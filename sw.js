// Cache de la aplicacion
const CACHE_NAME = 'netpin-v1';

// Cache de mapas offline
const MAP_CACHE_NAME = 'netpin-map-v1';

const VALID_CACHES = [

    CACHE_NAME,
    MAP_CACHE_NAME

];

const FILES_TO_CACHE = [

    './',
    './index.html',
    './manifest.json',
    './assets/css/styles.css',
    './assets/js/app.js',
    './assets/img/favicon/favicon.ico',
    './assets/img/favicon/android-chrome-192x192.png',
    './assets/img/favicon/android-chrome-512x512.png'

];

self.addEventListener('install', event => {

    event.waitUntil(

        caches
            .open(CACHE_NAME)
            .then(cache => cache.addAll(FILES_TO_CACHE))

    );

});

self.addEventListener('activate', event => {

    event.waitUntil(

        caches.keys().then(keys => {

            return Promise.all(

                keys
                    .filter(key => !VALID_CACHES.includes(key))
                    .map(key => caches.delete(key))

            );

        })

    );

});

self.addEventListener('fetch', event => {

    event.respondWith(

        caches
            .match(event.request)
            .then(response => response || fetch(event.request))

    );

});
