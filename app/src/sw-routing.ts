/**
 * Which caching strategy the service worker uses for a given request.
 *
 * Split out of sw.ts so it can be unit-tested: sw.ts declares `self` as a
 * ServiceWorkerGlobalScope and cannot be imported from a node test, which
 * is exactly why the bug this module exists to prevent survived review.
 */
export type Strategy = 'network-first' | 'cache-first';

/**
 * The app shell must be network-first, not cache-first.
 *
 * Vite emits content-hashed asset filenames, so `index.html` is the only
 * thing that names the current bundle. Serving it from cache pins the app
 * to whatever bundle was cached first: a new deploy changes the asset
 * filenames, the stale HTML never asks for them, and the installed PWA can
 * never update itself again. That is not a theoretical risk — it shipped,
 * and the symptom was a phone showing a months-old UI beside a current
 * card count, because deck.json was already network-first while the shell
 * was not.
 *
 * Hashed assets under `assets/` stay cache-first: their filename changes
 * whenever their content does, so a cached one is never stale.
 */
export function strategyFor(url: string, mode?: string): Strategy {
  if (mode === 'navigate') return 'network-first';

  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    // A request URL that will not parse cannot be matched to the shell;
    // treat it as an ordinary asset rather than throwing inside `fetch`.
    return 'cache-first';
  }

  if (pathname.endsWith('/deck.json')) return 'network-first';
  if (pathname.endsWith('/') || pathname.endsWith('/index.html')) return 'network-first';
  if (pathname.endsWith('/manifest.webmanifest')) return 'network-first';

  return 'cache-first';
}
