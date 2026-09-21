---
topic: aws
category: aws-kinesis
tags: [kinesis, sqs, msk, kafka, architecture, synthesis]
citations: ["Amazon Kinesis Data Streams Developer Guide — 'What Is Amazon Kinesis Data Streams?'"]
---

# Choosing Between Kinesis, SQS, and MSK

`aws-messaging/choosing-between-sqs-sns-and-eventbridge.md` already
settles SQS against SNS and EventBridge; this note doesn't re-derive
what a queue is, only what separates a stream from one. The two
services are often reached for interchangeably, but they rest on a
single structural difference, and everything else — fan-out, replay,
retry semantics — follows from it rather than standing as an independent
feature to compare.

A Kinesis stream is a ==replayable== log read by position: many ^card-9ign
independent consumers each track their own read position (a sequence
number or checkpoint) against the same underlying data, and reading
never removes anything. An SQS queue delivers each message to exactly
one consumer, which then deletes it — reading is destructive by design.

Why does "many consumers each tracking their own position" make multi-consumer fan-out and replay natural in Kinesis but awkward to bolt onto SQS? :: Because nothing about reading a Kinesis stream affects what any other consumer can read — each one just keeps its own position, so adding a new consumer or rewinding an existing one to reprocess history costs nothing and touches no other reader. SQS instead removes a message once it's been successfully processed, so there is only one logical "copy" to consume; supporting several independent consumers means fanning the queue's contents out to several queues ahead of time (typically via SNS), not something the queue does on its own. ^card-she9

That same distinction cuts the other way, too: per-message retry,
visibility timeouts, and independent per-message lifetimes are natural
in SQS and simply don't exist in Kinesis.

> [!card] mcq
> A team needs each unit of work retried independently on failure, with
> other in-flight messages unaffected, and no requirement that any
> consumer replay old messages. Which property makes SQS, not Kinesis,
> the natural fit here?
> - [x] SQS tracks per-message visibility and redelivery independently for each message; Kinesis has no per-record retry concept, only a shared read position per consumer
> - [ ] SQS supports more consumers per topic than Kinesis supports per stream
> - [ ] Kinesis cannot scale to the required throughput
> - [ ] SQS is cheaper at every volume, which is the deciding factor here ^card-kz4a

Both services order things, but not the same thing or the same way.
Kinesis orders records ==per shard== by partition key — everything ^card-8kee
hashing to the same shard arrives in write order. SQS FIFO orders per
message group, a similar idea in spirit but a different mechanism.

Its own throughput and dedup rules are covered in
`standard-vs-fifo-queues.md` rather than repeated here.

**MSK** (managed Kafka) is a legitimate third option, not just Kinesis
with extra steps. The honest reasons to reach for it: an organization
already running Kafka elsewhere, retention needs that go beyond what
Kinesis offers (Kafka retention can be arbitrarily long, even
==unlimited==), log compaction (keeping only the latest value per key ^card-psp9
rather than every event), or wanting portability that doesn't lock the
architecture to AWS.

What is the real cost of choosing MSK over Kinesis for those benefits, rather than a feature it lacks? :: Operational complexity. MSK still means running and tuning a Kafka cluster — brokers, partitions, ZooKeeper/KRaft, upgrades — where Kinesis's shard model is a fully managed abstraction over the same underlying idea. Choosing MSK trades away that managed simplicity in exchange for retention flexibility, compaction, and portability; it isn't a strictly better version of the same service. ^card-j8jj

`firehose-and-delivery-to-destinations.md` covers the fourth option,
which fits when none of this matters: if the goal is only landing data
somewhere (S3, Redshift, OpenSearch, Splunk, an HTTP endpoint) with no
consumer application and no replay requirement, Firehose is simpler than
standing up a stream, a queue, or a Kafka cluster at all.

> [!card] recall
> Walk through the decision rule for picking among Kinesis, SQS, and MSK
> for a new pipeline: what three questions would you ask, and what
> answer to each points toward which service?
> ---
> First, do consumers need to replay history or does more than one
> independent consumer need to read the same data at its own pace? If
> yes, that rules out plain SQS and points at Kinesis or MSK. Second, is
> ordering naturally per-key (route by an entity id) or per-message
> (strict FIFO on a queue)? Per-key ordering fits Kinesis's shard model;
> per-message FIFO fits SQS FIFO. Third, is the team willing to operate a
> Kafka cluster to get longer retention, compaction, or AWS portability?
> If yes, MSK; if no, Kinesis gets the same replayable-log shape with
> less operational burden. ^card-2eo1

Reducing the choice to "which has more features" misses the point:
==replay== and independent multi-consumer reads are the properties SQS ^card-wylq
structurally cannot offer no matter how it's configured, and per-message
retry lifetimes are the property Kinesis structurally cannot offer no
matter how it's configured — the decision is about which structural
shape the workload actually has, with MSK and Firehose sitting at the
two edges of that same Kinesis-shaped territory.
