---
topic: database-internals
category: database-internals
tags: [storage-engines, row-store, column-store, buffer-pool]
citations: ["Petrov, Database Internals, Ch. 1"]
---

# Storage Engine Basics

A database's storage engine is the layer responsible for laying data out
on disk and moving it in and out of memory; two data layouts dominate.
**Row-oriented** stores keep all columns of one record contiguous, which
suits workloads that read or write whole records at a time (typical
OLTP). **Column-oriented** stores keep all values of one column
contiguous across records, which suits scanning a few columns over many
rows (typical OLAP/analytics) and compresses well, since a column's
values tend to be similar to each other.

> [!card] mcq
> Which workload is a column-oriented store best suited for?
> - [x] Aggregating one or two columns (e.g. sum of a price column) across millions of rows
> - [ ] Fetching every column of a single record by primary key
> - [ ] Appending one full record at a time as fast as possible
> - [ ] Storing records with no fixed schema at all ^card-4u9i

Row stores are generally better for record-at-a-time OLTP access; column
stores are generally better for scanning ==few columns== across many rows. ^card-if86

A **buffer pool** (or buffer cache/page cache) is an in-memory cache of
disk pages that the storage engine manages itself, rather than relying
solely on the OS page cache; it lets the engine decide which pages to
keep hot and control exactly when a dirty (modified) page is written
back to disk, which matters for correctness during crash recovery.

Pages read from disk into the buffer pool that have been modified but
not yet written back are called ==dirty== pages; the engine must track ^card-se4z
them so it knows what still needs to be flushed.

> [!card] mcq
> Why does a database storage engine typically implement its own buffer
> pool instead of relying entirely on the operating system's page cache?
> - [x] It needs precise control over which pages are evicted and exactly when a dirty page is flushed, since that timing matters for crash recovery correctness
> - [ ] The operating system does not allow databases to read files at all
> - [ ] Buffer pools are only needed for column-oriented stores
> - [ ] The OS page cache does not exist on modern systems ^card-4bcw

A storage engine is broadly **disk-based** (data's primary home is disk,
with memory used as a cache and write buffer, as in most relational
databases) or **memory-based / in-memory** (the primary copy lives in
RAM, with disk used only for durability via logging or periodic
snapshots, as in Redis). Memory-based engines can offer much lower
latency, but the data set must fit in the memory available, and durability
depends entirely on how faithfully the disk log or snapshot is written
and replayed on restart.

What tradeoff does an in-memory storage engine accept in exchange for its low latency? :: It must give up disk as its primary storage medium, meaning the dataset is bounded by available RAM, and it depends on a write-ahead log or periodic snapshot to disk (replayed on restart) to survive a crash without losing committed data. ^card-579l

> [!card] recall
> A team is choosing between a row-oriented and a column-oriented storage
> engine for a new analytics dashboard that runs queries like "average
> order value per month over the last two years." Explain which layout
> fits better and why. ^card-tssx
