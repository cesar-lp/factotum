---
topic: aws
category: aws-observability
tags: [cloudwatch, x-ray, metrics, logs, tracing, cost-model]
citations: ["Amazon CloudWatch User Guide — 'What is Amazon CloudWatch?'", "AWS X-Ray Developer Guide — 'How X-Ray works'"]
---

# Choosing Between Metrics, Logs, and Traces

The other notes in this category cover each signal's own mechanics —
what a metric's dimensions are, how a log group's retention works, how
an X-Ray trace is assembled. This note is about picking between them,
which is a question of properties: what each one can answer, and what
each one costs to keep around.

The property that decides the most up front is **cardinality**. A
metric's storage and query cost scale with the number of distinct
dimension-value combinations it has to track — every new combination is
effectively a new time series. A log line's cost doesn't work that way:
writing a log entry that includes a customer id or a request id costs
the same whether that id has been seen once or a million times. That
asymmetry is the rule for where an identifier belongs: a
==high-cardinality== value like a customer id or request id belongs in a ^card-9dcu
log field or an X-Ray annotation, never in a metric dimension, because a
metric with unbounded dimension values is a cost incident waiting to
happen.

Why does putting a unique request id into a metric's dimensions cause a cost problem that putting the same id into a log line does not? :: A metric is billed and stored per distinct combination of dimension values, so a dimension that takes on a new value for every request creates a new time series per request, growing without bound. A log line's cost doesn't depend on how many distinct values a field has taken across all log entries — one entry with a unique id costs the same as one without, so uniqueness is harmless there. ^card-ytoy

Retention and aggregation are the second axis, and they trade off
against each other. A CloudWatch metric can survive up to 15 months,
but only by progressively rolling older data up into coarser
granularity — the detail of an individual data point is gone long before
the retention window ends. A log entry keeps its full original content
for exactly as long as its log group's retention setting keeps it, with
no forced rollup — but that fidelity is also why logs cost more to
retain at the same volume.

> [!card] mcq
> A metric retained for its full 15 months and a log group retained for the same period are compared for what they can tell you about a specific event from 10 months ago. What's the key difference?
> - [x] The metric has already been aggregated into coarser granularity by then, while the log entry (if not expired or deleted) still holds its original full-fidelity content
> - [ ] Both retain identical granularity for the full period, so there's no difference
> - [ ] The log has been aggregated into rollups, while the metric keeps full detail
> - [ ] Neither can be queried after 6 months regardless of retention settings ^card-jskv

Query cost is the third axis, and it's asymmetric in the opposite
direction from storage. Reading a metric is cheap and ==bounded== — you ^card-d7jc
ask for a time series over a window and get back a fixed, small amount
of data regardless of how much traffic generated it. Querying logs is
charged by the volume of data the query has to scan, so a query over a
wide time range or an unindexed log group can be slow and expensive even
when the answer it returns is one line.

The billing model behind that second half is the subject of
`logs-insights-and-query-cost.md`.

Why is reading a metric's value over a time window cheap and predictable, while running a log query over the same window can be expensive and slow? :: A metric read returns pre-aggregated data points at a fixed resolution — the cost doesn't grow with how much underlying traffic produced those points. A log query has to scan the raw log data covered by the time range to find matches, so its cost and latency scale with the volume of log data written in that window, not with the size of the answer. ^card-osij

The fourth axis is completeness. A metric counts every event that
occurred — a request-count metric reflects all requests, not a sample of
them. A trace, by contrast, only exists for the fraction of requests
X-Ray decided to sample (`distributed-tracing-with-x-ray.md` covers the
sampling mechanics); most requests that ever happened have no trace at
all.

These four axes settle the division of labor. Metrics are for detecting
that something is wrong and for alarming, because they're cheap,
continuous, and complete — an alarm needs to see every occurrence, not a
sample. Logs are for explaining one specific occurrence once you know
roughly when it happened, because they keep full fidelity. Traces are
for locating where in a multi-service call chain a problem lives, because
they carry the causal structure a single log line or metric point
doesn't.

> [!card] recall
> A service's error rate metric crosses its alarm threshold. Walk through which signal you'd reach for first to detect this, which you'd reach for next to explain a specific failed request, and which you'd reach for to find which downstream dependency caused it — and say why each one is the right tool for that step rather than either of the others.
> ---
> Detect with the metric: it's cheap, continuous, and counts every request, so it's the only one of the three suited to always-on alarming. Explain a specific request with logs: once you know roughly when the failure happened, a log query (or a request id pulled from the metric's dimensions if logged) gives full-fidelity detail about what that one invocation actually did. Locate the failing dependency with a trace: it's the only signal that preserves the causal structure across services, showing which downstream call the time or error actually came from — something no single log line or metric point can show on its own, since neither one is stitched across service boundaries. ^card-1h74

Two traps follow directly from getting an axis wrong. The first is
==alarming== on a Logs Insights query — polling a log query on a ^card-spoj
schedule to detect a condition. It's slower and more expensive than it
needs to be for anything a metric filter or the embedded metric format
could turn into a metric instead, since a metric-based alarm evaluates in
seconds against pre-aggregated data rather than re-scanning raw logs each
time.

Both of those cheaper routes from a log line to a metric are covered in
`metric-filters-and-embedded-metric-format.md`.

The second trap is trying to alarm on trace data — for example, treating
a rise in sampled trace latency as a proxy for overall latency. Sampling
makes this unsound: a sampled subset isn't guaranteed to represent the
full traffic, so a trace-based signal can miss a real widespread problem
or manufacture a false one purely from which requests happened to be
selected.

What makes an alarm built on X-Ray trace data statistically unsound, in a way that an alarm on a metric is not? :: Traces are sampled, not complete — only a subset of requests are ever recorded. An alarm needs its signal to reliably reflect what's actually happening across all traffic, but a sampled subset isn't guaranteed to be representative, so it can either miss a genuine widespread problem or show an apparent spike caused only by which requests happened to be sampled. ^card-e4nv
