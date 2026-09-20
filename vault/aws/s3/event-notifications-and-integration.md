---
topic: aws
category: aws-s3
tags: [event-notifications, sqs, sns, lambda, eventbridge]
citations: ["AWS Developer Guide — Amazon S3, 'Amazon S3 Event Notifications'"]
---

# Event Notifications and Integration

S3 can tell other services when something happens to an object, which is
what turns a passive bucket into the trigger for a pipeline: a thumbnail
generator, a search indexer, an audit trail. The design question isn't
whether to wire this up — it's building the downstream consumer so it
survives the delivery guarantees S3 actually makes, not the ones you'd
prefer it made.

S3 can publish an event directly to ==SQS==, SNS, Lambda, or EventBridge ^card-wo23
whenever a configured action (object created, removed, restored, and
more) occurs on the bucket.

Routing events through SNS instead of directly to one queue lets a
single event ==fan out== to multiple independent subscribers — several ^card-y7nt
SQS queues, Lambda functions, or external endpoints — without S3 needing
to know how many consumers exist or configuring each one separately on
the bucket itself.

> [!card] mcq
> A team needs three unrelated services (image resizing, audit logging,
> and search indexing) to each independently process every object
> upload. What's the advantage of publishing to an SNS topic that fans
> out to three SQS queues, over configuring three separate direct S3
> event destinations?
> - [x] Adding or removing a consumer later only means subscribing/unsubscribing from the topic, not editing the bucket's notification configuration each time
> - [ ] SNS is required because S3 can only have one notification destination configured at a time
> - [ ] Direct-to-SQS delivery isn't supported by S3 at all
> - [ ] Fan-out through SNS guarantees exactly-once delivery, unlike direct delivery ^card-odnu

Routing through **EventBridge** instead trades that simplicity for
==filtering== and routing rules defined outside the bucket's own ^card-iyf0
notification configuration — matching on event detail, and delivering to
many more target types than S3's native destinations support directly.

Why would a team choose EventBridge over S3's native event notifications even though it adds a hop? :: Because EventBridge's rule-based routing and content filtering live outside the bucket configuration, and it can fan out to a much wider range of target types (including cross-account and third-party targets) — useful when the routing logic is complex enough that stuffing it into notification config or Lambda glue code doesn't scale. ^card-0iu3

The delivery semantics you must design a consumer around are ==at-least-once== ^card-wogt
and unordered: a single event can be delivered more than once, and two
events for the same object are not guaranteed to arrive in the order the
underlying actions actually happened.

> [!card] recall
> A Lambda function triggered by S3 object-created events writes a row
> to a database keyed by object key, and assumes each event fires
> exactly once and in creation order. Explain a concrete way this
> assumption breaks in production, and one design change that would
> make the function correct despite the actual delivery guarantee. ^card-5z9m

If S3 event delivery doesn't guarantee ordering, how should a consumer that needs an accurate final answer (e.g. "does this key currently exist") treat an incoming event? :: As a hint to go re-check the object's current state directly, rather than trusting the event payload's description of what happened as ground truth — since a later action's event could be processed before an earlier one's. ^card-pklg

What single design principle addresses both of S3 event delivery's guarantees at once — that an event may be duplicated, and that two events may arrive out of order? :: Make event handling idempotent and driven by the object's current state (e.g. re-fetch or compare against a version/timestamp) rather than by the event payload alone, so processing the same event twice or in the wrong order doesn't change the outcome. ^card-mglu
