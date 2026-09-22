import { describe, it, expect } from 'vitest';
import { renderMath, MATH_FONT_URLS } from '../src/ui/math.js';

describe('renderMath', () => {
  it('renders inline math as KaTeX HTML', () => {
    const html = renderMath('x^2');
    expect(html).toContain('class="katex"');
    expect(html).not.toContain('katex-display');
  });

  it('renders display math in display mode', () => {
    const html = renderMath('A^\\top A x = A^\\top b', true);
    expect(html).toContain('katex-display');
  });

  it('emits MathML alongside the HTML, so screen readers get a real equation', () => {
    expect(renderMath('\\frac{a}{b}')).toContain('<math');
  });

  it('does not throw on invalid LaTeX, so one bad span cannot blank a card', () => {
    expect(() => renderMath('\\frac{')).not.toThrow();
    expect(renderMath('\\frac{')).toContain('katex');
  });

  it('refuses to build a live link from \\href, which is what trust:false buys', () => {
    const html = renderMath('\\href{javascript:alert(1)}{x}');
    // The raw TeX is echoed into <annotation> as inert text -- KaTeX always
    // does that and no option disables it. What must never appear is a live
    // element or attribute built FROM it.
    expect(html).not.toContain('href="javascript:');
    expect(html).not.toMatch(/<a[\s>]/);
  });

  it('never emits a live tag from markup in the source', () => {
    const html = renderMath('\\text{<script>alert(1)</script>}');
    expect(html).not.toMatch(/<script[\s>]/);
  });
});

describe('MATH_FONT_URLS', () => {
  it('names the two faces this vault actually needs', () => {
    expect(MATH_FONT_URLS).toHaveLength(2);
  });

  it('resolves each one to a bundled .woff2 asset URL', () => {
    for (const url of MATH_FONT_URLS) {
      expect(typeof url).toBe('string');
      expect(url).toMatch(/\.woff2($|\?)/);
    }
  });
});
