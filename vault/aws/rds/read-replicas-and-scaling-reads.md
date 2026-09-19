---
topic: aws
category: aws-rds
tags: [rds, read-replicas, replication-lag, read-your-writes, scaling]
citations: ["AWS User Guide — Amazon RDS, 'Working with DB instance read replicas'"]
---

# Read Replicas and Scaling Reads

`data-systems/replication.md` covers the general single-leader tradeoff:
followers can serve reads to scale out read throughput, but only at the
cost of returning data that lags behind the leader. RDS read replicas are
that exact tradeoff, wearing an AWS name — and every consequence the
theory note predicts shows up here in practice.

Unlike a Multi-AZ standby, a read replica is replicated ==asynchronously==: ^card-jum5
the primary does not wait for the replica to apply a change before
acknowledging the client's write, which is precisely what makes the
replica usable for offloading read traffic without slowing writes down.

That same asynchrony is the source of ==replication lag== — the gap ^card-p1i5
between when a write commits on the primary and when a replica has applied
it. Lag is not constant: it grows under heavy write volume or when a
replica falls behind on catching up, and shrinks again once it catches up.

Lag is what breaks ==read-your-writes==. A client that writes to the ^card-8myw
primary and then immediately reads from a replica can see the pre-write
state, because the replica simply hasn't received the change yet — from
the client's point of view, a write it just made appears to have vanished.

Because a read replica exists to add read capacity rather than to survive
a primary failure, promoting one out of its replica role to stand in for a
failed primary is a deliberate, manual operation — nothing like the
automatic promotion Multi-AZ performs on a synchronously replicated
standby.

> [!card] mcq
> A client writes a row to the RDS primary, then immediately reads from a read replica and doesn't see it. What is the most likely cause?
> - [x] Replication lag — the asynchronous replica hasn't applied the write yet
> - [ ] The write was rejected silently by the primary
> - [ ] Read replicas share the primary's storage volume, so this cannot happen
> - [ ] The replica's schema is out of sync with the primary's schema ^card-eh1p

Why does asynchronous replication make read replicas useful for scaling reads, when Multi-AZ's synchronous standby is not used that way? :: The primary doesn't wait for a replica to apply a write before acknowledging the client, so adding replicas doesn't add write latency — Multi-AZ deliberately pays that latency instead, in exchange for a promotion-ready standby with no lag. ^card-8eqh

Name two ways an application can work around the read-your-writes problem when reading from an RDS read replica. :: Route reads for data the same user just wrote back to the primary instead of a replica, or track how far a replica has caught up and only serve reads from replicas that have applied at least that point in the write stream. ^card-aenc

> [!card] recall
> Explain why read replica lag is not a bug to be fixed but an inherent
> consequence of choosing asynchronous replication — and why RDS can't
> simply make lag disappear without giving up the write-latency benefit
> replicas exist to provide. ^card-oj6d
