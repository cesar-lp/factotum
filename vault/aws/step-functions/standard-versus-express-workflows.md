---
topic: aws
category: aws-step-functions
tags: [step-functions, standard-workflows, express-workflows, pricing, semantics]
citations: ["AWS Step Functions Developer Guide — 'Standard vs. Express Workflows'"]
---

# Standard versus Express Workflows

Every other note in this category describes state machine behavior that
applies to both workflow types. This one is about the choice you make
before any of that: Step Functions ships two execution engines behind the
same Amazon States Language, and picking wrong shows up as either a
runaway bill or a silent duplicate side effect rather than as an error at
deploy time.

The most visible difference is how long an execution is allowed to run.
A Standard workflow can run for up to a ==year==, while an Express ^card-k4i1
workflow's hard ceiling is five minutes.

That duration limit alone rules out Express for anything involving a long
wait — a human approval step, a multi-day batch job — regardless of how
attractive its pricing looks, since the execution is simply terminated once
five minutes elapses.

Pricing is inverted between the two, which is the part that actually
drives the decision at volume. Standard is priced per state transition,
so a workflow's cost scales with how many states it visits, independent of
how long each one takes. Express is priced per request plus duration (execution
==time== and memory consumed), so a workflow's cost scales with how long it ^card-saax
runs, independent of how many states it has.

Why does a high-volume workflow that fires millions of times a day but only has a handful of states typically favor Express over Standard on cost alone? :: Standard bills per state transition, so millions of executions each incurring several transitions multiplies quickly regardless of how briefly each one runs; Express bills per request plus duration, so a short-lived, few-state execution stays cheap even at very high volume — the pricing model that's expensive for Standard is exactly the one Express is built to be cheap under. ^card-ufh1

> [!card] mcq
> A workflow runs 50 million times a day, completes in under a second each time, and has three states. Which cost driver dominates for a Standard workflow running this pattern?
> - [x] The sheer number of state transitions across 50 million executions, since Standard bills per transition regardless of how fast each execution completes
> - [ ] The total wall-clock duration, since Standard bills like Express does
> - [ ] Memory consumed per execution
> - [ ] Nothing — Standard workflows are free below a duration threshold ^card-6row

Execution semantics are the fact that decides correctness, not just cost:
Standard executions are ==exactly-once==, while Express executions are ^card-e7me
at-least-once.

At-least-once for Express means a state can genuinely run twice under
retry or infrastructure conditions the workflow author never sees in
local testing — so a non-idempotent side effect (charging a card, sending
an email) inside an Express workflow is a latent bug, not a hypothetical
one, in exactly the same way a non-idempotent SQS consumer is; see
`../messaging/idempotency-and-exactly-once.md` for that mechanism in
general.

Standard also keeps a full durable execution history — every state
transition, input, and output, inspectable individually after the fact in
the console or via `GetExecutionHistory`. Express does not keep this
per-execution history at all; instead it writes its logs to CloudWatch
Logs, which gives you aggregate visibility but not the same per-state,
per-execution replay Standard provides.

> [!card] recall
> A production incident requires figuring out exactly what input a specific failed execution passed into its third state, two weeks after the fact. Explain why this is straightforward for a Standard workflow and effectively impossible for an Express workflow, tying your answer to what each one actually persists.
> ---
> Standard workflows persist a full durable execution history per execution — every state's input, output, and transition is recorded and individually queryable well after the execution ends, so you can pull up that exact execution and inspect its third state directly. Express workflows don't keep this structured, per-execution history; they only emit logs to CloudWatch Logs, which is aggregate, unstructured (relative to execution history), and only as complete as whatever logging was configured — there's no guaranteed way to reconstruct one specific execution's per-state input two weeks later. ^card-89rq

Express itself splits into two invocation modes. **Synchronous** Express
waits for the execution to finish and returns its result directly to the
caller, suited to request/response workloads that need Express's speed
and cost profile but still want the answer inline. **Asynchronous**
Express starts the execution and returns immediately, suited to
fire-and-forget, high-throughput event processing where nothing is
waiting on a return value.

The decision rule is honest rather than clever: high-volume, short-lived,
idempotent work belongs on Express, where its pricing and throughput pay
off and at-least-once execution is a cost you've already designed around.
Anything that needs exactly-once semantics, can run longer than a few
minutes, or needs per-execution auditability for compliance or debugging
belongs on Standard, even if it costs more per execution.

Which single Step Functions execution property most directly determines whether a workflow can safely perform a non-idempotent action like charging a payment, independent of that workflow's duration or state count? :: Whether it runs as Standard (exactly-once) or Express (at-least-once) — a non-idempotent action is safe under exactly-once execution but a latent duplicate-charge bug under at-least-once, regardless of how few states the workflow has or how quickly it completes. ^card-h1fj
