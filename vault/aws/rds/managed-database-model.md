---
topic: aws
category: aws-rds
tags: [rds, managed-database, shared-responsibility, operations]
citations: ["AWS User Guide — Amazon RDS, 'What is Amazon RDS?'"]
---

# The Managed Database Model

Amazon RDS does not replace the database engine — it wraps a real engine
(MySQL, PostgreSQL, and others) with automation for the operational tasks
that look the same no matter what schema you put on top. Where that
automation stops, and what stays entirely yours, is the one fact the rest
of this category assumes you already understand.

RDS takes over the tasks that are identical for every workload running the
same engine: applying operating-system and ==engine patches==, taking ^card-z1fv
scheduled backups, monitoring instance health, and orchestrating failover
to a standby when the primary becomes unreachable.

RDS hands you an instance endpoint, but not the discipline behind it — how
many ==connections== your application opens, how it retries after a ^card-8fvc
failover, and how it pools them across requests are choices no amount of
managed automation makes for you.

==Schema design==, query construction, index selection, and access control ^card-zi03
remain entirely your responsibility — RDS has no visibility into whether a
query is slow because of a missing index or a badly ordered join.

That split is worth keeping explicit, because it's easy to read "managed"
as "handled" and stop thinking about the parts that were never in scope.
Every other note in this category assumes you've internalized it — a note
about read replicas or Multi-AZ is really a note about how RDS automates
one specific piece of the infrastructure half of that split, never the
data-modeling half.

> [!card] mcq
> Which of these stays the application owner's responsibility under RDS's managed model?
> - [x] Choosing which columns to index for a given query pattern
> - [ ] Applying minor-version engine patches
> - [ ] Orchestrating failover to a standby instance
> - [ ] Taking automated daily backups ^card-e9ws

What does RDS's managed model NOT do for you? :: It does not design your schema, choose your indexes, tune your queries, or manage how your application pools and reuses connections — those decisions depend on a specific workload that RDS has no way to infer. ^card-imh3

Why won't RDS's automated maintenance fix a query that's slow because of a missing index? :: Patching, backups, and failover orchestration operate on the instance and the engine binary, not on the logical schema or the plans your query optimizer chooses — adding the index is still on you. ^card-xni1

> [!card] recall
> Explain why "managed database" is a narrower promise than it sounds:
> what categories of operational risk does RDS remove, and what categories
> of correctness or performance risk does it leave completely untouched? ^card-3m9q
