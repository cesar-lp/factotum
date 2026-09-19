---
topic: aws
category: aws-messaging
tags: [sqs, fifo, ordering, deduplication, throughput]
citations: ["AWS Developer Guide — Amazon Simple Queue Service, 'FIFO queues'"]
---

# Standard vs FIFO Queues

Standard and FIFO queues make opposite choices on the same tradeoff:
Standard queues are built to move messages as fast as possible and give
up any guarantee about order or duplicates, while FIFO queues give up raw
throughput in exchange for strict ordering and deduplication.

A **Standard queue** makes no ordering promise at all — messages can be
delivered in a different order than they were sent — and does not
deduplicate: the same logical send can occasionally show up as more than
one message, on top of the at-least-once redelivery every SQS queue
already has from visibility timeout expiry.

A **FIFO queue** preserves order and deduplicates sends, but only within
a ==message group== — a set of related messages sharing one ^card-8q1s
`MessageGroupId`. Order is guaranteed within a group, but messages
belonging to different groups can still be delivered interleaved with
each other, so a FIFO queue's ordering guarantee is per-group, not
queue-wide.

> [!card] mcq
> A FIFO queue receives messages from two different `MessageGroupId`
> values, A and B, interleaved. What ordering guarantee actually applies?
> - [x] Messages within group A arrive in send order, and messages within group B arrive in send order, but A's and B's messages can be interleaved with each other
> - [ ] All messages across both groups arrive in one strict global send order
> - [ ] No ordering guarantee applies once more than one message group is in use
> - [ ] FIFO queues only support a single message group per queue ^card-q1z5

FIFO's deduplication uses a ==deduplication window==: SQS treats two ^card-46a4
sends with the same deduplication ID (explicit, or a content hash) as the
same message if the second arrives within that window, and silently
discards the duplicate rather than enqueuing it a second time. Outside
that window, an identical resend is treated as a brand-new message.

This is the precise thing to be careful about calling "exactly-once."
FIFO's documentation describes ==exactly-once processing==, not ^card-f3e8
exactly-once delivery: it eliminates duplicates that originate from the
producer resending within the dedup window, and a message a consumer
receives is not made visible to any other consumer while its visibility
timeout is active. It does not mean a consumer can never receive the same
message more than once for any reason — a consumer that receives a
message, is slow, and lets the visibility timeout lapse before deleting
it will still see that message again, exactly as in a Standard queue.

> [!card] mcq
> What does FIFO's "exactly-once processing" guarantee actually cover?
> - [x] It suppresses duplicate enqueues from resends within the deduplication window; it does not prevent a consumer from ever receiving the same message twice if its own visibility timeout lapses
> - [ ] A message can never be delivered to a consumer more than once, under any circumstance
> - [ ] The consumer is exempt from needing to call DeleteMessage
> - [ ] Deduplication applies queue-wide regardless of message group ^card-31ja

Why would an application deliberately give every message the same `MessageGroupId`, even though that serializes all processing to effectively one consumer at a time? :: Because ordering is only guaranteed within a group — if the application's correctness depends on strict global order across all its messages, a single group is the only way to get that, accepting the throughput cost as the price of the guarantee. ^card-ie9s

What is the practical throughput consequence of FIFO's per-group ordering guarantee, compared to a Standard queue? :: Because SQS must deliver each group's messages in order, it can only have one message from a given group in flight (unprocessed) at a time, so fanning work out across many consumers requires many distinct message groups; a Standard queue has no such constraint and can hand out messages to as many consumers as are polling. ^card-hu2q

> [!card] recall
> A team picks a FIFO queue "to be safe" for a workload that has no actual
> ordering or duplicate-sensitivity requirement. Explain what they are
> giving up, and why Standard would have been the better default absent a
> specific need for FIFO's guarantees. ^card-mx6k
