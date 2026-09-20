---
topic: aws
category: aws-dynamodb
tags: [dynamodb, capacity, throttling, backoff, on-demand]
citations: ["AWS Developer Guide — Amazon DynamoDB, 'Read/write capacity mode'"]
---

# Capacity Modes and Throttling

DynamoDB offers two different models for how a table's read and write
capacity is allocated, and both models can still throttle a request —
the choice between them is about who plans for capacity, not about
whether throttling can happen at all.

In **provisioned capacity** mode, the table owner declares how much read
and write throughput the table should sustain, and DynamoDB reserves and
partitions capacity to match that declaration. A request that would
exceed the provisioned amount for the partition it targets gets
throttled rather than served, regardless of whether other partitions of
the same table have spare capacity.

In **on-demand** capacity mode, DynamoDB manages capacity allocation
itself and scales it automatically as observed traffic changes, so the
table owner does not pre-declare a throughput target. This removes the
need to forecast traffic, but it does not remove throttling as a
possibility — a sufficiently sharp spike can still outpace how quickly
the service scales a partition's allocation to meet it.

> [!card] mcq
> What is the fundamental difference between provisioned and on-demand
> capacity modes in DynamoDB?
> - [x] Provisioned mode requires the table owner to declare a throughput target that DynamoDB partitions capacity to match; on-demand mode has DynamoDB manage and scale capacity automatically without a pre-declared target
> - [ ] On-demand mode never throttles requests, while provisioned mode always does
> - [ ] Provisioned mode is only available for tables without a sort key
> - [ ] On-demand mode disables secondary indexes ^card-b1l3

Why can a request still be throttled under on-demand capacity mode, even though the table owner never set a throughput ceiling? :: On-demand capacity still scales gradually rather than instantaneously, and per-partition throughput is still bounded at any given moment; a burst of traffic concentrated on one partition (or one that arrives faster than the service can scale allocation to meet it) can outrun that scaling and get throttled, even with no explicit limit configured by the owner. ^card-2cdm

==Throttling== is DynamoDB's mechanism for protecting a partition (and ^card-aap8
the underlying storage node serving it) from being driven past what it
can currently sustain: instead of queuing or degrading a request, it is
rejected outright with an error the client must handle.

Because a hot partition (see `partitioning-and-hot-keys.md`) concentrates
traffic on one physical partition regardless of the table's overall
capacity mode or total allocation, it is a common cause of throttling
that neither raising provisioned throughput nor switching to on-demand
mode actually fixes — both models still enforce limits per partition,
not just per table.

What kind of fix does throttling caused by a hot partition actually require, as opposed to throttling caused by genuinely high but evenly-spread traffic? :: A key-design fix that spreads the concentrated traffic across more partition key values, since adding capacity (provisioned or on-demand) only helps when the load is already spread evenly; it does nothing for a single overloaded partition, which is bounded by its own limit no matter how much spare capacity sits idle elsewhere in the table. ^card-y3dx

A throttled request is not a failure the client should give up on: the
correct response is to retry the request after a delay, and to increase
that delay on each successive failure — ==exponential backoff== — so ^card-vyq4
that a burst of throttled clients doesn't immediately retry in lockstep
and reproduce the same overload a moment later.

> [!card] recall
> Explain why retry-with-backoff is the client's responsibility rather
> than something DynamoDB itself does on the client's behalf, and what
> would go wrong if every throttled client retried immediately and at the
> same fixed interval instead. ^card-jmxy
