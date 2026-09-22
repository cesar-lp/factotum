import katex from 'katex';
import mainRegular from 'katex/dist/fonts/KaTeX_Main-Regular.woff2?url';
import mathItalic from 'katex/dist/fonts/KaTeX_Math-Italic.woff2?url';

/**
 * Renders a LaTeX span to HTML. The single point in the app where KaTeX is
 * called, so its options are stated once rather than at each call site.
 *
 * `output: 'htmlAndMathml'` is not optional: the HTML half is a tree of
 * absolutely-positioned spans that a screen reader reads as nonsense, and
 * the MathML half is the only part that carries the equation's actual
 * structure. `trust: false` refuses `\href` and friends, which is what
 * keeps this the one place allowed to bypass escapeHtml.
 *
 * `throwOnError: false` renders an invalid span in KaTeX's error styling
 * instead of throwing mid-render and blanking the whole card. It is a
 * backstop only -- the real defence is the `invalid-math` lint rule, which
 * fails the build before a bad span can ever reach a phone.
 */
export function renderMath(latex: string, display = false): string {
  return katex.renderToString(latex, {
    displayMode: display,
    throwOnError: false,
    trust: false,
    strict: false,
    output: 'htmlAndMathml'
  });
}

/**
 * Warms the two KaTeX fonts this vault's math actually uses.
 *
 * Without this there is a real offline hole rather than a theoretical one:
 * KaTeX's fonts are hashed assets fetched on first use, so a phone that
 * installs the PWA and goes offline BEFORE ever displaying a math card has
 * none of them cached, and every equation renders in fallback glyphs with
 * broken stretchy delimiters. Fetching them at boot puts them in the same
 * cache-first bucket (see sw-routing.ts) as any other hashed asset.
 *
 * Only two of KaTeX's ~20 faces: upright text and math italic cover
 * essentially all of this vault. The rest still load on demand for the rare
 * note that needs script or fraktur.
 *
 * The `?url` imports are what make this possible at all -- a static <link>
 * in index.html cannot name a content-hashed filename, so Vite has to
 * resolve it and the link has to be injected at runtime.
 */
export const MATH_FONT_URLS: string[] = [mainRegular, mathItalic];

export function preloadMathFonts(): void {
  for (const href of MATH_FONT_URLS) {
    if (document.head.querySelector(`link[rel="preload"][href="${href}"]`)) continue;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'font';
    link.type = 'font/woff2';
    link.crossOrigin = 'anonymous';
    link.href = href;
    document.head.append(link);
  }
}
