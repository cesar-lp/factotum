# Development guidelines

Conventions for anyone — human or agent — working in this repo. `README.md`
covers how the system works; this file covers how to change it.

## Branch naming

Branches are named `<type>/<short-kebab-description>`, where `<type>` is a
[Conventional Commits](https://www.conventionalcommits.org/) type:

```
feat/keep-going
fix/cloze-feedback-and-input
docs/state-and-roadmap
chore/vault-conventions-and-spec
```

Use the type of the branch's *primary* commit. Adding notes to `vault/` is
`feat/` — new material is a feature of the deck.

**Do not prefix branches with `claude/`, an agent name, a ticket id, or a
generated suffix.** Some tooling proposes a branch name of that shape when
it creates a worktree; rename it before pushing. The prefix should say what
the change is, not who or what made it.

## Commits

Commit messages follow the same Conventional Commits types (`feat:`,
`fix:`, `docs:`, `chore:`, `test:`, `refactor:`). Explain *why* in the
body — this repo's history is the main record of why a design is the way it
is, and several non-obvious decisions are only documented there.

## Node version

`.nvmrc` is the single source of truth for the Node version, and it holds a
**fully-qualified** version (`22.23.2`), not a bare major. All three
workflows that run Node — `ci.yml`, `build-deck.yml`, `deploy.yml` — read it
via `setup-node`'s `node-version-file`, so CI and local development cannot
drift apart. Bumping Node means editing this one file.

Two things move *with* it and are not independent. `engines` in
`package.json` states the same major. `@types/node` must track that major
too — types from a newer release describe APIs the running Node does not
have, which typechecks clean and then fails at runtime. Dependabot is
configured to skip `@types/node` majors for exactly this reason, so a Node
bump is the moment to raise it by hand, where both versions are visibly
chosen together.

**Do not shorten it back to `20`.** nvm resolves a bare major to the newest
matching install, but asdf does not: with `legacy_version_file = yes` asdf
reads `.nvmrc` as a version source and looks for a runtime named exactly
`20`, which never exists. The result is `No version is set for command node`
and every `npm` command failing — including the whole pre-PR gate below.

That failure is easy to paper over, and has been papered over repeatedly:
running `asdf set` in a worktree writes an untracked `.tool-versions` that
fixes that one directory. The repo looks fine, the next checkout breaks
again, and the stray file eventually gets deleted as debris, which brings
the breakage back. If you find yourself writing a `.tool-versions`, the
tracked version file is wrong — fix that instead. Do not commit a
`.tool-versions`: two version files that can disagree is the trap this
setup exists to avoid.

## Pull requests

All work lands through a PR into `main`. Do not push to `main` directly —
`build-deck.yml` pushes there itself, and a human merges PRs.

`ci.yml` gates every PR on tests, typecheck, and a deck-drift check. Before
opening one, confirm all three locally:

```bash
npm test && npm run typecheck && npm run build:deck && git status --porcelain
```

That last command must print nothing. `build:deck` both regenerates
`deck/deck.json` and mints `^card-xxxx` anchors into vault notes, so either
can go stale on its own and fail the PR.

**Check for stray untracked notes before running `build:deck`.** The build
walks every note under `vault/`, not the git index — it neither knows nor
cares what is staged, tracked, or committed. So an in-progress note sitting
untracked in the working tree gets its cards minted into `deck/deck.json`
like any other, and committing that deck carries half-written cards into an
unrelated PR. This has already happened once: a `build:deck` run during a
docs-only change swept up twelve untracked drafts and wrote 1381 cards from
189 notes instead of the 178 that were committed. It was caught before the
push, but by luck rather than by process.

So before building for a PR:

```bash
git status --porcelain | grep '^?? vault/'
```

Anything that turns up and does not belong to the current change must be
committed on its own branch or moved out of the tree first. If a
contaminated deck was already generated but not yet committed,
`git checkout -- deck/deck.json` throws it away; rebuild once the tree is
clean.

## Worktrees

Work often happens in a git worktree under `.claude/worktrees/`. Each one is
a full checkout with its own `node_modules`, so they run to tens of
megabytes apiece and accumulate quietly — a finished worktree costs as much
as an active one.

**Delete a worktree once its branch is merged.** Check first, then remove:

```bash
git branch --merged main | grep <branch>
git -C <worktree-path> status --porcelain
git worktree remove <worktree-path>
git worktree prune
```

The first two commands are the safety check: confirm the branch really
landed, and that nothing uncommitted is sitting in the worktree. `git
worktree remove` refuses a dirty worktree by default — do not reach for
`--force` to get past that, since the uncommitted work it is protecting is
unrecoverable once the directory is gone. Commit or discard it
deliberately, then remove.

`git worktree prune` clears entries whose directories are already gone (for
example a worktree created under `/tmp` and cleared by a reboot), which
otherwise linger in `git worktree list` as `prunable`.

Run `git worktree list` periodically — a merged branch's worktree is pure
overhead, and the tooling that creates them does not clean up after itself.

## Branch freshness

**Branch from an up-to-date `main`, and re-sync before opening a PR.**
Fetch first — the local `main` is itself a cached copy and goes stale
the moment someone merges:

```bash
git fetch origin && git rebase origin/main
```

This matters more here than in most repos, for three reasons. `main`
advances with no human merge at all: `build-deck.yml` runs on every push
to `main` touching `vault/`, `pipeline/` or `package.json`, and commits
back both `deck/deck.json` and the `^card-xxxx` anchors it minted into
`vault/`, so a `chore: rebuild deck` commit can land while nobody has
merged anything. Worktrees are long-lived: one created days ago starts
from whatever `main` was then, and nothing about working inside it ever
advances that base — and it is the worktree's own refs the build runs
against, so fetching in the main checkout does nothing for it. And
`deck/deck.json` is a single generated file that every content PR
rewrites, so two branches cut from different bases conflict there
almost by construction — rebasing late means resolving a machine-
generated diff instead of never creating one.

Rebase rather than merge, so the branch stays a readable stack of
commits over current `main`. Regenerate the deck after any rebase that
pulled in vault changes, since `deck.json` is downstream of both sides:

```bash
npm run build:deck && git status --porcelain
```

## Vault content

Authoring conventions — the `topic`/`category` split, card syntax, and the
parser's behaviour — live in `README.md`. Two rules worth repeating because
violating them is silent rather than loud:

- **Never hand-write or edit a `^card-xxxx` anchor.** The build assigns
  them, and review history is keyed by card id, so editing one orphans that
  card's FSRS state on the next rebuild.
- **A cloze must not restate its own answer.** The parser joins consecutive
  prose lines into one block, so a cloze card's prompt is its whole
  paragraph — a term defined by a cloze and then repeated later in that same
  paragraph produces a card that shows you the answer.
  `pipeline/tests/cloze-self-answer.test.ts` enforces this.

A third rule governs how much a note should carry. `README.md` sizes
categories — roughly 8–12 notes each; this sizes the notes themselves:

- **A note should carry at least 6 cards, typically 7–9.** Measured across
  the 178 notes in the vault when this was written, the minimum was 6, the
  median 7 and the maximum 11 — a standard the repo has followed
  consistently and never stated, which means anyone writing a new note has
  had no way to discover it. Four notes written without knowing it came in
  at 3, 3, 4 and 5 cards.

  A note that yields fewer than 6 cards is usually telling you the subject
  is too thin to stand on its own, and belongs merged into a neighbouring
  note rather than kept as a stub. **Do not pad to reach the number.**
  Restating a card the note already has produces two cards that test one
  piece of knowledge, which quietly corrupts scheduling: FSRS treats them as
  independent, so the material gets reviewed twice as often as its difficulty
  warrants. Merging is the fix; padding is not.
