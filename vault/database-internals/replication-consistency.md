---
topic: database-internals
category: database-internals
tags: [quorums, read-repair, hinted-handoff, crdt, tunable-consistency]
citations: ["Petrov, Database Internals, Ch. 11-12"]
---

# Quorums and Tunable Consistency

In a leaderless replicated system with N replicas, a client can require
a write to be acknowledged by W replicas and a read to be answered by R
replicas before proceeding; choosing W and R lets an application tune
its own tradeoff between consistency and latency/availability per
operation, rather than the whole system having one fixed policy.

If ==W + R > N==, every read quorum and every write quorum are guaranteed ^card-72wa
to overlap in at least one replica, so at least one replica in any read
quorum must have seen the most recent write — this is what a "quorum"
read/write setup is built to guarantee, though it does not by itself
guarantee that replica's value is recognized as the newest without
version information.

> [!card] mcq
> Why does the condition W + R > N matter for a quorum-based system?
> - [x] It guarantees any read quorum and any write quorum share at least one common replica, so a read can always reach a replica that has the latest acknowledged write
> - [ ] It guarantees the system will never accept a write during a network partition
> - [ ] It guarantees every replica is always fully up to date at all times
> - [ ] It has no effect on consistency, only on write latency ^card-w8zx

Even with W + R > N satisfied, a read quorum can still return values at
different versions from different replicas (since replication is
typically asynchronous); the client or coordinator must compare version
metadata (e.g. vector clocks or timestamps) across the returned values
to determine which is actually newest, and **read repair** pushes that
newest value back out to any replica in the quorum that was caught
holding a stale version.

What does read repair do, and when does it happen? :: During a quorum read, when the coordinator notices that some replicas in the read quorum returned an older version than others, it writes the newest version back to the stale replicas — repairing that specific piece of divergence as a side effect of the read, rather than waiting for a separate background process. ^card-4itb

**Hinted handoff** lets a write succeed even when one of its target
replicas is temporarily unreachable: another node accepts the write on
that replica's behalf, stores a "hint" recording who it was really meant
for, and forwards it once the original replica comes back — this trades
a short window of reduced redundancy for keeping writes available during
a transient failure, rather than blocking or rejecting the write outright.

> [!card] mcq
> What problem does hinted handoff address?
> - [x] Letting a write still succeed and reach its intended replica eventually, even when that replica is temporarily unreachable at write time
> - [ ] Detecting which replica holds the most recent version of a key
> - [ ] Permanently resolving conflicting concurrent writes to the same key
> - [ ] Reducing the network bandwidth used by replication traffic ^card-cmhr

**CRDTs** (conflict-free replicated data types) are data structures
designed so that concurrent, independent updates made on different
replicas can always be merged deterministically into the same final
value, without coordination between replicas at write time. It is
important to be precise about what this buys: CRDTs guarantee
==convergence== — every replica eventually reaches the same state — not ^card-xvyt
that conflicting updates are avoided or that the merged result matches
what either writer "intended"; a merge of two concurrent counter
increments, for instance, still has to define a specific (and sometimes
surprising) rule for what the merged value becomes.

> [!card] mcq
> What guarantee do CRDTs actually provide?
> - [x] That replicas which have seen the same set of updates will deterministically converge to the same value, regardless of the order updates were applied
> - [ ] That concurrent writes to the same field can never happen
> - [ ] That merged values always match the intent of every concurrent writer
> - [ ] That a single global lock coordinates all writes across replicas ^card-9vow

> [!card] recall
> Explain the difference between what read repair fixes and what hinted
> handoff fixes — specifically, what each mechanism assumes about why a
> replica ended up out of sync. ^card-r1j7

Tunable consistency means an application can choose different W/R
settings per operation type: for example using a small W (fast, highly
available writes) paired with a large R (reads that check more replicas
to reduce the chance of missing the latest write), or the reverse,
depending on which operation's latency matters more for that particular
use case.

> [!card] recall
> A key-value store lets you configure W and R independently per request.
> For a workload that writes rarely but reads very frequently and needs
> those reads to reflect the latest write as often as possible, explain
> how you would set W and R relative to N and why. ^card-nm0x
