---
topic: aws
category: aws-messaging
tags: [sns, pub-sub, fan-out, sqs]
citations: ["AWS Developer Guide — Amazon Simple Notification Service, 'Fanout to Amazon SQS queues'"]
---

# SNS and the Fan-Out Pattern

SQS models one producer handing work to one (logical) pool of consumers.
SNS models something different: one producer publishing an event that
any number of independent, unrelated consumers may each want to react to
in their own way. That difference in intent — a queue versus a
publish/subscribe topic — is why the two services coexist rather than one
replacing the other.

A ==topic== is the channel a publisher sends messages to; it has no ^card-qjfl
notion of who, if anyone, is listening on the other end.

A ==subscription== attaches an endpoint — an SQS queue, a Lambda ^card-yayl
function, an HTTP endpoint, an email address — to that channel, and SNS
delivers a copy of every published message to every current one of these
independently.

**Fan-out** is the pattern this naturally produces: publish one message
once, and have it delivered to many different subscribers, each of which
processes that same message for its own purpose (e.g. one order event
triggering billing, inventory, and notification workflows independently)
without the publisher knowing or caring who is subscribed.

> [!card] mcq
> A publisher sends one message to an SNS topic with five active
> subscriptions. How many deliveries does SNS attempt?
> - [x] One delivery attempt to each of the five subscriptions, independently
> - [ ] One delivery total, to whichever subscription is first to respond
> - [ ] The publisher must send five separate messages, one per subscriber
> - [ ] SNS picks one subscription at random per message ^card-xy4t

Why is subscribing an SQS queue to an SNS topic (rather than subscribing an HTTP endpoint or Lambda directly) often called the "durable" version of fan-out? :: Because a message SNS delivers to a queue sits there until a consumer explicitly processes and deletes it — if that consumer is down when the message arrives, the message waits in the queue rather than being lost; an HTTP endpoint that is unreachable has no such buffer, so SNS's delivery to it can exhaust its retries and the message is effectively gone for that subscriber. ^card-2dsq

An HTTP or Lambda subscriber that is temporarily unavailable relies
entirely on SNS's own limited delivery retry policy for that
subscription; once those retries are exhausted, the message is not
recoverable through that subscription. An SQS subscriber does not share
this weakness, because the message's durability afterward is the
queue's job, not SNS's.

> [!card] recall
> Explain why fan-out to several SQS queues (one per subscriber) is a
> better default than fanning out directly to several Lambda functions,
> in terms of what happens when one downstream consumer is slow or
> temporarily broken while the others are healthy. ^card-zaax

What must be true for the same message published once to an SNS topic to reach five different downstream systems? :: Each of the five systems must have its own subscription attached to that topic — SNS delivers independently to each subscription, so one message becomes as many independent deliveries as there are current subscriptions. ^card-vw2j

Can a publisher sending a message to an SNS topic tell how many subscribers will receive it, or who they are? :: No — the topic is the only thing the publisher addresses; subscriptions are managed independently of publishing, so the publisher has no visibility into or dependency on who is currently subscribed. ^card-z2eq
