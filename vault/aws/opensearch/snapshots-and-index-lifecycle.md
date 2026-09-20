---
topic: aws
category: aws-opensearch
tags: [snapshots, index-state-management, hot-warm-cold, data-lifecycle]
citations: ["AWS Developer Guide — Amazon OpenSearch Service, 'Working with Amazon OpenSearch Service index snapshots'", "OpenSearch Documentation — 'Index State Management'"]
---

# Snapshots and Index Lifecycle Management

Two related but distinct disciplines keep an OpenSearch domain from either
losing data or drowning in it: snapshots protect against losing an index
outright, and index lifecycle policies decide how an aging index should be
treated (and eventually retired) while it still exists.

A ==snapshot== is a point-in-time backup of one or more indexes, or of an ^card-iwe8
entire cluster, restorable into a new or existing cluster.

It is taken incrementally — only data changed since the previous one is
copied — and it is the recovery path for cluster-level failures that
replicas alone can't fix, such as a bad deletion or an unrecoverable
cluster state.

> [!card] mcq
> Why do replica shards not make snapshots unnecessary?
> - [x] Replicas protect against a single node's hardware failure, not against logical mistakes (like an accidental delete) or a cluster-wide failure, both of which get copied to every replica just as reliably as to the primary
> - [ ] Replicas already are incremental snapshots under a different name
> - [ ] Snapshots are only useful for moving data between unrelated regions, never for recovery
> - [ ] Because replica shards are disabled while snapshots run ^card-kixy

Index State Management (ISM) automates what happens to an index as it
ages, moving it through a sequence of ==states== (commonly hot, warm, and ^card-je1o
cold) with different actions triggered on transition — such as reducing
replica count, moving to cheaper storage, or eventually deleting the
index — instead of an operator manually managing each index's lifecycle
by hand.

A **hot** state keeps an index on fast storage with its normal replica
count, suited to indexes still receiving writes and frequent queries; a
**warm** state typically reduces replica count and may move data to
cheaper storage for indexes that are read-only but still queried
occasionally; a **cold** state moves data to the cheapest available
storage for indexes kept mostly for compliance or rare lookups, trading
query latency for cost.

Why does it make sense to roll time-series data (e.g. one index per day of logs) through hot, warm, and cold states rather than keeping every day's index in the same configuration? :: Recent data is written to and queried heavily, so it needs fast storage and full replica count, but as an index ages, both its write and query rates drop toward zero — keeping it on the same expensive, fully-replicated configuration indefinitely wastes resources on data that is rarely touched, so shifting it to progressively cheaper storage as its access pattern cools matches cost to actual usage. ^card-bmfi

> [!card] recall
> Explain why index lifecycle policies are usually built around whole
> indexes (e.g. one index per day or per week) rather than applied to
> individual documents within a single long-lived index. ^card-o34m

An ISM policy transitions an index between states based on a condition —
most commonly the index's ==age== since creation or rollover, though a ^card-5nbc
size or document-count threshold can also trigger a transition — and each
state can define its own set of actions to run once entered.

What risk does deleting the only snapshot repository configuration, or letting snapshot creation silently fail, create for an ISM policy that eventually deletes cold indexes? :: If a cold index is deleted by policy before a valid snapshot of it exists, that data is unrecoverable — snapshots and lifecycle deletion are two independent mechanisms, and ISM does not automatically verify a snapshot succeeded before allowing an index to reach a delete action, so the two must be deliberately coordinated rather than assumed to cooperate. ^card-7tjn
