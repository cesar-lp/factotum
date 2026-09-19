---
topic: data-systems
category: data-systems
tags: [linearizability, serializability, cap, consensus, total-order-broadcast]
citations: ["Kleppmann, Designing Data-Intensive Applications, Ch. 9"]
---

# Consistency Guarantees and Consensus

Linearizability and serializability are frequently conflated but answer
different questions: one is about recency of a single object, the other
about isolation across a set of operations touching many objects.

Linearizability makes a system behave as if there were only one copy of
each piece of data: once a write completes, every subsequent read (by any
client, on any replica) must see that write or a later one — never a
stale value. Serializability, by contrast, is about transactions
involving possibly many objects, guaranteeing their combined effect is
equivalent to some serial (one-at-a-time) execution order, but it says
nothing about how quickly a given write becomes visible.

> [!card] mcq
> A database is serializable but not linearizable. What can still go wrong?
> - [x] A client can read stale data from a replica even though it was written moments ago by another client, because serializability doesn't constrain recency
> - [ ] Transactions can leave the database in an inconsistent state
> - [ ] Two transactions can both read and write the same row without any isolation
> - [ ] The database can lose committed data on a crash ^card-rb57

Linearizability is a ==recency== guarantee on single objects; ^card-4n76
serializability is an ==isolation== guarantee across transactions. ^card-lgbl

What does the P in CAP actually mean, and why is "pick two of three" a misleading framing? :: Network partitions are not a choice but a fact about deploying over an unreliable network — they will happen. The real decision a system designer faces is how the system behaves when a partition occurs: either remain available and risk returning inconsistent (stale or conflicting) data, or refuse to serve some requests to preserve consistency. "Pick two of three" wrongly implies you can choose to avoid P, when in fact CA (consistent and available) is only achievable in the absence of any partition at all. ^card-1t7n

> [!card] mcq
> Which statement about CAP is accurate?
> - [x] During a network partition, a system must choose between remaining available (possibly inconsistent) or consistent (possibly unavailable); it cannot choose to avoid partitions
> - [ ] A well-engineered system can be simultaneously consistent, available, and partition-tolerant at all times
> - [ ] CAP proves that all distributed databases are equally unreliable
> - [ ] Partition tolerance is an optional feature that most production systems disable ^card-a6s2

Total order broadcast is a protocol guaranteeing that messages are
delivered to every node in the ==same order==, reliably (no message is ^card-9e5b
lost) — it is equivalent in difficulty to solving consensus, and can be
used to implement single-leader replication's operation log or to build
a linearizable storage service.

> [!card] mcq
> Why is implementing linearizable compare-and-set storage considered
> equivalent in difficulty to solving consensus?
> - [x] Both require all nodes to agree on a single, totally ordered sequence of operations despite failures and network delays — solving one lets you build the other
> - [ ] Linearizability requires no coordination between nodes at all
> - [ ] Consensus algorithms cannot tolerate any node failures, unlike linearizable storage
> - [ ] Compare-and-set operations do not require ordering, only atomicity ^card-vh3s

Consensus algorithms (e.g. Raft, Paxos) must satisfy uniform agreement
(no two nodes decide differently), integrity (no node decides twice),
validity (a decided value was actually proposed by some node), and
==termination== (every node that doesn't crash eventually decides some ^card-1f46
value) — this last property is why consensus is provably impossible to
guarantee in a fully asynchronous system with even one faulty node (the
FLP result), which is why practical algorithms rely on timeouts and
partial synchrony assumptions.

> [!card] recall
> Two nodes in a leaderless quorum system use w + r > n for reads and
> writes. Explain a scenario where this inequality still fails to return
> the most recent write, despite being satisfied. ^card-08ed
