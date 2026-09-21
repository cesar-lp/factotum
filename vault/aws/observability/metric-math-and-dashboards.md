---
topic: aws
category: aws-observability
tags: [cloudwatch, metric-math, dashboards, alarms]
citations: ["Amazon CloudWatch User Guide — 'Using metric math'", "Amazon CloudWatch User Guide — 'Using Amazon CloudWatch dashboards'"]
---

# Metric Math and Dashboards

`metrics-namespaces-dimensions-and-cardinality.md` covers what a metric is;
`alarms-evaluation-and-missing-data.md` covers how an alarm evaluates one.
This note covers the layer in between: computing a metric you never
published, from ones you already have, entirely at query time — and the
dashboards built on top of the result.

Metric math takes one or more existing metrics as input and applies an
expression to them, producing a new time series without ever writing
anything new to CloudWatch's storage. Nothing about the inputs changes;
the new series exists only as the output of that expression, recomputed
whenever it's evaluated.

The everyday case that justifies the whole feature is a ratio — dividing an
error count by a request count to get an ==error rate==. An alarm on the ^card-rvdp
raw error *count* fires the moment traffic spikes, even if the proportion
of failures hasn't moved at all; an alarm on that ratio only fires when
failures actually become more common relative to traffic.

Why does an alarm on a raw error count risk firing during a plain traffic spike, when an alarm on the error-rate expression (errors divided by requests) does not? :: A traffic spike raises the absolute number of errors just by raising the number of requests, even if the underlying failure proportion is unchanged — the count alarm can't distinguish "more traffic, same reliability" from "the same traffic, now failing more." Dividing by request count normalizes that out, so the rate only moves when the proportion of failures actually changes. ^card-3njj

> [!card] mcq
> A service's error count triples during a traffic surge, but its error rate (errors ÷ requests) stays flat. Which alarm correctly stays quiet through this surge?
> - [x] An alarm on the metric math expression errors ÷ requests
> - [ ] An alarm on the raw error count metric
> - [ ] Both alarms, since CloudWatch normalizes count metrics automatically
> - [ ] Neither — metric math expressions can't be alarmed on directly ^card-bg26

Beyond arithmetic between metrics, common expression shapes include `SUM`
and `AVG` applied across an array of metrics (collapsing several time
series from, say, one per instance, into one), `RATE` for converting a
cumulative counter into a per-period rate, and `FILL` for substituting a
value — a constant, or the last known value — into gaps where a metric has
no datapoint.

`SEARCH` deserves special attention because of what it does to a graph over
time rather than at query time: it's an expression that matches metrics
==dynamically== by namespace, metric name, or dimension pattern instead of ^card-t81x
naming a fixed list of metrics up front. A graph built on a `SEARCH`
expression picks up a new instance, a new dimension value, or a newly
launched resource automatically, without anyone editing the graph's
definition to add it.

Why does building a graph on a SEARCH expression avoid the maintenance problem that naming metrics explicitly creates? :: An explicit list of metrics only ever shows the resources that existed when someone wrote the expression — a new instance or a new dimension value simply doesn't appear until the list is edited by hand. SEARCH instead matches by pattern at evaluation time, so whatever currently satisfies the pattern is included, and a newly created resource shows up on the next evaluation with no edit required. ^card-wal2

The capability that makes ratio-based alarming possible at all is that a
metric math expression can itself be the thing an alarm watches — you are
not limited to alarming on published metrics. The one constraint is that
the expression an alarm uses must ==collapse== to a single time series; ^card-77vy
an expression that would otherwise fan out into one series per matched
metric (a raw `SEARCH` result, for instance) has to be reduced first, with
something like `SUM` or `AVG`, before an alarm can be attached to it.

What happens if you try to attach an alarm directly to a metric math expression built from a bare SEARCH, without wrapping it in an aggregating function like SUM? :: It can't be used, because that expression fans out into one time series per metric the search matches rather than producing a single series — an alarm needs exactly one series to evaluate a threshold against. The SEARCH result has to be collapsed with an aggregating function like SUM or AVG first so the expression resolves to the one time series an alarm requires. ^card-k327

`FILL`'s gap-substitution matters beyond making a graph look continuous: a
gap in one input metric of an expression propagates into the derived
series, so a metric math result can end up sparser than either of its
inputs on its own. `metrics-namespaces-dimensions-and-cardinality.md` and
`alarms-evaluation-and-missing-data.md` cover missing-data handling and
`treatMissingData` for a single metric's own alarm; the added twist here is
that a *derived* metric's gaps are inherited from whichever input metric
happened to be missing a datapoint at that moment, which is easy to miss
when reasoning about the expression's numerator and denominator as if they
were always both present.

> [!card] recall
> An error-rate alarm (errors ÷ requests) has gone unexpectedly quiet
> during an incident where the error count metric is still publishing
> normally, but the request count metric briefly stopped reporting
> datapoints. Explain how a gap in just one input metric can silence an
> alarm built on an expression combining both, and why FILL is the
> relevant lever here rather than anything about the alarm's own
> configuration.
> ---
> A metric math expression can only produce an output datapoint where all
> of its inputs have one — if the request count metric has a gap, the
> division has nothing to divide by at that timestamp, so the derived
> rate series has a gap there too, whether or not the error count metric
> is reporting fine. The alarm never sees a breaching value during that
> gap because it never sees any value at all, so it stays in whatever
> state it was already in rather than firing. FILL addresses this by
> substituting a value into the missing input so the expression can still
> compute something, rather than the alarm needing different evaluation
> settings. ^card-xuc4

Dashboards are the visualization layer over both plain metrics and query
results (including Logs Insights queries — see
`logs-insights-and-query-cost.md`): widgets arranged on a grid, each backed
by one or more metrics or expressions.

A dashboard is not a live window onto whatever is currently configured —
it is a saved document with its own definition (which widgets, which
metrics, which time range) that has to be edited to change, and that
definition is what renders every time the dashboard is opened, independent
of anything else changing around it.

Why does calling a CloudWatch dashboard "a saved document, not a view of live config" matter in practice? :: Because a dashboard's widgets keep showing exactly the metrics and expressions it was built with, even if the underlying resources are renamed, replaced, or removed — nothing about the dashboard's definition updates itself in response. A widget built on an explicit metric list goes stale the same way a metric math expression without SEARCH does; someone has to edit the dashboard deliberately to point it at what currently exists. ^card-btbx

A single dashboard can also mix widgets pulling from different accounts and
different regions, so one view can put a metric from a production account
next to one from a staging account, or roll up the same metric across
several regions, without needing a separate dashboard per account or
region.

The honest boundary between a dashboard and ad-hoc querying is what
question each is for: a dashboard is worth building for a question you
already know you'll keep asking — is this service healthy right now — and
pays for its setup cost through repetition. An ad-hoc Logs Insights query
or a one-off metric math expression is for the question you didn't know
you'd need to ask until the incident that raised it, where building a
permanent widget for it would be effort spent on something you may never
look at again.
