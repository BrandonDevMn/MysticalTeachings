const CACHE_NAME = 'mystical-teachings-v1';
const STATIC_CACHE = 'mystical-static-v1';
const DYNAMIC_CACHE = 'mystical-dynamic-v1';

const STATIC_ASSETS = [
    './',
    './index.html',
    './css/styles.css',
    './css/cards.css',
    './css/mana-symbols.css',
    './js/app.js',
    './js/api.js',
    './js/cards.js',
    './js/storage.js',
    './manifest.json',
    './icon.jpg'
];

const API_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const IMAGE_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

// Install event - cache static assets
self.addEventListener('install', event => {
    console.log('Service Worker installing...');
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('Service Worker activating...');
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                            console.log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Handle static assets
    if (STATIC_ASSETS.some(asset => event.request.url.includes(asset))) {
        event.respondWith(
            caches.match(event.request)
                .then(response => {
                    return response || fetch(event.request);
                })
        );
        return;
    }

    // Handle Scryfall API requests
    if (url.hostname === 'api.scryfall.com') {
        event.respondWith(
            handleApiRequest(event.request)
        );
        return;
    }

    // Handle Scryfall image requests
    if (url.hostname === 'cards.scryfall.io' || url.hostname === 'c1.scryfall.com') {
        event.respondWith(
            handleImageRequest(event.request)
        );
        return;
    }

    // Default: cache first for app shell, network first for everything else
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request)
                    .then(fetchResponse => {
                        if (fetchResponse.ok) {
                            const responseClone = fetchResponse.clone();
                            caches.open(DYNAMIC_CACHE)
                                .then(cache => {
                                    cache.put(event.request, responseClone);
                                });
                        }
                        return fetchResponse;
                    })
                    .catch(() => {
                        // Offline fallback for HTML requests
                        if (event.request.destination === 'document') {
                            return caches.match('./index.html');
                        }
                    });
            })
    );
});

// Handle Scryfall API requests with caching
async function handleApiRequest(request) {
    try {
        // Try network first for fresh data
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            // Cache successful API responses
            const cache = await caches.open(DYNAMIC_CACHE);
            const responseClone = networkResponse.clone();

            // Add timestamp for cache expiration
            const response = new Response(responseClone.body, {
                status: responseClone.status,
                statusText: responseClone.statusText,
                headers: {
                    ...responseClone.headers,
                    'sw-cached-at': Date.now().toString()
                }
            });

            cache.put(request, response.clone());
            return networkResponse;
        }

        throw new Error('Network response not ok');
    } catch (error) {
        console.log('Network failed, trying cache for API request');

        // Fallback to cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            const cachedAt = cachedResponse.headers.get('sw-cached-at');
            const now = Date.now();

            // Check if cache is still valid
            if (cachedAt && (now - parseInt(cachedAt)) < API_CACHE_DURATION) {
                return cachedResponse;
            }
        }

        // Return offline response
        return new Response(
            JSON.stringify({
                error: 'offline',
                message: 'Unable to fetch data. Please check your connection.'
            }),
            {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

// Handle image requests with long-term caching
async function handleImageRequest(request) {
    try {
        // Check cache first for images
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            const cachedAt = cachedResponse.headers.get('sw-cached-at');
            const now = Date.now();

            // Use cached image if it's still valid
            if (cachedAt && (now - parseInt(cachedAt)) < IMAGE_CACHE_DURATION) {
                return cachedResponse;
            }
        }

        // Fetch from network
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            // Cache the image with timestamp
            const cache = await caches.open(DYNAMIC_CACHE);
            const responseClone = networkResponse.clone();

            const response = new Response(responseClone.body, {
                status: responseClone.status,
                statusText: responseClone.statusText,
                headers: {
                    ...responseClone.headers,
                    'sw-cached-at': Date.now().toString()
                }
            });

            cache.put(request, response.clone());
            return networkResponse;
        }

        // Return cached version even if expired
        if (cachedResponse) {
            return cachedResponse;
        }

        throw new Error('No cached version available');
    } catch (error) {
        console.log('Failed to load image:', request.url);

        // Return cached version if available
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        // Return placeholder image response
        return new Response('', {
            status: 404,
            statusText: 'Image not found'
        });
    }
}

// Handle background sync (for future enhancements)
self.addEventListener('sync', event => {
    console.log('Background sync triggered:', event.tag);

    if (event.tag === 'background-sync-cards') {
        event.waitUntil(
            // Implement background sync logic here
            Promise.resolve()
        );
    }
});

// Handle push notifications (for future enhancements)
self.addEventListener('push', event => {
    console.log('Push notification received');

    const options = {
        body: event.data ? event.data.text() : 'New Magic cards available!',
        icon: './icon.jpg',
        badge: './icon.jpg',
        vibrate: [100, 50, 100],
        data: {
            url: './'
        }
    };

    event.waitUntil(
        self.registration.showNotification('Mystical Teachings', options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
    event.notification.close();

    event.waitUntil(
        clients.openWindow(event.notification.data.url || './')
    );
});

// Send message to client about offline status
function notifyClientOffline() {
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({
                type: 'OFFLINE_STATUS',
                isOffline: true
            });
        });
    });
}

// Send message to client about online status
function notifyClientOnline() {
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({
                type: 'OFFLINE_STATUS',
                isOffline: false
            });
        });
    });
}