---
topic: aws
category: aws-kinesis
tags: [kinesis, ordering, retention, iterators, replay]
citations: ["Amazon Kinesis Data Streams Developer Guide — 'Data retention'"]
---

# Ordering and Retention Guarantees

`streams-shards-and-partition-keys.md` already hints at this, but it is
worth stating as its own guarantee because it is so easy to overstate:
Kinesis orders records **within a shard only**. There is no ordering
guarantee across shards at all, so "Kinesis is an ordered stream" is only
true per partition key — a consumer reading several shards in parallel
sees each shard's own sequence preserved, but no meaningful global order
across the stream as a whole.

> [!card] mcq
> A stream has 4 shards. A consumer application reads all 4 in parallel
> and merges the records it receives into a single output list as they
> arrive. What can it assume about that merged list's order?
> - [x] Nothing globally — only the records within each individual shard are guaranteed to be in order; interleaving across shards depends on timing, not a guarantee
> - [ ] The merged list is fully ordered, since Kinesis timestamps every record
> - [ ] The merged list is ordered as long as all 4 shards use the same partition key scheme
> - [ ] The merged list is ordered because sequence numbers are global across the stream ^card-u8bc

Why does reading multiple shards in parallel and merging the results not reconstruct a meaningful global order, even though each shard individually is perfectly ordered? :: Sequence numbers and ordering are scoped to a single shard, not the stream — there is no shared clock or global counter tying one shard's position to another's, so the arrival order of records pulled from different shards reflects processing timing, not any guarantee Kinesis makes. ^card-o647

Retention is the other guarantee worth pinning down. A stream retains
its records for ==24== hours by default, extendable to 7 days at standard ^card-e1uu
pricing and up to 365 days at extra cost.

What retention window buys is bigger than "how long can I be down before
losing data": because records are neither removed nor mutated when a
consumer reads them, the stream itself is a replayable log. A consumer
with a processing bug can be fixed and then re-run from an earlier
position over data it already saw once, reprocessing it correctly the
second time — a capability a plain queue does not offer once a message
has been deleted after being read.

Why is "a stream is replayable" a more useful way to think about Kinesis retention than "records survive for 24 hours in case of an outage"? :: Because replay works even when nothing failed — a consumer with a logic bug that already processed records incorrectly can rewind and reprocess the same data once the bug is fixed, which is a routine operational tool, not just a disaster-recovery fallback; a queue that deletes messages on read cannot offer this at all. ^card-dp4u

Where a consumer starts reading from within that retained window is
controlled by its **iterator type**, chosen when it begins consuming a
shard. `TRIM_HORIZON` starts at the oldest record still within the
retention window. `AT_SEQUENCE_NUMBER` and `AFTER_SEQUENCE_NUMBER` resume
from an exact, previously recorded position. `AT_TIMESTAMP` starts at the
first record at or after a given time.

`LATEST` starts consuming only records written *after* the iterator is
created — anything already in the stream, including everything written
in the seconds right before the consumer started, is never seen.

> [!card] recall
> A consumer application crashes and is restarted five minutes later
> using a LATEST iterator instead of resuming from a saved checkpoint.
> Explain exactly what data is lost, and why LATEST is a dangerous
> default choice for anything other than a first-time consumer that
> genuinely does not care about history.
> ---
> LATEST only returns records written after the new iterator is created,
> so every record written to that shard during the five minutes the
> consumer was down — and anything written before it started in the
> first place — is simply skipped, not queued or delivered late. It
> looks like the "start fresh" option and reads that way in code, which
> is exactly why it is dangerous: a restart after a crash silently drops
> a window of data instead of erroring, and nothing in the API surfaces
> that loss. A production consumer almost always wants TRIM_HORIZON from
> a saved checkpoint instead, which is exactly what consumer
> checkpointing exists to make practical. ^card-hacn

What is the difference between resuming a shard with AT_SEQUENCE_NUMBER versus AFTER_SEQUENCE_NUMBER for a given sequence number? :: AT_SEQUENCE_NUMBER starts by returning that exact record again, while AFTER_SEQUENCE_NUMBER starts with the next record following it — the choice matters for a consumer resuming from a checkpoint that already recorded the last record it fully processed, which should use AFTER to avoid reprocessing it. ^card-xy3p

One more property of retention matters beyond replay: records are
==immutable== once written and cannot be deleted before their retention ^card-gxjm
window expires, even on request. That is a real constraint for anything
privacy-sensitive — a record containing personal data that needs to be
purged on request cannot simply be deleted from Kinesis; it has to be
handled by encrypting sensitive fields before they are ever written, or
by controlling what reaches the stream in the first place, since Kinesis
itself offers no mechanism to remove one.
