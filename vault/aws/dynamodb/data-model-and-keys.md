---
topic: aws
category: aws-dynamodb
tags: [dynamodb, data-model, partition-key, sort-key]
citations: ["AWS Developer Guide — Amazon DynamoDB, 'Core components of Amazon DynamoDB'"]
---

# Data Model and Keys

DynamoDB stores data in tables made of items, and items are made of
attributes — the rough analogues of rows and columns, except that nothing
about an item's shape is declared up front except its key. Understanding
what the key schema fixes, and what it deliberately leaves open, is the
foundation every other DynamoDB note builds on.

A table's ==primary key== is the only part of an item's shape that ^card-xpqz
DynamoDB enforces; every other attribute is optional and can differ from
item to item within the same table.

A **simple primary key** consists of just a partition key: an attribute
whose value DynamoDB hashes to decide which physical partition stores
the item, and which must be unique across every item in the table since
it is the only thing identifying an item.

A **composite primary key** adds a ==sort key== alongside the partition ^card-a5eg
key.

Items sharing the same partition key value are stored together, ordered
by that second attribute, and no longer need a unique partition key
value each — uniqueness is now enforced on the pair of the two key
attributes together.

What does a composite primary key buy you that a simple primary key cannot? :: The ability to group a whole family of related items — an "item collection" — under one partition key value and retrieve them together, ordered, in a single request; a simple key can only ever address one item at a time by its unique value, with no built-in notion of an ordered group. ^card-l610

> [!card] mcq
> A table uses a composite primary key of `(UserId, OrderDate)`. What does this let you do that a simple key on `UserId` alone would not?
> - [x] Store many orders per user and fetch them together, sorted by date, in one request
> - [ ] Make `UserId` values unique across the table
> - [ ] Avoid specifying an attribute type for `UserId`
> - [ ] Allow items to omit `UserId` entirely ^card-sjdd

DynamoDB is schemaless below the key: an item can carry any set of
non-key attributes, of any type, and two items in the same table can have
completely different attributes. Only the ==key schema== — which ^card-5qkv
attributes form the primary key, and their types — is declared when the
table is created and fixed thereafter.

Why can two items in the same DynamoDB table have entirely different sets of non-key attributes? :: Because DynamoDB validates only the primary key attributes against the table's declared key schema at write time; every other attribute is stored as part of that item's own document-like structure and is never checked against any table-wide column definition. ^card-gp3q

> [!card] recall
> A relational table enforces a fixed set of columns for every row. Explain what problem this creates when an application's entities have optional or varying fields, and how DynamoDB's schemaless-attributes-plus-fixed-key-schema design sidesteps it without giving up a way to address and group items reliably. ^card-0zj8
