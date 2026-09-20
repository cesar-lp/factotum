---
topic: aws
category: aws-dynamodb
tags: [dynamodb, consistency, eventual-consistency, replication]
citations: ["AWS Developer Guide — Amazon DynamoDB, 'Read consistency'"]
---

# Consistency and Read Modes

Replication lag is the gap between a write landing on a leader and that
write becoming visible to a reader served by a follower. DynamoDB
replicates every item across multiple storage nodes for durability, and
exposes that same gap directly to callers as a choice they make on
every read request.

An ==eventually consistent read== may be served by any replica of the ^card-pjg3
data, including one that has not yet applied the most recent write; it
can return a stale value, but it is the cheaper option and is DynamoDB's
default read mode.

A ==strongly consistent read== is routed so that it only ever returns ^card-vs9k
the result of all writes that completed successfully before it began —
it never observes stale data, but at the cost of being routed more
narrowly and being unavailable to a read request made against a global
secondary index.

> [!card] mcq
> Why can a query against a global secondary index never be strongly
> consistent in DynamoDB?
> - [x] A GSI's entries are propagated to it asynchronously from the base table, so there is no way to route a read that is guaranteed to have seen the very latest base-table write
> - [ ] GSIs do not support the ConsistentRead parameter at all in any form
> - [ ] Strongly consistent reads are only possible on tables without any indexes
> - [ ] AWS disables strong consistency to save storage costs ^card-7mfx

This mirrors the standard framing of read-your-writes consistency:
routing a read to the ==leader== (or, in DynamoDB's case, ^card-m16h
to whichever replica is authoritative for that item) is what guarantees
seeing your own prior write, at the cost of that read no longer being
spreadable across every replica the way a stale-tolerant read is.

What is the cost of always choosing strongly consistent reads over eventually consistent ones, even though both return correct data once the system has caught up? :: A strongly consistent read must be routed more narrowly (effectively to the authoritative copy) rather than load-balanced across any available replica, and it can be refused or delayed on a partition that is temporarily unavailable — trading some of the availability and throughput headroom that eventually consistent reads get from being served by whichever replica answers fastest. ^card-in4i

Why does DynamoDB default to eventual consistency rather than strong consistency? :: Eventually consistent reads can be served by any replica, which spreads load more evenly and tolerates a temporarily unreachable replica without failing the read; most application reads can tolerate a brief staleness window, so defaulting to the more available, more distributable option and letting callers opt into strong consistency only where correctness demands it is the better tradeoff for the common case. ^card-mqyl

An application should reach for strong consistency specifically where
reading a value immediately after writing it is part of the logic — for
instance, reading back an item right after a conditional write to decide
what to do next — and accept eventual consistency everywhere staleness
of a fraction of a second genuinely doesn't matter, such as populating a
dashboard.

> [!card] recall
> Explain the connection between DynamoDB's eventually-consistent-by-
> default read mode and the read-your-writes guarantee. Why does asking
> for a strongly consistent read solve the same problem that routing
> reads to the leader solves in a single-leader replicated system? ^card-0ndg
