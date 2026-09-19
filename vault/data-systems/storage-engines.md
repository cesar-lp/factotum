---
category: data-systems
tags: [storage-engines, lsm-tree, b-tree, ssm, compaction]
citations: ["Kleppmann, Designing Data-Intensive Applications, Ch. 3"]
---

# Storage Engines: LSM-Trees and B-Trees

A simple append-only log is fast to write (sequential disk access) but
slow to read, since finding a key requires scanning the whole file. A
**hash index** kept in memory, mapping each key to its byte offset in the
log, fixes lookups but requires the whole index to fit in memory and does
not support efficient range queries.

**SSTables** (Sorted String Tables) store key-value pairs sorted by key,
which allows an in-memory index to be sparse — you only need one index
entry every few kilobytes, since you can scan forward from the nearest
known offset — and allows efficient merging of multiple segment files
during compaction, similar to a mergesort.

An LSM-tree keeps recent writes in an in-memory ==memtable== (backed by a ^card-ocbt
write-ahead log for crash recovery) and, once it grows past a threshold,
flushes it to disk as a new sorted SSTable segment.

Background **compaction** merges SSTable segments, discarding overwritten
or deleted keys, which keeps the number of segments (and therefore the
number of segments a read must check) bounded. LSM-trees favor sequential
writes and can achieve very high write throughput, but a read may need to
check the memtable and several disk segments before finding a key (or
confirming it's absent), which is why Bloom filters are commonly used to
skip segments that definitely don't contain a key.

> [!card] mcq
> Why do LSM-tree storage engines typically achieve higher sustained write
> throughput than B-tree storage engines?
> - [x] Writes are sequential appends to an in-memory structure and log, deferring random-access disk work to background compaction
> - [ ] LSM-trees never write to disk at all
> - [ ] LSM-trees skip the write-ahead log, trading durability for speed
> - [ ] B-trees require a full tree rebuild on every write ^card-nvp7

A B-tree stores data in fixed-size ==pages==, each of which is referenced ^card-hnpk
by other pages the way a tree's parent references children, and updating
a value means finding the containing page and overwriting it in place.

B-trees typically require a ==write-ahead log== so that a crash during a ^card-beza
multi-page update (e.g. a page split) can be recovered from without
leaving the tree in a corrupted state.

> [!card] mcq
> Which statement about write amplification is accurate?
> - [x] LSM-trees can suffer high write amplification from repeated compaction rewrites, while B-trees can suffer it from rewriting a whole page for a small change
> - [ ] Only B-trees experience write amplification; LSM-trees are immune to it
> - [ ] Only LSM-trees experience write amplification; B-trees write each byte exactly once
> - [ ] Write amplification only affects read-heavy workloads, not writes ^card-5y1x

What is "read amplification" in the context of an LSM-tree, and how do Bloom filters mitigate it? :: Read amplification is the number of underlying disk reads (segments checked) needed to answer one logical read, which can be high because a key might exist in several unmerged segments. A Bloom filter lets the engine skip segments that provably do not contain the key, cutting the number of segments actually read. ^card-9cp1

> [!card] recall
> A team chooses a B-tree-based database for a workload with heavy random
> point updates and needs predictable read latency with a bounded number
> of disk seeks per read. Explain why a B-tree suits this better than an
> LSM-tree, and name the tradeoff they are accepting. ^card-vx7b
