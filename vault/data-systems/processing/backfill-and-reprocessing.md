---
topic: data-systems
category: data-processing
tags: [stream-processing, backfill, reprocessing, lambda-architecture, kappa-architecture]
citations: ["Kleppmann, Designing Data-Intensive Applications, Ch. 11 (Stream Processing)"]
---

# Backfill and Reprocessing

Every other note in this category assumes a pipeline's logic is fixed
and asks how it behaves at runtime. This one asks what happens when the
logic itself changes: pipeline code gets fixed, a bug is discovered
after the fact, or a new field is added to an existing aggregate.
Recomputing history to reflect the new logic — a backfill — is not a
rare emergency procedure; it is a design requirement any real pipeline
needs from day one, because every one of those situations eventually
happens.

Being able to recompute history at all rests on three properties, and
losing any one of them closes off backfill entirely. The pipeline needs
retained raw input to recompute from (not just the already-aggregated
output), deterministic transformations (the same input must produce the
same output every time, or "recomputed" and "original" become
incomparable), and event-time semantics for anything windowed.

That last one is the concrete payoff of keeping event time rather than
processing time: a pipeline whose windows are assigned by processing
time ==cannot== be replayed and produce the same result, because ^card-59i9
replaying the same records later means they arrive at completely
different processing times than the first run — landing in different
windows and producing different aggregates, even though the input data
is identical. A pipeline windowed on event time replays deterministically
because the window a record belongs to is a fact about the record
itself, unaffected by when it happens to be reprocessed.

> [!card] mcq
> Why can't a pipeline that assigns windows by processing time be
> replayed to reproduce its original results?
> - [x] Replayed records get processed at a different wall-clock time than the first run, so they land in different processing-time windows and produce different aggregates even from identical input
> - [ ] Processing-time pipelines don't retain enough state to be replayed at all
> - [ ] Replay is fine for processing-time pipelines; only event-time pipelines have this limitation
> - [ ] Processing time changes deterministically on replay, so this isn't actually a problem in practice ^card-2q1b

Given those preconditions hold, two strategies exist for actually
running the backfill, trading safety against cost. The ==parallel run== ^card-qort
computes the new logic alongside the existing pipeline into a separate
output, so the current production output is untouched while the new
version's results accumulate; only once the new output has been compared
against the old and judged correct does traffic switch over to it. This
is the safer of the two, but it roughly doubles compute and storage
while both versions run, and it needs an explicit switchover step once
validation finishes.

What must be true before traffic is cut over to a parallel run's new output, and what does the parallel run cost while both versions are live? :: The new output must be validated against the existing output and judged correct before the switch happens; while both run, the approach costs roughly double the compute and storage, since the full pipeline is effectively running twice. ^card-mbwr

In-place recomputation, by contrast, overwrites or recomputes the
existing output directly with no second copy running alongside it. It's
simpler and cheaper — no doubled infrastructure, no separate comparison
step — but during the recomputation window, anyone reading that output
sees results that are wrong, partial, or simply missing, since there is
no unaffected old copy left to fall back on while the new one catches
up.

> [!card] recall
> A team chooses in-place recomputation over a parallel run to backfill
> a corrected metric, citing lower cost. What operational risk are they
> accepting that a parallel run would have avoided?
> ---
> While the recomputation is in progress, any consumer reading that
> output sees incorrect, partial, or missing data, because there is no
> separate, untouched copy of the old output to serve in the meantime —
> the parallel run's whole safety advantage is having exactly that
> fallback available until the new version is validated. ^card-fftm

The Lambda architecture is the historical ancestor of this same
trade-off: it runs a slow, thorough batch layer to periodically
recompute correct historical results, alongside a fast (but
approximate, less reliable) speed layer serving fresh results in the
meantime — the batch layer's recomputation is essentially a
continuously scheduled backfill baked into the architecture itself.

Kappa architecture answers the same need differently: instead of
maintaining a separate batch layer at all, it treats the log as the one
source of truth and handles reprocessing by simply ==replaying== that ^card-1hhh
log through the same stream processing code used for live traffic,
avoiding the need to maintain two separate codebases that must be kept
in behavioral sync.

Why does the Kappa architecture avoid the problem the Lambda architecture has of keeping batch-layer and speed-layer logic in behavioral sync? :: Because Kappa uses only one codebase — the same stream processing logic that handles live traffic is also used to reprocess history, simply by replaying the retained log through it again, so there's no second implementation that can drift from the first. ^card-drte

Backfilling in practice runs into constraints beyond picking a
strategy. Log or storage retention has to exceed however far back a
backfill might ever need to reach, or the raw input needed to recompute
that period is simply gone. A backfill job competes for the same compute
and I/O resources as the live pipeline it runs alongside, so an
unthrottled backfill can degrade production processing. And downstream
consumers may see results change underneath them as a backfill
completes, which is exactly why the pipeline's outputs should be
idempotent or explicitly versioned — so a consumer can tell it's looking
at a revised value rather than silently getting inconsistent numbers
across two reads of what looks like the same output.
