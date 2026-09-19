---
topic: aws
category: aws-opensearch
tags: [near-real-time, refresh-interval, segments, merging]
citations: ["OpenSearch Documentation — 'Near real-time search'", "OpenSearch Documentation — 'Index refresh'"]
---

# Indexing Pipeline, Refresh, and Segment Merging

OpenSearch's storage engine (Lucene, underneath) is built on the same idea
as `database-internals/lsm-trees.md`: writes accumulate in memory, get
flushed as immutable, sorted segments, and those segments are merged
together over time. Search is "near-real-time" precisely because a write
is durable before it is searchable, and the gap between those two moments
is a deliberate, tunable tradeoff rather than a bug.

A newly indexed document is first written into an in-memory buffer and a
==translog== (transaction log) for durability, but it is not yet visible ^card-n29q
to search — it sits there until the next refresh, exactly like a write
sitting in an LSM-tree's memtable before that memtable is flushed to a
searchable segment.

A ==refresh== periodically writes the in-memory buffer's contents into a ^card-f4h6
new, immutable Lucene segment and opens that segment for search, which is
what actually makes recently indexed documents show up in query results.

That operation is not the same as a **flush**: a flush is what fsyncs
segments to disk and clears the translog entries they made redundant,
while making a segment searchable can happen without any fsync at all —
durability in that window still comes from the translog, not from the
newly opened segment itself.

> [!card] mcq
> Why is OpenSearch described as "near-real-time" rather than real-time
> search?
> - [x] A document becomes searchable only after the next refresh writes it into a searchable segment, so there is always some delay between indexing and searchability
> - [ ] Because query results are always several minutes stale by design
> - [ ] Because it only supports batch indexing, never single-document writes
> - [ ] Because replicas are never kept in sync with primaries ^card-k4t0

Shortening the refresh interval makes new documents searchable sooner but
forces more frequent segment creation, which — exactly as in an LSM-tree —
means more, smaller segments for the merge process to deal with, trading
search freshness against indexing and merge overhead.

Why does creating many small segments instead of fewer, larger ones increase the work a search has to do, independent of merging? :: Each segment carries its own inverted index and metadata that a query must check separately, so more segments means more per-segment lookup overhead for the same total document count, even before accounting for the eventual cost of merging them back together. ^card-4n2d

Segment ==merging== combines several smaller segments into one larger ^card-2ugd
one, dropping documents that were deleted or updated in the meantime (an
update in Lucene is implemented as a delete of the old document plus an
insert of the new one) — the direct counterpart to compaction in an
LSM-tree, reclaiming space and keeping the number of segments a query must
check from growing without bound.

> [!card] recall
> Explain the parallel between Lucene's segment merging in OpenSearch and
> compaction in an LSM-tree (`database-internals/lsm-trees.md`): what
> problem does each one solve, and why do both rely on segments being
> immutable in the first place? ^card-9e4k

Because Lucene segments are immutable, an OpenSearch "update" or "delete"
never edits a document in place; it marks the old version as ==obsolete== ^card-jwe0
in whichever segment holds it (via a tombstone-like marker) and writes the
new version as a fresh document, leaving the actual space reclamation to
the next merge that processes that segment.

That stale, tombstoned copy lingers — occupying disk and still needing to
be skipped during searches — until compaction-equivalent merging cleans it
up, the same lifecycle as an overwritten entry in an LSM-tree.

What cost does frequent updating of the same documents impose on an OpenSearch index, given that updates are implemented as delete-plus-insert rather than in-place edits? :: Each update leaves behind a stale, tombstoned copy of the old document that still occupies disk space and must still be skipped during searches until a merge reclaims it, so a heavily-updated index accumulates dead document versions and relies on merging to keep both space usage and search-time filtering overhead bounded. ^card-4gdk
