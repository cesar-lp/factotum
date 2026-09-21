---
topic: data-systems
category: data-processing
tags: [stream-processing, checkpointing, fault-tolerance, state-backends]
citations: ["Kleppmann, Designing Data-Intensive Applications, Ch. 11 (Stream Processing)"]
---

# Checkpointing, State, and Recovery

A batch job that crashes halfway through can simply be rerun on its
input — the input is a bounded file sitting on disk, unaffected by the
crash. A stream job cannot fall back on that: it runs indefinitely, so
failure over its lifetime is not a risk to plan for but a certainty, and
its input is not a static file but a position in an unbounded feed that
keeps moving whether or not the job is alive to consume it.

Worse, a stream job usually isn't stateless. A windowed aggregate holds
partial sums per window, a stream join holds buffered records waiting for
a match, a deduplication step holds a set of seen keys — all of it live
only in memory unless the job does something deliberate to preserve it.

The problem checkpointing solves is a pairing, and the pairing is the
whole point: a ==checkpoint== must capture both the operator state and ^card-shxs
the input offsets that state was computed from. State alone, without
knowing which records already produced it, cannot be resumed correctly —
recovery would either replay records the state already reflects
(double-counting them) or skip records it doesn't yet reflect (losing
them). The two halves have to agree on exactly one instant.

> [!card] mcq
> Why is it wrong to think of a stream processing checkpoint as "just a
> snapshot of the operator's state"?
> - [x] The state alone doesn't say which input records it already reflects; without the matching source offsets, recovery can't tell what to replay versus skip
> - [ ] Checkpoints only ever store offsets, never actual state, so this description is backwards
> - [ ] It's a correct description; offsets are an unrelated, optional detail
> - [ ] State snapshots are taken continuously, so there's no single instant to pair with an offset ^card-gtbh

Producing that paired snapshot across a job that may be spread over many
operators and many parallel instances is a distributed consistency
problem: naively asking every operator to snapshot "now" gives no
guarantee they all stop at corresponding points in the record stream,
since a record could be in flight between two operators when one has
already snapshotted and the other hasn't.

The common answer is a barrier (also called a marker) injected into the
stream itself rather than coordinated out of band. A barrier flows
through the topology exactly like a normal record, so it arrives at each
operator after everything that came before it and before everything
after. An operator snapshots its own state once it has seen the barrier
arrive on every one of its input channels — at that point it has
processed precisely the records up to the cut the barrier marks, no more
and no less. Because the barrier travels with the data instead of
requiring the pipeline to pause, this produces a globally consistent cut
==without stopping the world==: different operators snapshot at ^card-c7nz
different wall-clock moments, but all at the same logical point in the
stream.

Recovering from a failure means restoring the most recent checkpointed
state and rewinding the source to the offsets recorded alongside it, so
processing resumes from exactly the cut the barrier marked rather than
from wherever the source happens to be now.

That rewind step is only possible if the source can be rewound at all —
recovery of this kind requires a ==replayable== source, one that retains ^card-1r79
records and lets a consumer re-read from an arbitrary earlier offset (a
partitioned log is the standard example). A source that discards a
record once delivered, with no way to ask for it again, cannot support
this recovery model no matter how good the checkpointing is: the
operator state might be restored perfectly, but the records needed to
bring it back up to the present are simply gone. This is why the source's
own properties cap what guarantees the rest of the pipeline can offer,
regardless of how the processing layer is built.

Why does recovering a stream job require rewinding the source to a checkpointed offset, rather than just restoring the saved operator state and resuming from wherever the source currently is? :: Because the saved state reflects everything processed up to that checkpoint's offset. Resuming from the source's current position (which has moved on since the checkpoint, or is undefined after a crash) would either skip records the state doesn't yet reflect or reprocess ones it already does; only replaying from the exact recorded offset lines the state back up with the input it corresponds to. ^card-759f

Checkpoint frequency is a direct trade-off, not a knob to maximize:
frequent checkpoints add runtime overhead (pausing or coordinating work
to take the snapshot, plus the I/O to persist it), while infrequent
checkpoints mean more work must be reprocessed after a failure, since
recovery always rewinds to the *last* checkpoint, not to the moment of
failure. Shortening the interval trades steady-state throughput for a
shorter reprocessing tail; lengthening it does the reverse.

> [!card] recall
> A team doubles their stream job's checkpoint interval to cut
> steady-state overhead. Explain what this does to recovery time after a
> failure, and why the choice is a genuine trade-off rather than a free
> win.
> ---
> Doubling the interval means, on average, roughly twice as many records
> have arrived since the last checkpoint at the moment of any given
> failure, so recovery has to reprocess roughly twice as much input
> before catching back up to where the job was. It's a real trade-off
> because the saved overhead (less frequent snapshotting work) is paid
> for in expected reprocessing time — there's no interval that minimizes
> both simultaneously. ^card-t88j

For state too large to snapshot cheaply in full each time, engines pair a
durable ==state backend== (state is kept in something like an embedded ^card-ld67
key-value store on local disk, backed by a distributed filesystem or
object store, rather than only in memory) with incremental checkpointing,
which persists only the state that changed since the previous checkpoint
instead of writing the entire state again each time — turning checkpoint
cost from proportional to total state size into proportional to the
change since last time.

What problem does incremental checkpointing solve that a full-state checkpoint on every interval does not? :: It keeps checkpoint cost proportional to how much state changed since the last checkpoint rather than to the total size of all state, which matters once state grows large enough that re-serializing and writing the whole thing on every interval would dominate the job's overhead or make frequent checkpoints impractical. ^card-vtya
