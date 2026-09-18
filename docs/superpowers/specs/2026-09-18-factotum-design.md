# Factotum — Design Spec

**Date:** 2026-09-18
**Status:** Approved for planning
**Author:** Cesar Palacios (with Claude)

## 1. Summary

A personal spaced-repetition app for retaining technical knowledge —
programming syntax, computer networking, algorithms, data structures, system
design. Content lives as Obsidian notes in a Git repo; a CI pipeline compiles
notes into a deck; an offline-first PWA on iPhone runs the daily review
session with FSRS scheduling and light gamification.

Single user. No App Store. No servers.

## 2. Goals and non-goals

**Goals**

- A daily review session short enough to finish and compelling enough to open.
- Content authored as notes, not as a card database — notes stay readable.
- Zero maintained infrastructure: GitHub Actions and GitHub Pages only.
- Works offline; review history survives without a network.
- Errors in generated content are correctable in one tap, at the moment of doubt.

**Non-goals**

- Multi-user, sharing, or sync across multiple devices.
- App Store distribution, native widgets, Live Activities, Siri integration.
- Free-text code grading or fuzzy answer matching.
- XP, levels, achievements, leaderboards.

## 3. Content model

### 3.1 Authoring

Notes are written by an LLM (Claude, in a session) from topics the user
chooses; the user curates the syllabus rather than writing prose. Cards are
**inline in the notes**, not in separate deck files, so a card always sits
beside the explanation that justifies it.

Only notes with a `category` in frontmatter are scanned. Drafts and daily
notes never produce cards.

### 3.2 Card syntax

Four constructs across three grading modes (machine-graded choice, machine-graded cloze, self-graded):

```markdown
---
category: networking
tags: [tcp, transport-layer]
---

# TCP Three-Way Handshake

The client sends a SYN, the server replies SYN-ACK, and the client confirms
with ACK. Default Ethernet MTU is ==1500 bytes==. ^card-k3n9

What does the TIME_WAIT state protect against? :: Delayed duplicate segments
from a previous connection being accepted by a new one. ^card-p2x1

> [!card] mcq
> At which OSI layer does TCP operate?
> - [x] Transport (4)
> - [ ] Network (3)
> - [ ] Session (5)
> ^card-m8q4

> [!card] recall
> Explain why TCP's congestion control makes it a poor fit for real-time
> video, and what QUIC changes.
> ^card-r5t2
```

| Construct | Format | Grading |
|---|---|---|
| `==text==` | cloze | typed, exact match (case/whitespace-insensitive) |
| `Q :: A` | qa | self-graded, 4 buttons |
| `> [!card] mcq` | mcq | tap a choice, `- [x]` is correct |
| `> [!card] recall` | recall | self-graded, no answer key |

Syntax overlaps deliberately with the Obsidian Spaced Repetition plugin, so
notes remain useful outside this app.

### 3.3 Citations

Every generated note carries source references (RFC number, textbook section,
docs URL). Cards surface them on the answer side. Citations do not prevent
errors; they make verifying a suspicious card immediate.

### 3.4 Stable IDs

Review history is keyed by card ID, so IDs must survive content edits.
Cards are identified by Obsidian block references (`^card-xxxx`). The build
Action assigns an ID to any card lacking one and **commits it back to the
vault**. Block refs are native Obsidian syntax, so they also enable
`obsidian://` deep links from a failed card to its source note on desktop.

## 4. Architecture

Single public GitHub repository. Content is textbook-grade public
information, so nothing is gated; this also satisfies GitHub Pages' public-repo
requirement on free accounts.

```
factotum/
  vault/               # Obsidian vault — open this folder in Obsidian
    networking/tcp-handshake.md
    algorithms/...
  pipeline/            # markdown -> deck.json (TypeScript, runs in CI)
  app/                 # the PWA (Vite + TypeScript)
  deck/deck.json       # build output, committed
  .github/workflows/   # build-deck, deploy, daily-push
```

### 4.1 Data flow

```
vault/*.md  --push-->  Action: parse, assign IDs, commit back, emit deck.json
                              |
                              v
                       Action: build PWA, deploy to GitHub Pages
                              |
                        fetch (ETag)
                              v
                    iPhone PWA — IndexedDB, offline-first

Action (cron 08:00) --Web Push--> service worker --> reads IndexedDB,
                                                     computes due count,
                                                     renders notification,
                                                     setAppBadge()
```

### 4.2 Deck format

The deck is content only. It carries **no scheduling state** — that separation
makes the deck a disposable build artifact while review history remains the
only irreplaceable data.

```json
{
  "generatedAt": "2026-09-18T10:00:00Z",
  "cards": [
    {
      "id": "card-m8q4",
      "format": "mcq",
      "category": "networking",
      "tags": ["tcp"],
      "prompt": "At which OSI layer does TCP operate?",
      "choices": [
        { "text": "Transport (4)", "correct": true },
        { "text": "Network (3)", "correct": false }
      ],
      "source": { "path": "vault/networking/tcp-handshake.md", "block": "card-m8q4" },
      "citations": ["RFC 793 §1.4"]
    }
  ]
}
```

`answer` (string) replaces `choices` for cloze and qa formats; `recall` cards
carry neither.

### 4.3 Client storage

IndexedDB, three stores:

- **`cards`** — mirror of the last fetched deck.
- **`reviews`** — per card ID: FSRS state (stability, difficulty, due,
  reps, lapses, state, lastReview), plus `suspended` and `flagged` booleans.
- **`meta`** — streak count, banked freezes, last completed day, settings,
  deck ETag, push subscription.

A `reviewLog` append-only store records every rating with a timestamp, which
is what makes the heatmap and later FSRS parameter optimisation possible.

### 4.4 Deck merge

On each fetch, merge by card ID:

- **New ID** → insert, no FSRS state, enters the new-card queue.
- **Existing ID, changed content** → update content in place, **preserve FSRS
  state**.
- **Missing ID** → tombstone, do not delete. A renamed or restored note keeps
  its history.

### 4.5 Backup

Review history exists in one place. Phase 1 ships **Settings → Export** which
produces a JSON file the user can drop in iCloud. Phase 2 may auto-commit it
to the repo with a fine-grained token. Losing a phone should cost a day, not a
year.

## 5. Scheduling

**Algorithm: FSRS** via `ts-fsrs`. Desired retention defaults to **0.90**.

**Rating map**

- MCQ — correct → `Good`, wrong → `Again`.
- Cloze — exact match → `Good`; mismatch shows the expected answer with an
  **"I actually knew this"** override so a typo does not schedule the card as
  forgotten.
- qa / recall — all four buttons (Again / Hard / Good / Easy).

**New card cap: 10/day, configurable.** This is the system's most important
guardrail: without it, a large generation run produces an unreviewable pile
three weeks later and the habit dies.

**Session shape:** due cards first, **interleaved across categories** (not
blocked by topic — interleaving improves discrimination between similar
concepts, the exact failure mode with e.g. five sorting algorithms), then new
cards up to the cap. The session ends when the queue empties.

**Leeches:** a card failed 8 times is auto-suspended and flagged. A card you
cannot learn is usually a badly written card.

## 6. Quality control

Notes are LLM-written, so some cards will be wrong, and spaced repetition
makes wrong facts permanent. Two mitigations, both chosen because they cost
nothing up front:

1. **Flag in app.** A permanently visible ⚑ on every card. One tap suspends
   the card immediately and files a GitHub issue containing the card ID, note
   path, and prompt. Correction happens later, out of session.
2. **Citations** on the answer side (§3.3), making verification fast.

Explicitly rejected: a generation-time verification pass (roughly doubles
cost to catch errors the flag already catches, and misses confidently-wrong
ones), and batch PR review before merge (friction the user will not sustain).

## 7. UI/UX

### 7.1 Screens

**Dashboard** — the landing screen on every open. Due count, streak, 12-week
heatmap, per-category mastery bars, and the start button. The dashboard is
deliberately unavoidable: mastery bars only redirect attention toward weak
topics if they are seen daily.

**Review** — split layout. The prompt occupies the upper half where the eyes
are; every tappable element (choices, input, rating buttons, ⚑) lives in the
bottom third within thumb reach. Header shows streak and cards remaining, with
a thin progress bar.

- MCQ — choices as tappable rows; correct/incorrect revealed in place.
- Cloze — dashed blank in the prompt, text input, "Check".
- qa / recall — reveal, then four rating buttons.

**Session complete** — cards reviewed, accuracy, streak state, freeze spent if
applicable.

**Settings** — theme (Auto / Day / Night), desired retention, new-card cap,
export backup, push subscription string to copy.

Rejected: a swipe-to-rate card stack (four FSRS ratings do not map to two
directions, and invisible gestures are forgotten gestures) and a
straight-into-the-cards launch (saves one tap, costs the daily glance at the
mastery bars).

### 7.2 Theming

Paper — warm cream and ink — with **Ink** as its night counterpart. Eight CSS
custom properties on `:root`, switched by `prefers-color-scheme` with an
Auto / Day / Night override in Settings.

The day accent was re-tuned from terracotta to **amber/ochre** so that both
themes share one accent hue and the accent stays clearly distinct from the red
"wrong" state — the two were adjacent on the colour wheel and confusable at a
glance.

| Token | Day (Paper) | Night (Ink) |
|---|---|---|
| `--bg` | `#faf4e8` | `#14151a` |
| `--surface` | `#f3ead9` | `#1b1d23` |
| `--text` | `#2c2721` | `#e9e2d6` |
| `--dim` | `#8a8073` | `#8b8a86` |
| `--line` | `#ddd2bd` | `#2b2d34` |
| `--accent` | `#a66c14` | `#e8a33d` |
| `--ok` | `#4f7a42` | `#6fcf97` |
| `--bad` | `#b03a30` | `#eb5f5f` |

Soft variants (`--accent-soft`, `--ok-soft`, `--bad-soft`) are the same hues at
12–15% alpha, used for filled backgrounds on choices and chips.

**Mastery bars use a two-stop scale — `--ok` when healthy, `--bad` when weak —
rather than a separate warning colour.** Introducing an amber warning token
would collide with the amber accent; "weak" belongs to the same semantic family
as "wrong" anyway. The scale crosses over at 50%.

## 8. Gamification

Four mechanics, chosen to be non-farmable. XP, levels and achievements are
explicitly out of scope.

1. **Streak with mercy.** A day counts when the due queue reaches zero. Days
   with nothing due auto-credit. Day boundary is **04:00 local**, so a
   late-night session counts for the day it feels like. Freezes accrue one per
   10 consecutive days, cap 2 banked, and apply automatically on a missed day;
   the app reports a spent freeze afterwards rather than prompting in the
   moment.
2. **Daily goal = clearing the due queue**, never a fixed card count. The
   scheduler already knows the right amount of work, and an emptied queue
   cannot be farmed.
3. **Category mastery** = mean FSRS-predicted recall probability seven days
   out, across a category's unsuspended cards. Adding easy cards barely moves
   it; abandoning a topic decays it. Suspended and flagged cards are excluded.
4. **Heatmap** — cards reviewed per day, 12 weeks, four intensity levels.

## 9. Notifications

A scheduled GitHub Action fires a content-light Web Push at 08:00 using VAPID
keys held in repository secrets. The push subscription is copied once from
Settings into a repository secret; it is re-pasted only if it rotates.

The push wakes the service worker, which reads IndexedDB locally, computes the
real due count, renders the notification text ("23 cards due"), and calls
`setAppBadge()`. The server therefore never sees review history. The badge is
also refreshed on app open and at session end.

Known constraint: iOS Web Push requires the PWA to be installed to the Home
Screen. That is a one-time setup step, documented in the repo README.

## 10. Testing

Three components carry real risk and get real tests:

- **Parser** — table-driven fixtures covering all four constructs, malformed
  notes, notes without `category`, ID assignment and idempotency.
- **Deck merge** — edits preserve FSRS state, deletions tombstone, restored
  IDs recover history.
- **Scheduler wrapper** — rating maps, new-card cap, leech suspension, day
  boundary arithmetic including the 04:00 rollover.

The UI is verified by hand. This is a single-user app and snapshot tests of a
still-evolving interface are a tax without a payoff.

## 11. Phasing

**Phase 1 — usable daily.** Vault conventions, parser, deck build Action,
Pages deploy, PWA with FSRS scheduling, all three card formats, dashboard,
review screen, both themes, flag button, export backup. Content seeded by
Claude writing notes on topics the user names.

**Phase 2 — the habit layer.** Streak with freezes, heatmap, mastery bars,
badge, daily push Action, session-complete screen.

**Phase 3 — automated generation.** A topics file drives an Action that
generates new notes with inline cards and opens a pull request.

Phase 3 is last deliberately: LLM-proposed cards can only be judged once
hand-seeded ones have been lived with.

## 12. Risks

- **Wrong facts drilled to permanence.** Mitigated by the flag button and
  citations (§6); accepted as a residual risk.
- **History loss.** One device, one copy. Mitigated by export in Phase 1.
- **Push subscription rotation** silently breaking the daily nudge. The
  dashboard's own due count makes this visible; re-pasting is a two-minute fix.
- **Safari storage eviction.** Home Screen–installed PWAs are not subject to
  the 7-day script-writable storage cap, and `navigator.storage.persist()`
  hardens it further; export remains the backstop.
