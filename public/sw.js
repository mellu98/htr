/**
 * Wave Up — Service Worker
 *
 * Caching strategy:
 *   - PRECACHE  (install): the app shell + manifest + icons. Anything that
 *     lets the install splash render offline.
 *   - RUNTIME   (fetch):
 *       /_next/static/*   → cache-first  (immutable hashed bundles)
 *       /icons/*          → cache-first  (PWA icons)
 *       /videos/*         → stale-while-revalidate (heavy, but resumable)
 *       /api/*            → network-first (live data must not be stale)
 *       navigations       → network-first, fall back to cached /offline if
 *                          available, otherwise a minimal 503 page.
 *   - ACTIVATE  (activate): delete old cache versions on upgrade.
 *
 * Note: the user controls when to upgrade (we don't auto-skipWaiting) so
 * the running tab keeps the existing SW until reload — safer for long
 * video playbacks.
 */

const VERSION = 'wave-up-v2';
const CORE = [
  '/',
  '/library',
  '/coach',
  '/tasks',
  '/offline',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(VERSION);
      // addAll fails if any single request fails. Use individual add() with
      // try/catch so a single 404 doesn't abort the whole install.
      await Promise.all(
        CORE.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => null),
        ),
      );
      // Don't skipWaiting — let the page control the upgrade moment.
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle same-origin GETs — let cross-origin (e.g. Vimeo, fonts CDN)
  // go straight to the network.
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Don't intercept Next.js dev/HMR endpoints — they need to hit the network.
  if (url.pathname.startsWith('/_next/webpack-hmr')) return;

  if (url.pathname.startsWith('/api/')) {
    // API: network-first, fall back to cached response if any.
    event.respondWith(networkFirst(req));
    return;
  }

  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    // Cache-first: these are immutable / rarely change.
    event.respondWith(cacheFirst(req));
    return;
  }

  if (url.pathname.startsWith('/videos/')) {
    // Stale-while-revalidate: serve from cache, refresh in background.
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // Navigations: network-first, fall back to cached /offline shell.
  if (req.mode === 'navigate') {
    event.respondWith(navigationStrategy(req));
    return;
  }

  // Default: try cache, then network.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        // Best-effort cache write for GET 200s.
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((cache) => cache.put(req, copy)).catch(() => null);
        }
        return res;
      }).catch(() => cached ?? Response.error());
    }),
  );
});

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok) {
      const copy = res.clone();
      caches.open(VERSION).then((cache) => cache.put(req, copy)).catch(() => null);
    }
    return res;
  } catch (e) {
    return Response.error();
  }
}

async function networkFirst(req) {
  try {
    const res = await fetch(req);
    if (res.ok) {
      const copy = res.clone();
      caches.open(VERSION).then((cache) => cache.put(req, copy)).catch(() => null);
    }
    return res;
  } catch (e) {
    const cached = await caches.match(req);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'offline' }), {
      status: 503,
      headers: { 'content-type': 'application/json' },
    });
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(VERSION);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req)
    .then((res) => {
      if (res.ok) cache.put(req, res.clone()).catch(() => null);
      return res;
    })
    .catch(() => cached ?? Response.error());
  return cached ?? fetchPromise;
}

async function navigationStrategy(req) {
  try {
    const res = await fetch(req);
    if (res.ok) {
      const copy = res.clone();
      caches.open(VERSION).then((cache) => cache.put(req, copy)).catch(() => null);
    }
    return res;
  } catch (e) {
    const cached = await caches.match(req);
    if (cached) return cached;
    const offline = await caches.match('/offline');
    if (offline) return offline;
    return new Response(
      `<!doctype html><html><head><meta charset="utf-8"><title>Offline</title>
       <meta name="viewport" content="width=device-width,initial-scale=1">
       <style>
         body{margin:0;background:#0a0a14;color:#f1f5f9;font-family:system-ui;
              display:flex;align-items:center;justify-content:center;min-height:100vh;
              padding:1.5rem;text-align:center}
         h1{font-size:1.5rem;margin:0 0 .5rem}
         p{color:#94a3b8;max-width:30rem;line-height:1.5}
       </style></head><body>
       <div><h1>Sei offline</h1>
       <p>Wave Up non riesce a raggiungere il server. Riapri la pagina quando torni online — le lezioni già aperte restano disponibili.</p>
       </div></body></html>`,
      { status: 503, headers: { 'content-type': 'text/html; charset=utf-8' } },
    );
  }
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
