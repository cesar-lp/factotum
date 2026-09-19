---
topic: aws
category: aws-dynamodb
tags: [dynamodb, query, scan, access-patterns, data-modeling]
citations: ["AWS Developer Guide — Amazon DynamoDB, 'Working with queries' and 'Working with scans'"]
---

# Query, Scan, and Access-Pattern-First Modeling

DynamoDB gives you exactly two ways to read more than one item at a
time, and the gap between them is wide enough that it reshapes how you
design tables in the first place — not as an afterthought, but as the
starting point.

A **Query** operation finds items by partition key value (optionally
narrowed by a sort key condition), and only ever examines the items
within that one partition key's item collection — it never touches
unrelated partitions.

A **Scan** operation examines ==every item in the table==, filtering out ^card-qomb
the ones that don't match after reading them, regardless of how few
items actually satisfy the filter.

> [!card] mcq
> Why is a DynamoDB Scan with a filter expression generally far more
> expensive than an equivalent Query?
> - [x] The filter is applied after DynamoDB has already read every item in the table (or index); a Query instead reads only the items within the targeted partition key's collection
> - [ ] Scan always returns incorrect results, while Query never does
> - [ ] A Scan cannot use a filter expression at all
> - [ ] Query is a client-side operation, while Scan runs entirely on the server ^card-drf0

Because a Query is cheap only when it targets a specific partition key
(and optionally a sort key range), the partition key design directly
determines which lookups are cheap and which degrade into full-table
Scans.

Why does this push DynamoDB modeling to start from the application's access patterns rather than from the entities it stores? :: The primary key and any secondary indexes are the only cheap entry points into the data; if you model the schema around the entities first and figure out queries afterward, you frequently end up needing to look items up by an attribute nothing was keyed on, leaving Scan as the only option — so the queries the application will actually run have to be enumerated before the key schema is chosen, not after. ^card-867u

This inverts the modeling order a relational database encourages. A
relational schema is normalized around the ==entities and their ^card-r6o7
relationships==, on the assumption that a query planner and arbitrary
joins can answer whatever question comes up later; DynamoDB has no query
planner and no cross-partition joins, so a key schema chosen without a
known query in mind is a bet that Query will happen to work, not a
guarantee that it will.

What specifically does a relational database provide that lets entity-first modeling work there, which DynamoDB lacks? :: A query planner capable of ad-hoc joins and secondary access paths at query time, so a normalized, entity-shaped schema can still answer new questions later; DynamoDB has no join operator and no planner, so any access path not already baked into the primary key or a secondary index has no cheap route at all. ^card-m8my

In practice, DynamoDB table design starts from a list of every query the
application needs to run, then works backward to a key schema (and set
of secondary indexes) that answers each one with a Query rather than a
Scan.

This often means deliberately ==duplicating data== across multiple items ^card-aw3s
or attributes, so that the right value is already sitting on a key
wherever an access pattern needs to look it up, rather than requiring a
join or a Scan to derive it at read time.

> [!card] recall
> Explain why "design the table around your access patterns, not your
> entities" is not just DynamoDB-specific advice but a direct consequence
> of Query only being able to search within one partition key's item
> collection. What happens to an access pattern that wasn't anticipated
> when the table was designed? ^card-qnvj
