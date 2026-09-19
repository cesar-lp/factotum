---
topic: aws
category: aws-opensearch
tags: [shards, primary-replica, cluster-model, sharding]
citations: ["AWS Developer Guide — Amazon OpenSearch Service, 'Sizing Amazon OpenSearch Service domains'", "OpenSearch Documentation — 'Index sharding'"]
---

# Index, Shard, and Cluster Model

An OpenSearch **index** is a named collection of documents, but it is never
stored as one unit — it is split into **shards**, and the shard, not the
index, is the actual thing a node holds and a query runs against. This is
the same reflex as partitioning in `data-systems/partitioning.md`: fix the
number of shards upfront, and move whole shards between nodes rather than
resharding the key space every time the cluster changes size.

A ==primary shard== holds the authoritative copy of a slice of an index's ^card-54k9
documents; every document is routed to exactly one primary based on a hash
of its ID (or a custom routing value), so the number of primaries fixes how
finely the index's data and indexing load can be spread across nodes.

A ==replica shard== is a full copy of a primary, placed on a different ^card-a5ys
node, that serves read traffic and stands in as the new primary if the node
holding the original primary fails.

> [!card] mcq
> Why does OpenSearch route each document deterministically to one
> specific primary shard rather than a random one?
> - [x] So that a later request for that same document (get, update, delete) can be routed to the correct shard the same way, without asking every shard
> - [ ] To guarantee every shard has the same number of documents at all times
> - [ ] Because primary shards are read-only and only replicas accept writes
> - [ ] To avoid needing replica shards ^card-667w

A shard is the unit of both scale and failure: adding nodes only helps
throughput if there are enough shards to spread across them, and losing the
node holding a primary with no surviving replica loses that slice of data
outright, even though the rest of the index is untouched.

Why can't OpenSearch simply move a document from one primary shard to another to rebalance load, the way it moves whole shards between nodes? :: A document's shard assignment is derived by hashing its ID at index time, and that hash-to-shard mapping is fixed by the index's primary shard count; changing which shard a document belongs to would mean rehashing against a different shard count, which is exactly the operation that forces reindexing rather than a cheap rebalance. ^card-asnv

The number of ==primary shards== is set when an index is created and, on ^card-413h
the current generation of the engine, cannot be changed in place afterward
— growing or shrinking it requires creating a new index with the desired
count and reindexing all documents into it.

> [!card] recall
> A team creates an index with a small, fixed primary shard count expecting
> light traffic, then the index grows far larger than planned. Explain
> concretely why they cannot just "add more shards" to the existing index,
> and what operation they must perform instead. ^card-t5d3

Replica count, unlike primary count, ==can be changed== after an index ^card-ortb
exists, since adding or removing a replica is just copying or dropping a
full copy of an already-fixed set of primaries — no rehashing of documents
is involved.

What happens if an index is split into far more primary shards than its data volume actually needs? :: Each shard carries fixed per-shard overhead in the cluster's metadata and in memory, so over-sharding a small index wastes resources and can degrade cluster performance even though no single shard is overloaded. ^card-zayx
