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
