---
topic: aws
category: aws-lambda
tags: [lambda, invocation, event-sources, event-source-mapping]
citations: ["AWS Lambda Developer Guide — 'Lambda invocation types', 'Using AWS Lambda with event source mappings'"]
---

# Event Sources and Invocation Modes

The single most consequential fact about any Lambda function is not what
its code does but how it gets invoked, because the invocation mode decides
who is waiting for a response, who owns retries, and what "the function
failed" even means downstream. There are three modes, and mixing up which
one a given trigger uses is the root of most Lambda error-handling bugs.

In a ==synchronous== invocation, the caller (an API Gateway request, ^card-rer0
another service calling the Invoke API directly) blocks and waits for the
function to run and return a response, so the caller sees success or
failure immediately and is responsible for deciding what to do next.

In an ==asynchronous== invocation, the caller hands the event to Lambda's ^card-d7h8
internal event queue and gets an immediate acknowledgment that the event
was accepted — not that it succeeded — while Lambda itself runs the
function and handles retries in the background, decoupled from the caller.

Services like S3 and SNS invoke a function ==asynchronously== by default; ^card-h27d
the caller (S3, SNS) never sees whether the function eventually succeeded,
because it already moved on after Lambda accepted the event.

> [!card] mcq
> An API Gateway endpoint backed by a Lambda function times out and returns a 504 to the client. Which invocation mode is API Gateway using?
> - [x] Synchronous — the caller is blocked waiting on the function and directly experiences the failure
> - [ ] Asynchronous — the caller would have already received an acknowledgment and moved on
> - [ ] Poll-based via an event source mapping — there is no caller to time out
> - [ ] It depends on the function's own configured invocation type ^card-p81z

The third mode, used for stream- and queue-based sources like Kinesis, DynamoDB
Streams, and SQS, is **poll-based**: Lambda itself runs a separate
component called an ==event source mapping== that polls the source, batches ^card-gybp
records, and invokes the function on the service's behalf — there is no
external caller at all, synchronous or otherwise.

What role does the event source mapping play for a poll-based source like SQS, and why does that make "who invoked the function" a different question than it is for API Gateway? :: The event source mapping is a Lambda-managed poller that reads batches of records off the queue or stream and calls Invoke on the function itself; there is no external client waiting on a response the way there is with API Gateway, so retry behavior and failure handling are governed entirely by the mapping's own configuration rather than by anything a caller does. ^card-b1cw

Why can't you look at a trigger's name alone (e.g. "SNS", "SQS") and assume you already know how errors propagate? :: The invocation mode, not the service name, determines error propagation — SNS invokes asynchronously and Lambda's internal queue owns retries, while SQS is polled by an event source mapping whose batching and retry configuration is entirely separate machinery, so two different services can behave alike or two triggers on the same service can behave differently depending on how the mapping or invocation is configured. ^card-sp5p

> [!card] recall
> A function is triggered by SQS. Explain, at the level of who is doing the
> calling, why treating this the same as an API-Gateway-triggered function
> — assuming the caller sees and reacts to a failed invocation — would lead
> you to design its error handling incorrectly. ^card-uihc

Which invocation mode leaves error handling and retries entirely to whatever code called Invoke directly, with no built-in queue or poller involved? :: Synchronous invocation — the caller gets the failure directly and must itself decide whether to retry, so there is no separate retry mechanism to inspect the way there is for the other two modes. ^card-trr3
