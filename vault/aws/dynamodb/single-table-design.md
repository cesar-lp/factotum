---
topic: aws
category: aws-dynamodb
tags: [dynamodb, single-table-design, key-overloading, data-modeling]
citations: ["AWS Developer Guide — Amazon DynamoDB, 'Best practices for designing and using partition keys'"]
---

# Single-Table Design

`queries-scans-and-access-patterns.md` establishes that DynamoDB modeling
starts from access patterns, not entities. Single-table design takes
that idea to its logical extreme: instead of one table per entity type,
as a relational schema would do, every entity type an application needs
lives in one shared table, distinguished only by the shape of its keys.

**Key overloading** is the technique that makes this possible: instead
of a partition key meaning one fixed thing (e.g. always "user ID"), its
value is a generic, prefixed string like `USER#123` or `ORDER#456`,
whose meaning depends on the prefix. The ==same attribute names== ^card-y17u
(commonly generic ones like `PK` and `SK`) hold semantically different
kinds of values depending on which entity type occupies that item.

> [!card] mcq
> In a single-table design, what does a partition key value like
> `ORDER#456` typically represent?
> - [x] An overloaded key encoding both the entity type (Order) and its identifier, sharing the same generic `PK` attribute other entity types also use
> - [ ] A composite key requiring exactly two attributes to be unique
> - [ ] A value that must be globally unique across every AWS account
> - [ ] A partition key that DynamoDB has specially reserved for order data ^card-3jse

By choosing prefixes deliberately, related entities can be co-located in
one **item collection**: a customer's profile item and all of their order
items can share the same partition key value, so a single Query fetches
the customer and every related order together, sorted by however the
sort key was designed — something that would otherwise require a join.

Why does co-locating related entity types under one shared partition key value matter specifically for DynamoDB, as opposed to a relational database? :: DynamoDB has no cross-table join, so the only way to fetch related items together in one request is for them to already share a partition key (an item collection); a relational database can defer that relationship to query time via a join, so it never needs this kind of physical co-location. ^card-sqg3

What is the main cost single-table design imposes on a team, compared with one table per entity type? :: The table's items are no longer self-describing or easily browsable — inspecting a raw item requires knowing the prefix conventions to decode which entity type and relationship it represents, and every access pattern must be enumerated up front since the schema is optimized tightly around them rather than left general. ^card-zkda

Single-table design is not a universal best practice; AWS's own guidance
frames it as one option with real costs, not a default. It pays off when
an application has a well-understood, largely fixed set of access
patterns and wants to minimize the number of requests needed to serve
them. It pays off less when access patterns are still evolving, when a
team values being able to inspect data ad hoc, or when the entities
genuinely don't share access patterns worth co-locating — in those cases
==multiple tables== stay easier to reason about, and the join-avoidance ^card-qkwb
benefit never gets exercised often enough to justify the added
complexity.

> [!card] recall
> A team is building the first version of a new product and isn't yet
> sure which queries will matter most in six months. Explain why
> single-table design is a riskier bet for them than it would be for a
> team maintaining a mature service with stable, well-enumerated access
> patterns. ^card-3h5n

What honest tradeoff does single-table design make in exchange for fetching related entities in one request? :: It sacrifices the table's readability and general-purpose flexibility — items become opaque without knowledge of the prefixing scheme, and the design is only worth it when the access patterns it was built around are already well known and unlikely to change often. ^card-fjrg
