---
topic: aws
category: aws-messaging
tags: [sns, filter-policies, fan-out, message-attributes]
citations: ["AWS Developer Guide — Amazon Simple Notification Service, 'Amazon SNS message filtering'"]
---

# Message Filtering

Plain fan-out sends every subscriber a copy of every message published to
a topic. Most real subscribers only care about a fraction of those
messages, and message filtering lets a subscription declare which
fraction up front, so SNS never delivers the rest to it at all.

A **filter policy** attached to a subscription is a set of conditions
evaluated against a message's attributes (or, with body filtering
enabled, fields in the message body itself). SNS evaluates the policy at
publish time, per subscription, and only delivers the message to
subscriptions whose policy matches it.

The alternative — deliver everything and let each subscriber's own code
decide what to ==ignore== — looks equivalent from a correctness ^card-ud7g
standpoint but is worse on every other axis: every uninterested
subscriber still pays the cost of receiving and deserializing messages
it never wanted before throwing them away, and that wasted work scales
with total publish volume rather than with how much that particular
subscriber actually cares about.

> [!card] mcq
> A topic publishes 10,000 messages a day, and one Lambda subscriber only
> needs to act on roughly 50 of them. What does attaching a filter policy
> to that subscription change, compared to filtering inside the Lambda
> function's own code?
> - [x] SNS never invokes the Lambda function for the ~9,950 irrelevant messages, instead of invoking it 10,000 times and having it immediately discard most of them
> - [ ] The Lambda function receives all 10,000 messages either way; filter policies only affect SQS subscriptions
> - [ ] Filtering moves from per-message evaluation to a one-time check at subscription creation
> - [ ] The publisher must know about the filter policy and tag each message accordingly at send time ^card-t3vt

Why does filtering at the SNS subscription level scale better than filtering identically inside every subscriber's own code? :: Because the filtering decision is made once, centrally, at publish time — a message that matches no subscription's filter policy is never delivered anywhere, so the cost of "not caring about this message" for N subscribers doesn't multiply into N separate receive-and-discard operations, and each subscriber's invocation count reflects only the messages it actually needs. ^card-3s9w

A filter policy is evaluated independently per subscription, so the same
published message can match some subscriptions on a topic and not
others — filtering does not change what gets published, only which of
the topic's existing subscriptions actually receive a given message.

Does a filter policy change what a publisher sends, or only where a given published message ends up? :: Only where it ends up — the publisher still sends one message to the topic exactly as before; the filter policy determines, per subscription, whether that particular subscription receives a copy of it. ^card-is2i

> [!card] recall
> A team considers two designs for a subscriber that only cares about
> "high priority" events: (a) attach an SNS filter policy matching a
> `priority: high` message attribute, or (b) subscribe to everything and
> check `event.priority == "high"` in the handler's first line. Explain a
> concrete scenario where these two designs behave differently in
> practice, not just in code cleanliness. ^card-dx6g

What must a message carry for an attribute-based SNS filter policy to be able to match against it? :: A message attribute (a key set alongside the message body at publish time) whose value the filter policy's condition can be evaluated against — a filter can't match on data that exists only inside an unparsed body unless body filtering is explicitly enabled for that subscription. ^card-2o6b
