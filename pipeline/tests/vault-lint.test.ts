import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, relative, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { markdownFiles } from '../src/build.js';
import { lintNote, type LintProblem } from '../src/lint.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REAL_VAULT_DIR = resolve(__dirname, '../../vault');

/**
 * Runs the linter over every real vault note. Unlike cloze-self-answer.test.ts,
 * lintNote is read-only, so this can run straight against the real vault with
 * no throwaway copy.
 */
describe('vault lint', () => {
  it('the whole vault is clean', () => {
    const files = markdownFiles(REAL_VAULT_DIR).sort();
    expect(files.length).toBeGreaterThan(0);

    const report: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      const problems: LintProblem[] = lintNote(text);
      const relPath = relative(REAL_VAULT_DIR, file);
      for (const problem of problems) {
        report.push(`${relPath}:${problem.line} [${problem.rule}] ${problem.message}`);
      }
    }

    expect(report, `Found ${report.length} lint problem(s):\n\n${report.join('\n')}`).toEqual([]);
  });
});
