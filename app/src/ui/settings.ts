import type { FactotumDb } from '../db/schema.js';

// Stub for Task 17. Kept minimal so Task 16's #settings route typechecks
// and resolves without implementing the real settings screen here.
export async function renderSettings(_root: HTMLElement, _db: FactotumDb, _onDone: () => void): Promise<void> {}
