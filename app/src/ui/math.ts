import katex from 'katex';

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
