---
topic: aws
category: aws-messaging
tags: [eventbridge, event-driven, routing, pattern-matching]
citations: ["AWS Developer Guide — Amazon EventBridge, 'What is Amazon EventBridge?'"]
---

# EventBridge and Event Routing

SNS fan-out delivers the same message to every subscription on a topic
and leaves any further discrimination to filter policies or the
subscriber itself. EventBridge starts from the opposite default: routing
based on the structure and content of an event is the primary mechanism,
not an add-on, and events can come from many independent AWS services
and SaaS partners rather than only from whatever explicitly publishes to
a topic.

An ==event bus== is where events land — a default bus that many AWS ^card-sb66
services publish to automatically, custom buses an application defines
for its own events, and partner buses fed by third-party SaaS
integrations.

A ==rule== attached to a bus defines an event pattern — a structural ^card-yxef
match against an event's fields (source, type, nested detail fields) —
and a list of targets to invoke for any event that matches it.

An event can match several of these at once and gets routed to every
target of each one it matches; a bus with nothing matching a given event
simply never routes that event anywhere.

> [!card] mcq
> An EventBridge rule's event pattern matches on `source: "aws.ec2"` and
> `detail.state: "terminated"`. An EC2 state-change event arrives with
> `source: "aws.ec2"` and `detail.state: "running"`. What happens?
> - [x] The event does not match this rule (the detail.state field differs), so this rule does not invoke its targets for that event — though the event could still match a different rule
> - [ ] The event matches because the source matches, and detail fields are advisory only
> - [ ] EventBridge raises an error because the event doesn't fully satisfy the pattern
> - [ ] The event is placed in a dead-letter queue automatically ^card-zr9i

Why can one EventBridge event end up invoking several completely different targets, in a way plain SNS fan-out cannot replicate without filter policies on every subscription? :: Because EventBridge evaluates the event's actual structure against each rule's pattern independently, and any number of rules can match the same event — routing is a function of what's inside the event, not of a fixed subscriber list, so adding a new rule that matches existing events doesn't require touching the publisher or any existing subscriber at all. ^card-b8i3

EventBridge's pattern matching can inspect nested fields inside an
event's `detail` payload, not just top-level metadata like source —
which is the main structural difference from an SNS filter policy, whose
matching is aimed at flatter message attributes set at publish time
rather than an arbitrarily nested event body.

> [!card] recall
> SNS fan-out and EventBridge rule-based routing both let a single
> published message reach multiple different downstream consumers.
> Explain the difference in intent between the two: what kind of system
> is SNS fan-out designed for, and what kind of system is EventBridge's
> pattern-matching model designed for instead? ^card-4tfo

What two things does an EventBridge rule need to define in order to do anything? :: An event pattern (the structural match against incoming events) and a list of targets to invoke for any event that matches that pattern. ^card-esjx

Does an event that matches zero rules on an EventBridge bus get delivered anywhere by default? :: No — with no matching rule, the event is not routed to any target; EventBridge does not have an SNS-style "every subscriber gets a copy" default, since routing there is entirely rule-driven. ^card-e4ns
