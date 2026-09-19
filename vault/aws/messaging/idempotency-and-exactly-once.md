---
topic: aws
category: aws-messaging
tags: [idempotency, exactly-once, deduplication, at-least-once]
citations: ["AWS Developer Guide — Amazon Simple Queue Service, 'Amazon SQS FIFO queues'"]
---

# Idempotency and "Exactly-Once"

`vault/data-systems/distributed-trouble.md` establishes why a sender can
never be certain whether a request it got no acknowledgment for actually
succeeded — the request, its processing, or the response could each have
been delayed or lost independently. Message queues inherit this problem
exactly: a consumer's delete acknowledgment can be lost even though the
consumer finished the work, and there is no way for SQS to distinguish
that from the consumer never finishing at all. Given that ambiguity, the
only safe default is to redeliver, which is why every SQS queue is
at-least-once by default and why FIFO's stronger guarantee is scoped the
way it is (see `standard-vs-fifo-queues.md`).

This is why true exactly-once ==delivery== is not achievable for a queue ^card-7uc3
built on an unreliable network.

Guaranteeing a message arrives neither zero times nor more than once
would require the sender to know for certain that exactly one attempt
succeeded, which is the same unresolvable ambiguity
distributed-trouble.md describes for any request over an asynchronous
network.

What systems actually offer instead is exactly-once ==processing==: not a ^card-p0jf
promise that a consumer's code only ever runs once per message, but a
promise that duplicate deliveries can be detected and neutralized so
their *effect* only happens once. FIFO's deduplication window is one
version of this, implemented by the queue; consumer-side idempotency is
the other version, implemented by the application.

> [!card] mcq
> Which statement correctly distinguishes "exactly-once delivery" from
> "exactly-once processing"?
> - [x] Exactly-once delivery would mean a message physically arrives exactly once, which an unreliable network can't guarantee; exactly-once processing means duplicates may still arrive, but their effect is applied only once
> - [ ] They describe the same guarantee; the terms are interchangeable
> - [ ] Exactly-once processing means a consumer is only ever invoked once, full stop
> - [ ] Exactly-once delivery is what FIFO queues provide, and processing-level dedup is unnecessary on them ^card-um52

The practical way an application achieves exactly-once processing on top
of at-least-once (or FIFO) delivery is ==idempotency==: designing the ^card-6tmq
consumer's write so that applying the same message a second time
produces the same end state as applying it once, typically by keying the
write on a unique ID carried in the message and either checking that ID
before acting or using a natively idempotent operation (e.g. `SET`
rather than `INCREMENT`).

Why is an `INCREMENT balance BY 10` operation dangerous to run from a message consumer that might receive the same message twice, while a `SET balance TO 110` operation is not? :: INCREMENT is not idempotent — running it twice applies the change twice (adding 20 instead of 10); SET to an absolute value produces the same end state no matter how many times it's applied, so a duplicate delivery is harmless. ^card-2q7z

`vault/data-systems/transactions.md` describes the lost-update anomaly,
where two concurrent writes to the same object cause one to silently
vanish. A duplicate message processed as two independent, non-idempotent
writes is a self-inflicted version of that same anomaly — the "two
writers" are just the same logical write arriving twice, and the fix is
the same in spirit: make the write's outcome depend on something more
than "did a write of this shape arrive," such as a deduplication ID
checked against a store of IDs already applied, analogous to how a
fencing token lets a resource reject a write it has already seen a newer
version of.

> [!card] recall
> A consumer processes messages by writing "append this line to a log
> file" for each one, and receives the same message twice due to a
> visibility timeout expiry. Explain why this particular operation is
> naturally NOT idempotent, and describe one concrete change to the
> consumer's logic that would make it idempotent without changing what
> the log is used for. ^card-js0w

Besides an idempotent write operation, what information does a consumer typically need in hand to detect that "this message" has already been applied? :: A stable, unique identifier for the message or the underlying event (a dedup ID, an idempotency key) that survives redelivery unchanged, plus somewhere durable to record which IDs have already been applied, so a duplicate can be recognized and skipped rather than reapplied. ^card-ajur
