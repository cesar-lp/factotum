#!/usr/bin/env bash
# Render a per-note card-count diff between two deck.json files as markdown.
#
#   deck-diff.sh <base-deck.json> <head-deck.json> <out.md>
#
# Exits 0 always. Writes markdown to <out.md>, and prints "changed=true" or
# "changed=false" on stdout so the caller can decide whether the diff is
# worth saying anything about.
#
# The unit of comparison is cards-per-source-note, not raw JSON lines. A
# line diff of deck/deck.json is unreadable (one generated 1.2MB file, every
# content PR rewrites it) and, more to the point, it answers the wrong
# question. What a reviewer needs to know about a content PR is how many
# cards it adds and to which notes -- see CLAUDE.md's account of the
# build:deck run that swept up twelve untracked drafts and wrote 1381 cards
# from 189 notes instead of the 178 that were committed. That went unnoticed
# in review because nothing in the PR made the number visible.
set -euo pipefail

base_json=$1
head_json=$2
out=$3

# Per-note counts from both decks, emitted as: path <TAB> before <TAB> after.
# `--slurpfile` (not --argfile/--arg) so each deck is parsed as JSON once;
# these files are ~1.2MB and have no business being shelled through strings.
counts=$(jq -rn \
  --slurpfile b "$base_json" \
  --slurpfile h "$head_json" '
    def counts: reduce (.cards[]?.source.path) as $p ({}; .[$p] += 1);
    ($b[0] | counts) as $B |
    ($h[0] | counts) as $H |
    # Union of both key sets: a note dropped entirely still needs a row,
    # and it only exists on the base side.
    (($B | keys) + ($H | keys) | unique)[] as $p |
    [$p, ($B[$p] // 0), ($H[$p] // 0)] | @tsv
  ')

total_before=$(jq '.cards | length' "$base_json")
total_after=$(jq '.cards | length' "$head_json")
notes_before=$(jq '[.cards[]?.source.path] | unique | length' "$base_json")
notes_after=$(jq '[.cards[]?.source.path] | unique | length' "$head_json")

added=0        # cards gained, summed over notes that grew
removed=0      # cards lost, summed over notes that shrank
changed_notes=0
rows=""
thin=""        # notes left below CLAUDE.md's 6-card floor

while IFS=$'\t' read -r path before after; do
  [ -n "$path" ] || continue
  delta=$((after - before))
  [ "$delta" -eq 0 ] && continue

  changed_notes=$((changed_notes + 1))
  if [ "$delta" -gt 0 ]; then added=$((added + delta)); else removed=$((removed - delta)); fi

  # An absent note reads as "—" rather than 0, so "new note" and "note that
  # lost all its cards" are distinguishable at a glance.
  [ "$before" -eq 0 ] && before_cell="—" || before_cell="$before"
  [ "$after" -eq 0 ] && after_cell="—" || after_cell="$after"
  [ "$delta" -gt 0 ] && delta_cell="+$delta" || delta_cell="$delta"

  rows+="| \`${path}\` | ${before_cell} | ${after_cell} | ${delta_cell} |"$'\n'

  # Only notes this PR actually touched are held to the floor. Pre-existing
  # thin notes are not this PR's problem, and flagging them every time would
  # train everyone to ignore the warning.
  if [ "$after" -gt 0 ] && [ "$after" -lt 6 ]; then
    thin+="\`${path}\` (${after}), "
  fi
done <<< "$counts"

# Marker: the commenting job finds its own previous comment by this string
# and edits it in place, so a PR accumulates one comment that stays current
# instead of one per push.
marker='<!-- deck-diff -->'

if [ "$changed_notes" -eq 0 ]; then
  printf '%s\n### Deck diff\n\nNo change to the deck. %s cards across %s notes.\n' \
    "$marker" "$total_after" "$notes_after" > "$out"
  echo "changed=false"
  exit 0
fi

{
  echo "$marker"
  echo '### Deck diff'
  echo
  echo "**+${added} / −${removed} cards** across **${changed_notes}** $([ "$changed_notes" -eq 1 ] && echo note || echo notes)"
  echo
  echo "| | Before | After |"
  echo "| --- | ---: | ---: |"
  echo "| Cards | ${total_before} | ${total_after} |"
  echo "| Notes | ${notes_before} | ${notes_after} |"
  echo
  echo "<details><summary>Per-note breakdown</summary>"
  echo
  echo "| Note | Before | After | Δ |"
  echo "| --- | ---: | ---: | ---: |"
  # Cap the table. A PR touching hundreds of notes is itself the signal;
  # rendering every row just buries the summary above.
  echo "$rows" | sed '/^$/d' | head -n 40
  overflow=$(( changed_notes - 40 ))
  [ "$overflow" -gt 0 ] && { echo; echo "_…and ${overflow} more notes._"; }
  echo
  echo "</details>"

  if [ -n "$thin" ]; then
    echo
    echo "> [!WARNING]"
    echo "> Below CLAUDE.md's 6-card minimum: ${thin%, }."
    echo "> A note that thin usually wants merging into a neighbour rather than padding."
  fi
} > "$out"

echo "changed=true"
