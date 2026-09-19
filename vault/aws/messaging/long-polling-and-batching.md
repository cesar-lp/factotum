---
topic: aws
category: aws-messaging
tags: [sqs, long-polling, batching, throughput, partial-failure]
citations: ["AWS Developer Guide — Amazon Simple Queue Service, 'Amazon SQS short and long polling'"]
---

# Long Polling and Batching

Polling a queue and processing messages in bulk are two separate levers
for cutting the overhead of talking to SQS, and each addresses a
different kind of waste: polling efficiency is about not wasting requests
when there is nothing to receive, and batching is about not wasting
requests when there is plenty to receive.

**Short polling** returns immediately, even if the queue currently has no
messages available to return. Because SQS distributes a queue's messages
across many internal servers, a single short-poll request only samples a
subset of them — so a short poll can return empty even though the queue,
taken as a whole, is genuinely non-empty; the messages that exist simply
weren't on the servers this particular request happened to check.

**Long polling** instead lets `ReceiveMessage` wait (up to a configured
`WaitTimeSeconds`) for at least one message to become available before
returning empty, checking across the queue's servers during that window
rather than giving up after a single sample. This eliminates most empty
responses and the wasted request/response cycles they cost, at the price
of a consumer connection that can stay open longer.

> [!card] mcq
> Why can a short-poll ReceiveMessage call return zero messages even
> though the queue is not actually empty?
> - [x] Messages are spread across many internal SQS servers, and a short poll only samples a subset of them in one request
> - [ ] Short polling is rate-limited to one call per queue per second
> - [ ] SQS deletes messages that are not received within a few seconds
> - [ ] Short polling only works on FIFO queues ^card-urbz

What does long polling change about how ReceiveMessage checks for messages, compared to short polling? :: It waits, and checks across more of the queue's internal servers during that wait window, instead of sampling once and returning immediately — trading a longer-held connection for a much lower rate of empty responses. ^card-xjnk

Batching lets a single API call carry multiple messages — `SendMessageBatch`,
and `ReceiveMessage` requesting up to its batch limit — instead of one
call per message. This raises effective throughput mainly by
==amortizing== the fixed per-request overhead (network round trip, ^card-adkr
request processing) across many messages rather than paying it once per
message.

Batching also changes the shape of failure: a batch call can ==partially ^card-si0p
succeed==, where some entries in the batch succeed and others fail
independently, and the response reports success or failure per entry
rather than for the call as a whole.

> [!card] mcq
> A `SendMessageBatch` call submits 10 messages. 2 of them fail due to a
> transient throttling error while the other 8 succeed. What does the API
> response look like?
> - [x] A per-entry result: 8 successful entries with message IDs, and 2 failed entries identifying which ones failed and why
> - [ ] The entire batch is reported as failed, since not all entries succeeded
> - [ ] The entire batch is reported as successful, since most entries succeeded
> - [ ] SQS automatically retries the 2 failed entries before returning a response ^card-6vhc

Why must a caller using batched sends or deletes inspect each entry's individual result, rather than just checking whether the overall call returned without an error? :: Because the call itself succeeding only means SQS accepted and processed the batch request — individual entries within it can still fail independently, and an error-free response at the call level says nothing about whether every message inside it was actually sent, received, or deleted. ^card-t2vj

> [!card] recall
> Explain why increasing batch size mostly helps throughput (messages per
> second) without doing much for the latency of any single message, and
> under what condition a large batch size could actually start hurting
> latency. ^card-xc42
