import type { FactotumDb, Settings } from '../db/schema.js';
import { DEFAULT_SETTINGS, getSettings, saveSettings, sanitizeSettings } from '../db/settings.js';
import { exportBackup } from '../db/reviews.js';
import { escapeHtml } from './renderers.js';

const THEMES: Settings['theme'][] = ['auto', 'day', 'night'];
const THEME_LABELS: Record<Settings['theme'], string> = { auto: 'Auto', day: 'Day', night: 'Night' };

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

/**
 * The retention slider's min/max, in whole percent, derived from
 * `sanitizeSettings`'s own clamp rather than a second hardcoded [0.7, 0.97]
 * that could silently drift from it. Feeding it values far outside the
 * legal range and reading back what it clamps them to recovers the real
 * bounds — `sanitizeSettings` itself stays the only place those numbers are
 * written down. (Feeding it a non-finite value like Infinity would instead
 * hit its "invalid input" fallback, which is why this uses a merely very
 * large finite number.)
 */
export function retentionPercentBounds(): { min: number; max: number } {
  const min = sanitizeSettings({ desiredRetention: -1e9 }).desiredRetention;
  const max = sanitizeSettings({ desiredRetention: 1e9 }).desiredRetention;
  return { min: Math.round(min * 100), max: Math.round(max * 100) };
}

function applyTheme(theme: Settings['theme']): void {
  if (theme === 'auto') delete document.documentElement.dataset['theme'];
  else document.documentElement.dataset['theme'] = theme;
}

function retentionCopy(percent: number): string {
  return `Cards resurface aiming for about ${percent}% recall — lower brings them back sooner, higher lets them drift further before a review.`;
}

export async function renderSettings(root: HTMLElement, db: FactotumDb, onBack: () => void): Promise<void> {
  const settings = await getSettings(db);
  const cardCount = await db.count('cards');
  const { min, max } = retentionPercentBounds();
  const retentionPercent = Math.round(settings.desiredRetention * 100);

  root.innerHTML = `
    <section class="screen">
      <div class="top"><button class="btn-quiet" id="back">← back</button><span>settings</span></div>

      <div class="field field-stack">
        <span>Theme</span>
        <div class="segmented" id="theme" role="radiogroup" aria-label="Theme">
          ${THEMES.map((t) => `
            <button
              type="button"
              class="segmented-option"
              data-theme-option="${t}"
              role="radio"
              aria-checked="${t === settings.theme ? 'true' : 'false'}"
              ${t === settings.theme ? 'data-active="true"' : ''}
            >${THEME_LABELS[t]}</button>
          `).join('')}
        </div>
      </div>

      <div class="field field-stack">
        <label for="retention">Desired retention <span id="retention-value">${retentionPercent}%</span></label>
        <input id="retention" type="range" min="${min}" max="${max}" step="1" value="${retentionPercent}" />
        <p class="field-help" id="retention-help">${retentionCopy(retentionPercent)}</p>
      </div>

      <label class="field">New cards per day
        <input id="newcards" type="number" step="1" min="0" max="100" value="${settings.newCardsPerDay}" />
      </label>
      <label class="field">Hours to defer a note's cards after reading it
        <input id="readSuppressionHours" type="number" step="1" min="0" max="168" value="${settings.readSuppressionHours}" />
      </label>
      <p class="field-note">
        Opening a note hides its due cards for this many hours, so you don't
        immediately re-review what you just read. Set to <code>0</code> to
        turn deferral off.
      </p>
      <label class="field">Obsidian vault name
        <input id="obsidianVault" type="text" value="${escapeHtml(settings.obsidianVault)}" />
      </label>
      <p class="field-note">
        Name of your Obsidian vault, used by each card's "open note" link. Leave as
        <code>vault</code> unless you opened this repo's <code>vault/</code> folder
        under a different vault name in Obsidian.
      </p>

      <p class="field-note">${cardCount} card${cardCount === 1 ? '' : 's'} in your local deck.</p>

      <div class="spacer"></div>
      <button class="btn-secondary" id="export">Export backup</button>
    </section>
  `;

  const themeGroup = root.querySelector<HTMLElement>('#theme');
  const retentionInput = root.querySelector<HTMLInputElement>('#retention');
  const retentionValue = root.querySelector<HTMLElement>('#retention-value');
  const retentionHelp = root.querySelector<HTMLElement>('#retention-help');
  const newCardsInput = root.querySelector<HTMLInputElement>('#newcards');
  const readSuppressionHoursInput = root.querySelector<HTMLInputElement>('#readSuppressionHours');
  const obsidianVaultInput = root.querySelector<HTMLInputElement>('#obsidianVault');
  const backButton = root.querySelector<HTMLButtonElement>('#back');
  const exportButton = root.querySelector<HTMLButtonElement>('#export');

  let activeTheme: Settings['theme'] = settings.theme;

  const persist = async (): Promise<void> => {
    // Re-read rather than reusing the render-time `settings` snapshot: this
    // form owns five fields, and must not write stale values over any
    // field it does not render (disabledCategories, owned by the topics
    // screen).
    const current = await getSettings(db);
    const next = clampSettings({
      ...current,
      theme: activeTheme,
      // The slider is in whole percent; Settings stores a 0-1 fraction.
      desiredRetention: retentionInput ? Number(retentionInput.value) / 100 : DEFAULT_SETTINGS.desiredRetention,
      newCardsPerDay: newCardsInput ? Number(newCardsInput.value) : DEFAULT_SETTINGS.newCardsPerDay,
      readSuppressionHours: readSuppressionHoursInput
        ? Number(readSuppressionHoursInput.value)
        : DEFAULT_SETTINGS.readSuppressionHours,
      obsidianVault: obsidianVaultInput ? obsidianVaultInput.value : DEFAULT_SETTINGS.obsidianVault
    });
    await saveSettings(db, next);
    applyTheme(next.theme);

    // Reflect the clamped values back into the inputs in case the user
    // typed something out of range.
    activeTheme = next.theme;
    for (const option of root.querySelectorAll<HTMLButtonElement>('[data-theme-option]')) {
      const isActive = option.dataset['themeOption'] === next.theme;
      option.setAttribute('aria-checked', isActive ? 'true' : 'false');
      if (isActive) option.dataset['active'] = 'true';
      else delete option.dataset['active'];
    }
    const nextRetentionPercent = Math.round(next.desiredRetention * 100);
    if (retentionInput) retentionInput.value = String(nextRetentionPercent);
    if (retentionValue) retentionValue.textContent = `${nextRetentionPercent}%`;
    if (retentionHelp) retentionHelp.textContent = retentionCopy(nextRetentionPercent);
    if (newCardsInput) newCardsInput.value = String(next.newCardsPerDay);
    if (readSuppressionHoursInput) readSuppressionHoursInput.value = String(next.readSuppressionHours);
    if (obsidianVaultInput) obsidianVaultInput.value = next.obsidianVault;
  };

  themeGroup?.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-theme-option]');
    const theme = button?.dataset['themeOption'];
    if (theme === undefined || !(THEMES as string[]).includes(theme)) return;
    activeTheme = theme as Settings['theme'];
    void persist();
  });

  // Live-update the label and copy while dragging, persist only once the
  // user releases (native `change`) — matches the other two fields and
  // avoids a write per tick.
  retentionInput?.addEventListener('input', () => {
    const percent = Number(retentionInput.value);
    if (retentionValue) retentionValue.textContent = `${percent}%`;
    if (retentionHelp) retentionHelp.textContent = retentionCopy(percent);
  });
  retentionInput?.addEventListener('change', () => void persist());

  newCardsInput?.addEventListener('change', () => void persist());
  readSuppressionHoursInput?.addEventListener('change', () => void persist());
  obsidianVaultInput?.addEventListener('change', () => void persist());
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
