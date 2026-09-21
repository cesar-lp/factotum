---
topic: aws
category: aws-step-functions
tags: [step-functions, limits, quotas, payload, claim-check]
citations: ["AWS Step Functions Developer Guide — 'Quotas'"]
---

# State Machine Limits and Payload Size

Every other note in this category describes what a state or a workflow
mode can do. This one is about the numbers that quietly decide how a
*good* state machine ends up shaped — the limits that don't show up when
you're sketching a workflow, only once it's carrying real data or running
long enough to hit them.

The payload passed between states is capped at ==256 KB==. That's small ^card-9722
enough that a state machine handling anything nontrivial — an image, a
document, a query result set — cannot pass the data itself from state to
state at all. What it passes instead is a reference: an S3 object key, a
DynamoDB item id, anything small enough to fit the limit that lets the
next state go fetch the real data itself. This is the same **claim-check
pattern** used in general messaging architectures, and it's why a mature
state machine's Task states often look like they're passing almost
nothing around — because they are, deliberately.

Why do well-designed Step Functions workflows tend to pass small identifiers between states instead of the actual data those identifiers point to? :: Because the payload between states is capped at 256 KB, far too small for real documents, images, or result sets, so the workflow instead passes a reference — an S3 key, a database id — and lets whichever state needs the real data fetch it directly; this is the claim-check pattern applied to state machine payloads. ^card-c815

> [!card] mcq
> A Task state needs to hand a 40 MB processed file to the next state in
> the workflow. What should actually flow through the state machine's
> JSON payload?
> - [x] The file's S3 location, with the next state reading the object itself
> - [ ] The file's bytes, base64-encoded
> - [ ] The file split across several sequential states
> - [ ] Nothing — Step Functions automatically raises the payload limit for large objects ^card-yihy

A Standard execution's event history is capped at ==25,000== events, and ^card-s04z
that number interacts badly with one specific pattern: a Wait-then-poll
loop that checks on some slow external job. Every iteration of that loop
adds several events, so a workflow that's behaving completely correctly —
just polling a job that takes longer than expected — can run out of
history and fail for a reason that has nothing to do with the underlying
job actually failing.

> [!card] recall
> A workflow polls an external batch job every 30 seconds in a
> Wait-then-Choice loop until the job reports done. The job unexpectedly
> takes eighteen hours instead of the usual twenty minutes. Explain why
> this workflow can fail even though nothing about the batch job itself
> went wrong, and what that implies about designing poll loops.
> ---
> Each pass through the Wait-then-Choice loop appends more events to the
> execution's history, and that history is capped at 25,000 events for a
> Standard execution. An eighteen-hour job polled every 30 seconds is
> thousands of extra iterations beyond what the loop was sized for, and
> enough of them can exhaust the history limit and fail the execution —
> a bookkeeping failure, not a job failure. It implies poll intervals and
> expected durations need to be sized together, or that the workflow
> should wait for a callback instead of polling at all for anything
> open-ended. ^card-v71b

`callbacks-and-waiting-for-external-work.md` covers that callback-based
alternative to polling in full.

Maximum execution duration differs sharply by workflow type: a Standard
execution can run for up to one ==year==, while an Express execution is ^card-4zz1
capped at five minutes. That gap alone is often what decides which type a
workflow needs, well before throughput or cost enter the discussion.

What is the maximum duration of an Express workflow execution, and why does that number alone rule it out for a long-running approval or batch process regardless of how well it otherwise fits? :: Five minutes — an Express execution is force-terminated at that point no matter what state it's in, so any workflow whose steps can plausibly take longer than a few minutes in total needs a Standard execution instead, independent of any consideration of cost or throughput. ^card-sg10

Standard workflows are billed per **state transition** — moving from one
state to the next — not per unit of execution time. That makes the
number of states a real design and cost pressure: a workflow rebuilt as
many small, chatty states (an extra Pass state here, a Choice split into
finer branches there) accumulates more transitions, and therefore more
cost, than the same logic expressed as fewer, more purposeful states,
even though both do the same work.

Quotas don't all fail a request outright — some throttle it instead,
delaying execution starts or state transitions when a limit is hit
rather than rejecting the call. `ExecutionThrottled`
(`observability-and-debugging-executions.md` covers it alongside the
other execution metrics) is the signal that this is happening, which is
what makes it worth alarming on separately from an outright failure.

These limits point at one design rule: keep payloads down to references
rather than data, keep poll loops bounded so they can't outlast the
history limit, and prefer fewer meaningful states over many trivial ones.
None of the three is optional once a workflow is handling real data at
real scale — they're the same rule, applied to payload, to history, and
to billing.
