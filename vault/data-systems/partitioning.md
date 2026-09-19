---
category: data-systems
tags: [partitioning, sharding, hot-spots, rebalancing]
citations: ["Kleppmann, Designing Data-Intensive Applications, Ch. 6"]
---

# Partitioning

Partitioning (sharding) splits a large dataset across many nodes so that
each node holds only a subset, allowing both storage and query throughput
to scale beyond what a single machine can hold. Partitioning is usually
combined with replication, so each partition itself has multiple copies
spread across nodes for fault tolerance.

**Key-range partitioning** assigns each partition a contiguous range of
keys, which keeps range queries fast (a scan over a key range touches few
partitions) but risks a **hot spot** if the access pattern concentrates
writes on keys that are close together, such as sequentially increasing
timestamps.

> [!card] mcq
> A table partitioned by key range uses an ever-increasing timestamp as
> its partition key. What problem does this cause?
> - [x] All writes for "now" land on the same partition, creating a hot spot even though the cluster has many nodes
> - [ ] Range queries become impossible because timestamps cannot be compared
> - [ ] The database refuses to accept timestamp keys
> - [ ] Storage usage decreases because timestamps compress extremely well ^card-dhrr

**Hash partitioning** applies a hash function to the key to choose its
partition, which spreads load much more evenly and avoids the hot-spot
problem key-range partitioning has, but sacrifices the ability to do
efficient range queries, since keys that were adjacent are now scattered
across partitions.

Hash partitioning distributes keys evenly but loses the ability to do
efficient ==range queries==, because adjacent keys in the original key ^card-0tbb
space no longer land on adjacent (or even nearby) partitions.

> [!card] mcq
> Why might a system deliberately use a compound key of (hashed portion,
> range portion) rather than hashing the entire key?
> - [x] It spreads unrelated records across partitions while still allowing efficient range scans within one logical group, e.g. all of one user's records sorted by timestamp
> - [ ] It eliminates the need for replication
> - [ ] It guarantees perfectly equal partition sizes at all times
> - [ ] It removes the need for a partitioning scheme entirely ^card-7j2l

Secondary indexes complicate partitioning because an indexed value
usually doesn't align with the primary partitioning key. A ==document-partitioned== ^card-34m1
(local) index keeps each partition's index covering only its own
documents, so a query on the secondary index must be sent to every
partition (scatter/gather); a term-partitioned (global) index partitions
the index itself by term, so a query can go to fewer partitions but
writes may need to update partitions other than the one holding the
document.

Rebalancing — moving data between nodes as the cluster grows or shrinks —
should ideally move a minimal amount of data and avoid an all-nodes
coordinated resharding. Fixing the number of partitions upfront (many
more than there are nodes) and moving whole partitions between nodes is a
common technique that avoids the pitfalls of "key range mod N" schemes,
which force nearly all keys to move when N changes.

> [!card] recall
> Explain why hashing a key modulo the number of nodes (`hash(key) % N`)
> is a poor rebalancing strategy when nodes are added or removed. ^card-rt9a

Request routing in a partitioned system needs a way for a client (or a
load balancer) to know which node currently owns a given partition; this
is commonly solved by an external coordination service (e.g. ZooKeeper)
that tracks partition assignment and notifies routing tiers when it
changes, keeping the assignment ==metadata== consistent across the ^card-3fqf
cluster.
