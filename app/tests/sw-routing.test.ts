import { describe, it, expect } from 'vitest';
import { strategyFor } from '../src/sw-routing.js';

const BASE = 'https://cesar-lp.github.io/factotum';

describe('strategyFor', () => {
  it('serves the app shell network-first', () => {
    // THE regression. Cache-first on index.html pins the installed PWA to
    // whatever bundle was cached first: Vite hashes asset filenames, so a
    // new deploy renames them and stale HTML never asks for the new names.
    // This shipped once, and the app could not update itself until it was
    // fixed.
    expect(strategyFor(`${BASE}/index.html`)).toBe('network-first');
    expect(strategyFor(`${BASE}/`)).toBe('network-first');
  });

  it('serves a navigation request network-first whatever its url', () => {
    expect(strategyFor(`${BASE}/anything`, 'navigate')).toBe('network-first');
  });

  it('keeps deck.json network-first so a rebuilt deck arrives', () => {
    expect(strategyFor(`${BASE}/deck.json`)).toBe('network-first');
  });

  it('keeps notes.json network-first, for the same reason as deck.json', () => {
    // Stable URL, changing content: a rebuilt vault must reach the client.
    expect(strategyFor(`${BASE}/notes.json`)).toBe('network-first');
  });

  it('serves the manifest network-first', () => {
    expect(strategyFor(`${BASE}/manifest.webmanifest`)).toBe('network-first');
  });

  it('serves hashed assets cache-first, since their name changes with their content', () => {
    expect(strategyFor(`${BASE}/assets/main-CW9Ov4r7.js`)).toBe('cache-first');
    expect(strategyFor(`${BASE}/assets/main-Dk58BWiJ.css`)).toBe('cache-first');
  });

  it('ignores a query string when matching the shell', () => {
    expect(strategyFor(`${BASE}/index.html?v=2`)).toBe('network-first');
  });

  it('falls back to cache-first for an unparseable url instead of throwing', () => {
    expect(strategyFor('not a url')).toBe('cache-first');
  });
});
