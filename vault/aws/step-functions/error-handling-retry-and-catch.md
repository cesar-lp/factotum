---
topic: aws
category: aws-step-functions
tags: [step-functions, error-handling, retry, catch, states-language]
citations: ["AWS Step Functions Developer Guide — 'Error handling in Step Functions'"]
---

# Error Handling: Retry and Catch

The other notes in this category describe what a state does; this one
describes what happens when a state fails to do it. Step Functions'
distinguishing choice here is that failure handling is not code you write
inside a task — it is declared as JSON on the state itself, which means a
workflow's entire retry and fallback policy is visible in one place and
auditable without opening a single handler.

A `Retry` entry lives on the failing state and is a small, fixed set of
knobs rather than a loop you write. `ErrorEquals` lists which error names
this retrier matches; `IntervalSeconds` sets the delay before the first
retry; `MaxAttempts` caps how many retries are made; and `BackoffRate`
multiplies the interval after each attempt.

A `Retry` entry with `IntervalSeconds: 2` and `BackoffRate: 2` waits 2s
before the first retry and then ==4== seconds before the second, doubling ^card-we7g
each time rather than retrying at a fixed 2s interval.

`BackoffRate` is what turns a `Retry` block into exponential backoff instead
of a fixed-interval loop; a value of 1 (or omitting it, since it defaults to
1.0) degenerates back into that fixed loop, which is why forgetting it is
the easiest way to accidentally hammer a struggling downstream service at
constant speed. `MaxDelaySeconds` puts a ceiling on the interval so that
compounding backoff doesn't grow unbounded on a long-lived failure.

> [!card] mcq
> A Retry entry has IntervalSeconds: 3, BackoffRate: 2, MaxAttempts: 4, and no MaxDelaySeconds. What determines when the retries stop growing further apart?
> - [x] Nothing — without a MaxDelaySeconds cap, the interval keeps doubling (3s, 6s, 12s, 24s) until MaxAttempts is exhausted
> - [ ] Step Functions automatically caps backoff at 60 seconds
> - [ ] BackoffRate resets to 1 after the second attempt
> - [ ] MaxAttempts caps the interval, not just the attempt count ^card-q8s6

`ErrorEquals` matches against a small set of predefined names as well as
custom error names your task can throw. ==States.ALL== matches every error, ^card-1p5d
of any kind, and only makes sense as a catch-all.

`States.TaskFailed` matches a runtime error from the task itself (an
exception the code threw), while `States.Timeout` matches a task that ran
longer than its configured `TimeoutSeconds` without producing a result —
these are different failure modes with different fixes, so collapsing them
into one retrier throws away information you'd otherwise use to decide,
say, that a timeout should not be retried at all.

Why must States.ALL be the last entry in a list of Retry (or Catch) entries rather than the first? :: Step Functions evaluates retriers/catchers in the order they're listed and stops at the first match; States.ALL matches everything, so putting it first would swallow every error before a more specific entry (like one just for States.Timeout) ever got a chance to match and apply its own, possibly different, policy. ^card-1490

`Catch` is the transition Step Functions takes once retries (if any) are
exhausted: it names a `Next` state to move to on failure instead of
propagating the error out of the whole execution. `ResultPath` on a Catch
entry controls where the error information (an object with `Error` and
`Cause` fields) gets written into the state's input, so the cleanup state
can inspect what actually failed rather than just knowing that something
did.

Catching failure to a dedicated cleanup or notification state, rather than
letting the execution fail outright, is what lets a workflow fail
gracefully — the state machine still reaches a defined, intentional end
state instead of stopping in an ambiguous failed status with no cleanup
performed.

> [!card] recall
> A Task state has both a Retry block (ErrorEquals: States.ALL, MaxAttempts: 3) and a Catch block (ErrorEquals: States.ALL, Next: NotifyFailure). The task fails every time it's attempted. Walk through what Step Functions actually does, in order, before NotifyFailure runs.
> ---
> Step Functions retries the task according to the Retry block first: it waits the configured interval, re-invokes the task, and repeats this up to MaxAttempts times, applying BackoffRate to grow the interval between attempts. Only after all retry attempts are exhausted and the task has still failed does Step Functions consult the Catch block and transition to NotifyFailure. Retry and Catch are not alternatives evaluated once — Catch is the fallback for after retry has already given up. ^card-76cr

That ordering is the detail most often missed: retries are attempted
first, and a Catch is only consulted once every retry attempt on that
state has already failed. A state configured with both does not choose
between them per failure — it always retries to exhaustion before falling
through to the catch.

That same ordering is also why a retried task must be idempotent: a retry
can just as easily follow a success whose response was lost in transit as
a genuine failure, so the task may be invoked again after it already
completed its side effect once.

Idempotent design for exactly this situation — a duplicate invocation
after an ambiguous outcome — is not specific to Step Functions and is
covered in full in `../messaging/idempotency-and-exactly-once.md`; this
note only establishes that Step Functions' own retry mechanism creates the
same ambiguity a message redelivery does.

Why can't a retried task simply trust that "if it's being retried, the previous attempt must have failed"? :: Because the retry fires whenever the state machine didn't receive a successful result in time, and that can happen even when the task's side effect completed and only the acknowledgment was lost — so "being retried" tells you an attempt didn't confirm success, not that the underlying work never happened. ^card-1nuj

What two things does a Catch entry's ResultPath let a cleanup state do that it couldn't do if the error were simply discarded? :: It lets the cleanup state see which error actually occurred (the Error name and Cause message written into the state's input at that path) and combine that information with the rest of the original input, so the fallback logic can react differently depending on what failed rather than treating every failure identically. ^card-pubp
