---
topic: aws
category: aws-dynamodb
tags: [dynamodb, gsi, lsi, secondary-index, projections]
citations: ["AWS Developer Guide — Amazon DynamoDB, 'Improving data access with secondary indexes'"]
---

# Secondary Indexes: GSI vs LSI

A table's primary key answers exactly one access pattern well: look up
by partition key, optionally narrowed by sort key. Secondary indexes let
you query the same items by a different attribute, but DynamoDB offers
two kinds with different tradeoffs, and mixing them up is a common
source of design mistakes.

A **local secondary index (LSI)** shares its partition key with the base
table and lets you choose a different sort key for querying within one
partition key's item collection. It must be created at ==table-creation ^card-vm0m
time== and cannot be added or removed later.

A **global secondary index (GSI)** can use a completely different
partition key (and sort key) from the base table, letting a query span
partitions that share nothing with the base table's own key structure. A
GSI can be added, modified, or removed at any time after the table
exists.

> [!card] mcq
> Which statement correctly distinguishes a GSI from an LSI?
> - [x] A GSI can use a partition key different from the base table's and can be created after the table already exists; an LSI must share the base table's partition key and can only be created alongside the table
> - [ ] An LSI can span multiple partitions while a GSI is confined to one
> - [ ] A GSI is always strongly consistent while an LSI is always eventually consistent
> - [ ] An LSI supports more attribute types than a GSI ^card-gt66

What is the practical consequence of an LSI needing to be defined at table-creation time, for a table that is already live in production? :: You cannot retrofit an LSI onto an existing table to support a new access pattern — the only way to get one is to create a new table with the LSI defined upfront and migrate the data, whereas a GSI can simply be added to the live table. ^card-3lup

Both index kinds use a **projection** to decide which attributes get
copied into the index alongside the key: `KEYS_ONLY`, `INCLUDE` (a named
subset), or `ALL`. A query against the index can only return attributes
that were projected into it — reaching for an attribute outside the
projection requires a separate lookup back to the base table.

Why might a table designer deliberately choose a narrower projection (KEYS_ONLY or INCLUDE) over ALL for a secondary index? :: A narrower projection keeps the index smaller and cheaper to store and write, at the cost of needing an extra round trip to the base table whenever a query needs an attribute the index didn't copy — it's a storage/write-cost tradeoff against read convenience, not a correctness one. ^card-6j3q

The consistency difference is the sharpest distinction between the two.
An LSI supports strongly consistent reads, because it is stored on the
same partition as the base-table item it indexes and updated as part of
the same write. A GSI, whose entries can live on entirely different
partitions from the base item, is updated ==asynchronously== after the ^card-2r1c
base write, so a GSI query can only ever be eventually consistent.

What causes a GSI to be eventually consistent while an LSI can be read strongly consistent? :: An LSI shares its partition with the base item, so both are updated together in the same write; a GSI's entry generally lives on a different partition, reached by a separate, asynchronous propagation step after the base write completes, leaving a window where the GSI has not yet caught up. ^card-yt84

> [!card] recall
> A team needs a new query pattern on a table that already has significant
> production traffic and cannot tolerate a migration. Explain which
> secondary index type is even an option here, and why the other one is
> off the table regardless of which key structure it would ideally use. ^card-hhkd
