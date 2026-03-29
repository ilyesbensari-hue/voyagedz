// ==========================================
// VOYAGE DZ - Enhanced Service Worker
// ==========================================

const CACHE_VERSION = 'v2';
const STATIC_CACHE = `voyage-dz-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `voyage-dz-dynamic-${CACHE_VERSION}`;
const API_CACHE = `voyage-dz-api-${CACHE_VERSION}`;

// Static assets to cache on install
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/data.js',
    '/auth.js',
    '/api.js',
    '/calendar.js',
    '/i18n.js',
    '/messaging.js',
    '/advanced-search.js',
    '/admin-images.js',
    '/activity-detail.js',
    '/activity-manager.js',
    '/activity-styles.css',
    '/booking-system.js',
    '/host-calendar-manager.js',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:wght@600;700;800&display=swap'
];

// Offline fallback page
const OFFLINE_PAGE = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hors ligne - Voyage DZ</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Inter', sans-serif;
            background: linear-gradient(135deg, #0D1B2A 0%, #1B2838 100%);
            color: #F5F0EB;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 20px;
        }
        .container { max-width: 400px; }
        .icon { font-size: 80px; margin-bottom: 20px; }
        h1 { font-size: 24px; margin-bottom: 10px; }
        p { color: #8B9CB3; margin-bottom: 20px; }
        button {
            background: #E07B53;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">📡</div>
        <h1>Vous êtes hors ligne</h1>
        <p>Vérifiez votre connexion internet et réessayez.</p>
        <button onclick="window.location.reload()">Réessayer</button>
    </div>
</body>
</html>
`;

// Install - Cache static assets
self.addEventListener('install', event => {
    console.log('🔧 SW: Installing...');

    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('📦 SW: Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate - Clean old caches
self.addEventListener('activate', event => {
    console.log('✅ SW: Activated');

    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => {
                    return key !== STATIC_CACHE &&
                        key !== DYNAMIC_CACHE &&
                        key !== API_CACHE;
                }).map(key => {
                    console.log('🗑️ SW: Deleting old cache:', key);
                    return caches.delete(key);
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch - Smart caching strategy
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // API requests - Network first, cache fallback
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(networkFirst(request, API_CACHE));
        return;
    }

    // Static assets - Cache first
    if (STATIC_ASSETS.some(asset => url.pathname === asset || url.href.includes(asset))) {
        event.respondWith(cacheFirst(request, STATIC_CACHE));
        return;
    }

    // Images - Cache with network fallback
    if (request.destination === 'image' || url.pathname.startsWith('/uploads/')) {
        event.respondWith(cacheFirst(request, DYNAMIC_CACHE));
        return;
    }

    // Default - Network first
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
});

// Cache-first strategy
async function cacheFirst(request, cacheName) {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        return new Response(OFFLINE_PAGE, {
            headers: { 'Content-Type': 'text/html' }
        });
    }
}

// Network-first strategy
async function networkFirst(request, cacheName) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        const cached = await caches.match(request);
        if (cached) return cached;

        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
            return new Response(OFFLINE_PAGE, {
                headers: { 'Content-Type': 'text/html' }
            });
        }

        return new Response('Offline', { status: 503 });
    }
}

// Background sync for bookings (future enhancement)
self.addEventListener('sync', event => {
    if (event.tag === 'sync-bookings') {
        console.log('🔄 SW: Syncing bookings...');
        // Implement background sync for offline bookings
    }
});

// Push notifications
self.addEventListener('push', event => {
    const data = event.data?.json() || {};

    self.registration.showNotification(data.title || 'Voyage DZ', {
        body: data.body || 'Nouvelle notification',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: data.url || '/'
    });
});

// Notification click
self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data || '/')
    );
});

console.log('✅ Service Worker loaded');
