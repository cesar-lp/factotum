---
topic: aws
category: aws-step-functions
tags: [step-functions, choice-state, map-state, parallel-state, concurrency]
citations: ["AWS Step Functions Developer Guide — 'Choice, Map, and Parallel states'"]
---

# Choice, Map, and Parallel States

`state-machines-and-the-amazon-states-language.md` names Choice, Map, and
Parallel as three of ASL's state types without saying how they differ
from each other in practice. All three affect control flow rather than
doing work themselves, but they answer three different questions: which
branch, how many times, and how many things at once.

A **Choice** state evaluates a list of `Choices`, each pairing a
condition with a `Next` state, in the order they're written — the first
one whose condition matches wins, and later rules are never even checked.

Why does a Choice state's rule order matter even when two rules' conditions could both be true for the same input? :: Because evaluation stops at the first matching rule — whichever rule is listed first wins for any input both would match, so reordering two overlapping rules can silently change which branch a given input takes even though neither rule's condition changed. ^card-98dp

If no rule matches, a Choice state falls back to its `Default` field —
and a Choice state with no `Default` fails the execution outright the
moment an input matches nothing. Always setting one, even to a state that
raises a clear custom error, turns an unmatched input into a legible
failure instead of an opaque validation error.

A Choice state should ==always== have a `Default` set, whether or not you expect every input to match one of its rules. ^card-eflu

A **Map** state runs the same set of steps once per element of an input
array, without you writing a loop — the iteration count comes from the
array's length at runtime, not from anything hardcoded in the definition.

> [!card] mcq
> A Map state iterates over 5,000 order records, and each iteration calls
> a downstream payment API with a strict rate limit. Which Map field
> exists specifically to keep that fan-out from overwhelming the API?
> - [x] MaxConcurrency
> - [ ] ItemsPath
> - [ ] ResultPath
> - [ ] Parameters ^card-razu

`MaxConcurrency` caps how many iterations run at once — but the cap only
applies when it's a positive number.

Why is setting `MaxConcurrency` to 0 a trap rather than just an edge case? :: It reads like "run nothing at once" or "the tightest possible limit," but ASL defines 0 as unlimited — a Map state left at the default or set to 0 by someone trying to protect a downstream service does the exact opposite of what they intended, launching every iteration simultaneously. ^card-pw7q

A **Parallel** state is a completely different shape of fan-out: rather
than repeating one set of steps N times, it runs a *fixed* number of
independently defined branches — different state machine fragments,
possibly doing entirely unrelated work — all starting at once.

In what order does a Parallel state's output array list its branches' results — the order they were written in the definition, or the order they finished? :: The order they were written in the definition. A branch that finishes first doesn't move to the front of the output array; the position is fixed by the state machine's JSON, regardless of runtime timing. ^card-zsoe

If any one branch of a Parallel state fails, ==the whole state== fails — Step Functions doesn't wait for the other branches to finish and doesn't produce a partial result for the ones that succeeded. ^card-a0j2

Map and Parallel are easy to blur because both fan work out.

What question does a Map state answer that a Parallel state does not, and vice versa? :: Map answers "run this same set of steps over each of N items," where N is only known at runtime from the input array's length. Parallel answers "run these specific, different pieces of work at the same time," where the number and identity of the branches is fixed in the state machine's definition itself, not derived from input data. ^card-cuqm

For very large arrays where even a bounded `MaxConcurrency` isn't enough
— millions of items rather than thousands — Step Functions offers a
separate Distributed Map mode with its own execution model, covered in
`distributed-map-and-large-scale-processing.md`.
