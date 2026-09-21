---
topic: aws
category: aws-observability
tags: [cloudwatch, alarms, composite-alarms, sns, alarm-actions]
citations: ["Amazon CloudWatch User Guide — 'Amazon CloudWatch alarm actions', 'Using composite alarms'"]
---

# Composite Alarms and Alarm Actions

`alarms-evaluation-and-missing-data.md` covers how a single alarm
decides its own state. This note covers what happens once it decides:
what an alarm actually *does* when it fires, and how to keep fifty
individually-correct alarms from turning one incident into fifty pages.

An **alarm action** is what CloudWatch does automatically on a state
change: most commonly publishing to an ==SNS== topic, which is the ^card-tckl
normal path to a human inbox, a chat channel, or a pager, but an alarm
can equally trigger an Auto Scaling policy or an EC2 action like
reboot, stop, or recover.

> [!card] recall
> An alarm is configured with an action only on the transition into
> ALARM, and no action on the transition into OK. Explain what the team
> loses operationally by not also configuring an OK action, and what an
> OK action is typically used for.
> ---
> Without an OK action, the alarm firing tells the team something broke,
> but nothing tells them — automatically — when it recovered; someone
> has to go check the console or wait for the alarm to simply stop
> mentioning itself. An OK action, usually publishing to the same or a
> different SNS topic, is what makes automatic recovery notification
> possible: "the thing that paged you is now resolved" without a human
> having to go check. ^card-7ljy

An alarm action fires once, on the state ==transition== itself — not ^card-l11a
continuously for as long as the alarm remains in ALARM. An alarm that
has been in ALARM for six hours doesn't re-notify on its own; it fired
once, when it first crossed into that state, and stays silent until it
changes state again.

Why can't an on-call engineer rely on "the alarm is still firing every few minutes" as a sign an incident is still unresolved? :: An alarm action only fires on a state transition, not repeatedly while the alarm sits in ALARM, so an unresolved incident produces exactly one notification unless something else — a re-notification feature layered on top, or a separate periodic check — is configured to remind anyone. ^card-2hb5

Wiring fifty individual alarms straight to SNS means a single root
cause that trips all fifty produces fifty separate pages for one
incident. A **composite alarm** fixes this by evaluating a boolean rule
over other alarms' *states* rather than over a metric — for example
`ALARM("high-error-rate") AND ALARM("high-latency")` — and it is the
composite alarm, not the children, that has an action attached.

> [!card] mcq
> A service has twelve CloudWatch alarms, one per downstream dependency.
> A single upstream outage trips all twelve at once, each independently
> wired to the same SNS topic. What does wrapping them in a composite
> alarm (with the children's own SNS actions removed) change?
> - [x] The team gets one notification for the incident instead of twelve, since the composite alarm's own action is what fires
> - [ ] The twelve child alarms stop evaluating their own metrics entirely
> - [ ] CloudWatch automatically diagnoses which of the twelve is the true root cause
> - [ ] Nothing — composite alarms only add a rule, they can't replace existing actions ^card-y4hr

A composite alarm is a rule over child alarms' states, such as ==ALARM("a") AND ALARM("b")==, rather than a rule over a metric directly. ^card-ew6i

Composite alarms serve two distinct purposes, and it's worth naming them
separately: **raising a signal only when a combination is true** — a
disk-full alarm ANDed with a backup-job-running alarm, so you're paged
only when the disk is full *and* nothing scheduled explains it — and
**collapsing a storm of correlated child alarms into one parent
notification**, as in the twelve-dependency example above.

What are the two distinct things composite alarms are used for, beyond just "combining alarms"? :: Raising a notification only when a specific combination of conditions is true together (an AND across otherwise-independent alarms), and collapsing a storm of correlated child alarms that would otherwise all fire at once into a single parent notification. ^card-bzut

The **suppressor** pattern applies this same AND rule to a maintenance ^card-hrci
or deployment alarm instead of another failure signal:
`ALARM("app-errors") AND NOT ALARM("deployment-in-progress")` pages on
application errors only while a matching deployment or maintenance
alarm is *not* active, so a deploy's expected error blip doesn't page
anyone. Why is suppressing at the alarm layer, with a rule like this, preferable to muting the pager or the on-call rotation directly during a deploy? :: Muting the pager or rotation silences everything indiscriminately for that window, including an unrelated incident that happens to overlap the deploy; a suppressor alarm narrows the silence to exactly the condition the deployment alarm represents, so a genuinely unrelated failure during the same window still pages normally.

> [!card] recall
> A team wraps twenty alarms for one service's endpoints in a single
> composite alarm using AND across all of them, on the reasoning that
> "if the service is really down, everything fails together." One
> endpoint starts failing on its own, unrelated to the rest. Explain
> what the team does and doesn't find out from the composite alarm in
> this case, and why an AND-based composite is an honest trade rather
> than a strictly better alarm.
> ---
> Because AND requires every child to be in ALARM, a single endpoint
> failing alone never trips the composite — the team finds out nothing
> at all from it, even though a real problem exists. The composite alarm
> deliberately narrows what triggers a notification to reduce noise from
> correlated failures sharing one root cause, but that same narrowing
> can hide a real, uncorrelated single failure; it isn't a strictly
> better alarm, it's a different trade between fewer false alarms and
> a chance of missing an isolated one. ^card-xn9t

Composite alarms over children that genuinely share a root cause are
the case they're built for; composite alarms over children that don't
are where the suppression buys silence at the price of visibility into
exactly the kind of failure that doesn't take everything down at once.
