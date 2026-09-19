---
category: data-systems
tags: [replication, leader-election, read-your-writes, consistency]
citations: ["Kleppmann, Designing Data-Intensive Applications, Ch. 5"]
---

# Replication

Replication keeps a copy of the same data on multiple machines, usually
for higher availability, lower latency (serve nearby readers), and to
scale out read throughput. The three main approaches — single-leader,
multi-leader, and leaderless — differ mainly in how they decide which
node accepts writes and how writes propagate to the rest.

In **single-leader** replication, all writes go to one designated leader,
which then streams a change log to its followers; reads can be served by
the leader or, for scalability, by followers, at the cost of followers
potentially returning stale data.

> [!card] mcq
> What is the main risk of allowing followers to serve reads in a
> single-leader system?
> - [x] A follower may lag behind the leader and return stale data (replication lag)
> - [ ] Followers cannot serve reads under any circumstances
> - [ ] Follower reads always corrupt the underlying data file
> - [ ] The leader stops accepting writes whenever a follower serves a read ^card-hf3l

Replication can be ==synchronous== (the leader waits for a follower to ^card-b8zh
confirm before acknowledging the write to the client) or asynchronous
(the leader acknowledges immediately without waiting). Fully synchronous
replication to all followers would make the system unavailable if any one
follower is slow or down, so real systems typically use synchronous
replication to just one follower ("semi-synchronous") and async to the
rest, or go fully async and accept possible data loss on leader failure.

**Read-your-writes** consistency guarantees a user sees their own prior
writes on a subsequent read, even if that read is served by a lagging
replica; without it, a user could submit a write and immediately not see
it reflected because the read hit a follower that hasn't caught up yet.

> [!card] mcq
> Which technique can provide read-your-writes consistency in a
> single-leader system with asynchronous followers?
> - [x] Route reads for recently-written data (e.g. the user's own record) to the leader, or track a version/timestamp and wait for the follower to catch up to it
> - [ ] Disable replication entirely so only one copy of the data exists
> - [ ] Always serve reads from the follower with the most free disk space
> - [ ] Increase the leader's write-ahead log buffer size ^card-opfv

Read-your-writes is a guarantee about a single user seeing their own
prior writes; it does NOT guarantee that ==different users== observe ^card-9zi8
writes in the same order, which is a separate property (monotonic reads,
or consistent prefix reads) that read-your-writes alone does not provide.

**Multi-leader** replication allows more than one node to accept writes
(often one leader per datacenter), which improves write availability
across regions but introduces the possibility of concurrent, conflicting
writes to the same data that must be resolved somehow.

> [!card] mcq
> What distinguishes leaderless replication (as in Dynamo-style systems)
> from single-leader or multi-leader replication?
> - [x] Clients (or a coordinator) send writes to several replicas directly, with no designated leader deciding write order
> - [ ] There is no replication at all; only a single copy of the data exists
> - [ ] Leaderless systems never allow concurrent writes to different keys
> - [ ] Leaderless systems require all replicas to be perfectly synchronous ^card-5xzp

In leaderless replication, a client typically writes to and reads from
several replicas and considers the write successful once a ==quorum== of ^card-ous0
replicas acknowledges it, rather than waiting for every replica.

What does "conflict resolution" have to address specifically in multi-leader or leaderless replication that single-leader replication avoids by construction? :: Two writes to the same key made concurrently at different leaders (or different replicas), where neither logically "happened after" the other, so the system must decide how to merge or pick a winner — single-leader avoids this because all writes are serialized through one leader. ^card-b7db
