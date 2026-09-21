---
topic: aws
category: aws-observability
tags: [cloudwatch, alarms, missing-data, anomaly-detection]
citations: ["Amazon CloudWatch User Guide — 'Using Amazon CloudWatch alarms'"]
---

# Alarms, Evaluation, and Missing Data

`metric-resolution-retention-and-statistics.md` covers what a metric
*is*; this note covers what watches it. A CloudWatch alarm is not just a
threshold — it's a threshold plus an evaluation window plus a rule for
what to do when no data shows up at all, and it's the last two pieces,
not the threshold, where alarms actually misbehave in production.

An alarm is always in exactly one of three states, and the third is a
real, first-class state with real consequences rather than an error
condition:

> [!card] mcq
> A CloudWatch alarm has just been created and no datapoints have
> arrived yet for its metric. What state is it in?
> - [x] INSUFFICIENT_DATA — a distinct third state, not an error
> - [ ] OK, since no breach has been observed
> - [ ] ALARM, since it can't confirm the threshold is being respected
> - [ ] The alarm has no state until the first datapoint arrives ^card-pn6d

Why does treating INSUFFICIENT_DATA as "basically OK" understate what it means? :: INSUFFICIENT_DATA means the alarm cannot currently evaluate its condition at all — the metric simply hasn't produced enough datapoints — which is a different claim than "the condition was checked and found healthy." An alarm can sit in INSUFFICIENT_DATA for exactly the same underlying reason it should be sitting in ALARM: the thing it watches has stopped producing data entirely. ^card-q1kv

Rather than breaching the moment a single datapoint crosses the
threshold, an alarm is configured with ==M== out of N evaluation: it ^card-fbu8
looks at the last N evaluation periods and only transitions to ALARM if
at least that many of them breached. A common setting like 3 out of 5
buys tolerance for one noisy or momentarily bad period without giving
up sensitivity to a sustained problem — but that tolerance is bought
with detection latency, since the alarm cannot fire until enough
breaching periods have actually accumulated.

Raising the number of datapoints required to alarm, out of a fixed
window, reduces false positives — but it also delays every true
positive by roughly the same margin, because the alarm has no way to
tell "one bad period, ignore it" apart from "the start of a real
incident" until enough periods have actually passed.

> [!card] recall
> An alarm set to breach on the very first bad period is flapping
> between OK and ALARM on a noisy metric. Explain what switching to a
> looser "M out of N" setting, like 3 out of 5, actually changes
> mechanically, and why that is a different fix than widening the
> threshold value itself.
> ---
> It stops counting a single noisy period as a full breach — the alarm
> now needs three breaching periods within the last five before it
> transitions, so an isolated spike gets absorbed without ever flipping
> the alarm to ALARM. Widening the threshold instead would mask a
> genuinely elevated-but-tolerable level at every evaluation, changing
> what counts as a breach rather than how many breaches are required. ^card-igrd

The evaluation rule above assumes datapoints keep arriving. When they
don't, a separate setting called `treatMissingData` decides what happens,
and it has four options: `missing`, `notBreaching`, `breaching`, and
`ignore`.

> [!card] mcq
> An alarm watches a custom metric that a function only publishes when a
> particular error path executes — so on a healthy day, no datapoints
> arrive at all. `treatMissingData` is left at `notBreaching`. The
> function's error-reporting code silently breaks and stops publishing
> entirely. What does the alarm show?
> - [x] OK — missing data is treated as a non-breaching datapoint, so total silence looks identical to total health
> - [ ] ALARM, since no data for a required metric is itself abnormal
> - [ ] INSUFFICIENT_DATA, since CloudWatch can tell the publisher died
> - [ ] The alarm is automatically deleted after enough missing periods ^card-f7nu

`treatMissingData` set to `notBreaching` :: missing datapoints are treated as if they did not breach the threshold, so an alarm can sit happily in OK while its underlying metric has stopped being published for any reason — including the exact failure the alarm exists to catch. ^card-6e1t

Why is `missing` (leaving missing datapoints as INSUFFICIENT_DATA, the default) called the least opinionated setting rather than the safest one? :: It makes no assumption in either direction about what an absence of data means — it neither assumes the system is fine (like notBreaching) nor assumes it's broken (like breaching) — which is honest about CloudWatch's actual ignorance, but "honest and neutral" is not the same as "safe": a genuinely dead metric under `missing` still just sits in INSUFFICIENT_DATA rather than paging anyone, unless something else is watching for that state. ^card-tk1u

Sparse metrics — ones only published when a specific condition occurs,
rather than on every request — are the root cause of most alarm
flapping and most alarm silence alike: flapping, because an alarm
oscillates between INSUFFICIENT_DATA and OK as gaps come and go, and
silence, because `notBreaching` (or an unwatched INSUFFICIENT_DATA)
makes total data loss indistinguishable from nothing happening. The
durable fix is usually not to keep tuning `treatMissingData` or the
evaluation window, but to change what gets published: alarm on a metric
that is emitted on every invocation regardless of outcome (or have the
code publish an explicit zero when nothing happened), so the metric's
absence itself becomes a signal worth alarming on rather than routine
static.

Why does tuning `treatMissingData` settings tend to be a weaker fix for a sparse metric than changing what gets published? :: `treatMissingData` only decides how to interpret an absence that has already happened; it can't distinguish "nothing happened" from "the reporting pipeline died" any better after the change than before. Publishing a metric on every invocation (or an explicit zero) removes the ambiguity at the source, so the alarm has real, continuous data to evaluate instead of gaps it has to guess about. ^card-tyc1

CloudWatch's alternative to a fixed numeric threshold is an ==anomaly ^card-bhq8
detection== alarm: instead of comparing the metric to a fixed number, it
fits a band of expected values from the metric's own recent history
(accounting for patterns like daily or weekly seasonality) and alarms
when the metric strays outside that band. The weakness mirrors the
strength — the band learns whatever pattern it's shown, so a sustained
bad period baked into its training window gets absorbed into "normal,"
and the alarm quietly stops catching the very problem that skewed the
band in the first place.

> [!card] recall
> A service has been running with elevated latency for two weeks due to
> an undiagnosed regression. An anomaly-detection alarm is created on
> that latency metric today. Explain why this alarm is a poor tool for
> catching the existing regression, even though it will likely catch a
> *new* one.
> ---
> The anomaly band is fitted from the metric's own recent history, and
> that history already includes the two weeks of elevated latency, so
> the model learns the regressed level as the new normal rather than as
> an outlier, and treats a further worsening — not the existing
> regression — as the anomaly. A fixed threshold set before the
> regression began would have caught it; the anomaly band, trained on
> already-bad data, cannot. ^card-lb8m
