---
topic: aws
category: aws-observability
tags: [cloudwatch, metrics, dimensions, cardinality, cost]
citations: ["Amazon CloudWatch User Guide — 'Metrics'", "Amazon CloudWatch User Guide — 'Dimensions'"]
---

# Metrics, Namespaces, Dimensions, and Cardinality

Lambda's own cost-and-observability note covers what a function emits and
why tracing exists; this note starts one layer down, at the thing every
CloudWatch metric actually is underneath the graphs — because getting this
wrong is the single most common way an observability bill surprises
someone.

A CloudWatch metric's identity is not its name. It is the combination of
==namespace==, metric name, and the full set of dimension name-value pairs ^card-n0wm
attached to a data point. Publish the same metric name under two different
dimension sets and CloudWatch does not treat that as one metric viewed two
ways — it stores two entirely separate metrics, each with its own data
points and its own statistics.

`Latency` published with `service=api` and `Latency` published with
`service=api, region=eu` are not the same metric filtered differently.
They are two metrics that happen to share a name, because the dimension
set is part of what makes a metric *that* metric.

Why can't you graph a total across all instances if you have only ever published a metric with an `instance_id` dimension set on every data point? :: Because CloudWatch never stored a total — each distinct `instance_id` value created a distinct metric, and CloudWatch does not retroactively sum across sibling metrics for you. The aggregate you want was never a data point anywhere; you would have had to publish it yourself as its own metric (with no `instance_id` dimension, or with an explicit rollup dimension) at the time you emitted the per-instance ones. ^card-7e3k

> [!card] recall
> A team publishes a custom metric with dimensions for `endpoint` and
> `status_code` on every data point, but never publishes a version of
> that metric without those dimensions. Months later they want a single
> graph of total request count across all endpoints and status codes.
> Explain why that graph cannot be built from what they already have,
> and what they'd need to change going forward.
> ---
> Every combination of `endpoint` and `status_code` values is its own
> distinct metric under CloudWatch's identity rule, so there is no
> "all of them" metric already stored — summing sibling metrics after
> the fact isn't something CloudWatch does automatically for an
> arbitrary set of them. To get the total going forward, they need to
> publish an additional data point, at write time, that omits those
> dimensions (or rolls them into a single aggregate dimension), so the
> aggregate exists as a metric in its own right. ^card-yp08

Custom metrics are billed per metric, not per data point, which turns
dimension cardinality into a cost multiplier rather than a free-form
label. A measurement broken out along three dimensions with ==10==, 50, ^card-b5on
and 200 possible values respectively is not "one metric with extra
detail" — multiply those value counts together and the same conceptual
measurement turns into a potential 100,000 distinct metrics, each billed
as its own metric.

> [!card] mcq
> A service publishes a custom metric with dimensions `customer_id`
> (5,000 distinct values) and `endpoint` (20 distinct values), with
> every combination actually occurring. Roughly how many billable
> custom metrics does this generate?
> - [x] Up to 100,000 — cardinality multiplies across dimensions, since each distinct combination of dimension values is a separate metric
> - [ ] 5,020 — one metric per distinct dimension value across both dimensions, added together
> - [ ] 1 — dimensions are just labels on one underlying metric and don't affect how many are billed
> - [ ] 25 — only the number of dimensions matters, not how many values each one takes ^card-z28q

What makes a dimension value choice like a raw request id, a user id, or a full URL path a classic cause of a runaway observability bill? :: Each is effectively unbounded — a new distinct value shows up on essentially every request — so putting one in a dimension doesn't add detail to an existing metric, it mints a brand-new metric per request or per user. Cardinality that should have been in the thousands becomes unbounded, and because custom metrics bill per metric, the cost scales with traffic instead of staying flat. ^card-r2hu

A namespace is the top-level container that scopes a metric name and
keeps unrelated services (and your own applications) from colliding —
AWS's own services publish into fixed namespaces like ==AWS/Lambda== or ^card-vqgq
`AWS/S3`, and a custom application typically gets its own namespace name
chosen when you publish to it.

Why can a service's built-in CloudWatch metric only be sliced along certain dimensions and not others you might want? :: Because AWS, not you, decided which dimensions get attached to that metric's data points when the service publishes them — a service metric arrives with a fixed dimension set baked in, so you can only view it broken out along whichever dimensions AWS chose to record, never along one it never captured. ^card-wge7
