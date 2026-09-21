---
topic: aws
category: aws-observability
tags: [cloudwatch, metrics, resolution, retention, statistics]
citations: ["Amazon CloudWatch User Guide — 'Metric data points'", "Amazon CloudWatch User Guide — 'GetMetricStatistics'"]
---

# Metric Resolution, Retention, and Statistics

`metrics-namespaces-dimensions-and-cardinality.md` covers what a metric
*is*; this note covers what CloudWatch actually keeps once you've published
one, and why the numbers you get back later don't always answer the
question you meant to ask.

The single fact that explains most confusion about CloudWatch's numbers is
this: CloudWatch does not store the raw events you publish. It stores
statistics computed over a period, and once that computation happens the
individual data points behind it are gone — you cannot go back and ask
for something the stored statistic didn't preserve.

What is the one fact about how CloudWatch stores metric data that explains most of the confusion people have about its numbers? :: CloudWatch stores statistics computed over a period rather than the raw underlying data points — once a period's statistic is computed and the finer-grained data ages out, the individual events behind it are gone and cannot be recomputed a different way later. ^card-46si

Metrics can be published at ==standard== resolution, a 1-minute ^card-bugz
granularity, or at high resolution, down to 1 second. High resolution
isn't free: it costs more to publish, and an alarm evaluated against a
high-resolution metric can check as often as every 10 or 30 seconds
instead of once a minute, which makes it far more sensitive to short
transient blips than an alarm watching the coarser, once-a-minute
version of the same underlying behavior.

> [!card] mcq
> A team switches a metric from standard to high resolution and also
> creates an alarm that evaluates it every 10 seconds. What's the most
> likely operational consequence, beyond the added publishing cost?
> - [x] The alarm reacts to much shorter transient spikes, so it can flap or fire on blips that a 1-minute standard-resolution alarm would have smoothed over
> - [ ] Nothing changes about alarm behavior, since alarms always evaluate once per minute regardless of the metric's resolution
> - [ ] The metric's retention period gets shorter, since higher-resolution data is deliberately discarded sooner in exchange for finer granularity
> - [ ] The statistic set CloudWatch keeps changes from average/sum/min/max to raw percentiles ^card-8n87

Retention follows a rollup schedule, not one flat expiration: high-
resolution and 1-minute data points are kept at that granularity for only
a short window, then CloudWatch aggregates them into 5-minute data
points, and later into 1-hour data points, with the coarsest tier held
for a total of ==15 months==. ^card-cj7t

Why would a year-old incident be impossible to examine minute-by-minute, even though CloudWatch's total metric retention is a generous 15 months? :: Because that 15-month figure describes the coarsest, longest-lived tier of the rollup schedule, not the finest one — the original per-minute or per-second data points are aggregated away into 5-minute and then 1-hour statistics long before a year passes, so by the time you'd go looking, the fine-grained detail has already been replaced by an hourly summary and no longer exists to query. ^card-8tah

CloudWatch keeps a fixed statistic set per period rather than every data
point that fed into it: sum, minimum, maximum, sample count, and average.
Those five numbers can tell you a lot, but they cannot answer every
question — a true median or a p99 latency is mathematically unrecoverable
from sum, min, max, count, and average alone, because none of those five
values describes how the underlying data points were distributed between
the min and the max.

> [!card] recall
> Given only a period's sum, minimum, maximum, sample count, and average
> for a latency metric, explain why you cannot derive a p99 from them —
> and what that implies about why CloudWatch treats percentile statistics
> as something fundamentally different from Average, requiring the
> distribution itself to have been retained rather than just these five
> summary numbers.
> ---
> A percentile is a statement about where a value falls within the full
> ordered distribution of data points — the 99th-smallest out of every
> hundred, roughly speaking. Sum, min, max, count, and average describe
> the aggregate shape of the data (its total, its extremes, its center of
> mass) but say nothing about how values are spread between the min and
> max, so infinitely many different distributions could produce the same
> five numbers while having wildly different p99s. Getting a percentile
> back out requires CloudWatch to have kept something closer to the
> underlying distribution of data points for that period, not merely the
> five-number summary — which is why percentiles are computed
> differently under the hood and can't just be read off the same
> statistic set that Average comes from. ^card-iy44

`SampleCount` is what separates a genuinely good period from a lucky one:
an unusually low average latency backed by a large count means the whole
period ran fast, while the same low average backed by a count of one
means a single fast request skewed a period where almost nothing else
happened — the average can't tell those two stories apart on its own.

Why can two periods report the exact same low Average latency and mean completely different things operationally? :: Average alone doesn't say how many requests it was computed from — a low average from a period with a large SampleCount reflects genuinely fast, consistent behavior across many requests, while the same low average from a period with a SampleCount of one is just a single lucky request, with no information at all about how everything else in that period performed. ^card-pjer

The period you request when graphing or alarming and the resolution at
which a metric was actually stored are independent settings, and
confusing them produces false expectations rather than an error.

Why doesn't requesting a 1-minute period over a metric whose underlying data has already been rolled up to 5-minute granularity give you back 1-minute detail? :: Because the period parameter only controls how the query buckets and labels the statistic it returns — it can't invent detail that was never stored. Once the finer-grained points have been aggregated away, querying at a shorter period just returns the coarser statistic relabeled at that period; the stored resolution puts a hard ceiling on how fine any query can meaningfully be, and no query-time setting raises it. ^card-u7a5
