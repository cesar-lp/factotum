---
topic: aws
category: aws-kinesis
tags: [kinesis, resharding, capacity-modes, scaling]
citations: ["Amazon Kinesis Data Streams Developer Guide — 'Resharding a stream'"]
---

# Resharding and Capacity Modes

`streams-shards-and-partition-keys.md` establishes the shard as the unit
of capacity; this note covers how the number of shards changes over
time, and the one fact about that process that breaks consumers who
don't know it.

A stream runs in one of two capacity modes. **Provisioned** mode means
you choose the shard count directly and pay per shard-hour regardless of
how much of that capacity you actually use. **On-demand** mode scales
shard count automatically in response to observed traffic and charges by
throughput consumed instead.

On-demand sounds strictly better, but provisioned earns its place for two
reasons that both come back to predictability: a known, fixed shard count
means a predictable bill, and it means you can reason concretely about
the per-shard limits from `streams-shards-and-partition-keys.md` — you
know exactly how much headroom a given key distribution has, rather than
depending on a scaling mechanism you don't directly control.

On-demand's scaling is ==reactive==, not anticipatory — it responds to ^card-12xq
traffic it has already observed, which means it cannot pre-provision for
a step change it has no way to see coming.

> [!card] mcq
> A team knows a marketing campaign will drive a 10x traffic spike at a
> specific hour tomorrow. The stream currently runs in on-demand mode.
> What is the risk of leaving it on-demand for that event?
> - [x] On-demand scales reactively after observing increased traffic, so the sudden spike can throttle requests before new capacity is added
> - [ ] On-demand mode cannot scale at all without a support ticket
> - [ ] There is no risk — on-demand always pre-allocates enough headroom for any spike
> - [ ] On-demand mode caps throughput permanently at the account's default limit ^card-p45f

Why is a known, scheduled traffic spike specifically an argument for switching to provisioned capacity rather than trusting on-demand mode? :: Because on-demand only scales in reaction to traffic it has already measured, so a sudden step change can outrun it and throttle briefly before it catches up — a known spike lets you provision the needed shard count in advance, which sidesteps that reaction lag entirely rather than relying on it to catch up in time. ^card-popf

Changing shard count — whether by hand in provisioned mode or
automatically in on-demand — happens through **resharding**, which is
built from two operations: a **split**, which divides one shard's hash
key range into two new shards, and a **merge**, which combines two
adjacent shards' ranges into one.

The fact that matters most about both operations: resharding does
==not== move existing data. A split closes the parent shard to further ^card-0xhr
writes and opens two child shards to take over its hash key range, but
every record already written to the parent stays exactly where it is
until it naturally expires under the stream's retention policy — nothing
is copied or migrated into the children.

> [!card] recall
> A shard is split into two children while a consumer is partway through
> reading records from the parent. Explain why that consumer must finish
> reading everything remaining in the parent before it starts reading
> either child, and what breaks if it doesn't.
> ---
> The parent shard still holds records that were written before the
> split, and those records keep their original relative order only
> within that parent. If the consumer jumps to a child shard early, it
> can read records that were written to that child after the split
> before it has read older records still sitting in the parent — for any
> partition key whose records happened to be mid-stream at split time,
> that reorders what the consumer sees relative to write order. Draining
> the parent fully first preserves the per-key ordering guarantee across
> the split; skipping ahead breaks exactly the guarantee resharding is
> supposed to leave intact. ^card-gndi

Does splitting a shard copy or move that shard's existing records into the two new child shards? :: No — a split only closes the parent to new writes and routes future writes for its key range to the two children; every record already in the parent stays in the parent until it expires under the stream's normal retention, with nothing migrated. ^card-v2hb

A shard that has been split or merged and no longer accepts writes is
**closed**; a shard currently accepting writes is **open**. A stream can
contain a mix of both at once, since closed parents remain readable until
their data expires while their open children handle new traffic.

Tracking which shards are closed, which are open, and in what order a
consumer must drain parents before children is exactly the bookkeeping
problem the Kinesis Client Library solves automatically through its
checkpointing model, detailed in
`the-kinesis-client-library-and-checkpointing.md` — a hand-rolled consumer
that ignores shard lineage is the most common way resharding silently
breaks ordering in production.

What state is a shard in once it has been split or merged and stopped accepting new writes, while its records remain readable until they expire? :: Closed — a closed shard is no longer written to but stays readable for the remainder of its retention window, and a stream routinely has both open and closed shards present at once during and after resharding. ^card-x7g4
