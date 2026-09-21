---
topic: aws
category: aws-observability
tags: [cloudwatch, alerting, slo, percentiles, golden-signals]
citations: ["Amazon CloudWatch User Guide — 'Percentiles', 'Metric math'", "Google SRE Book — 'Monitoring Distributed Systems'"]
---

# Golden Signals, Percentiles, and What to Alert On

`alarms-evaluation-and-missing-data.md` and
`composite-alarms-and-alarm-actions.md` cover how an alarm actually
evaluates a metric and fires an action. This note is about a layer
above that mechanics: which metrics are worth watching in the first
place, and which of those are worth waking someone up over.

Four signals are worth instrumenting on nearly any service before
anything else, because between them they catch almost every failure
mode a user would notice. **Latency** is how long requests take —
distinguishing successful-but-slow from genuinely failed matters, since
they call for different responses. **Traffic** is how much demand the
service is under — requests per second, or whatever the service's
natural unit of load is. **Errors** is the rate of requests that failed.
**Saturation** is how full the service's most constrained resource is —
not raw CPU or memory in isolation, but whichever resource, once
exhausted, degrades the other three. A service can look fine on the
first three signals while its saturation signal is already climbing
toward the point where it won't be.

> [!card] mcq
> A service's latency and error rate both look normal, but a queue depth metric behind it has been climbing steadily for an hour. Which of the four golden signals does that queue depth represent, and why does it matter even though the user-facing signals haven't moved yet?
> - [x] Saturation — it measures how close a constrained resource is to its limit, and it tends to move before latency and errors do, since a resource can absorb backlog for a while before it starts visibly degrading requests
> - [ ] Traffic — queue depth is just another way of measuring request volume
> - [ ] Errors — a growing queue implies requests are already failing somewhere
> - [ ] Latency — queue depth is latency measured indirectly ^card-en3p

What does it mean for a resource to be the right one to track as a service's saturation signal, out of everything that could be measured? :: It should be whichever resource is most constrained for that service — the one that, once exhausted, is what actually degrades latency, throughput, or error rate. Tracking an unconstrained resource (say, disk space on a service that will run out of memory or connection pool slots long first) as "the" saturation signal misses the one that will actually cause the outage. ^card-wt1z

An average latency is a single number computed across every request in
a period, and it hides exactly the requests you'd most want to know
about: a slow tail can sit underneath a perfectly normal-looking
average, because enough fast requests pull the mean back down. A
==p99== latency — the value below which 99% of requests fall — is where ^card-c99e
the users who are actually suffering live, since it isolates the
requests the average is diluting away.

The problem compounds across instances. Averaging the per-instance
average latencies together — an average of averages — is not a
statistically meaningful number at all: it weights every instance
equally regardless of how many requests each one actually served, so a
lightly loaded instance's average distorts the result as much as a
heavily loaded one's, in a way a raw distribution over all requests
never would.

Why is an "average of averages" — averaging several instances' own average latencies together — considered not a meaningful statistic, even though each individual instance's average is a legitimate number? :: Averaging averages implicitly weights every instance equally, regardless of how many requests it actually handled, so an instance that served ten requests skews the combined figure exactly as much as one that served ten thousand. The result no longer reflects the true distribution of latency across actual requests — it reflects the distribution across instances instead. ^card-8njh

CloudWatch turns that from a preference into a constraint you have to
satisfy in advance. A percentile can only be computed where the
distribution of individual values was preserved; a metric published as a
pre-aggregated statistic set has already thrown away what the calculation
needs, and nothing you write later recovers it.
`metric-resolution-retention-and-statistics.md` works through exactly why
those stored statistics are insufficient. The consequence for alerting is
the part that matters here: whether you *can* page on p99 is settled when
the metric is instrumented, not when the alarm is written.

The choice of what to page on follows from the same distinction between
what a metric measures and what actually degrades the user's
experience. An alert should fire on a **symptom** — error rate, or
latency past an agreed threshold — because that's the thing the user is
actually experiencing. Alerting on a **cause** instead — CPU usage,
queue depth, disk I/O — produces two kinds of false signal: it can fire
while nothing is actually going wrong for users (CPU spikes during a
harmless batch job), and it stays silent during an outage whose cause
isn't the one you happened to pick a threshold for. Cause-based signals
belong as diagnostic information to consult once a symptom-based
alert has already fired, not as the trigger itself.

> [!card] recall
> Explain why "page on symptoms, not causes" is the right default for what to alarm on, using CPU usage as the example of a cause-based signal that shouldn't itself page anyone.
> ---
> A symptom (error rate, latency past a threshold) is what the user is actually experiencing, so an alert on it is guaranteed to correspond to a real user-facing problem when it fires, and to catch every user-facing problem regardless of what caused it. CPU usage is a cause: it can spike for reasons that never affect users (a scheduled batch job, a GC pause) — a false page — and a real outage can happen without CPU ever moving (the bottleneck is a downstream dependency, or connection pool exhaustion) — a missed page. CPU is still worth watching, just as a diagnostic to check once a symptom-based alert has already told you something is actually wrong. ^card-bakw

An **error budget** answers the question a raw threshold leaves
unanswered: how much failure is actually acceptable? Instead of
alarming on "any error," you set an objective — say, 99.9% of requests
succeed over 30 days — which implies a budget of allowed failures for
that window. The threshold that pages someone stops being an arbitrary
round number and becomes a decision about how much of that budget can
burn before it's a real problem, which is also what tells you whether a
brief spike is worth waking up for or safe to absorb.

Alert fatigue is not just an annoyance — it's an engineering failure
with a concrete mechanism: every alert that fires without anyone taking
action trains the people receiving it to treat the channel as ==noise==, ^card-lcuf
so that when a genuinely serious alert does fire, it gets the same
reflexive dismissal as the routine ones before it. Because of that
mechanism, deleting an alert that nobody acts on is often the correct
fix, not a compromise — a page that trains people to ignore pages is
actively making the on-call rotation worse at catching the alerts that
matter.

Why can deleting a low-value alert improve, rather than worsen, a team's ability to catch real incidents? :: Every alert that fires without a real action taken conditions the on-call responder to treat that channel as safe to ignore, which degrades their response to every other alert on the same channel, including the ones that matter. Removing an alert nobody acts on removes that training effect, so responders are more likely to treat the alerts that remain as genuinely worth acting on. ^card-fmbi
