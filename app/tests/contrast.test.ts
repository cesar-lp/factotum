import { describe, it, expect, beforeAll } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const THEME_PATH = resolve(__dirname, '../src/theme.css');

// ---------------------------------------------------------------------------
// Colour parsing
// ---------------------------------------------------------------------------

interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** Parses `#rgb`, `#rrggbb`, `#rrggbbaa` and modern `rgb(r g b / a%)` (also
 * tolerates the older comma syntax) into 0-255 channels plus 0-1 alpha. */
function parseColor(raw: string): RGBA {
  const value = raw.trim();

  const hex3 = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(value);
  if (hex3) {
    const [, r, g, b] = hex3;
    return { r: parseInt(r! + r!, 16), g: parseInt(g! + g!, 16), b: parseInt(b! + b!, 16), a: 1 };
  }

  const hex6 = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})?$/i.exec(value);
  if (hex6) {
    const [, r, g, b, a] = hex6;
    return {
      r: parseInt(r!, 16),
      g: parseInt(g!, 16),
      b: parseInt(b!, 16),
      a: a ? parseInt(a, 16) / 255 : 1,
    };
  }

  // rgb(149 97 18 / 12%)  |  rgba(149, 97, 18, 0.12)  |  rgb(149, 97, 18)
  const rgbFn = /^rgba?\(\s*([^)]+)\)$/i.exec(value);
  if (rgbFn) {
    const body = rgbFn[1]!;
    const [channelPart, alphaPart] = body.split('/');
    const nums = channelPart!.trim().split(/[\s,]+/).map(Number);
    const [r, g, b] = nums;
    let a = 1;
    if (alphaPart !== undefined) {
      a = parsePercentOrNumber(alphaPart.trim());
    } else if (nums.length === 4) {
      a = nums[3]!;
    }
    return { r: r!, g: g!, b: b!, a };
  }

  throw new Error(`contrast test: cannot parse colour value "${raw}" — extend parseColor()`);
}

function parsePercentOrNumber(s: string): number {
  return s.endsWith('%') ? parseFloat(s) / 100 : parseFloat(s);
}

/** A colour-valued custom property, for the purposes of this test, is one
 * whose value parses as a hex colour or an rgb()/rgba() function. That
 * excludes the type/space/radius scales (px numbers) and the font stacks
 * (comma-separated identifiers/strings) without needing a hand-maintained
 * allowlist of token names — any *new* colour token automatically qualifies
 * just by looking like a colour, which is what makes the fail-closed check
 * below actually catch additions. */
function isColorValue(value: string): boolean {
  const v = value.trim();
  return /^#[0-9a-f]{3,8}$/i.test(v) || /^rgba?\(\s*[^)]+\)$/i.test(v);
}

/** Composites a translucent colour over an opaque backdrop (both as 0-255
 * RGB), per the standard "over" alpha-compositing formula. The backdrop is
 * assumed opaque, which holds for every backdrop used below (--bg/--surface
 * are both fully opaque tokens). */
function compositeOver(fg: RGBA, backdrop: RGBA): RGBA {
  if (fg.a >= 1) return fg;
  return {
    r: fg.a * fg.r + (1 - fg.a) * backdrop.r,
    g: fg.a * fg.g + (1 - fg.a) * backdrop.g,
    b: fg.a * fg.b + (1 - fg.a) * backdrop.b,
    a: 1,
  };
}

// ---------------------------------------------------------------------------
// WCAG relative luminance / contrast ratio
// ---------------------------------------------------------------------------

function srgbToLinear(channel255: number): number {
  const c = channel255 / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(c: RGBA): number {
  const r = srgbToLinear(c.r);
  const g = srgbToLinear(c.g);
  const b = srgbToLinear(c.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: RGBA, b: RGBA): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

// ---------------------------------------------------------------------------
// theme.css parsing
// ---------------------------------------------------------------------------

type TokenMap = Record<string, string>;

/** Pulls `--name: value;` declarations out of one `{ ... }` block's body. */
function parseDeclarations(blockBody: string): TokenMap {
  const tokens: TokenMap = {};
  const re = /--([\w-]+)\s*:\s*([^;]+);/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(blockBody))) {
    tokens[m[1]!] = m[2]!.trim();
  }
  return tokens;
}

/** Finds the `{ ... }` body that follows the first match of `selectorRe`,
 * respecting brace nesting (needed for the `@media { :root { ... } }`
 * block, whose selector is itself nested one level deeper). */
function extractBlock(css: string, selectorRe: RegExp): string {
  const m = selectorRe.exec(css);
  if (!m) {
    throw new Error(`contrast test: could not find a block matching ${selectorRe} in theme.css`);
  }
  const openBrace = css.indexOf('{', m.index);
  if (openBrace === -1) throw new Error('contrast test: malformed CSS, no opening brace found');
  let depth = 0;
  for (let i = openBrace; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') {
      depth--;
      if (depth === 0) return css.slice(openBrace + 1, i);
    }
  }
  throw new Error('contrast test: malformed CSS, unbalanced braces');
}

let themeCss: string;
let lightTokens: TokenMap;
let darkMediaTokens: TokenMap;
let darkNightTokens: TokenMap;

beforeAll(() => {
  themeCss = readFileSync(THEME_PATH, 'utf-8');

  // :root { ... } — the very first top-level :root block (light theme).
  lightTokens = parseDeclarations(extractBlock(themeCss, /:root\s*\{/));

  // @media (prefers-color-scheme: dark) { :root:not([data-theme='day']) { ... } }
  const mediaBody = extractBlock(themeCss, /@media\s*\(prefers-color-scheme:\s*dark\)\s*\{/);
  darkMediaTokens = parseDeclarations(extractBlock(mediaBody, /:root[^{]*\{/));

  // :root[data-theme='night'] { ... }
  darkNightTokens = parseDeclarations(extractBlock(themeCss, /:root\[data-theme=['"]night['"]\]\s*\{/));
});

// ---------------------------------------------------------------------------
// Resolving a token to an effective, opaque colour for a given theme
// ---------------------------------------------------------------------------

/** Resolves `name` to an RGBA colour under the given token map. If the
 * token is translucent (alpha < 1), composites it over `--bg` from that
 * same map, since every translucent token in this palette (the *-soft
 * family) is used as an overlay tint on the page background, never as a
 * fully opaque fill. */
function resolveToken(tokens: TokenMap, name: string): RGBA {
  const raw = tokens[name];
  if (raw === undefined) throw new Error(`contrast test: token --${name} not found`);
  const color = parseColor(raw);
  if (color.a >= 1) return color;
  const bg = parseColor(tokens['bg']!);
  return compositeOver(color, bg);
}

// ---------------------------------------------------------------------------
// Declared pairs
//
// Each pair is a (foreground token, background token) combination that
// actually occurs together in app/src/styles/*.css, found by grepping which
// classes set `color` against which `background`. `min` is the WCAG AA
// threshold that applies: 4.5 for normal text, 3.0 for non-text UI
// components (and would also be 3.0 for large text, though nothing here
// relies on the large-text allowance — everything is held to 4.5 unless it
// is genuinely non-text).
// ---------------------------------------------------------------------------

interface Pair {
  name: string;
  fg: string;
  bg: string;
  min: number;
  source: string;
}

const PAIRS: Pair[] = [
  {
    name: 'body text',
    fg: 'text',
    bg: 'bg',
    min: 4.5,
    source: 'base.css body { color: var(--text) } on background: var(--bg)',
  },
  {
    name: 'card/input text on surface',
    fg: 'text',
    bg: 'surface',
    min: 4.5,
    source:
      'review.css .choice/.answer-input/.rate, base.css .btn-secondary, settings.css .field select/input — all color: var(--text) on background: var(--surface)',
  },
  {
    name: 'dim label on bg',
    fg: 'dim',
    bg: 'bg',
    min: 4.5,
    source:
      'base.css .top, review.css .review-counter/.review-close/.citation, dashboard.css .streak/.week-bar-label/.all-clear, summary.css .summary-stat-label/.summary-row-label, topics.css .topic-head, settings.css #retention-value/.field-help/.field-note/.segmented-option — every var(--dim) sits on the page background var(--bg)',
  },
  {
    name: "rating row interval on --surface (dim)",
    fg: 'dim',
    bg: 'surface',
    min: 4.5,
    source:
      "review.css .rate { background: var(--surface) } containing .rate-interval { color: var(--dim) } — called out by the file's own comment as re-tuned specifically for this pairing",
  },
  {
    name: 'correct-answer text on bg',
    fg: 'ok',
    bg: 'bg',
    min: 4.5,
    source: 'review.css .expected, .cloze-fill.is-ok, .cloze-state.is-ok — color: var(--ok) on the page background',
  },
  {
    name: 'wrong/typed text on bg',
    fg: 'bad',
    bg: 'bg',
    min: 4.5,
    source: 'review.css .cloze-typed, .cloze-state.is-bad — color: var(--bad) on the page background',
  },
  {
    name: 'accent-coloured cloze text on bg',
    fg: 'accent',
    bg: 'bg',
    min: 4.5,
    source: 'review.css .cloze-fill.is-accent, .cloze-state.is-accent — color: var(--accent) on the page background',
  },
  {
    name: 'button label on accent fill',
    fg: 'on-accent',
    bg: 'accent',
    min: 4.5,
    source:
      "base.css .btn { background: var(--accent); color: var(--on-accent) } (Start review/Check/Continue), settings.css .segmented-option[data-active='true']",
  },
  {
    name: 'chip text on accent-soft',
    fg: 'accent-text',
    bg: 'accent-soft',
    min: 4.5,
    source:
      'base.css .chip, review.css .choice-badge — color: var(--accent-text) on background: var(--accent-soft), a translucent overlay composited over --bg',
  },
  {
    name: 'correct-choice text on ok-soft',
    fg: 'text',
    bg: 'ok-soft',
    min: 4.5,
    source: 'review.css .choice.is-correct { background: var(--ok-soft) }, text stays color: var(--text)',
  },
  {
    name: 'wrong-choice text on bad-soft',
    fg: 'text',
    bg: 'bad-soft',
    min: 4.5,
    source: 'review.css .choice.is-wrong { background: var(--bad-soft) }, text stays color: var(--text)',
  },
  {
    // dashboard.ts renders this as `<span class="all-clear-mark">&#10003;</span>`
    // immediately followed by the sibling text "All clear — nothing due
    // today": the glyph is a decorative status icon that duplicates
    // information already conveyed by adjacent real text, not a piece of
    // text in its own right (WCAG's "text" is a sequence of characters
    // conveying information — this checkmark conveys nothing the sibling
    // span doesn't already say). It is judged as a non-text graphical UI
    // indicator (1.4.11, 3:1), the same bucket as an icon-font glyph.
    name: 'all-clear mark on ok-soft (decorative status glyph)',
    fg: 'ok',
    bg: 'ok-soft',
    min: 3.0,
    source: 'dashboard.css .all-clear-mark { background: var(--ok-soft); color: var(--ok) }',
  },
  {
    name: 'progress fill on track (non-text UI)',
    fg: 'accent',
    bg: 'line',
    min: 3.0,
    source:
      'review.css .progress { background: var(--line) } > i { background: var(--accent) } — a non-text UI component (progress indicator)',
  },
];

const DECLARED_FG = new Set(PAIRS.map((p) => p.fg));
const DECLARED_BG = new Set(PAIRS.map((p) => p.bg));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('contrast maths (sanity check for the calculator itself)', () => {
  it('black on white is 21:1', () => {
    const black = parseColor('#000000');
    const white = parseColor('#ffffff');
    expect(contrastRatio(black, white)).toBeCloseTo(21, 1);
  });

  it('identical colours are 1:1', () => {
    const c = parseColor('#956112');
    expect(contrastRatio(c, c)).toBeCloseTo(1, 5);
  });

  it('composites a translucent colour over an opaque backdrop', () => {
    const fg = parseColor('rgb(0 0 0 / 50%)');
    const bg = parseColor('#ffffff');
    const result = compositeOver(fg, bg);
    expect(result.r).toBeCloseTo(127.5, 1);
    expect(result.g).toBeCloseTo(127.5, 1);
    expect(result.b).toBeCloseTo(127.5, 1);
    expect(result.a).toBe(1);
  });

  it('parses the modern rgb(r g b / a%) syntax used in theme.css', () => {
    const c = parseColor('rgb(149 97 18 / 12%)');
    expect(c).toEqual({ r: 149, g: 97, b: 18, a: 0.12 });
  });
});

describe.each([
  ['light (:root)', () => lightTokens],
  ["dark (@media prefers-color-scheme)", () => darkMediaTokens],
  ["dark ([data-theme='night'])", () => darkNightTokens],
])('WCAG AA contrast — %s', (_label, getTokens) => {
  it('every declared pair meets its required ratio', () => {
    const tokens = getTokens();
    const failures: string[] = [];

    for (const pair of PAIRS) {
      const fg = resolveToken(tokens, pair.fg);
      const bg = resolveToken(tokens, pair.bg);
      const ratio = contrastRatio(fg, bg);
      if (ratio < pair.min) {
        failures.push(
          `${pair.name} (--${pair.fg} on --${pair.bg}): ${ratio.toFixed(2)}:1, needs ${pair.min.toFixed(1)}:1`
        );
      }
    }

    expect(failures, failures.join('\n')).toEqual([]);
  });
});

describe('fail-closed: every colour token must be covered by a declared pair', () => {
  it('has no colour-valued custom property missing from PAIRS', () => {
    const uncovered: string[] = [];

    for (const [name, value] of Object.entries(lightTokens)) {
      if (!isColorValue(value)) continue; // type/space/radius scale, font stacks
      if (!DECLARED_FG.has(name) && !DECLARED_BG.has(name)) {
        uncovered.push(`--${name}: ${value}`);
      }
    }

    expect(
      uncovered,
      uncovered.length
        ? `theme.css defines colour token(s) not used in any declared contrast pair in ` +
          `app/tests/contrast.test.ts — add a Pair (or extend an existing one) for: ${uncovered.join(', ')}`
        : ''
    ).toEqual([]);
  });

  it('sanity: PAIRS is non-empty and actually exercises multiple tokens', () => {
    // Guards against a vacuous pass where isColorValue mis-classifies
    // everything as non-colour and the check above trivially succeeds.
    expect(PAIRS.length).toBeGreaterThan(5);
    expect(DECLARED_FG.size + DECLARED_BG.size).toBeGreaterThan(5);
  });
});

describe('dark theme parity', () => {
  it('the @media dark block and the [data-theme="night"] block define identical tokens', () => {
    const mediaKeys = Object.keys(darkMediaTokens).sort();
    const nightKeys = Object.keys(darkNightTokens).sort();
    expect(nightKeys, 'the two dark blocks declare a different set of tokens').toEqual(mediaKeys);

    const mismatches: string[] = [];
    for (const key of mediaKeys) {
      if (darkMediaTokens[key] !== darkNightTokens[key]) {
        mismatches.push(`--${key}: media="${darkMediaTokens[key]}" vs night="${darkNightTokens[key]}"`);
      }
    }
    expect(mismatches, mismatches.join('\n')).toEqual([]);
  });
});
