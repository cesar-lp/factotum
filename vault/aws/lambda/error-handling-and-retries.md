---
topic: aws
category: aws-lambda
tags: [lambda, retries, dead-letter-queue, destinations, idempotency]
citations: ["AWS Lambda Developer Guide — 'Error handling and automatic retries in AWS Lambda', 'Configuring destinations for asynchronous invocation'"]
---

# Error Handling and Retries

Retry behavior in Lambda is not one policy — it is a direct consequence of
the invocation mode covered in `event-sources-and-invocation-modes.md`.
Getting this wrong in either direction (assuming retries happen when they
don't, or assuming Lambda will dedupe them when it won't) is the most
common source of both dropped events and duplicate side effects in
production Lambda systems.

For a ==synchronous== invocation, Lambda does not retry a function error ^card-13c1
on the caller's behalf at all — the caller receives the error directly and
any retry has to be code the caller itself writes.

Why does it make sense that Lambda leaves retries to the caller for a synchronous invocation, rather than retrying internally the way it does for async? :: The caller is already there, waiting on the result, and is in the best position to decide whether retrying is safe or useful for that specific request (e.g. it may already have its own backoff and circuit-breaker logic) — Lambda retrying silently underneath a caller that is also blocked and waiting would just add latency the caller didn't ask for. ^card-0aj4

For an ==asynchronous== invocation, Lambda's internal event queue does ^card-sqlf
retry a failed invocation automatically, without any caller involvement,
before giving up and routing the event to whatever failure handling has
been configured for it.

> [!card] mcq
> A function invoked asynchronously (e.g. by S3) throws an unhandled exception on every attempt. What happens to that event?
> - [x] Lambda retries it automatically a limited number of times, then sends it to a configured destination or dead-letter queue if one exists
> - [ ] The event is dropped immediately with no retry, because S3 doesn't wait for a response
> - [ ] S3 itself detects the failure and re-sends the event
> - [ ] The function is throttled to prevent further invocations ^card-h8eh

Poll-based sources add a third pattern layered on top of the event source
mapping itself: for a stream (Kinesis, DynamoDB Streams), the mapping
keeps retrying the same batch — and can stall that shard entirely on a
persistent error — until it succeeds or the record expires from the
stream, unless bisect-on-error or a retry limit is configured. For SQS,
retry timing is governed by the queue's own visibility timeout: a message
that isn't deleted before that timeout expires becomes visible again and
is redelivered, independent of anything Lambda's async retry logic does.

A **dead-letter queue (DLQ)** for asynchronous invocations is a
destination — an SQS queue or SNS topic — you configure to catch an event
only after every retry has been exhausted and it has still failed.

**Destinations** are the newer mechanism that supersede the DLQ pattern:
they can route an event on ==success== as well as on failure, to a wider ^card-56lj
set of targets (SQS, SNS, another Lambda function, or EventBridge), and
they carry richer context — the invocation's response payload or error
details — that a bare DLQ message does not.

Why can a single event's underlying operation end up applied more than once even though the platform "handled" retries correctly? :: A retry — whether Lambda's internal async retry or an SQS redelivery after a visibility timeout — re-delivers the same event to a new invocation with no knowledge of whether the previous attempt's side effects (a write, a charge, a message sent) actually completed before it failed; the platform's job is only to make sure the event isn't silently lost, not to guarantee it is processed exactly once. ^card-b7aw

> [!card] recall
> Explain why idempotency has to be built into the function's own logic
> (e.g. by checking a stored idempotency key before applying a write)
> rather than something Lambda's retry machinery can provide, given that
> retries by design re-deliver events whose prior outcome is unknown. ^card-jt8m

For a poll-based SQS trigger specifically, which mechanism controls whether a failed message gets redelivered, and how does that differ from an async invocation's retry behavior? :: The queue's own visibility timeout and redrive policy control redelivery — a message becomes visible again for another poll once its visibility timeout expires, and after enough failed receives (per the redrive policy) it moves to an SQS dead-letter queue; this is entirely SQS's own retry mechanism, distinct from the internal retry queue Lambda uses for asynchronous invocations. ^card-iefa
