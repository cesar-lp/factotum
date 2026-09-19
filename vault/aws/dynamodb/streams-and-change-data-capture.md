---
topic: aws
category: aws-dynamodb
tags: [dynamodb, streams, change-data-capture, ordering]
citations: ["AWS Developer Guide — Amazon DynamoDB, 'Capturing table activity with DynamoDB Streams'"]
---

# Streams and Change Data Capture

Change data capture (CDC) is the general pattern of turning a database's
writes into a consumable log of events, so other systems can react to
changes without polling the table or coupling directly to the writer.
DynamoDB Streams is the built-in mechanism that makes a table's writes
available this way.

A **DynamoDB Stream** is an ordered log of item-level modifications
(inserts, updates, deletes) to a table, made available for a consumer —
commonly a Lambda function — to read and process, each record carrying
the kind of change and, depending on configuration, the item's before
and/or after image.

The ordering guarantee Streams provides is scoped, not global: records
are guaranteed to appear in the order the corresponding writes actually
happened only ==within a single partition key==, not across the whole ^card-ufqg
table.

> [!card] mcq
> If two writes happen to the same partition key in quick succession,
> what does DynamoDB Streams guarantee about the order a consumer sees
> them in?
> - [x] The consumer sees them in the same order the writes actually occurred, because ordering is guaranteed per partition key
> - [ ] The consumer sees them in a random order, since Streams provides no ordering guarantee at all
> - [ ] The consumer sees them ordered globally across the entire table, matching wall-clock time across all partition keys
> - [ ] Streams deduplicates the two writes into a single record ^card-zekj

Why can't a Streams consumer assume that a record for item A always arrives before a causally-later record for unrelated item B, even though A was written first? :: The ordering guarantee only holds within one partition key's own stream of changes; writes to different partition keys can be processed and delivered by different shards of the stream, so there is no table-wide clock forcing B's record to wait behind A's — only two writes sharing the same partition key are guaranteed to preserve their relative order. ^card-a0b5

This per-partition-key ordering is exactly what makes Streams useful for
==CDC== patterns that need to replay one entity's history faithfully: as ^card-a5y3
long as every write to a given item goes through the same partition key
(true by construction, since the partition key is part of the item's own
identity), a consumer processing that key's records in order sees a
faithful, gap-free timeline of everything that happened to that entity.

What common CDC pattern does Streams' per-partition-key ordering make safe to build, that a global-but-unordered event feed would not? :: Maintaining a derived, materialized view or search index per entity by replaying that entity's own change history in order — for example rebuilding an aggregate or triggering a downstream workflow keyed to one item's state transitions — since out-of-order delivery for that one entity would corrupt the derived state even if every other entity's ordering was fine. ^card-4xg7

Common uses built on top of Streams include replicating changes to
another data store (a search index or a data warehouse), triggering
workflows on specific state transitions (an order moving to
"shipped"), and cross-region replication for DynamoDB global tables,
which itself relies on Streams internally.

> [!card] recall
> Explain why a consumer that needs a strictly ordered history of a
> single entity's changes should design that entity's writes to share one
> partition key, and what specifically would go wrong for that consumer
> if the entity's changes were instead spread across multiple partition
> keys. ^card-s56d

Streams records are not retained forever — a consumer that falls behind
long enough can permanently miss records that age out of the stream. A
CDC consumer should treat the stream as a log with a ==bounded retention ^card-9864
window==, not as a permanent, replayable-from-the-beginning source of
truth, and design its downstream state to tolerate rebuilding from a
fresh table scan if it ever falls too far behind to catch up from the
stream alone.
