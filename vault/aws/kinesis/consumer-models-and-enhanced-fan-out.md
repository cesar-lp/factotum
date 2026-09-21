---
topic: aws
category: aws-kinesis
tags: [kinesis, consumers, enhanced-fan-out, subscribetoshard, throttling]
citations: ["Amazon Kinesis Data Streams Developer Guide — 'Developing Consumers with Enhanced Fan-Out'"]
---

# Consumer Models and Enhanced Fan-Out

`streams-shards-and-partition-keys.md` established that a shard's read
side caps out at 2 MB/s and that this budget is shared across every
standard consumer reading it. This note is about what "shared" actually
costs you, and the mechanism Kinesis offers when it costs too much.

A **standard consumer** reads by calling `GetRecords` in a loop —
polling. Every standard consumer attached to a shard draws from the same
2 MB/s output budget, so adding a second consumer doesn't give it its own
2 MB/s: it makes the first consumer and the new one split the shard's one
allowance between them.

This is the ==shared== nature of standard-consumer throughput — the ^card-baxj
budget belongs to the shard, not to any one reader, and it does not grow
because a new reader shows up wanting a slice of it.

That single fact explains a recurring production surprise: a healthy
pipeline with one consumer starts throttling the moment a second team
adds a debugging or analytics reader to the same stream, with no change
to producers or record volume at all.

Why did adding a third reader to an already-healthy Kinesis stream cause every consumer, including the original two, to start throttling — with no change in producer volume? :: Because standard-consumer read throughput is a fixed 2 MB/s budget per shard shared across all standard consumers on it, not 2 MB/s granted per consumer; a third reader doesn't add capacity, it just divides the same fixed budget three ways instead of two, so everyone's effective share shrinks. ^card-8gjf

> [!card] mcq
> A shard is being read by two standard consumers, each already close to
> its throughput ceiling. What happens when a third standard consumer
> starts polling the same shard?
> - [x] All three now compete for the same fixed 2 MB/s, so each one's effective throughput drops and throttling becomes likely
> - [ ] Nothing changes, since GetRecords calls don't count against a shared limit
> - [ ] Kinesis automatically reshards to add capacity for the new consumer
> - [ ] Only the newest consumer is throttled, since it has the lowest priority ^card-vo02

When a standard consumer's share of that budget is exhausted, its
`GetRecords` calls start failing with a
`ProvisionedThroughputExceededException`. The instinctive fix — poll
faster, to make sure you get your share before someone else does — makes
things strictly worse: more frequent `GetRecords` calls don't create more
read bandwidth, they just add more contention for the same fixed budget,
pushing every consumer on the shard further past it.

**Enhanced fan-out (EFO)** removes the sharing entirely: each consumer
that registers for EFO gets its own dedicated 2 MB/s per shard, entirely
separate from the standard-consumer pool and from every other registered
EFO consumer.

EFO also changes the delivery model, not just the budget. A standard
consumer *pulls* by calling `GetRecords` on its own schedule; an EFO
consumer *pushes*, subscribing once via `SubscribeToShard` and then
having records delivered to it over an ==HTTP/2== stream as they arrive, ^card-d87s
without it having to ask again.

> [!card] mcq
> What operational difference does `SubscribeToShard` create compared to `GetRecords`, beyond giving each consumer its own throughput budget?
> - [x] Records are pushed to the consumer over a persistent HTTP/2 stream as they arrive, rather than the consumer polling for them on its own interval
> - [ ] SubscribeToShard eliminates the need for checkpointing entirely
> - [ ] SubscribeToShard reads from all shards in the stream with a single call
> - [ ] SubscribeToShard is only available for streams in on-demand capacity mode ^card-ghrd

Push delivery over a live stream, rather than a polling loop, is also why
EFO cuts latency the way it does: a standard consumer's freshness is
bounded by how often it happens to call `GetRecords`, while an EFO
consumer sees new records roughly ==70 ms== after they're written, ^card-25rx
because there's no polling interval to wait out.

That combination — dedicated throughput per consumer, delivered with
much lower latency — is not free, and the pricing model makes clear it's
a deliberate choice rather than a default worth reaching for on every
stream: EFO bills per registered consumer-shard-hour, plus a charge for
the data it retrieves, on top of whatever the stream itself already
costs. A stream with five EFO consumers pays that per-consumer charge
five times over, once per shard, every hour, whether or not each
consumer is busy.

Why is enhanced fan-out described as "a deliberate purchase, not a default," when it clearly solves the shared-throughput problem? :: Because it's billed per registered consumer per shard per hour, plus data retrieval — the cost scales with both the number of consumers and the number of shards, so registering several EFO consumers on a large stream can materially raise the bill even when none of them individually needs the low latency, making it a cost worth reasoning about rather than something to enable reflexively for every reader. ^card-iqlp

> [!card] recall
> A team has three standard consumers reading the same stream and is
> hitting `ProvisionedThroughputExceededException` on all of them.
> Explain why simply switching all three to enhanced fan-out fixes the
> throttling, and what new cost consideration that switch introduces that
> polling more standard consumers never had. ^card-ewuq
