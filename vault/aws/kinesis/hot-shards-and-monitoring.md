---
topic: aws
category: aws-kinesis
tags: [kinesis, hot-shard, monitoring, iterator-age, throttling]
citations: ["Amazon Kinesis Data Streams Developer Guide — 'Monitoring the Amazon Kinesis Data Streams Service with Amazon CloudWatch'"]
---

# Hot Shards and Monitoring

`resharding-and-capacity-modes.md` covers how to change shard count;
this note covers the failure that makes you need to, and how to see it
coming before it becomes data loss. `aws-observability/alarms-evaluation-and-missing-data.md`
covers how an alarm itself evaluates and fires — this note only covers
which Kinesis metrics are worth watching and why.

Throughput limits in Kinesis apply ==per shard==, not to the stream as a ^card-f118
whole. A stream can be sitting at a fraction of its aggregate provisioned
capacity and still throttle constantly, because one shard is taking a
disproportionate share of the traffic while the others sit idle — a
**hot shard**.

Why can a stream throttle even when its total provisioned throughput comfortably exceeds total incoming traffic? :: Because Kinesis enforces read and write limits per individual shard, not against the stream's aggregate capacity. If partition keys route traffic unevenly, one shard can exceed its own limit and throttle while the stream's other shards are far under theirs, so total headroom says nothing about whether any single shard is overloaded. ^card-7r1x

Almost every hot shard traces back to the same root cause: ==partition ^card-y7d5
key== distribution. A key with disproportionate volume (a dominant
customer ID, a fixed constant used by mistake) always hashes to the same
shard, concentrating traffic there no matter how many shards the stream
has.

Seeing a hot shard is harder than it should be by default. The
stream-level metrics `WriteProvisionedThroughputExceeded` and
`ReadProvisionedThroughputExceeded` tell you *that* the stream is
throttling, but not which shard is responsible — that requires enabling
==shard-level== metrics separately, at extra cost, per shard. ^card-ugc8

> [!card] mcq
> A stream is emitting `WriteProvisionedThroughputExceeded` datapoints,
> but the on-call engineer can't tell which of the stream's 20 shards is
> causing it. What is missing?
> - [x] Shard-level metrics were never enabled; the stream-level metric alone can't attribute throttling to a specific shard
> - [ ] The stream needs to be resharded before any attribution is possible
> - [ ] `WriteProvisionedThroughputExceeded` only fires when every shard is throttling simultaneously
> - [ ] Attribution requires enabling enhanced fan-out on the throttling shard ^card-ssp7

On the consumer side, one metric outranks the rest: ==IteratorAge==, how ^card-2uyk
far behind the current record a consumer's read position is. A rising
value means the consumer is losing ground against incoming writes.

What makes a rising IteratorAge more urgent than an ordinary "consumer is slow" performance problem? :: Records only live in the stream for the configured retention period. If IteratorAge keeps climbing, the consumer's read position will eventually fall behind data that ages out and is permanently deleted — turning a performance issue into a hard deadline: the consumer must catch up before its own lag exceeds retention, or the unread records are gone for good. ^card-y8xl

Two other metrics round out the picture: `GetRecords.Success` (whether
the consumer's read calls are succeeding at all) and
`PutRecords.FailedRecords` (how many records within a batch put actually
failed, since a batch call can partially succeed).

> [!card] recall
> `PutRecords.FailedRecords` is climbing steadily on a stream that has
> plenty of aggregate provisioned capacity. Walk through the diagnosis in
> order: what you'd check first, and why the fix you'd reach for depends
> on whether the root cause is key distribution or total volume.
> ---
> Check shard-level metrics first (enabling them if they aren't already
> on) to see whether the failures concentrate on one or two shards rather
> than spreading evenly — that distinguishes a hot shard from genuine
> across-the-board undercapacity, and aggregate capacity headroom already
> rules out the latter. If it's concentrated, the root cause is almost
> always partition key distribution, so the fix is changing the key
> rather than adding shards or raising throughput. ^card-2yn6

The fixes, in order of preference: fix the partition key so traffic
spreads evenly, split the specific hot shard if the key can't easily
change, or move the stream to on-demand capacity mode if traffic is
unpredictable enough that manual shard management keeps recurring.

Why does splitting a hot shard without addressing its partition key usually just recreate the problem? :: Splitting divides a shard's hash key range in two, but if the same disproportionate key still hashes into one of the two resulting ranges, that child shard inherits the same lopsided share of traffic — the split changes shard boundaries, not the traffic pattern that made the original shard hot. ^card-09tj
