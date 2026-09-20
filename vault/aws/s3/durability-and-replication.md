---
topic: aws
category: aws-s3
tags: [durability, replication, cross-region, failure-domains]
citations: ["AWS Developer Guide — Amazon S3, 'Replication'"]
---

# Durability and Replication

S3's durability marketing number is famous, but the number itself isn't
the useful thing to remember — it drifts, and quoting it teaches nothing
about how it's achieved. What's worth understanding is the mechanism
underneath it, and how that's different from the optional replication
features you configure yourself.

S3 achieves its durability by storing redundant copies of each object
==across multiple devices== in multiple facilities within a region, so ^card-7c1u
that the loss of any single device, or even an entire facility, does not
lose the object.

This built-in redundancy is automatic and always on; **Cross-Region
Replication (CRR)** and **Same-Region Replication (SRR)** are separate,
opt-in features that copy objects to a *different* ==bucket== after the ^card-hje2
fact, for reasons unrelated to that base durability guarantee.

> [!card] mcq
> Since S3 already stores every object redundantly across multiple
> facilities for durability, what is the primary reason to also
> configure Cross-Region Replication?
> - [x] Reasons like regional disaster recovery, reduced latency for readers in another region, or satisfying a compliance requirement to keep a copy in a separate jurisdiction — not to improve durability, which is already handled
> - [ ] CRR is required for any object to be considered durable at all
> - [ ] CRR replaces the need for versioning
> - [ ] CRR is the only way to prevent accidental deletion ^card-410d

Why is replication (CRR/SRR) not a backup in the traditional sense? :: Replication propagates changes, including deletes and overwrites, to the destination — it is not configured to protect against accidental deletion or corruption of the source object; a delete on the source (subject to versioning and replication rules) leads to a corresponding change on the destination, so replication alone does not give you an independent, isolated recovery point the way a backup does. ^card-4oc5

Replication is ==asynchronous==: after a write to the source bucket ^card-77wb
succeeds and is acknowledged to the client, the copy to the destination
bucket happens afterward, so there is a window — normally short, but not
bounded to zero — during which the destination has not yet caught up.

This is exactly the tradeoff `vault/data-systems/replication.md`
describes for asynchronous single-leader replication: the source
acknowledges the client without waiting for the follower (here, the
destination bucket) to confirm, which keeps writes fast but means a
reader of the destination can observe ==stale== data relative to the ^card-7z5g
source during the propagation window.

> [!card] recall
> A team assumes that because CRR is enabled, they can safely delete
> their source bucket's data once it "looks replicated" in the
> destination region. Explain two separate reasons this assumption is
> risky: one about timing, and one about what replication does and does
> not protect against. ^card-86qe

Does enabling a replication rule on a bucket retroactively copy objects that were already there before the rule existed? :: No — replication rules apply only going forward from the point the rule was created; copying pre-existing objects requires a separate one-time batch replication operation. ^card-xlqu

What must be true of the source bucket and destination bucket for cross-region replication to be configured between them at all? :: Both must have versioning enabled, since replication tracks and reproduces the version history of each object rather than just its current state. ^card-yy37
