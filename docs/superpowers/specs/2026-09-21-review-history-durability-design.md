# Factotum — Review-History Durability

**Date:** 2026-09-21
**Status:** Proposed
**Supersedes:** nothing. Discharges the open item that
`2026-09-19-factotum-state-and-roadmap.md` has carried since 19 September as
"more urgent than anything in Phase 2, needs its own spec".

## 0. The problem, stated precisely

Factotum's deck is reproducible. `deck/deck.json` and every `^card-xxxx`
anchor in `vault/` are generated from this repository by `build:deck`, and a
lost checkout costs a rebuild.

Your review history is not reproducible. FSRS stability and difficulty scores
are the accumulated product of every rating you have entered, in the order and
at the times you entered them. They exist in exactly one place: the `factotum`
IndexedDB database in Safari on one iPhone. Nothing else in the system has ever
seen them.

The mitigation on record is "manual Settings → Export". Reading the shipped
code, it is weaker than that:

- `exportBackup` (`app/src/db/reviews.ts`) produces a JSON blob and
  `app/src/ui/settings.ts` hands it to a download link.
- **There is no import.** No `importBackup`, no restore, no code anywhere in
  `app/` that reads such a file back.

So the current state is not "backed up manually". It is *a file you can
produce and cannot restore from*. If the phone is lost tomorrow, that JSON
gets you nothing until someone writes the restore path from scratch, under
pressure, against whatever schema ships that week. The only unrecoverable
asset in the project is protected by code that does not exist.

Every phase on the roadmap — the path, note enrichment, Phase 2's streaks and
heatmaps — makes that history more valuable. None of them protect it.

## 1. Scope

**In scope.** A versioned backup format (already shipped, unchanged), an
import/restore path with explicit merge semantics, a preview before any write,
a backup-freshness indicator, and the seam that a later Google Drive sync
plugs into.

**Phase 2, specified here but not built here.** Automatic sync to a Google
Drive `appdata` folder.

**Out of scope.** Multi-device concurrent review. The merge defined in §3 is
built to make it possible later — it is commutative and idempotent — but no
part of this spec builds or tests a second device.

### 1.1 Why the phase split falls where it does

Restore is unconditional. Whatever destination the backup eventually lands in —
Files, iCloud, Drive, a private repo — *reading a backup back into IndexedDB is
the same code*. A destination changes where the copy goes; it does not change
whether you can get it back.

It is also the only half that can be built and verified without external
setup. Phase 2 requires a Google Cloud project and an OAuth client authorized
for `https://cesar-lp.github.io`, which only the account owner can create.
Phase 1 must not block on that.

## 2. Format

The format shipped in `exportBackup` is already correct and **this spec does
not change it**:

```json
{ "version": 1, "exportedAt": "<ISO>", "reviews": [...], "reviewLog": [...], "meta": {...} }
```

The importer accepts `version: 1`. Consequently **every file already exported
from the running app remains restorable** — no migration, no flag day, and the
backups taken before this spec existed are not wasted.

### 2.1 What is carried, and what is deliberately not

| Store | Carried | Why |
|---|---|---|
| `reviews` | yes | FSRS state. The irreplaceable payload. |
| `reviewLog` | yes | The audit trail — the only record of how the state was reached. |
| `meta` | yes | Three distinct kinds of key; see §3.3. |
| `cards` | **no** | Regenerated from `deck/deck.json` on load. Including it would add ~2439 regenerable records and risk restoring a stale deck over a current one. |

### 2.2 The importer treats the file as hostile

A backup is a file that has been sitting on a filesystem, syncing through
iCloud, possibly hand-edited. The importer sanitizes every record on the way in
— the discipline `sanitizeReads` (`app/src/db/note-reads.ts`) and
`sanitizeSettings` (`app/src/db/settings.ts`) already apply to stored values —
rather than trusting the JSON. Records failing validation are **dropped, not
imported**, and the dropped count is surfaced in the preview (§4), so a
half-valid file is visibly half-valid instead of quietly partial.

Rejected outright, with a message rather than a partial import: absent or
unrecognised `version`, a payload that is not an object, or `reviews` /
`reviewLog` that are not arrays.

## 3. Merge semantics

**Restore merges; it does not replace.** Each rule is chosen so that running a
restore is never worse than not running it.

Replacement was considered and rejected. It is simpler, but restoring a stale
file would silently discard newer reviews, and — decisively — a destructive
restore cannot double as the sync path in §6, which would leave phase 2
inventing a second, untested set of semantics for the same data.

### 3.1 `reviews` — later `lastReview` wins

Per `cardId`, keep the record with the later `lastReview`. A record with
`lastReview: null` was never reviewed and loses to one that was; if both are
null, the live record stands.

The comparator must be **total and symmetric**, because §6 depends on
`merge(a,b) == merge(b,a)`. In order: `lastReview`, `reps`, `stability`,
`difficulty`, and finally a stable discriminator over the serialized record so
that no tie can resolve differently depending on argument order.

**Exception: `suspended` and `flagged` are OR'd across both records**,
independently of which side wins the schedule fields. They are deliberate acts
carrying no timestamp, so newest-wins cannot see them. Losing a flag is silent;
clearing one is a single tap. Sticky is the cheap direction to be wrong in.

`learningFailures` follows the winning record, defaulting to 0 when absent —
matching the optional-field handling already documented in `schema.ts`.

### 3.2 `reviewLog` — union by `(cardId, ts, rating)`

The `id` field is an IndexedDB autoincrement key. It is **device-local and
meaningless across databases**: id 412 in a backup and id 412 in the live DB
are unrelated reviews. Using it as identity would silently collide them.
Incoming ids are discarded and re-minted on insert.

### 3.3 `meta` — one rule per kind of key

| Key | Rule | Why |
|---|---|---|
| `settings` | **Not merged.** Restored only when the live DB has no settings record at all. | A device-local preference with no timestamp; newest-wins is undefined for it. A wiped phone comes back configured; a working phone does not get its theme yanked by an old file. |
| `noteReads` | Per path, the later timestamp. | Matches `NoteReads`' own semantics. Losing one is harmless by its own docstring. |
| `newCards:<day>` | Per key, the **larger** count. | Conservative: a restore can never grant extra new-card intake for a day already spent. |

This rule depends on a property of the shipped code that is easy to break:
`getSettings` reads and sanitizes without writing, and `saveSettings` fires
only on a user action, so a fresh install genuinely holds no `settings` record.
The consequence for the operator is worth stating plainly — **restore before
touching Settings on a new device**, since changing the theme first creates the
record and causes the backup's settings to be skipped. Anything that makes the
app persist default settings eagerly at startup silently disables this rule.

Unrecognised `meta` keys are dropped. A forward-compatible key from a future
version has no merge rule here, and guessing one is worse than declining.

### 3.4 Shape

`mergeBackup(live, incoming)` is a **pure function** over plain data, with the
database write a separate step. That is what makes every rule above testable
without a browser, and it is the same function phase 2 calls.

## 4. Restore UX

In Settings, in a **Backup** section alongside the existing Export button
(`app/src/ui/settings.ts`).

The mechanism is a plain `<input type="file" accept="application/json">`. In an
iOS Home Screen PWA this opens the Files picker, which reaches iCloud Drive —
and Export's `link.download` already lands there. The round trip works on the
device that actually holds the data, with no new plumbing.

Three steps:

1. **Pick a file.**
2. **Preview.** Parse, sanitize, run `mergeBackup`, and display what it *would*
   do without writing: cards whose schedule changes, cards gained, log entries
   added, records dropped as invalid.
3. **Confirm**, which commits.

Step 2 is the point of the design, not a courtesy. It is the only place where a
wrong file fails loudly — a truncated download, another app's JSON, a file from
a different vault — instead of merging zero records while you believe you have
restored. It is also where the §3 rules get inspected once against real data
rather than trusted.

**Atomicity.** The commit is a single `readwrite` transaction across `reviews`,
`reviewLog` and `meta`, as `recordReview` already does. All three land together
or none do.

**No additional confirmation dialog.** The merge is non-destructive by
construction; guarding it with a scare prompt would train the habit of clicking
through the one dialog that matters.

**The fresh-install path is not a special case.** Merging into an empty
database is a copy. That falls out of §3 rather than being a second code path —
which matters, because the wiped-phone path is the one that must work and the
one you will never rehearse.

## 5. Backup freshness

Nothing currently records that an export happened. This adds one `meta` key,
`lastBackupAt`, written on export — and later by sync, which is why it is
shared rather than export-local.

Settings displays `Last backup: 12 days ago`, or `never`, turning
warning-coloured past `STALE_BACKUP_DAYS` (7). Phase 2 reuses the same constant
to decide a sync is overdue.

A passive line was chosen over a home-screen banner or a session-complete
prompt: it is honest, costs no persistent UI that phase 2 would retire, and the
threshold constant is the part that carries forward.

### 5.1 What this indicator cannot honestly claim

The browser cannot report whether a download completed or where it went.
`link.click()` is the only available signal, so `lastBackupAt` means **"you
asked for an export"**, not **"a file exists"**. The UI wording must not
overstate it.

This is a real gap and it is the strongest argument for phase 2: the Drive API
returns an actual acknowledgement, and `lastBackupAt` becomes truthful the day
that ships.

## 6. Phase 2 — the seam, and the properties it depends on

Phase 1 exposes three UI-agnostic pieces:

- `serializeBackup(db)` — the existing `exportBackup`, renamed for symmetry.
- `mergeBackup(live, incoming)` — pure.
- `applyBackup(db, merged)` — the transactional write.

Phase 2's sync is a loop over that seam rather than new logic:

> read remote → `mergeBackup` with local → `applyBackup` locally → write merged back

Nothing about Drive reaches into the merge.

**This is safe only if the merge is commutative and idempotent** —
`merge(a,b) == merge(b,a)` and `merge(a,a) == a`. Union, max-timestamp and OR
are naturally both. The exposure is the `reviews` tie-break, which §3.1 makes a
total deterministic comparator for exactly this reason.

Both properties get property-based tests **in phase 1**, where a violation is a
failing test rather than two devices disagreeing permanently about your
history.

### 6.1 Google Drive, honestly scoped

Checked against Google's current documentation on 2026-09-21; each claim below
cites where it comes from, because an earlier draft of this section asserted
three things from memory and all three were wrong.

- **Scope:** `drive.appdata` — a hidden per-app folder, invisible in the Drive
  UI, unreadable by other apps. The right shape for a backup blob.
- **No app verification is required.** Drive's auth guide classifies
  `drive.appdata` as **non-sensitive**, and Google's verification overview
  states that apps requesting only non-sensitive scopes do not need to complete
  OAuth app verification. A lighter *brand verification* applies only if the
  consent screen should show a custom app name and logo — cosmetic, and
  skippable. This is a materially smaller obstacle than assumed.
- **There is no refresh token to expire, and none to store.** Google Identity
  Services' token model states there is no need to store per-user refresh
  tokens; the browser receives short-lived access tokens only. The 7-day
  refresh-token expiry that applies to OAuth clients in **Testing** publishing
  status therefore does not bite here — that rule governs refresh tokens, and
  this flow is not issued any.

  This is also a genuine security advantage over the private-repo alternative
  considered during design: no long-lived credential is ever written to the
  device.
- **Owner setup, unavoidable and not automatable:** a Google Cloud project and
  an OAuth client ID authorized for the origin `https://cesar-lp.github.io`.
  The client ID is public by design; there is no secret in the browser.
- **"Automatic" has a ceiling, and the ceiling is a tap.** GIS documents a new
  access token being obtained *at page load or through a user gesture such as a
  button press*. Acquiring one with no prompt at all after the first consent is
  **not documented by Google**, so this design must not depend on it: treat an
  occasional sign-in tap as the expected path, and any silent acquisition that
  happens to work as a bonus.

  Separately, an iOS Home Screen PWA gets no reliable background execution — no
  Background Sync in Safari, no periodic wakeups. Sync runs **when the app is
  open**: on launch and after a session. That is at most one session of
  exposure with nothing to remember, which is a large improvement over today,
  but it is not a daemon.
- **Sign-in grants no security.** Nothing in Factotum is access-controlled: the
  deck is public and the history is local. The sign-in is a ticket to reach
  Drive, nothing more, and the UI should not imply otherwise.

Sources: Drive API scopes and their sensitivity classification
(`developers.google.com/workspace/drive/api/guides/api-specific-auth`), OAuth
app verification requirements (`support.google.com/cloud/answer/13463073`),
Testing-status refresh-token expiry
(`developers.google.com/identity/protocols/oauth2`), and the GIS token model
(`developers.google.com/identity/oauth2/web/guides/use-token-model`).

## 7. Testing

- **Merge rules** — unit tests per rule in §3, including the OR'd flags, the
  null-`lastReview` cases, and the three `meta` kinds.
- **Properties** — commutativity and idempotence of `mergeBackup` over
  generated inputs (§6).
- **`reviewLog` identity** — a backup and a live DB carrying colliding
  autoincrement ids for different reviews must produce the union, not a
  collision.
- **Hostile input** — truncated JSON, wrong `version`, non-array stores,
  records with non-finite numbers: rejected or dropped, never partially
  applied.
- **Round trip** — `serializeBackup` → `mergeBackup` into an empty database →
  the reconstructed state equals the original. This is the wiped-phone path and
  it is the single most important test in the spec.
- **Atomicity** — a failure partway through `applyBackup` leaves all three
  stores untouched.

## 8. Open questions

None blocking. One is deferred by design: multi-device merge (§1), which this
spec enables and does not build.

The Drive consent-expiry question that an earlier draft deferred here is
**closed** — §6.1 establishes that the browser flow is issued no refresh token,
so Testing-status expiry does not apply. What replaces it is smaller and needs
no external setup to decide: whether a sign-in tap on app launch is acceptable
in the cases where a token cannot be acquired silently. It can be answered the
first day phase 2 runs.
