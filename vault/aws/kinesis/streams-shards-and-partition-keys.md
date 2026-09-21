---
topic: aws
category: aws-kinesis
tags: [kinesis, shards, partition-key, throughput]
citations: ["Amazon Kinesis Data Streams Developer Guide — 'Shard'"]
---

# Streams, Shards, and Partition Keys

Every other note in this category is really about one idea: a Kinesis
stream is an ordered, replayable log, but that log is not one thing — it
is split into **shards**, and the shard is the unit of everything that
matters. Capacity, ordering, and parallelism are all decided at the shard
level, not the stream level, so understanding shards is the prerequisite
for reasoning about producers, consumers, resharding, or throttling.

A shard's limits are fixed and worth knowing exactly, because they drive
almost every design decision downstream. A single shard accepts up to
==1 MB== of data per second on write, or ==1,000== records per second, ^card-4hpz
^card-iblr
whichever limit is hit first.

On the read side, a shard supports up to 2 MB/s of output, and that
capacity is ==shared== across every standard (non-fan-out) consumer ^card-joep
reading it — three consumers polling the same shard split that same 2
MB/s three ways, not 2 MB/s each.

Why does adding more producers writing to the same shard never raise that shard's throughput ceiling? :: The limit is enforced per shard, not per producer or per connection — every producer writing to a given shard shares the same 1 MB/s or 1,000 records/s budget, so more producers just divide the existing ceiling rather than raising it. ^card-dhjj

A stream's total capacity is just the sum of its shards' capacity, so
scaling a stream means adding shards (covered in
`resharding-and-capacity-modes.md`), not raising a per-shard limit that
does not exist to raise.

Every record carries a **partition key**, a string the producer supplies,
and Kinesis hashes it to decide which shard the record lands on. That one
hash does double duty, and the two things it controls are in direct
tension with each other: it determines which records end up *mutually
ordered* (only records that land on the same shard are ordered relative
to each other), and it determines whether *load spreads evenly* across
the stream's shards.

> [!card] mcq
> A stream has 20 shards. A producer sends every record with the
> partition key `"US"`, `"CA"`, or `"MX"` — a customer's country. What
> happens to write throughput as volume grows?
> - [x] Throughput is capped near the limit of a single shard, since only three distinct keys can ever hash to at most three shards, no matter how many shards the stream has
> - [ ] Throughput scales with the stream's full 20-shard capacity, since Kinesis load-balances any key across all shards
> - [ ] Kinesis automatically detects the skew and reassigns extra shards to the hot keys
> - [ ] Throughput is unaffected, because partition keys only affect ordering, not shard placement ^card-inhg

A key with only a handful of distinct values — a country, an account
tier, an order status — concentrates almost all traffic on whichever few
shards those values happen to hash to, throttling the stream at a
fraction of its provisioned capacity no matter how many shards it has.
The opposite extreme, a random or unique key per record, spreads load
perfectly evenly — and in doing so destroys the very ordering guarantee a
partition key might have been chosen to provide, since two records for
the same logical entity (say, the same user) can now land on different
shards with no ordering relationship at all.

Why can't a stream with many distinct partition-key values ever go fully idle-throttled the way a low-cardinality key can, yet also not guarantee any ordering between two records for the same entity? :: High cardinality spreads records across most or all shards, so no single shard absorbs a disproportionate share of traffic — but spreading also means two records sharing a logical entity are no longer guaranteed to hash to the same shard, and ordering only holds within a shard, so records for that entity can arrive out of order relative to each other. ^card-xi6m

Choosing a partition key is therefore a real trade-off, not a default to
accept without thinking: pick a key granular enough to spread load, but
still coarse enough that the records that *must* stay ordered relative to
each other (typically, all records for one entity) always hash together.
A user id or device id is usually the right granularity — fine enough to
spread across many shards, coarse enough to keep one user's events
ordered.

Within a shard, each record gets a **sequence number**, a monotonically
increasing value Kinesis assigns at write time that marks the record's
position in that shard's log.

> [!card] recall
> Explain why a Kinesis record is addressed by the pair (shard id,
> sequence number) rather than by a single global offset the way you
> might expect from a simpler log design.
> ---
> There is no single log — a stream is a collection of independently
> ordered shards, each with its own sequence-number space starting from
> its own creation. A sequence number only has meaning relative to the
> shard that issued it; the same number could exist in two different
> shards and refer to two unrelated records. A consumer must therefore
> always know which shard it is reading before a sequence number tells
> it anything, which is exactly why consumer state is tracked per shard,
> never per stream. ^card-7vvz

Does a Kinesis sequence number identify a record uniquely on its own, without knowing which shard it belongs to? :: No — a sequence number is only unique and meaningful within its own shard; the same numeric value has no relationship to a record with that number in a different shard, so a record is only fully addressed by the pair of shard id and sequence number. ^card-ov6a
