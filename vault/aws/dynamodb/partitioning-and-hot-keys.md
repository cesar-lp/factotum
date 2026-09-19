---
topic: aws
category: aws-dynamodb
tags: [dynamodb, partitioning, hot-partition, key-design]
citations: ["AWS Developer Guide — Amazon DynamoDB, 'Partitions and data distribution'"]
---

# Partitioning and Hot Keys

`data-systems/partitioning.md` describes hash partitioning in the
abstract: apply a hash function to the key, use it to pick a partition,
and trade away range-query locality for even load distribution.
DynamoDB is a concrete instance of exactly that tradeoff, built into a
managed service where the partition key is the one modeling decision an
application team controls.

DynamoDB hashes an item's partition key value to determine which
physical partition stores it, then spreads a table's partitions across
many nodes.

Overall table throughput scales with the ==number of partitions== in ^card-46x1
use, not with the capacity of any single machine — which is exactly why
one partition absorbing a disproportionate share of traffic caps the
whole table's effective throughput at what that one partition can push.

A ==hot partition== is a partition that receives a disproportionate share ^card-bqr2
of a table's traffic relative to the others, because many requests hash
to the same partition key value (or a small set of them) at once.

Why does hashing the partition key not, by itself, prevent a hot partition? :: Hashing only determines *which* partition an item lands on; it does nothing about *how many* requests target that same key value. If the application's traffic itself is skewed — one popular item, a small config table, a low-cardinality status field used as the key — every one of those requests hashes to the same partition regardless of how well-distributed the hash function is. ^card-5ox9

> [!card] mcq
> Which partition key design is most likely to create a hot partition in DynamoDB?
> - [x] A status field with only a handful of possible values (e.g. "PENDING", "DONE") used as the sole partition key
> - [ ] A randomly generated UUID used as the sole partition key
> - [ ] A composite key combining a high-cardinality user ID with a timestamp sort key
> - [ ] A partition key value that includes a random numeric suffix ^card-u1f1

This is the same failure mode `data-systems/partitioning.md` names for
key-range partitioning under a monotonically increasing key — sequential
IDs or timestamps concentrating writes on one range — except DynamoDB's
hash partitioning trades that particular failure away only to reintroduce
a version of it whenever the key values themselves have ==low ^card-n1k5
cardinality== or skewed access frequency.

The standard fix is to design the partition key around a high-cardinality
attribute — something with many distinct values spread evenly across
requests — and, when the natural key is low-cardinality, to append a
calculated suffix (such as a hash of another attribute) to spread one
logical entity's traffic across several physical partition key values.

What technique lets a single logical entity's traffic spread across multiple physical partitions when its natural key has too few distinct values? :: Appending a calculated suffix to the natural key — for example a random or hashed value — so requests that would otherwise all target one partition key value are distributed across several, then fanning out reads across those suffixed values and merging the results in the application. ^card-7kpl

DynamoDB does absorb some of this for you. ==Adaptive capacity== is ^card-g1xn
always on, needs no opt-in, and can shift throughput toward a struggling
partition — even isolating a single very hot item onto a partition of its
own.

It is not a substitute for key design, though: it can only lift a
partition up to the per-partition ceiling, so an access pattern that
concentrates hard enough on one key value still throttles. Treat it as
headroom that buys time, not as a fix.

> [!card] recall
> `data-systems/partitioning.md` notes that key-range partitioning risks
> hot spots from sequential keys while hash partitioning avoids that
> specific problem. Explain why DynamoDB's hash-based partitioning is not
> immune to hot partitions in general, and connect the failure mode back
> to the "access pattern concentrates" framing that note uses for
> key-range partitioning. ^card-z8t6
