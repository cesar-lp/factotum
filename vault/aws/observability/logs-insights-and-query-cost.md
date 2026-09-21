---
topic: aws
category: aws-observability
tags: [cloudwatch, logs-insights, query-cost, structured-logging]
citations: ["Amazon CloudWatch Logs User Guide — 'Analyzing log data with CloudWatch Logs Insights'"]
---

# Logs Insights and Query Cost

`log-groups-streams-and-retention-cost.md` covers what a log group costs to
store and keep around. This note covers the other cost surface entirely —
what it costs to *ask a question* of logs you've already stored — and a
query language purpose-built for turning raw log lines into an aggregate
answer.

A Logs Insights query is a pipeline of stages, each narrowing or
transforming the rows produced by the one before it: `fields` picks which
fields to show, `filter` keeps only matching rows, `parse` extracts new
fields out of unstructured text, `stats ... by` collapses rows into groups
and computes an aggregate per group, and `sort` and `limit` shape the final
output.

The stage that actually changes what kind of question you can answer is
==stats==. Without it, a query is a search — it hands back matching log ^card-nlzl
lines for you to read. Adding it turns that same log data into a number: a
count, an average, a percentile, one row per group instead of one row per
log line. That's the difference between grepping and measuring.

Why does adding `stats ... by` to a query change what kind of question you can answer, rather than just changing the output format? :: Without `stats` a query returns individual matching log lines — you still have to read them and do the aggregation yourself. `stats` computes the aggregate (a count, an average, a percentile) per group inside the query engine itself, so the result is already the answer — "how many," "how often," "what's the p99" — instead of raw material for you to summarize by hand. ^card-q2xy

> [!card] mcq
> A query filters a log group down to every line containing "timeout" over the last hour. What turns this from a search into a measurement of how often timeouts are happening per service?
> - [x] Adding a `stats count(*) by service` stage
> - [ ] Adding a `limit 10000` clause
> - [ ] Sorting the results by `@timestamp`
> - [ ] Narrowing the `filter` to an exact string match instead of a substring ^card-rj84

`parse` pulls a new field out of a log line's raw text using a pattern with
a glob-like placeholder — useful when the line was written as free-form
text and the value you want (a status code, a duration, a request id) is
just sitting inside a string with no field boundary around it.

That extraction step disappears entirely for logs written as JSON: a JSON
log line's keys are picked up automatically as ==addressable== fields — no ^card-s3q7
`parse` needed — so `stats avg(duration) by endpoint` works directly
against a field that arrived already structured.

Why is "JSON log lines are parsed into fields automatically" the concrete argument for structured logging, rather than just a style preference? :: It's the difference between a query you can write and one you cannot without extra work. A field that already exists as JSON can go straight into `fields`, `filter`, or `stats by` with no extraction step. The same value sitting inside a free-form text line needs a `parse` pattern to pull out first — and if the text format is inconsistent across log statements, that pattern breaks or misses rows, so the query becomes unreliable exactly where the aggregate matters most. ^card-auww

Logs Insights charges by the ==volume of data scanned== to run a query, not ^card-b3il
by how much of that data ends up in the result. A query over an hour of one
log group is billed for that hour's bytes; the same query over a month is
billed for roughly seven hundred times as much, regardless of how few rows
either one returns.

That billing model inverts the intuition most people bring from an indexed
search engine, where a `WHERE` clause makes a query cheaper by letting the
engine skip unindexed data. A Logs Insights `filter` does nothing of the
kind:

Why doesn't adding a `filter` clause reduce what a Logs Insights query is charged for? :: Because there's no index to skip past — the query engine still has to read every byte of every log event in the selected log groups and time range to know whether it matches the filter or not. The filter changes which rows appear in the result, not how much data had to be scanned to produce that result, so a highly selective filter over a huge time range still costs the same as an unfiltered one over that same range. ^card-5pcq

The one lever that actually reduces cost is choosing a smaller time range
or fewer log groups to scan, since those two settings — not the query body
— determine the bytes read.

> [!card] recall
> Two engineers are debugging a spike in errors. One runs a query over the
> last 30 days with a tight `filter` on the exact error string. The other
> runs the same `filter` over just the last hour, then widens the range
> only if nothing turns up. Explain why the second approach is the better
> default given how Logs Insights is billed, and what "widen only if
> needed" is actually optimizing for.
> ---
> Cost is driven by the time range (and which log groups are scanned), not
> by how selective the filter is — a `filter` doesn't reduce bytes read
> either way. Starting narrow means the common case (the error is recent)
> gets answered for a small fraction of the cost of scanning 30 days
> upfront, and only the less common case of an older or less obvious
> problem pays for a wider scan. "Widen only if needed" defers the
> expensive scan until cheaper ones have already failed to answer the
> question. ^card-uun0

A second consequence of scan-based billing is where you draw log group
boundaries in the first place. Because a query only pays for the log groups
it actually scans, keeping unrelated concerns in ==separate== log groups ^card-qh2o
means a query against one of them costs nothing extra for the others —
mixing them into one giant log group instead forces every query against
any one concern to scan, and pay for, all of them.

Results are also capped in size regardless of cost — a query that would
otherwise return far more rows than the cap stops early, which is what the
explicit `limit` clause is for: naming how many rows you actually want back
rather than relying on the implicit cap to cut the query off. A query worth
running more than once can also be saved, so a recurring investigation
doesn't have to be retyped from scratch each time — though a saved query
still scans fresh data, and fresh bytes, every time it's run.
