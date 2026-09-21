---
topic: aws
category: aws-step-functions
tags: [step-functions, execution-history, redrive, logging, observability]
citations: ["AWS Step Functions Developer Guide — 'Monitoring Step Functions'"]
---

# Observability and Debugging Executions

`vault/aws/observability/` covers CloudWatch metrics, alarms, Logs
Insights, and X-Ray tracing as their own category, and none of that is
repeated here. This note is about what's specific to Step Functions
itself: a record of every execution that exists whether or not you set
up any logging at all, and what changes once you're on the flow mode
that doesn't have one.

Every Standard execution keeps an **execution history** — an ordered,
durable log of every state it entered, with that state's input, output,
and any error, appended automatically as the execution runs. Nobody has
to instrument anything for this to exist; it's a property of running a
Standard execution at all, which is the main practical difference from
Express workflows (`standard-versus-express-workflows.md`), which don't
keep one.

Why does a Standard execution's event history make a workflow that failed three days ago just as diagnosable as one that failed a moment ago, with no logging code written anywhere? :: Because the history isn't something you had to emit — it's recorded automatically as a property of the execution itself, capturing each state's input, output, and error as it happens, so inspecting a past failure means reading that record rather than relying on logs someone remembered to add. ^card-qtea

> [!card] mcq
> What is the single biggest observability difference between a Standard
> workflow and an Express workflow?
> - [x] Standard keeps a full execution history automatically; Express keeps none unless you configure logging
> - [ ] Standard supports CloudWatch metrics and Express does not
> - [ ] Express workflows cannot be traced with X-Ray under any configuration
> - [ ] Standard workflows show a graph view and Express workflows do not ^card-nrj2

The console's graph and timeline views aren't a second source of data —
they're a rendering of the same execution history, laid out as a diagram
or a chronological bar chart instead of a raw event list. Either view is
only as complete as the history behind it, which is exactly why Express
logging configuration (below) matters so much: with nothing logged,
there's nothing for either view to draw from.

Four execution-level metrics are worth alarming on individually because
each one catches a *different* failure mode. `ExecutionsFailed` counts
executions that errored out — a problem in the workflow's own logic or a
downstream service. `ExecutionsTimedOut` counts ones that ran past a
state's or the workflow's own timeout — a stuck dependency, not
necessarily an error. `ExecutionThrottled` counts executions that
couldn't even start, or transitions that were delayed, because a
service quota was hit — a capacity problem, not a logic problem.
`ExecutionsAborted` counts ones stopped deliberately, by a person or an
automated process calling ==StopExecution==, not a failure at all, but ^card-g7kw
worth tracking separately so it doesn't get miscounted as one.

> [!card] recall
> A dashboard alarms only on ExecutionsFailed. Explain why that single
> alarm would miss both a workflow being throttled by a service quota and
> one that's stuck waiting on a dependency that never responds, and what
> the right metric would be for each.
> ---
> ExecutionsFailed only fires on executions that actually error out. A
> throttled execution doesn't error — it's delayed or refused from
> starting because a quota was hit, which is what ExecutionThrottled
> tracks. A workflow stuck on an unresponsive dependency doesn't error
> either as long as it stays within its timeout; once it exceeds one,
> it's counted by ExecutionsTimedOut, not ExecutionsFailed. Each failure
> mode needs its own metric because none of them reliably triggers
> another one's alarm. ^card-x430

**redriveExecution** restarts a failed Standard execution from its point
of failure rather than from the beginning — the states that already
succeeded aren't re-entered. That's a big deal for how you design
states in the first place: if redrive is going to resume mid-workflow,
every step before a likely failure point needs to be safe to have
already run once, meaning ==idempotent== or otherwise resumable, not a ^card-1r4o
step that would double-charge a customer or double-send a notification
if the workflow is later redriven past it.

Why does the existence of redriveExecution push you toward writing resumable, idempotent-feeling steps even for a workflow you expect to succeed most of the time? :: Because redrive resumes from the failure point without repeating earlier states, so any state with a side effect that isn't safe to have happened exactly once already — like sending an email or charging a card — could behave incorrectly the one time redrive is actually used, and there's no way to know in advance which workflow will need it. ^card-f6ki

Express workflows have no execution history to fall back on, so their
substitute is explicit **logging configuration** pointed at CloudWatch
Logs — and the log level you choose decides how much you can debug after
the fact, not just how much it costs. `OFF` logs nothing at all, so a
failed Express execution leaves no record beyond whatever your own code
happened to log. `ERROR` and `FATAL` capture only failures. `ALL` logs
every state transition, closest to what Standard gives you for free, at
correspondingly higher log volume and cost. Choosing `OFF` for an Express
workflow isn't a cost optimization so much as giving up the ability to
debug it after the fact.

What does choosing a logging level for an Express workflow actually decide, beyond how much it costs to run? :: It decides how much of the execution you can reconstruct after something goes wrong — since Express keeps no execution history of its own, whatever the configured log level didn't capture is simply gone, with no automatic record to fall back on the way a Standard execution's history provides. ^card-mdks
