---
topic: aws
category: aws-rds
tags: [rds, multi-az, failover, availability, synchronous-replication]
citations: ["AWS User Guide — Amazon RDS, 'Configuring and managing a Multi-AZ deployment'"]
---

# Multi-AZ and Failover

Multi-AZ is RDS's high-availability feature: a standby copy of the primary
instance kept in a different availability zone, promoted automatically
when the primary becomes unhealthy. `data-systems/replication.md` frames
the general tradeoff between synchronous and asynchronous replication —
Multi-AZ is RDS committing firmly to the synchronous side of that line for
one specific purpose: surviving a single instance or AZ failure without
losing acknowledged writes.

RDS replicates writes to the standby ==synchronously==: the primary waits ^card-f94b
for confirmation before acknowledging the client, trading some write
latency for the guarantee that whichever copy ends up promoted has every
write the client was told succeeded.

Failover does not move an IP address between machines — it repoints
==DNS==. The instance's stable endpoint is a CNAME, and promoting the ^card-h562
standby means updating that CNAME to resolve to the new primary; clients
holding open connections to the old primary see them drop and must
reconnect to re-resolve the name.

Because failover forces every client to drop and re-establish its
connection, an application that never retries a failed connection attempt
will treat a successful failover as an ==outage==, even though RDS ^card-by03
completed its half of the job correctly.

The standby in a classic Multi-AZ deployment sits idle for reads — it
exists purely so there is somewhere to fail over to, not to absorb query
load. That is why Multi-AZ is an availability feature rather than a
scaling feature: it protects against losing the primary, but it does
nothing to spread read traffic across more capacity.

> [!card] mcq
> What does an RDS Multi-AZ failover actually change from the client's perspective?
> - [x] The instance endpoint's DNS record now resolves to the promoted standby, and existing connections must be re-established
> - [ ] The instance's IP address is migrated live to the new primary with no DNS change
> - [ ] Nothing changes; failover is fully transparent to open connections
> - [ ] The application must be redeployed with a new connection string ^card-y85o

Why is Multi-AZ described as an availability mechanism rather than a read-scaling mechanism? :: Its standby exists only to be promoted on failure; it isn't serving reads in the meantime, so adding a Multi-AZ standby doesn't add any read capacity — it only shortens recovery time after the primary fails. ^card-ojuf

What must a client application do to actually benefit from a Multi-AZ failover, and what happens if it doesn't? :: It must detect the dropped connection and retry, re-resolving the endpoint's DNS so it reaches the newly promoted primary; an application that just retries against the same cached connection or IP will keep failing even after RDS has successfully failed over. ^card-v8dk

> [!card] recall
> Explain why synchronous replication to the standby is the piece that
> makes Multi-AZ failover safe with respect to acknowledged writes, and
> what it costs the primary in exchange. ^card-8fsb
