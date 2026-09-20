---
topic: aws
category: aws-opensearch
tags: [system-of-record, derived-data, dual-write, change-data-capture]
citations: ["OpenSearch Documentation — 'Reindexing OpenSearch data'"]
---

# OpenSearch vs. a System of Record

Every other note in this category assumed OpenSearch already has the right
documents in it. This note is about how they got there, and why that
question has a real answer that AWS's managed service doesn't remove: a
managed domain takes provisioning, patching, and snapshots off your plate,
but it does not decide how your source-of-truth data gets into the index
in the first place, or what happens when the two fall out of sync.

OpenSearch is almost always a ==derived== store: the documents in an index ^card-xb58
are a searchable projection of data whose authoritative copy lives
elsewhere (a relational database, DynamoDB, application logs), and losing
the index entirely should mean an inconvenient rebuild, not permanent data
loss.

> [!card] mcq
> Why is treating OpenSearch as the system of record for data that also
> exists in a primary database generally a design mistake?
> - [x] OpenSearch's indexing model (analyzers, mappings, refresh-based visibility) is optimized for search and aggregation, not for the durability and transactional guarantees a system of record needs, and rebuilding a lost index depends on the real source of truth still existing
> - [ ] OpenSearch cannot store data durably at all, even temporarily
> - [ ] OpenSearch documents cannot contain the same fields as the source database
> - [ ] AWS's managed layer prevents OpenSearch from being queried directly by applications ^card-l3w7

Keeping a derived index in sync with its source has two competing designs.
==Dual writes== have the application write to the primary database and to ^card-awkj
OpenSearch as two separate operations, which is simple to build but has no
atomicity across the two: a crash, timeout, or ordering hiccup between the
two writes can leave the index and the database permanently disagreeing,
with nothing that automatically detects or repairs the drift.

**Change data capture (CDC)** instead reads the primary database's own
write-ahead log or change stream (the same kind of stream a replication
follower would consume) and derives index updates from that single
stream, so the index is only ever written to as a consequence of a
write that already reliably happened in the database.

Why does deriving OpenSearch updates from a change stream avoid the failure mode that plain dual writes have? :: There is only one place a write can succeed or fail — the primary database — and the index-update pipeline consumes an already-committed change stream after the fact, so an application never needs both writes to succeed together; a lagging or temporarily failed pipeline just means the index catches up later, not that it silently diverges forever. ^card-0mzf

> [!card] recall
> A team's application performs a dual write: it writes to its primary
> database, then immediately writes the same change to OpenSearch. Using
> the async-replication-lag reasoning from asynchronous replication,
> explain why even a CDC-based pipeline still leaves the index eventually
> consistent rather than instantly consistent with the database, and why
> that's an acceptable tradeoff for a search index in a way it wouldn't be
> for a payments ledger. ^card-r1nq

Because the index is derived and ==rebuildable==, a full reindex from the ^card-q3a0
source of truth is a legitimate recovery and migration tool, not just a
disaster-recovery last resort — it's the standard way to apply a changed
mapping or analyzer, since those generally can't be altered in place on
documents already indexed.

What does AWS's managed layer (provisioning, patching, snapshots, dedicated master nodes) leave entirely to the application team, regardless of how well-managed the underlying OpenSearch engine is? :: Deciding how data gets from the system of record into the index and stays in sync with it — the dual-write-versus-CDC tradeoff, mapping design, and reindexing strategy are all application-level architecture decisions that AWS's managed service does not make or enforce for you. ^card-qixm
