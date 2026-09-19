import type { FactotumDb, Settings } from '../db/schema.js';
import { DEFAULT_SETTINGS, getSettings, saveSettings, sanitizeSettings } from '../db/settings.js';
import { exportBackup } from '../db/reviews.js';

const THEMES: Settings['theme'][] = ['auto', 'day', 'night'];

/**
 * Coerces a partial settings object into a valid Settings, applying the
 * same clamping rules as `sanitizeSettings` (Task 11) — desiredRetention in
 * [0.7, 0.97], newCardsPerDay rounded into [0, 100], theme one of
 * auto/day/night — so the UI never has a second, divergent notion of what
 * "valid" means. Delegates rather than reimplementing.
 */
export function clampSettings(input: Partial<Settings>): Settings {
  return sanitizeSettings(input);
}

function applyTheme(theme: Settings['theme']): void {
  if (theme === 'auto') delete document.documentElement.dataset['theme'];
  else document.documentElement.dataset['theme'] = theme;
}

export async function renderSettings(root: HTMLElement, db: FactotumDb, onBack: () => void): Promise<void> {
  const settings = await getSettings(db);

  root.innerHTML = `
    <section class="screen">
      <div class="top"><button class="btn-quiet" id="back">← back</button><span>settings</span></div>
      <label class="field">Theme
        <select id="theme">
          ${THEMES.map((t) => `<option value="${t}" ${t === settings.theme ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </label>
      <label class="field">Desired retention
        <input id="retention" type="number" step="0.01" min="0.7" max="0.97" value="${settings.desiredRetention}" />
      </label>
      <label class="field">New cards per day
        <input id="newcards" type="number" step="1" min="0" max="100" value="${settings.newCardsPerDay}" />
      </label>
      <div class="spacer"></div>
      <button class="btn" id="export">Export backup</button>
    </section>
  `;

  const themeSelect = root.querySelector<HTMLSelectElement>('#theme');
  const retentionInput = root.querySelector<HTMLInputElement>('#retention');
  const newCardsInput = root.querySelector<HTMLInputElement>('#newcards');
  const backButton = root.querySelector<HTMLButtonElement>('#back');
  const exportButton = root.querySelector<HTMLButtonElement>('#export');

  const persist = async (): Promise<void> => {
    const rawTheme = themeSelect ? themeSelect.value : DEFAULT_SETTINGS.theme;
    // Re-read rather than reusing the render-time `settings` snapshot: this
    // form owns three fields, and must not write stale values over any
    // field it does not render (disabledCategories, owned by the topics
    // screen).
    const current = await getSettings(db);
    const next = clampSettings({
      ...current,
      theme: (THEMES as string[]).includes(rawTheme) ? (rawTheme as Settings['theme']) : DEFAULT_SETTINGS.theme,
      desiredRetention: retentionInput ? Number(retentionInput.value) : DEFAULT_SETTINGS.desiredRetention,
      newCardsPerDay: newCardsInput ? Number(newCardsInput.value) : DEFAULT_SETTINGS.newCardsPerDay
    });
    await saveSettings(db, next);
    applyTheme(next.theme);

    // Reflect the clamped values back into the inputs in case the user
    // typed something out of range.
    if (themeSelect) themeSelect.value = next.theme;
    if (retentionInput) retentionInput.value = String(next.desiredRetention);
    if (newCardsInput) newCardsInput.value = String(next.newCardsPerDay);
  };

  themeSelect?.addEventListener('change', () => void persist());
  retentionInput?.addEventListener('change', () => void persist());
  newCardsInput?.addEventListener('change', () => void persist());
  backButton?.addEventListener('click', onBack);

  exportButton?.addEventListener('click', () => {
    void exportBackup(db).then((json) => {
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `factotum-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    });
  });
}
