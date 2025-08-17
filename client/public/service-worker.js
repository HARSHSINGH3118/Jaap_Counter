/* Lightweight app-shell SW for Vite builds (root scope).
   Build + preview to test: `npm run build && npm run preview`
*/
const VERSION = "v1.2.2"; // bumped
const APP_CACHE = `jaap-app-${VERSION}`;
const RUNTIME_CACHE = `jaap-runtime-${VERSION}`;

const APP_SHELL = [
  "/",                      // SPA entry
  "/index.html",
  "/manifest.webmanifest",
  "/icons/pwa-192.png",
  "/icons/pwa-512.png",
  "/icons/pwa-maskable-512.png",
  "/audio/jaap.mp3"         // kirtan track for offline
];

/* ---------------- Install / Activate ---------------- */
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(APP_CACHE).then((c) => c.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => {
      if (![APP_CACHE, RUNTIME_CACHE].includes(k)) return caches.delete(k);
    }));
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch {}
    }
    await self.clients.claim();
  })());
});

/* Allow page to trigger immediate update */
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

/* ---------------- Fetch Strategies ---------------- */
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  // 1) SPA navigations: network-first (with timeout), fallback to cached shell
  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(event));
    return;
  }

  // 2) API (same-origin) → network-first, fallback to cache
  if (sameOrigin && (url.pathname.startsWith("/auth") || url.pathname.startsWith("/counters"))) {
    event.respondWith(networkFirst(request));
    return;
  }

  // 3) Static assets → stale-while-revalidate
  if (["script","style","image","font"].includes(request.destination)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // 4) Audio (kirtan) → stale-while-revalidate (works offline)
  if (request.destination === "audio") {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
});

/* ---------------- Strategies (helpers) ---------------- */
async function networkFirstNavigation(event) {
  const preload = event.preloadResponse ? event.preloadResponse : Promise.resolve(undefined);
  const fromPreload = await preload;
  if (fromPreload) return fromPreload;

  try {
    const res = await Promise.race([
      fetch(event.request),
      timeout(3500) // 3.5s
    ]);
    return res;
  } catch {
    const cached = await caches.match("/index.html");
    return cached || new Response("<h1>Offline</h1>", { headers: { "Content-Type": "text/html" } });
  }
}

async function networkFirst(request) {
  try {
    const res = await fetch(request);
    await safePut(RUNTIME_CACHE, request, res.clone());
    return res;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw new Error("Network error and no cache");
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const fetchPromise = fetch(request)
    .then(async (res) => { await safePut(RUNTIME_CACHE, request, res.clone()); return res; })
    .catch(() => cached);
  return cached || fetchPromise;
}

/* Only cache successful, same-origin GETs; never cache HTML for non-HTML reqs */
async function safePut(cacheName, request, response) {
  try {
    if (!response || !response.ok || response.type !== "basic") return;
    const ct = (response.headers.get("content-type") || "").toLowerCase();

    // Don’t poison the runtime cache with HTML for asset/audio requests
    if (ct.includes("text/html") && request.mode !== "navigate") return;

    // For audio, require an audio/* content-type
    if (request.destination === "audio" && !ct.startsWith("audio/")) return;

    const cache = await caches.open(cacheName);
    await cache.put(request, response);
  } catch {}
}

function timeout(ms) {
  return new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms));
}
