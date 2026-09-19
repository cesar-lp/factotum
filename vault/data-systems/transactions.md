---
category: data-systems
tags: [transactions, acid, isolation, write-skew, serializability]
citations: ["Kleppmann, Designing Data-Intensive Applications, Ch. 7"]
---

# Transactions and Isolation Levels

ACID stands for Atomicity, Consistency, Isolation, Durability, though in
practice "Consistency" is really an application-level property (invariants
hold) rather than something the database can guarantee on its own — the
database can only guarantee atomicity, isolation, and durability, and the
application must use those to preserve its invariants.

**Read committed** is the most basic isolation level: it prevents dirty
reads (seeing another transaction's uncommitted writes) and dirty writes
(overwriting another transaction's uncommitted writes), typically
implemented with row-level locks for writes and by only ever showing the
latest committed value for reads.

Read committed does NOT prevent a ==non-repeatable read== (also called a ^card-aj12
read skew), where a transaction reads the same row twice and gets two
different values because another transaction committed in between.

> [!card] mcq
> Which anomaly can occur under read committed isolation but not under
> snapshot isolation?
> - [x] Non-repeatable reads (read skew) — reading the same row twice within one transaction and getting different values
> - [ ] Dirty reads of uncommitted data
> - [ ] Dirty writes overwriting uncommitted data
> - [ ] Lost updates from two transactions writing the same row concurrently unnoticed ^card-o88h

**Snapshot isolation** gives each transaction a consistent point-in-time
view of the database (as of when the transaction started), typically
implemented with multi-version concurrency control (MVCC), so readers
never block writers and writers never block readers.

> [!card] mcq
> Which guarantee does snapshot isolation NOT provide?
> - [x] Protection against write skew
> - [ ] Reads from a consistent point-in-time snapshot
> - [ ] Readers never block writers
> - [ ] Protection against dirty reads ^card-65vf

**Write skew** happens when two transactions each read some overlapping
data, then make disjoint writes based on what they read, and each write
individually looks fine but the combination violates an invariant that
held before either committed — e.g. two doctors each check "at least one
other doctor is on call" and both go off call simultaneously because
neither observed the other's decision. Snapshot isolation does not
prevent this because neither transaction's write actually conflicts with
a row the other transaction wrote.

Write skew is a generalization of the ==lost-update== anomaly to cases ^card-p56w
where two transactions modify different objects rather than the same
object, based on a premise (something they each read) that becomes false
once both commit.

> [!card] mcq
> Which technique can prevent write skew under snapshot isolation when the
> database doesn't offer true serializable isolation?
> - [x] Explicitly lock the rows the transaction's decision depends on (e.g. SELECT ... FOR UPDATE) so a conflicting concurrent transaction is forced to wait
> - [ ] Increase the transaction timeout
> - [ ] Switch to read committed isolation, which prevents write skew by default
> - [ ] Disable multi-version concurrency control ^card-fvqy

**Serializable** isolation guarantees that the outcome of running
transactions concurrently is equivalent to running them in some
sequential order, one at a time — this is the strongest isolation level
and is the only one of the three that prevents write skew in general.
Common implementations include actual serial execution (one transaction
at a time, feasible when each is short), two-phase locking, and
serializable snapshot isolation (SSI), which detects at commit time
whether a transaction's premise was invalidated by a concurrent commit.

What does serializable snapshot isolation (SSI) do differently from plain snapshot isolation to prevent write skew, without giving up the performance of not blocking on reads? :: SSI runs transactions optimistically on a snapshot as usual, but tracks which rows each transaction read and detects, at commit time, whether any of those rows were concurrently modified by a transaction that has since committed; if so it aborts one transaction rather than letting the anomaly through, avoiding the need to take locks upfront. ^card-fpzw
