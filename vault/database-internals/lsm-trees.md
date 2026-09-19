---
category: database-internals
tags: [lsm-tree, compaction, amplification, sstable]
citations: ["Petrov, Database Internals, Ch. 7"]
---

# LSM-Trees and Compaction

An LSM-tree buffers recent writes in an in-memory ==memtable==, backed by ^card-drcz
a write-ahead log for crash safety; once that buffer fills up, it is
flushed to disk as an immutable, sorted **SSTable** segment. Because
segments are immutable and sorted, they can be merged efficiently and
searched with a sparse index, but a single key can end up duplicated
across many segments until compaction cleans it up.

**Compaction** merges SSTable segments together, dropping overwritten
and deleted (tombstoned) entries, which keeps the number of segments a
read has to check bounded. The two dominant strategies make different
tradeoffs. **Size-tiered** compaction merges same-sized segments into a
larger one only once several accumulate, which keeps write amplification
low (each byte is rewritten relatively few times) but lets multiple
generations of overlapping, un-merged segments coexist, so both stale
data and duplicate keys pile up — high space amplification, and a read
may check more segments. **Levelled** compaction organizes segments into
levels of increasing size, keeps each level's key ranges non-overlapping,
and continuously merges a level into the next, which keeps stale data
from piling up (low space amplification) but rewrites data more times
overall as it moves between levels (higher write amplification).

> [!card] mcq
> Which amplification does levelled compaction reduce compared to
> size-tiered compaction, and at what cost?
> - [x] It reduces space amplification (less stale/duplicate data lingers), at the cost of higher write amplification (data is rewritten more times moving between levels)
> - [ ] It reduces write amplification, at the cost of higher space amplification
> - [ ] It reduces both write and space amplification with no tradeoff
> - [ ] It eliminates compaction entirely, removing all amplification ^card-7a0i

Size-tiered compaction keeps ==write== amplification low but lets stale ^card-9k1r
and duplicate data accumulate, so it trades toward higher space
amplification; levelled compaction is the mirror image.

> [!card] mcq
> A workload rewrites the same small set of keys very frequently and disk
> space is tightly constrained. Which compaction strategy better fits
> this, and why?
> - [x] Levelled compaction, because it keeps stale versions of frequently-overwritten keys from accumulating across many segments, bounding space usage
> - [ ] Size-tiered compaction, because it minimizes space amplification by design
> - [ ] Neither strategy affects space usage; only the memtable size does
> - [ ] Size-tiered compaction, because it never rewrites a key more than once ^card-w9id

**Read amplification** is the number of underlying disk reads a single
logical lookup requires — potentially the memtable plus several disk
segments — since a key might exist (or have existed and been deleted) in
more than one of them. Because segments are sorted, a lookup only needs
to check segments whose key range could contain the target, and a
==Bloom filter== per segment lets the engine skip segments that ^card-ugwk
definitely do not contain the key, without a disk read at all.

What is "write amplification" in an LSM-tree, distinct from the number of client write requests? :: The ratio of bytes actually written to disk (across the initial flush and every later compaction rewrite of that data) to the bytes of the original logical write — a single logical write can be physically rewritten to disk many times over its lifetime as compactions merge it into progressively larger segments. ^card-hcmf

> [!card] recall
> A team is choosing a compaction strategy for a workload that ingests
> huge volumes of write-once, rarely-updated time-series data and cares
> most about sustaining high write throughput. Explain which strategy
> (size-tiered or levelled) fits better and what amplification tradeoff
> they are accepting. ^card-unnd

> [!card] mcq
> Why can an LSM-tree read require checking multiple SSTable segments
> even for a single key?
> - [x] The same key may have been written or overwritten at different times, landing in different segments that haven't yet been merged by compaction
> - [ ] SSTables are stored unsorted, so every segment must always be scanned fully
> - [ ] The memtable is never checked during a read, only disk segments are
> - [ ] LSM-trees store each key exactly once, so this never happens ^card-830u
