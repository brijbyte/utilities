/// <reference lib="webworker" />
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./env.d.ts" />

const sw = self as unknown as ServiceWorkerGlobalScope;

const VERSION = __COMMIT_HASH__;
const CACHE_NAME = `utilities-${VERSION}`;

// Static shell + all hashed assets (injected at build time)
const PRECACHE = [
  "/",
  "/manifest.webmanifest",
  "/icon.svg",
  ...__PRECACHE_ASSETS__,
];

// Install: precache everything so the app works fully offline.
sw.addEventListener("install", (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)),
  );
});

// Activate: clean old caches, claim clients
sw.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  sw.clients.claim();
});

// Fetch: network-first for navigation, cache-first for assets
sw.addEventListener("fetch", (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin
  if (request.method !== "GET" || url.origin !== sw.location.origin) return;

  // Navigation requests (SPA): network-first, fallback to cached /index.html
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/", clone));
          return response;
        })
        .catch(() => caches.match("/") as Promise<Response>),
    );
    return;
  }

  // Hashed assets (JS/CSS with content hash): cache-first, immutable
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return response;
          }),
      ),
    );
    return;
  }

  // Other static files (icons, manifest): stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      });
      return cached || fetchPromise;
    }),
  );
});

// Listen for messages from the app
sw.addEventListener("message", (event: ExtendableMessageEvent) => {
  if (event.data === "SKIP_WAITING") {
    sw.skipWaiting();
  }
});
