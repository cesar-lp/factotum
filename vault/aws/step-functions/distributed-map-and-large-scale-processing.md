---
topic: aws
category: aws-step-functions
tags: [step-functions, map, distributed-map, s3, batch-processing]
citations: ["AWS Step Functions Developer Guide — 'Distributed Map state'"]
---

# Distributed Map and Large-Scale Processing

`choice-map-and-parallel-states.md` covers the inline Map state as one of
the four core state types. This note is about the ceiling that state runs
into, and the separate flow mode Step Functions built specifically to
clear it.

An inline Map state's iterations aren't isolated from the rest of the
execution — each one runs inside the *same* execution, so its inputs and
outputs are appended to the *same* event history and count against the
*same* payload limits as every other state. That's fine at small scale and
punishing at large scale: iterating over a large enough array would blow
through the execution history limit long before finishing, so in
practice inline Map tops out at a few ==thousand== items. ^card-a8pf

Why can't an inline Map state simply be given a larger array and left to iterate further? :: Every iteration's input, output, and state transitions are recorded in the parent execution's own event history and subject to its payload limits, so the history grows with the item count until the execution hits its history-size ceiling — the limit isn't iteration speed, it's bookkeeping shared with one execution. ^card-tzl3

**Distributed Map** exists to remove that shared bookkeeping. Instead of
iterating in-process, each iteration (or each batch of iterations) starts
as its own **child execution** — a separate execution with its own event
history. The parent's history no longer grows with the item count at all;
it just tracks the child executions as they run. That's what unlocks
concurrency in the tens of thousands rather than the low thousands, and
it's the entire reason the feature exists rather than being a tuning knob
on ordinary Map.

> [!card] mcq
> Why does Distributed Map support far higher item counts and concurrency
> than an inline Map state?
> - [x] Each iteration runs as its own child execution with a separate event history, instead of appending to the parent execution's shared history
> - [ ] It uses a faster JSON parser for iteration input
> - [ ] It skips input and output processing entirely
> - [ ] It only runs on Express workflows, which have no history limit ^card-q609

Distributed Map's other defining feature is where the input can come
from: instead of an array already sitting in the execution's payload, it
can read directly from an object store — a JSON array, a CSV file
(treating the header row as field names), or a manifest listing other
objects to process, all held in ==S3==. That's what makes it possible to ^card-ch4q
process a dataset the workflow could never have received as input in the
first place, since the dataset itself never has to pass through a
state's payload.

What kind of workflow does reading Distributed Map input directly from S3 make possible that reading it from the execution's own payload does not? :: One that processes a dataset far larger than any state's payload limit — the objects or rows to iterate over live in S3 and are streamed into child executions on demand, so the dataset itself never has to be embedded in, or pass through, the execution's JSON payload. ^card-5gs7

Two settings shape how a distributed job actually runs. **ItemBatcher**
groups multiple items into each child execution instead of one-item-per-
child, trading a little isolation for far fewer executions to start and
track — worthwhile once per-item overhead would otherwise dominate.
**ToleratedFailurePercentage** is the switch from all-or-nothing to
best-effort: without it, one failed item fails the whole Map state;
with it, the job keeps going as long as failures stay under the
threshold. A job processing a few hundred thousand records from a
third-party export usually wants this set above zero, because treating
every malformed row as a reason to abort the entire run turns routine
data mess into a full re-run.

> [!card] recall
> A batch job processes two million records pulled from S3, and about
> 0.1% of them are malformed in ways that make Lambda throw. Explain why
> setting ToleratedFailurePercentage to a small nonzero value is usually
> the right call here, and what you would lose by leaving it at its
> default of zero.
> ---
> At two million records, 0.1% is around two thousand items that will
> reliably fail no matter how many times the job is retried — they are
> bad data, not transient errors. Leaving ToleratedFailurePercentage at
> zero means any one of those failures fails the entire Map state, so
> the whole multi-hour job would need to be rerun (and would fail again)
> over a known, bounded amount of bad input. A small nonzero tolerance
> lets the job complete and treats the failed items as something to
> collect and handle separately, matching how the data actually behaves. ^card-f1so

Distributed Map also writes its **results to S3** rather than returning
them inline, for the same payload-limit reason input can't be inline: the
combined output of tens of thousands of child executions would exceed any
state's payload limit many times over, so the aggregate lands as objects
in a results bucket instead of as JSON flowing to the next state.

Distributed Map is not a strictly better Map state. Each child run
carries its own overhead and is billed as a full ==execution==, and ^card-5esj
following a distributed job means reasoning about a fleet of separate
runs instead of one inline loop readable start to finish in a single
event history. It's the right tool once inline Map's ceiling has
actually been hit — not a default to reach for on a hunch that a dataset
might someday grow.

Why is reaching for Distributed Map by default, before an inline Map state has actually run into its limits, a bad habit rather than just harmless caution? :: Because Distributed Map trades away simplicity you'd otherwise keep for free — each child execution costs more and is harder to trace than one inline iteration in a single readable history — and that trade only pays off once the item count or concurrency genuinely exceeds what inline Map can handle. ^card-kbvw
