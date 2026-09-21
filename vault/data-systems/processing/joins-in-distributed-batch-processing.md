---
topic: data-systems
category: data-processing
tags: [joins, shuffle, broadcast-join, sort-merge-join, batch-tuning]
citations: ["Kleppmann, Designing Data-Intensive Applications, Ch. 10 (Batch Processing)"]
---

# Joins in distributed batch processing

`mapreduce-and-the-shuffle.md` establishes that the shuffle, not the map
or reduce logic, is where a batch job's cost lives. A join is the
clearest case of this: what looks like an algorithm problem — matching
records that share a key — is really a data-movement problem, because a
single-machine join only works once the matching records are sitting on
the same machine, and getting them there is the entire difficulty at
distributed scale.

The general-purpose method is the sort-merge join, also called a
==reduce-side== join: both input datasets are partitioned and sorted by ^card-w189
the join key so that matching records from either side land on the same
reducer, which can then walk both sorted streams together and emit
matches. It works regardless of the size of either input, which is what
makes it the default, but it pays for that generality by shuffling both
datasets across the network in full.

> [!card] mcq
> What is the defining cost of a sort-merge (reduce-side) join, and why
> is it still the fallback join strategy despite that cost?
> - [x] It shuffles both entire input datasets across the network, but it works correctly regardless of the size or existing layout of either side, unlike the optimizations built on top of it
> - [ ] It requires a global lock across all reducers, but it uses the least memory of any join strategy
> - [ ] It only works when both inputs are already sorted, but it uses no network at all
> - [ ] It duplicates every record onto every node, but it needs no shuffle phase ^card-12sq

The much cheaper case is when one side of the join is small enough to
fit comfortably in memory on every node. A **broadcast hash join**
(map-side join) sends the small dataset to every node in full and builds
an in-memory hash table from it there; each map task then streams through
its portion of the large dataset, probing the hash table locally, with no
shuffle at all. Recognizing this case — "is one side small enough to
broadcast?" — is usually the single biggest lever in tuning a batch job,
because it removes the network transfer of the large dataset entirely
rather than merely making it faster.

> [!card] recall
> A batch job joins a 2 TB event log against a 40 MB table of currency
> exchange rates. Explain which join strategy applies here and why it
> avoids the cost a sort-merge join would pay, and name the one condition
> that has to hold for it to be safe to use.
> ---
> This calls for a broadcast (map-side) hash join: the 40 MB exchange-rate
> table is small enough to fit in memory, so it can be sent to every node
> and built into a local hash table, letting each map task join its slice
> of the 2 TB log locally with zero shuffle of the large side. A
> sort-merge join would instead shuffle both the 2 TB log and the small
> table across the network to bring matching keys together — vastly more
> data movement for no benefit here. The condition is that the small side
> genuinely fits in the memory available on each node; if it doesn't, the
> broadcast itself becomes the bottleneck. ^card-8r84

Recognizing when one side of a join is small enough to broadcast, rather ^card-knyr
than shuffling both sides through a sort-merge join, is usually the
single biggest win available in tuning a batch job's join. :: Because it eliminates network transfer of the large dataset entirely rather than merely reducing it — a sort-merge join still has to move every record of both inputs, while a successful broadcast join moves only the small side, once, to every node.

There is a third case: when both datasets were already produced with the
==same== partitioning scheme by an earlier stage — using the join key — ^card-8t8q
a partitioned hash join can join corresponding partitions independently,
with no shuffle needed at all.

This achieves the same shuffle-free result as a broadcast join, but for a
completely different reason: a broadcast join avoids the shuffle because
one side is small, while a partitioned hash join avoids it because the
data was already laid out correctly beforehand.

> [!card] mcq
> Both a broadcast hash join and a partitioned hash join can avoid a
> shuffle entirely. What is the key difference in why each one can?
> - [x] Broadcast join avoids the shuffle because one side is small enough to replicate everywhere; partitioned hash join avoids it because both sides are already partitioned identically by the join key, regardless of either side's size
> - [ ] They avoid the shuffle for the same reason — both require one side to be small enough to fit in memory
> - [ ] Broadcast join requires pre-partitioned data; partitioned hash join requires a small side
> - [ ] Neither actually avoids the shuffle; both only reduce its size ^card-kiod

The decision between these three comes down to two questions asked
before the job runs: is either input small enough to fit in memory on a
single node, and if not, are both inputs already partitioned identically
by the join key from an earlier stage? Sort-merge join is the answer only
when both questions come back no — it is the correct default specifically
because it makes no assumption about size or existing layout, at the
price of always paying for the full shuffle.

The specific schemes available for partitioning a dataset by key, and the
tradeoffs between them, are covered in `../partitioning.md` rather than
here.

> [!card] mcq
> A batch job joins a 500 GB table against another 480 GB table; neither
> fits in memory, and neither was produced with matching partitioning.
> Which join strategy applies?
> - [x] Sort-merge (reduce-side) join — neither the broadcast nor the partitioned-hash preconditions hold, so the general-purpose method that shuffles both sides is the only one that is correct here
> - [ ] Broadcast hash join, sending the smaller of the two tables to every node
> - [ ] Partitioned hash join, since both tables are roughly the same size
> - [ ] No join strategy works at this scale without pre-aggregating one side first ^card-grbm
