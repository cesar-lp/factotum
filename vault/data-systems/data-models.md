---
topic: data-systems
category: data-systems
tags: [data-models, relational, document, graph, schema]
citations: ["Kleppmann, Designing Data-Intensive Applications, Ch. 2"]
---

# Data Models: Relational, Document, and Graph

The relational model organizes data into tables of rows with a fixed
schema, and relies on joins to reconstruct related data spread across
tables. It was designed to hide implementation detail behind a clean
query interface, and remains dominant because most applications have data
with many-to-many relationships and benefit from strong schema guarantees.

The **object-relational mismatch** is the friction between an
application's in-memory object graph (often deeply nested, with objects
referencing other objects) and the flat, tabular structure a relational
database expects, usually bridged with an ORM.

Document databases store self-contained JSON-like documents and shine
when an application's data naturally has a tree structure that is mostly
accessed as a single unit (a resume, a blog post with comments), giving
better locality than the equivalent normalized relational schema would.
They tend to handle one-to-many relationships more naturally than
many-to-many ones, since documents lack an efficient way to reference and
join other documents from a different collection.

> [!card] mcq
> Which situation favors a document model over a normalized relational
> schema?
> - [x] Data with a tree-like structure that is almost always loaded and updated as one self-contained unit
> - [ ] Data with many-to-many relationships requiring frequent joins across entities
> - [ ] Data requiring multi-object transactions spanning many collections
> - [ ] Data whose schema must be enforced strictly at write time ^card-cazy

Document databases are typically described as ==schema-on-read==, meaning ^card-r1ey
the structure of the data is implicit and only interpreted when the
application reads it; a relational database with a fixed schema is
schema-on-write, meaning the database enforces structure at write time.

> [!card] recall
> Explain why schema-on-read is often compared to dynamic typing in
> programming languages, and name one advantage this style has when an
> application's data structure changes frequently. ^card-rpf9

Graph databases (property graphs) model data as vertices and edges, each
of which may carry properties, and are suited to data where relationships
are plentiful, varied, and change shape often — such as social networks,
web graphs, or road networks. In a property graph, traversing an
arbitrary-depth chain of relationships is a natural query, whereas the
equivalent in SQL requires recursive queries or repeated self-joins that
get unwieldy quickly.

Vertices in a ==property graph== can have arbitrary key-value properties ^card-3ue1
and one or more labels, and edges also carry a label describing the kind
of relationship and can have their own properties.

> [!card] mcq
> Why are recursive many-hop relationship queries (e.g. "friends of
> friends of friends") typically awkward in a relational database but
> natural in a graph database?
> - [x] SQL requires repeated joins or recursive CTEs for variable-depth traversal, while graph query languages traverse edges directly regardless of depth
> - [ ] Relational databases cannot store relationships between rows at all
> - [ ] Graph databases do not use disk-based storage, so traversal is always faster
> - [ ] SQL does not support the WHERE clause needed to filter friends ^card-4bxu

What does "the network model" (a historical predecessor to relational
databases) require that the relational model does not? :: The network model requires the application to navigate data by following explicit access paths (pointers between records) chosen in advance, whereas the relational model lets a query optimizer choose the access path automatically based on declarative queries. ^card-of38
