---
topic: aws
category: aws-messaging
tags: [sqs, sns, eventbridge, architecture, synthesis]
citations: ["AWS Developer Guide — Amazon EventBridge, 'Choosing between Amazon EventBridge, Amazon SNS, and Amazon SQS'"]
---

# Choosing Between SQS, SNS, and EventBridge

The three services solve overlapping-sounding problems, but each one
optimizes for a different shape of relationship between producer and
consumer, and the right choice usually falls out of naming which shape
your actual problem has rather than comparing feature lists.

Reach for **SQS** when there is one logical unit of work per message and
you want a pool of workers pulling from a shared backlog at their own
pace — the queue-as-buffer model in `sqs-queue-model.md`. Its defining
properties (`visibility-timeout.md`, `dead-letter-queues-and-redrive.md`,
`long-polling-and-batching.md`) are all about safely and efficiently
managing that pull-based backlog, not about notifying multiple unrelated
parties. Within SQS, whether ordering and dedup (FIFO) are worth the
throughput cost is its own decision — see `standard-vs-fifo-queues.md`.

Reach for **SNS** when one event needs to reach several independent
subscribers that each do something different with it, and you control
(or at least enumerate) that ==subscriber list== — the fan-out model in ^card-0d91
`sns-and-fan-out.md`. `message-filtering.md` narrows what each subscriber
receives, but the routing primitive underneath is still "this topic's
current subscriptions," decided by who subscribed, not by the event's
content.

Reach for **EventBridge** when routing itself needs to be driven by the
content of the event rather than a static subscriber list — when adding
a new consumer for events that already exist should be a new rule, not a
change to the producer or to every existing consumer
(`eventbridge-and-event-routing.md`). It is also the natural choice when
events originate from many AWS services or SaaS integrations rather than
from one application publishing to its own topic.

> [!card] mcq
> A team is building a system where a checkout event should trigger
> billing, inventory, and analytics, and they expect to add more
> unrelated consumers over time without touching the checkout service or
> existing consumers. Which service's routing model most directly matches
> what they want to add consumers into?
> - [x] EventBridge, because a new consumer is just a new rule matched against the event's existing content, not a change anyone upstream or downstream has to make
> - [ ] SQS, because a shared queue is the simplest way to add more consumers
> - [ ] A single SNS topic with no filter policies, since every subscriber already gets every message
> - [ ] None of these; a static subscriber list can't be extended without code changes in any of the three ^card-3s5v

These services also compose rather than compete: fanning an SNS topic
out to several SQS queues (`sns-and-fan-out.md`) gets pub/sub's reach
combined with a queue's durability and backpressure at each destination,
and an EventBridge rule can target an SQS queue as easily as it can
target a Lambda function, giving content-based routing a durable landing
spot on the other end.

Why would a team put an SQS queue behind each SNS subscription instead of subscribing each consumer's compute (Lambda, HTTP endpoint) directly to the topic? :: Because a queue in front of a consumer absorbs load spikes and survives that consumer being temporarily down — the message waits in the queue rather than depending on SNS's own retry policy for a directly-subscribed endpoint, matching the durability point made in sns-and-fan-out.md. ^card-5e2z

Regardless of which of the three sits in the middle, the delivery
contract a consumer must design for is the same one described in
`idempotency-and-exactly-once.md`: at-least-once by default, with
duplicate-safe (idempotent) processing as the application's
responsibility rather than something any of these services fully hands
you for free.

What single assumption should hold across an SQS consumer, an SNS-via-SQS consumer, and most EventBridge targets, regardless of which of the three routed the message? :: The consumer may receive the same logical message more than once and must be written to handle that safely (idempotently), since none of the three provides an unconditional exactly-once delivery guarantee. ^card-7cav

> [!card] recall
> A colleague proposes using EventBridge for everything, arguing it can
> subsume both SQS and SNS since it can target a queue or invoke many
> rules. Explain what capability they would be giving up by replacing a
> plain SQS-backed worker pool with an EventBridge rule targeting that
> same queue, referring to what visibility-timeout.md and
> dead-letter-queues-and-redrive.md actually depend on. ^card-upbh

Between SNS and EventBridge, which one's routing decision depends on who has subscribed, and which one's depends on what the event itself contains? :: SNS's fan-out depends on the current subscription list attached to the topic; EventBridge's rule matching depends on the event's own fields (source, type, nested detail), independent of any fixed subscriber list. ^card-sh6s
