---
topic: aws
category: aws-kinesis
tags: [kinesis, poison-records, dead-letter, iterator-age, replay]
citations: ["Amazon Kinesis Data Streams Developer Guide — 'Troubleshooting Amazon Kinesis Data Streams Consumers'"]
---

# Error Handling and Poison Records

`lambda-integration-and-batch-processing.md` covers one specific instance
of a problem that is actually general to every Kinesis consumer, not just
a Lambda-triggered one: a stream is ordered, so a record your consumer
cannot process isn't just one failed record — it's a **head-of-line
block**. Because a shard delivers records in sequence, nothing behind the
stuck record can be processed until the stuck record is resolved one way
or another, whether the consumer is the KCL, a Lambda event source
mapping, or hand-rolled code calling `GetRecords` directly.

That framing forces an honest choice with no third option: a consumer
can either stop and refuse to advance past a record it can't process —
correct, in that nothing is ever silently lost, but unavailable, since
every record behind it also stops — or it can skip the record and keep
going — available, since the stream keeps flowing, but lossy, since that
record's effect never happens.

Why is "a record my consumer can't process" a fundamentally different problem on an ordered stream than on an unordered one? :: On an ordered stream, a shard delivers records to one consumer in sequence, so a record that can't be processed doesn't just fail on its own — it blocks every record behind it on that same shard from being processed at all, turning one bad record into a stall of a whole partition rather than an isolated failure. ^card-rgrw

The standard resolution refuses to accept either extreme outright:
bound the number of retries a record gets, and once that bound is
exceeded, move the record aside to a dead-letter destination and let the
consumer continue past it. This keeps the stream flowing while still
preserving the record — the failure becomes something to go investigate
later, rather than an outage that has to be fixed live before anything
else can proceed.

> [!card] mcq
> Why does the standard poison-record resolution move a record to a
> dead-letter destination after bounded retries, rather than either
> retrying forever or dropping it outright?
> - [x] It preserves the record for later investigation while letting the consumer advance past it, avoiding both an indefinite stall and a silent loss
> - [ ] Dead-lettering makes the record's processing succeed on a later attempt automatically
> - [ ] It's required by Kinesis itself and cannot be disabled
> - [ ] It converts the record into a new partition key to avoid the same shard again ^card-3awu

`vault/aws/messaging/dead-letter-queues-and-redrive.md` covers this same
move for SQS in detail, including why redriving a dead-lettered message
back is a manual step rather than automatic.

A poison record is often not actually the record's own fault. A schema
change on the producer side, or a downstream dependency the consumer
depends on being temporarily unreachable, can make an otherwise
perfectly normal record fail every single time it's attempted — right up
until the schema is fixed or the dependency comes back.

This is why a retry policy has to distinguish ==transient== failures ^card-leas
from permanent ones rather than treating every failure the same way:
misjudging a downstream outage as permanent gives up on (and
dead-letters) records that would have succeeded moments later, while
misjudging a genuinely malformed record the other way just delays the
same indefinite stall the bounded-retry approach exists to prevent.

What goes wrong if a Kinesis consumer's retry policy treats every processing failure as transient and simply keeps retrying forever? :: A record that is genuinely unprocessable — malformed, or permanently incompatible with the consumer's logic — never gets retried successfully no matter how many attempts it gets, so the consumer stalls on it indefinitely instead of ever reaching the bounded-retry-then-dead-letter path that would let the stream keep flowing. ^card-jqas

What Kinesis offers that most queue-based systems don't is a real
recovery path even after a record has been dead-lettered or skipped:
because records stay in the stream for their full ==retention period== ^card-xz4g
rather than being deleted once read, a fixed consumer can go back and
re-read exactly the records it missed, rather than having lost them the
moment they were first (mis-)processed.

Being able to point a corrected consumer at an old sequence number and
replay forward from there — instead of the data being gone the moment a
queue-based consumer acknowledged and deleted it — is a genuine advantage
a stream has over a queue for this failure mode specifically.

> [!card] recall
> A consumer's schema-validation logic has a bug that causes it to reject
> 5% of records for two hours before anyone notices and fixes it.
> Explain why a Kinesis stream makes this recoverable in a way a
> standard at-least-once queue with short retention would not, once the
> bug is fixed.
> ---
> Kinesis retains every record, including the ones the buggy consumer
> rejected, for the stream's full retention period rather than deleting
> them once delivered. Once the bug is fixed, the consumer (or a
> corrected one) can re-read starting from an earlier sequence number and
> reprocess the records it originally rejected. A queue that deletes a
> message as soon as it's acknowledged (or dead-lettered) has no such
> record to go back to — whatever wasn't captured elsewhere is gone for
> good, independent of whether the underlying bug ever gets fixed. ^card-fvo6

The signal that tells you a consumer is falling behind or stuck before
it turns into a multi-hour outage is its **IteratorAge** — a metric
measuring the gap between now and the timestamp of the last record it
processed, which climbs steadily whenever a consumer can't keep pace
with incoming records, whether from a genuine stall or ordinary
under-provisioning.

The metric side of this — thresholds, alarms, and what a rising
IteratorAge should trigger operationally — is developed further in
`hot-shards-and-monitoring.md`.

Does a rising IteratorAge, on its own, tell you whether a consumer is stuck on a poison record versus simply under-provisioned for its current volume? :: No — IteratorAge only measures how far behind the consumer's last processed record is from the current time; both a head-of-line block on a poison record and ordinary insufficient read capacity produce the same rising IteratorAge, so distinguishing the cause requires looking at the consumer's own error logs or retry counts alongside it. ^card-bqsh
