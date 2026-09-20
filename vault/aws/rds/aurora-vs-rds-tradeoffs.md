---
topic: aws
category: aws-rds
tags: [aurora, rds, tradeoffs, compatibility, cost]
citations: ["AWS User Guide — Amazon Aurora, 'Aurora versus RDS for MySQL and PostgreSQL'"]
---

# Aurora vs RDS: Tradeoffs

`aurora-architecture.md` explains what Aurora's shared-storage design
changes mechanically. This note is about when that change is worth having
— because Aurora is not a strictly better version of RDS, it's a different
point on the cost-and-compatibility curve that wins for some workloads and
loses for others.

Aurora's advantage compounds with ==read replica== count: because replicas ^card-g0u5
share the writer's storage instead of copying it, a fleet of several
replicas costs little extra in lag or storage duplication compared with
standard RDS, where each replica pays the same asynchronous-copy tax
independently.

Workloads with a large working set or bursty, high-throughput I/O tend to
benefit from Aurora's distributed storage layer, which spreads reads and
writes across many ==storage nodes== instead of one instance's attached ^card-18rl
volume — a bottleneck standard RDS storage doesn't have the same structure
to avoid.

None of that comes free. Aurora is a proprietary storage and replication
layer wearing a MySQL- or PostgreSQL-==compatible== wire protocol, not the ^card-kg1p
open-source engine unmodified — some extensions, replication features, or
low-level engine behaviors that standard RDS passes straight through from
the open-source engine don't have an Aurora equivalent.

For a small, low-traffic workload, Aurora's architecture is mostly
overhead you're not using: the benefits of shared distributed storage and
cheap replica fan-out matter most exactly when write volume, read fan-out,
or working-set size are large enough to strain a single attached volume in
the first place — below that point, a standard RDS instance is the simpler
and often cheaper choice.

> [!card] mcq
> A workload with light, steady traffic and no read replicas is choosing between standard RDS and Aurora for the same engine. What's the strongest argument for standard RDS here?
> - [x] Aurora's shared-storage and cheap-replica-fanout advantages matter most under load this workload doesn't generate
> - [ ] Aurora cannot run PostgreSQL-compatible workloads at all
> - [ ] Standard RDS instances are always faster than Aurora at every scale
> - [ ] Aurora requires manual failover configuration that RDS provides automatically ^card-0r55

Why does adding read replicas favor Aurora more than it favors standard RDS, as a workload scales out reads? :: Aurora replicas share the writer's storage volume rather than each copying the dataset independently, so each additional replica adds little extra lag or storage cost, while each standard RDS read replica pays its own asynchronous-copy overhead separately. ^card-xild

What kind of compatibility gap should you expect when moving a workload from an open-source engine on standard RDS to its Aurora-compatible equivalent? :: Aurora reimplements storage and replication under a compatible wire protocol rather than running the open-source engine unmodified, so some extensions, replication behaviors, or engine internals that standard RDS exposes directly may not have an equivalent on Aurora. ^card-mea0

> [!card] recall
> Explain why "Aurora is strictly better" is the wrong mental model — name
> a workload characteristic that makes Aurora's architecture pay off, and
> one that makes it mostly unused overhead. ^card-2we6
