/// <reference lib="webworker" />
export {};
declare const self: ServiceWorkerGlobalScope;

const CACHE = 'factotum-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest'];

// deck.json is network-first, but a raw fetch() has no platform timeout
// worth relying on (60s+ on mobile Safari) — on a slow-but-alive connection
// the user would wait that out before the cache fallback ever runs. Race
// the network against this instead.
const DECK_FETCH_TIMEOUT_MS = 2500;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/** Resolves to the sentinel string after `ms`, for racing against a fetch. */
function timeoutAfter(ms: number): Promise<'timeout'> {
  return new Promise((resolve) => setTimeout(() => resolve('timeout'), ms));
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  // deck.json: network first so a rebuilt deck arrives, cache as fallback
  // offline OR when the network is slow-but-alive (the daily-use case this
  // guards: a phone on flaky signal). The fetch itself is never aborted —
  // if it eventually succeeds after the cache fallback already answered,
  // the fresh response still gets cached via event.waitUntil so the next
  // open picks it up.
  if (request.url.endsWith('deck.json')) {
    const networkFetch = fetch(request).then((response) => {
      const copy = response.clone();
      void caches.open(CACHE).then((cache) => cache.put(request, copy));
      return response;
    });

    // Keep the in-flight fetch alive past the race below, and never let a
    // late failure surface as an unhandled rejection.
    event.waitUntil(networkFetch.catch(() => {}));

    event.respondWith(
      Promise.race([networkFetch, timeoutAfter(DECK_FETCH_TIMEOUT_MS)])
        .then((result) => (result === 'timeout' ? caches.match(request).then((hit) => hit ?? Response.error()) : result))
        .catch(() => caches.match(request).then((hit) => hit ?? Response.error()))
    );
    return;
  }

  // Everything else: cache first.
  event.respondWith(
    caches.match(request).then((hit) => hit ?? fetch(request).then((response) => {
      const copy = response.clone();
      void caches.open(CACHE).then((cache) => cache.put(request, copy));
      return response;
    }))
  );
});
