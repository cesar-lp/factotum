---
topic: aws
category: aws-rds
tags: [aurora, storage-engine, distributed-storage, replication, failover]
citations: ["AWS User Guide — Amazon Aurora, 'Aurora storage and reliability'"]
---

# Aurora Architecture

Standard RDS instances each own their own attached storage: compute and
storage fail together, and a replica needs its own full copy of the data.
Aurora's defining move is splitting those two apart — the reason its
replication and failover behave differently from every other engine RDS
offers isn't a tuning choice, it's a different architecture underneath.

Aurora separates the database engine process, which handles query
execution and transaction logic, from a ==distributed storage volume== that ^card-k821
lives underneath it and is shared by every instance attached to that
cluster — the engine no longer owns a private copy of the data files it
reads and writes.

Because that storage layer is shared, an Aurora replica doesn't hold a
second copy of the dataset the way a standard read replica does — it
attaches to the same volume the writer uses and replicates by streaming
==redo log records== from the writer, applying only the minimal state ^card-lzpn
needed to serve reads consistently.

That shared volume is itself replicated across multiple availability zones
below the compute layer, independent of how many database instances are
attached to it — durability is a property of the storage layer, not of
any single compute instance running on top of it.

Failover in Aurora is fast for the same reason replica lag is small: the
instance taking over doesn't need to catch up on data files it never had
a private copy of. It already has access to the same shared volume the
old writer was using, so ==promotion== is mostly a matter of the new ^card-0cer
writer starting to accept writes against storage it can already see.

> [!card] mcq
> What fundamentally distinguishes an Aurora replica from a standard RDS read replica?
> - [x] It attaches to the same shared storage volume as the writer instead of holding its own copy of the data
> - [ ] It uses synchronous rather than asynchronous replication
> - [ ] It runs a different database engine than the writer
> - [ ] It cannot be promoted to accept writes under any circumstances ^card-le5p

Why does decoupling compute from storage make Aurora failover faster than promoting a standard RDS read replica? :: The instance being promoted already has access to the same underlying storage volume the writer used, so there's no private copy of the data to catch up on first — promotion mainly means starting to accept writes against storage it could already read. ^card-vklm

In Aurora, what layer is responsible for surviving an availability-zone failure without losing committed data, and what layer is not? :: The distributed storage volume itself replicates across availability zones and is responsible for durability; the compute instances running the engine are not — they can fail and be replaced without the storage layer losing anything. ^card-4d4a

> [!card] recall
> Explain why treating storage as a separate, shared distributed system —
> rather than something each database instance owns privately — changes
> what "adding a replica" means in Aurora compared with standard RDS. ^card-0r0g
