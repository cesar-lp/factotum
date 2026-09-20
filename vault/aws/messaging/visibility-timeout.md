---
topic: aws
category: aws-messaging
tags: [sqs, visibility-timeout, redelivery, consumer-failure]
citations: ["AWS Developer Guide — Amazon Simple Queue Service, 'Amazon SQS visibility timeout'"]
---

# Visibility Timeout

Visibility timeout is the mechanism that lets multiple consumers safely
share one queue without two of them working on the same message at once.
Its whole job is to answer one question: how long should SQS assume a
consumer that just received a message is still working on it?

When a consumer receives a message, SQS hides that message from every
other consumer for the visibility timeout's duration, on the theory that
the receiving consumer is now responsible for it. If the consumer
finishes and calls `DeleteMessage` before the timeout expires, the
message is gone for good. If it does not, SQS assumes the consumer failed
and makes the message visible again for another attempt.

That assumption can be wrong in either direction, and each direction
fails differently.

If the timeout is set ==shorter== than the actual processing time, SQS ^card-ek67
gives up on the first consumer too early: a second consumer receives and
starts processing the same message while the first one is still working
on it, so the same message is now being handled twice concurrently.

> [!card] mcq
> A message takes 90 seconds to process, but the queue's visibility
> timeout is 30 seconds. What is the most direct consequence?
> - [x] A second (and possibly third) consumer receives and processes the same message while the first consumer is still working on it
> - [ ] The message is silently dropped after 30 seconds
> - [ ] SQS automatically extends the timeout to match the actual processing time
> - [ ] The producer is notified that the message needs a longer timeout ^card-tbx6

If the timeout is set ==longer== than necessary, the opposite failure ^card-bxar
shows up: when a consumer actually crashes partway through, no other
consumer can pick the message back up until that whole long window
elapses, so a real failure recovers slowly even though the queue holds a
perfectly deliverable message the entire time.

> [!card] mcq
> A consumer crashes immediately after receiving a message, and the
> queue's visibility timeout is set very long. What is the cost?
> - [x] The message sits invisible and undelivered until the long timeout expires, even though no consumer is actually working on it
> - [ ] The message is processed twice by two different consumers
> - [ ] The message is deleted without being processed
> - [ ] SQS reduces the timeout automatically once it detects the crash ^card-ds6d

Why can't a single fixed visibility timeout be "safe" for both a workload with wildly variable processing times and a workload that wants fast failure recovery? :: Because the two failure modes pull in opposite directions on the same knob — a timeout short enough to recover quickly from a crash risks being shorter than a slow item's real processing time and causing duplicate work, while a timeout long enough to never cut off a slow item makes every genuine crash recover slowly; the fix is not a better fixed value but extending the timeout dynamically (`ChangeMessageVisibility`) while a specific message is still legitimately being worked on. ^card-zhua

> [!card] recall
> Explain, in terms of what SQS can and cannot observe about a consumer,
> why visibility timeout has to be a guess (a timer) rather than something
> SQS can determine directly, such as "is this consumer still alive and
> still working on this message." ^card-cfxk

What SQS call lets a consumer extend its own visibility timeout mid-processing, for a message whose work is taking longer than expected? :: ChangeMessageVisibility. ^card-l30n
