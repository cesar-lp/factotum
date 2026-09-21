---
topic: data-systems
category: data-processing
tags: [stream-processing, exactly-once, delivery-semantics, sinks]
citations: ["Kleppmann, Designing Data-Intensive Applications, Ch. 11 (Stream Processing)"]
---

# Exactly-Once and End-to-End Guarantees

`checkpointing-state-and-recovery.md` covers how a stream job survives a
crash without losing or corrupting its internal state. This note asks a
different question: once a job can recover, what does that actually
guarantee about the *output* it produces — including the duplicates a
recovery inevitably creates?

The three delivery semantics describe what a failure does to a message,
arranged along one axis: how the system errs when something goes wrong.
==At-most-once== delivery errs by dropping — a failure can cause a ^card-rtdu
message to simply vanish, never processed at all. At-least-once delivery
errs the other way: a failure can cause a message to be redelivered and
reprocessed, but nothing is silently lost. Exactly-once is the semantics
everyone actually wants: no loss, no duplication.

Which of the three delivery semantics is the one every other one is defined in contrast to, and what does it promise that the other two each fail to? :: Exactly-once — it promises a message is neither dropped (unlike at-most-once) nor duplicated (unlike at-least-once); at-most-once trades away the no-loss property and at-least-once trades away the no-duplication property, each accepting one failure mode to avoid the other. ^card-bb5h

Here is the point this whole note exists to make, stated as plainly as
possible: exactly-once, as actually implemented, is **not** exactly-once
*delivery*. Messages are genuinely redelivered after a failure — a
checkpoint recovery rewinds the source and reprocesses records the job
already saw once, exactly as the previous note describes. What
"exactly-once" really names is exactly-once ==effect==: the guarantee ^card-x2vj
that each record influences the final result exactly once, even though
the underlying delivery mechanism is at-least-once and duplicates
genuinely occur in transit. Of all the terms in this subject, this one
causes more confusion than any other, precisely because the name
promises something about delivery that the mechanism was never built to
provide.

> [!card] mcq
> A stream job restarts after a crash, using checkpointed state and
> rewound source offsets. Some records the job had already processed
> before the crash get reprocessed. Is this consistent with the job
> providing "exactly-once" guarantees?
> - [x] Yes — "exactly-once" means each record's effect on the final result happens once, not that the record is only ever delivered once; reprocessing duplicates is expected as long as their effect is deduplicated
> - [ ] No — genuine exactly-once means no record is ever delivered more than once, so this job's guarantee is broken
> - [ ] Yes, but only because the job is using at-most-once delivery underneath
> - [ ] No — reprocessing after a crash is only acceptable under at-least-once semantics, never under exactly-once ^card-dywx

Achieving exactly-once effect takes two mechanisms working together, and
both are required — neither one alone is sufficient. A consistent
==checkpoint== (the previous note's subject) handles the job's own ^card-o23d
internal state, making sure recovery restores state that correctly
reflects processing up to a known point. But that only protects what
lives inside the stream processor. Anything the job writes to an
external system — a database, a file, another queue — can still be
written twice when a duplicate is reprocessed, so the sink itself has to
either be idempotent (writing the same record twice produces the same
end state, e.g. an upsert keyed on record id) or transactional (the
output only becomes visible as an atomic unit tied to that same recovery
point, so a replayed batch either doesn't commit again or overwrites the
prior attempt outright).

Why does a correct checkpoint of the job's internal state fail to guarantee exactly-once effect on its own? :: Because the checkpoint only protects state kept inside the stream processor. Once a duplicate record is reprocessed after a recovery, it still gets written to whatever external sink the job outputs to; without that sink itself being idempotent or transactional, the duplicate produces a second, incorrect write there regardless of how correct the internal state recovery was. ^card-t4pg

The guarantee's boundary is worth stating honestly rather than
glossing over: it holds only within the parts of the system built to
support it. The instant a job writes to an arbitrary external service —
one with no idempotency key support and no participation in a
transaction — that write can be duplicated by a reprocessed record with
nothing downstream to catch it, and the pipeline is back to plain
at-least-once at that final step no matter how carefully everything
upstream was checkpointed. "End to end" names exactly this: the
guarantee is a property of the *entire path* including the sink, not of
the stream processor in isolation, and a single unprotected hop at the
end undoes everything upstream.

`../transactions.md` covers what a transaction guarantees within a single
database; this note relies on that same atomicity being extended to
cover "commit this sink write together with this checkpoint," which is
what a transactional sink actually buys.

`../../aws/messaging/idempotency-and-exactly-once.md` covers the
messaging-system version of this same distinction — at-least-once
delivery paired with consumer-side idempotency — for a queue rather than
a stream processing pipeline; the underlying idea (duplicates are
inevitable, so effect must be deduplicated rather than delivery
prevented) is the same one this note applies to stream sinks.

Transactional sinks are not free: because the output can't be revealed
until the transaction tied to the checkpoint actually commits, consumers
of that output see it only in bursts at commit boundaries rather than as
each record finishes, so committing to a transactional sink trades
immediacy of visibility for the stronger guarantee — a real ==latency== ^card-uv3b
cost, not just an implementation detail.

> [!card] recall
> A team migrates a stream job's sink from a plain idempotent upsert to a
> transactional sink that commits alongside each checkpoint, hoping to
> tighten their correctness guarantee. What do they gain, and what
> user-visible cost do they take on in exchange?
> ---
> They gain protection for sinks or output shapes where idempotent
> upserts aren't possible (e.g. appends, or an external system with no
> natural dedup key) by tying visibility to an atomic commit instead of
> relying on the write itself being safe to repeat. The cost is latency:
> output is invisible to downstream consumers until the transaction
> commits, so results arrive in bursts at checkpoint boundaries rather
> than as soon as each record is processed, and picking a shorter
> checkpoint interval to reduce that lag trades back into the overhead
> discussed for checkpointing generally. ^card-7ksh
