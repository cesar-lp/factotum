/// <reference lib="webworker" />
export {};
import { strategyFor } from './sw-routing.js';

declare const self: ServiceWorkerGlobalScope;

// Bumped from v1 to discard the caches left by the version that served the
// app shell cache-first. Routine deploys do NOT need this bumped any more:
// the shell is network-first now, so a new build reaches the client without
// the service worker itself having to change.
const CACHE = 'factotum-v2';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
];

// A raw fetch() has no platform timeout worth relying on (60s+ on mobile
// Safari), so on a slow-but-alive connection the user would wait that out
// before any cache fallback ran. Race the network against this instead.
const NETWORK_TIMEOUT_MS = 2500;

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

/**
 * Network first, cache as the fallback — used for everything whose content
 * can change under a stable URL: the app shell and deck.json.
 *
 * The fetch itself is never aborted. If it succeeds after the timeout has
 * already handed the cache's copy to the page, the fresh response is still
 * written to the cache via `waitUntil`, so the next open picks it up.
 */
function networkFirst(event: FetchEvent, request: Request): void {
  const networkFetch = fetch(request).then((response) => {
    const copy = response.clone();
    void caches.open(CACHE).then((cache) => cache.put(request, copy));
    return response;
  });

  // Keep the in-flight fetch alive past the race, and never let a late
  // failure surface as an unhandled rejection.
  event.waitUntil(networkFetch.catch(() => {}));

  event.respondWith(
    Promise.race([networkFetch, timeoutAfter(NETWORK_TIMEOUT_MS)])
      .then((result) => (result === 'timeout' ? caches.match(request).then((hit) => hit ?? networkFetch) : result))
      .catch(() => caches.match(request).then((hit) => hit ?? Response.error()))
  );
}

/**
 * Cache first — only for Vite's content-hashed assets, whose filename
 * changes whenever their content does, so a cached copy is never stale.
 */
function cacheFirst(event: FetchEvent, request: Request): void {
  event.respondWith(
    caches.match(request).then((hit) => hit ?? fetch(request).then((response) => {
      const copy = response.clone();
      void caches.open(CACHE).then((cache) => cache.put(request, copy));
      return response;
    }))
  );
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  if (strategyFor(request.url, request.mode) === 'network-first') {
    networkFirst(event, request);
    return;
  }
  cacheFirst(event, request);
});
