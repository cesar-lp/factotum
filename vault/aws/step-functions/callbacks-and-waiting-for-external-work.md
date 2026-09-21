---
topic: aws
category: aws-step-functions
tags: [step-functions, task-tokens, callbacks, wait-state, human-approval]
citations: ["AWS Step Functions Developer Guide — 'Call back to Step Functions with a task token'"]
---

# Callbacks and Waiting for External Work

The task states covered elsewhere in this category invoke something and
move on once it responds. This note covers what happens when the thing a
workflow needs to wait on isn't a service call at all — a human clicking
approve, a third-party webhook, a legacy system with no AWS SDK in sight —
and Step Functions has no way to poll it directly.

The `.waitForTaskToken` integration pattern is Step Functions' answer: a
task is launched carrying a unique token, and the state machine pauses
that execution — not the whole account, just that one execution — until
something outside the workflow calls back with that same token to say the
work is done.

The token itself comes from `$$.Task.Token` in the ==context== object, ^card-s1kc
which the task must pass along to whatever external system is doing the
work — embedded in an SQS message, an email link, an API payload — since
that token is the only thing that lets the eventual caller identify which
paused execution to resume.

Once the external party finishes, it calls `SendTaskSuccess` with the
token and a result payload to resume the workflow on the success path, or
`SendTaskFailure` with the token and an error to resume it on the failure
path instead — the same `Catch` machinery covered in
`error-handling-retry-and-catch.md` applies to a failed callback exactly
as it would to a failed synchronous task.

> [!card] mcq
> A workflow using .waitForTaskToken hands its token to an external approval system, but the token is lost before the approver ever sees it (e.g. dropped by a bug in the notification email). What happens to that execution?
> - [x] It stays paused, doing nothing, until the state's configured timeout expires and it fails on timeout
> - [ ] Step Functions detects the lost token immediately and fails the state right away
> - [ ] The task retries automatically with a fresh token
> - [ ] The execution completes successfully with an empty result ^card-x4ic

Losing the token this way is why a ==timeout== is not optional configuration ^card-npiv
on a waitForTaskToken state but a required safeguard — without one, a lost
token leaves the execution paused indefinitely with no other way to notice
or recover.

For a task expected to take a long time — hours, potentially — a bare
timeout forces a bad choice between a timeout too short for legitimate
slow work and one so long that a genuinely stuck execution goes unnoticed
for ages. `SendTaskHeartbeat`, called periodically by the external system
while the work is still in progress, solves this: as long as heartbeats
keep arriving inside the state's `HeartbeatSeconds` window, the overall
timeout keeps getting extended, and only a stalled process that stops
heartbeating trips the failure.

Why does a heartbeat let a workflow use a short per-heartbeat window while still tolerating a task that legitimately takes many hours? :: The heartbeat window only has to be long enough to catch a task that's actually stuck between heartbeats; as long as the external process keeps sending heartbeats on schedule, each one resets that short window, so the task can run indefinitely in total while a genuine stall (no heartbeat arriving) is still caught quickly rather than only after some very long overall timeout expires. ^card-wkjh

The **Wait state** is a different, simpler tool for a different problem:
it pauses execution for a fixed number of seconds or until a specific
timestamp, with no external callback and no token involved at all — it is
scheduling a delay, not waiting on someone else's work to finish.

Polling in a loop — a Wait state, then a task that checks status, then a
`Choice` state that loops back to Wait if not yet done — is a legitimate
pattern when no callback mechanism exists on the other end (some external
API only supports polling, for instance), but it costs a state transition
on every single poll, which is part of what a genuine callback avoids
entirely by having the workflow simply sleep until it is told to wake up.

> [!card] recall
> A workflow needs to wait for a report-generation job in a third-party system that has no webhook or callback capability, only a "check status" API. Explain why .waitForTaskToken cannot be used here, and what pattern is used instead along with its main cost relative to a true callback.
> ---
> .waitForTaskToken requires the external system to actively call back into Step Functions with the task token once it's done — that requires the third party to support outbound callbacks, which this system doesn't. Since it only supports polling, the workflow has to poll it itself: alternate a Wait state (a fixed delay) with a task that calls the status-check API, using a Choice state to loop back to Wait until the status comes back done. The main cost is that each poll consumes a state transition, so a long-running job polled repeatedly racks up far more transitions (and, on Standard, more transition-based cost) than a true callback would, which triggers only once when the work is actually finished. ^card-cc91

What happens if SendTaskSuccess is called a second time with a token that was already used to resume its execution? :: Step Functions rejects the second call, because the execution has already moved past the paused state and that token is no longer valid for resuming anything — a duplicate callback doesn't re-run the resumed state or roll the execution back. ^card-h9cf

The deeper thing worth naming about `.waitForTaskToken` is that it
inverts control: once the token is handed off, the workflow's forward
progress depends entirely on code and systems it does not own and cannot
force to respond, which is a very different risk profile from a task
calling a service Step Functions itself is directly integrated with.

What concretely distinguishes a Wait state from a .waitForTaskToken task, in terms of what ends the pause? :: A Wait state's pause ends purely from the passage of time (a fixed duration or a specific timestamp reached), with nothing external involved; a .waitForTaskToken task's pause ends only when an outside caller explicitly calls SendTaskSuccess or SendTaskFailure with the matching token — time passing alone never resumes it (aside from its timeout eventually failing it). ^card-pbtl
