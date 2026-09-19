---
topic: aws
category: aws-messaging
tags: [sqs, queues, delivery-semantics, decoupling]
citations: ["AWS Developer Guide — Amazon Simple Queue Service, 'How Amazon SQS works'"]
---

# The SQS Queue Model

SQS decouples a producer from a consumer by sitting a durable buffer
between them: the producer's `SendMessage` call returns as soon as the
message is stored, without waiting for anything downstream to read it.
The consumer polls on its own schedule, so the two sides can run at
different rates, scale independently, and survive each other's outages.

A message is not removed from the queue just because a consumer read it.
==ReceiveMessage== hands a copy of a message to a consumer and starts its ^card-or3x
visibility timeout, but the message still physically remains in the
queue.

Only a subsequent, explicit `DeleteMessage` call — using the receipt
handle returned by that particular receive — actually removes the
message. If the consumer crashes, loses its network connection, or
simply never calls delete before the visibility timeout expires, the
message becomes visible again and can be handed to another consumer.

> [!card] mcq
> A consumer calls ReceiveMessage, then crashes before processing the
> message or calling DeleteMessage. What happens to the message?
> - [x] It stays in the queue and becomes visible again once its visibility timeout expires, so another consumer can receive it
> - [ ] It is permanently lost, since ReceiveMessage already removed it from the queue
> - [ ] SQS automatically retries delivery to the same consumer only
> - [ ] The message is moved to a dead-letter queue immediately ^card-ee74

Why does SQS split retrieval into a separate receive step and delete step, instead of having one call that reads and removes a message atomically? :: So that a consumer's failure between receiving and finishing its work leaves the message recoverable — if delete were implicit in receive, a crash right after receiving would delete a message that was never actually processed, silently losing it. Splitting the steps trades that risk for the opposite one: an unacknowledged message gets redelivered. ^card-51ny

This split is also why SQS's default delivery contract is ==at-least-once== ^card-7xg4
rather than exactly-once: a message can be delivered to a consumer more
than once, either because delete never arrived in time or because SQS's
own distributed, redundant storage occasionally delivers a duplicate copy
even when the consumer behaved correctly.

At-least-once delivery means a consumer must never assume a message it
receives is guaranteed to be new — retries, timeouts, and internal
duplication can all resurface a message it already handled.

> [!card] recall
> A queue with at-least-once delivery and a queue with at-most-once
> delivery each fail differently when something goes wrong. Explain what
> kind of application-level bug each one risks producing if the consumer
> is written as if the queue guaranteed the OTHER semantics. ^card-yuix

Does receiving a message from an SQS queue remove it from the queue? :: No — receiving only starts a visibility timeout that hides the message from other consumers; the message is only removed once the consumer explicitly calls DeleteMessage with the receipt handle from that receive. ^card-3lud

What does a producer's SendMessage call wait for before returning? :: Only confirmation that SQS has durably stored the message — it does not wait for any consumer to read or process it, which is what lets producer and consumer scale and fail independently of each other. ^card-h9q1
