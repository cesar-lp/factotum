---
topic: aws
category: aws-kinesis
tags: [kinesis, kcl, checkpointing, leases, dynamodb]
citations: ["Amazon Kinesis Data Streams Developer Guide — 'Developing Consumer Applications with the Kinesis Client Library'"]
---

# The Kinesis Client Library and Checkpointing

`consumer-models-and-enhanced-fan-out.md` covers how a consumer reads a
shard's records; this note covers what it takes to consume an entire
*stream* correctly across many shards and many worker processes without
losing or duplicating work. Nobody wants to solve that from scratch, and
the **Kinesis Client Library (KCL)** exists so nobody has to: it handles
discovering shards, assigning them across a fleet of workers, tracking
how far each shard has been processed, and — the part that's easy to get
wrong by hand — respecting shard lineage after a reshard.

Coordinating which worker owns which shard is done through a **lease
table**, a DynamoDB table the KCL creates and manages, with one lease
item per shard held by exactly one worker at a time. This means the
KCL's own coordination state is not free or invisible: it's a table you
provision and pay for like any other DynamoDB table, and if it gets
throttled, consumption across the whole application can stall in a way
that looks, from the outside, like a Kinesis problem when the fault is
entirely in that supporting table.

Why might a Kinesis consumer built on the KCL appear to stop processing records even though the stream itself is healthy and well within its throughput limits? :: Because the KCL coordinates shard ownership through a DynamoDB lease table, and if that table is under-provisioned or throttled, workers can't acquire, renew, or update leases — stalling consumption in a way that has nothing to do with the stream's own capacity and everything to do with the lease table's. ^card-5zc8

**Checkpointing** is a worker recording, per shard, the sequence number
of the last record it has finished processing — the durable bookmark
that lets it (or whichever worker inherits the shard next) resume from
the right place instead of from the beginning.

> [!card] mcq
> Where does the KCL store a worker's checkpoint progress for a shard?
> - [x] In the same DynamoDB lease table used for shard-ownership coordination
> - [ ] In the Kinesis stream itself, as a special marker record
> - [ ] In a separate S3 object per shard
> - [ ] In memory only, recovered by replaying from TRIM_HORIZON on restart ^card-6ps8

Checkpointing sits on a real trade-off, and there's no setting that
avoids it: checkpoint after every single record and you multiply writes
against that same lease table, potentially throttling it the way the
card above describes; checkpoint too infrequently and a worker crash
forces the shard's next owner to reprocess everything back to the last
checkpoint, however far behind that was.

Why is there no checkpoint frequency that eliminates both reprocessing risk and lease-table load at once? :: The two costs move in opposite directions along the same dial — checkpointing more often shrinks how much gets reprocessed after a crash but increases the write volume against the lease table (risking the throttling described above), while checkpointing less often reduces that write load but widens the window of work a crashed worker's successor has to redo; there is no frequency that minimizes both simultaneously, only a point chosen for the workload's tolerance for each. ^card-xxkd

Because a worker can crash between finishing a record and recording its
checkpoint, the same record can be handed to the next worker and
processed again — which is exactly why Kinesis consumption via the KCL
is ==at-least-once== delivery, and why the processing logic itself has ^card-ns7y
to be written to tolerate seeing a record more than once.

> [!card] recall
> Explain why "the KCL checkpoints for you" does not, by itself, make a
> consumer's downstream writes safe to run without additional care, given
> that a crash can occur between processing a record and checkpointing
> it.
> ---
> A checkpoint only marks progress after the fact — it can't make the gap
> between "processed" and "checkpointed" atomic with whatever side effect
> the record caused. If a worker crashes in that gap, the next owner
> resumes from the last checkpoint and reprocesses the record, so the
> record's effect (a write, a message sent) can happen twice. The KCL
> guarantees the record isn't lost; it does not and cannot guarantee the
> record's downstream effect only happens once — that has to be built
> into the processing logic itself, the way idempotency is described for
> queue consumers. ^card-xvwl

When workers join or leave the fleet, the KCL performs a **rebalance**:
redistributing shard leases across the current set of workers so the
load stays roughly even without any shard going unowned.

A rebalance after a reshard follows one strict rule that would be easy to
violate by hand: the KCL always finishes processing a ==parent== shard ^card-gbk2
completely before it will assign out either of its two children to any
worker.

What ordering guarantee does the KCL enforce across a reshard, and why does it matter? :: It fully finishes a parent shard before assigning either of its child shards to a worker, which preserves the sequential ordering a stream promises within a partition key's lineage — without this rule, a worker could start consuming a child shard's records while records still sit unprocessed on the parent, and since the child's records are logically downstream of the parent's, they'd be seen out of order. ^card-69y2
