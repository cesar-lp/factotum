---
topic: aws
category: aws-messaging
tags: [sqs, dead-letter-queue, redrive, poison-messages]
citations: ["AWS Developer Guide — Amazon Simple Queue Service, 'Amazon SQS dead-letter queues'"]
---

# Dead-Letter Queues and Redrive

Some messages will never be processed successfully no matter how many
times they are retried — a malformed payload, a message that triggers a
bug, a downstream dependency that will never accept it. Left alone, a
queue with at-least-once delivery keeps redelivering that message
forever, burning consumer capacity on work that can never succeed and
potentially blocking a FIFO group behind it indefinitely.

SQS tracks this with a per-message ==receive count==: the number of times ^card-o5oo
a given message has been delivered (received) without being deleted.
A redrive policy compares that count against a configured maximum and,
once it is exceeded, moves the message to a separate dead-letter queue
instead of returning it to the source queue for another attempt.

The dead-letter queue's job is narrow and deliberate: it is not a retry
mechanism and not a backup. It exists to isolate messages that a normal
consumer has already proven it cannot process, so they stop consuming
retry capacity and stop blocking whatever they were blocking, while
still being preserved (not silently dropped) for a human or a separate
process to inspect.

Redriving messages back from a dead-letter queue to their source queue
— after the underlying bug is fixed or the downstream dependency is
back — is a distinct, ==manual== action (`StartMessageMoveTask`), not ^card-xq0q
something the DLQ does automatically. This is deliberate: if a message
that was moved to a DLQ because it crashed a consumer got redelivered
automatically the moment it arrived, the same crash would just recur, and
the DLQ would provide no isolation at all.

> [!card] mcq
> Why is redriving messages from a dead-letter queue back to the source
> queue a manual, operator-initiated action rather than automatic?
> - [x] Automatic redrive would immediately reintroduce whatever caused the failure in the first place, defeating the DLQ's purpose of isolating problem messages until the underlying cause is actually fixed
> - [ ] SQS has no API for moving messages between queues
> - [ ] Dead-letter queues cannot hold more than one message at a time
> - [ ] Redrive would violate the FIFO deduplication window ^card-9qcq

What determines whether a message is moved to a dead-letter queue? :: Its receive count — the number of times it has been delivered without being deleted — exceeding the maxReceiveCount configured in the source queue's redrive policy. ^card-rt5q

Is a dead-letter queue a retry mechanism? :: No — it is the opposite: a holding area for messages a redrive policy has already given up retrying on the source queue, kept around for inspection rather than automatic reprocessing. ^card-xq48

> [!card] recall
> A team configures a redrive policy with maxReceiveCount set to 1.
> Explain the operational risk of setting this threshold too low, given
> that a message can fail its first attempt for reasons that have nothing
> to do with the message itself (e.g. a transient downstream outage). ^card-xlwj

Why does an unbounded retry loop on a permanently failing message cost more than just wasted consumer time on a FIFO queue specifically? :: Because FIFO enforces per-group ordering, a poison message stuck at the front of its group blocks every message behind it in that same group from being processed at all, not just the poison message itself. ^card-slx2
