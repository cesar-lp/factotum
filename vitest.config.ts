import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/tests/**/*.test.ts'],
    // Spreading configDefaults.exclude rather than replacing it: supplying an
    // `exclude` at all overrides vitest's built-in list, which is what keeps
    // node_modules and dist out.
    //
    // `.claude/worktrees/**` matters because spawned tasks create git worktrees
    // INSIDE the repo. The `include` glob above then walks into them and runs
    // every other branch's tests alongside this checkout's — doubling the count
    // and, worse, failing a local `npm test` here because of a half-finished
    // test on an unrelated branch. CI is unaffected (it checks out fresh), so
    // this only ever bites locally, which is where it is hardest to explain.
    exclude: [...configDefaults.exclude, '**/.claude/worktrees/**'],
    setupFiles: ['fake-indexeddb/auto']
  }
});
