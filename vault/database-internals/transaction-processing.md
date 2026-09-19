---
category: database-internals
tags: [wal, aries, steal-force, recovery, buffer-management]
citations: ["Petrov, Database Internals, Ch. 5"]
---

# Transaction Processing and Recovery

A **write-ahead log (WAL)** requires that a record describing a change be
durably written to an append-only log *before* the corresponding change
to the actual data page is written to disk. This lets the engine recover
a consistent state after a crash: replay the log forward from the last
checkpoint to reconstruct whatever changes didn't make it to the data
pages yet.

The WAL must be flushed to disk ==before== the transaction that produced ^card-ysmq
it is reported as committed to the client; otherwise a crash right after
"success" is returned could still lose the write.

> [!card] mcq
> What does "write-ahead" in write-ahead logging actually require?
> - [x] The log record for a change must reach durable storage before the corresponding data page write is considered complete
> - [ ] Data pages must be written to disk before any log record is created
> - [ ] The log is written only after a transaction commits, never before
> - [ ] Log records and data pages must always be written in the same disk operation ^card-4491

Buffer management policies describe two independent choices about dirty
pages held in the buffer pool. **Steal** vs **no-steal** asks whether an
uncommitted transaction's modified pages may be written ("stolen") to
disk before that transaction commits: a no-steal policy avoids ever
needing to undo a page write, at the cost of potentially keeping huge
amounts of dirty data pinned in memory for a long transaction. **Force**
vs **no-force** asks whether all of a transaction's dirty pages must be
flushed to disk at commit time: a force policy makes crash recovery
simpler (nothing to redo) but adds latency to every commit, while
no-force defers those writes and relies on the already-durable WAL to
redo them if a crash happens first.

> [!card] mcq
> A database uses a no-force buffer policy. What does this mean, and how
> is durability of a committed transaction still preserved?
> - [x] Dirty data pages need not be flushed to disk at commit time; durability instead comes from the transaction's log records already being durably written to the WAL, which can be replayed (redone) after a crash
> - [ ] Committed transactions are not durable at all under no-force
> - [ ] No-force means the write-ahead log itself is never flushed
> - [ ] No-force means dirty pages are flushed immediately, before commit ^card-g7ek

Steal and force are independent axes, so a system can combine them
freely — steal with no-force, no-steal with force, or any other pairing
— and the choice determines which recovery work (redo, undo, or both)
is needed after a crash. Most production engines use ==steal/no-force==, ^card-p9kf
because pinning all of a transaction's pages in memory (no-steal) or
flushing everything at every commit (force) is too costly, and instead
accept the extra recovery complexity of needing both redo and undo
logic.

What must an engine be able to do during recovery if it uses a steal policy (uncommitted pages can reach disk)? :: It must be able to undo the effects of any transaction that was stolen to disk but never committed, since a stolen page can contain changes from a transaction the crash interrupted before commit — so recovery needs an undo phase, not just redo. ^card-ug24

**ARIES** is the standard recovery algorithm built on steal/no-force WAL
and runs in three phases after a crash. **Analysis** scans the log
forward from the last checkpoint to determine which transactions were
in-flight and which pages were dirty at the moment of the crash. **Redo**
then replays the log forward from the earliest relevant point,
reapplying every logged change (whether or not its transaction had
committed) so the database reaches exactly the state it was in right
before the crash. **Undo** finally rolls back, in reverse log order, the
changes made by transactions that were still uncommitted at crash time.

> [!card] mcq
> What is the purpose of ARIES's redo phase?
> - [x] Reapply every logged change, from both committed and uncommitted transactions, to bring the database back to its exact pre-crash state before any rollback happens
> - [ ] Roll back all transactions that had not committed at the time of the crash
> - [ ] Determine which transactions were active when the crash occurred
> - [ ] Delete log records for transactions that already committed ^card-dcuk

> [!card] recall
> ARIES always redoes before it undoes, even though the undo phase will
> immediately reverse some of what redo just reapplied. Explain why this
> redo-then-undo order is used rather than skipping redo for transactions
> that will be undone anyway. ^card-37fc

Each log record ARIES writes carries a monotonically increasing
==LSN== (log sequence number), which is what lets the analysis phase ^card-bwmp
locate exactly where in the log a given page's last-known state came
from, and lets redo determine whether a page already reflects a given
log record (so it isn't needlessly reapplied).
