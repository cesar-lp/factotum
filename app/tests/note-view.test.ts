import { describe, it, expect } from 'vitest';
import { noteHeadHtml } from '../src/ui/note.js';

describe('noteHeadHtml', () => {
  // Pins the header's structure: Back (and, when present, Open in
  // Obsidian) share their own row inside .note-head-actions, with the
  // title on a full-width line below -- NOT three flex siblings competing
  // for width on one row, which is what used to squeeze the title down to
  // four wrapped lines on a phone-width screen. See note.css's .note-head.
  it('puts Back alone in .note-head-actions when there is no title and no Obsidian link', () => {
    const html = noteHeadHtml(null, null);
    expect(html).toContain('class="note-head"');
    expect(html).toContain('class="note-head-actions"');
    expect(html).toContain('data-role="back"');
    expect(html).not.toContain('note-title');
    expect(html).not.toContain('data-role="obsidian"');
  });

  it('puts the title on its own line, after .note-head-actions, not inside it', () => {
    const html = noteHeadHtml('TCP handshake', null);
    const actionsEnd = html.indexOf('</div>');
    const titleStart = html.indexOf('note-title');
    expect(actionsEnd).toBeGreaterThan(-1);
    expect(titleStart).toBeGreaterThan(actionsEnd);
    expect(html).toContain('>TCP handshake<');
  });

  it('puts the Obsidian link inside .note-head-actions alongside Back, not next to the title', () => {
    const html = noteHeadHtml('TCP handshake', 'obsidian://open?vault=x');
    const actionsMatch = html.match(/class="note-head-actions">([\s\S]*?)<\/div>/);
    expect(actionsMatch).not.toBeNull();
    const actionsHtml = actionsMatch?.[1] ?? '';
    expect(actionsHtml).toContain('data-role="back"');
    expect(actionsHtml).toContain('data-role="obsidian"');
  });

  it('escapes the title', () => {
    const html = noteHeadHtml('<script>', null);
    expect(html).not.toContain('<script>');
  });
});
