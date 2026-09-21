---
topic: aws
category: aws-observability
tags: [cloudwatch, logs, metrics, emf]
citations: ["Amazon CloudWatch User Guide — 'Creating metrics from log events using filters', 'Embedded metric format'"]
---

# Metric Filters and Embedded Metric Format

`log-groups-streams-and-retention-cost.md` covers what a log group is and
what it costs to keep one around. This note covers a different question:
how a metric ever gets produced from a log line at all, and why AWS
eventually added a second, better way to do it.

The older mechanism is the ==metric filter==: a pattern evaluated against ^card-jkpj
a log group's incoming events, which increments a metric by a defined
value every time an event matches. This is what lets you alarm on the
mere presence of a log line — an ERROR, a stack trace, an out-of-memory
kill — without the application ever having called a metrics API; the
application only had to print the line, and the filter does the counting.

What must an application do, at minimum, for a metric filter to be able to alarm on one of its failure conditions? :: Nothing beyond printing an ordinary log line that mentions the condition (an ERROR, an OOM kill, a specific error code). The filter watches the log group and does the counting; the application never calls a metrics API itself. ^card-lyfg

Metric filters have two failure modes worth knowing because both are
silent. First, a filter only evaluates events as they arrive — it cannot
be applied retroactively to logs that were already ingested before the
filter existed, so turning one on today tells you nothing about last
month's incidents. Second, and more dangerous operationally, a filter's
pattern is matched against a specific log format; if a deploy changes
how a line is worded or structured, the pattern can simply stop matching.
Nothing errors. The metric quietly reads ==zero==, and any alarm built on ^card-vguv
top of it never fires again — the alarm looks healthy right up until the
incident it existed to catch.

> [!card] mcq
> A metric filter was built to alarm on a specific ERROR log line. Months later, a routine deploy slightly reworded that log message. What is the most likely operational consequence?
> - [x] The filter silently stops matching, the metric reads zero, and the alarm never fires again — with no error surfaced anywhere
> - [ ] CloudWatch automatically updates the filter pattern to match the new wording
> - [ ] The filter throws a configuration error visible in the CloudWatch console
> - [ ] The alarm switches into INSUFFICIENT_DATA and pages on-call immediately ^card-9d1u

Why can't a newly created metric filter produce a useful metric for an incident that happened last week? :: A metric filter only evaluates log events as they're ingested going forward; it has no mechanism to scan back over events already stored in the log group, so it can only ever measure activity from the moment it was created onward. ^card-v1br

The newer approach inverts the whole arrangement. With the ==Embedded ^card-jeto
Metric Format==, the application itself writes one structured JSON log
line containing both the metric values and their dimensions inside a
defined `_aws` envelope; CloudWatch's ingestion pipeline recognizes that
envelope and extracts the metrics automatically, with no separate
`PutMetricData` call and no pattern-matching step standing between the
log line and the metric.

What is the practical benefit of a single EMF log line producing both a metric and a log record, compared to publishing a metric filter over an ordinary log line? :: You keep the metric's speed and alarmability for free, but the log record survives too — with EMF you can pivot from an anomalous metric data point straight back to the exact structured log line that produced it, something a metric filter can't offer since it discards everything about the event except the count. ^card-q26k

EMF earns that outcome through three concrete wins over calling
`PutMetricData` directly from the request path: no extra network round
trip is added to the request just to publish a number, fields with
high or unbounded cardinality (a user id, a request id) can ride along
in the structured log record without ever becoming metric dimensions,
and the resulting log is queryable on its own terms as full-fidelity
structured data, not just a number that was extracted from it.

> [!card] recall
> A teammate says "we switched this Lambda function to EMF, so now we
> don't have to think about dimension cardinality anymore." Explain what
> is wrong with that claim — what does EMF actually eliminate, and what
> does it leave completely unchanged?
> ---
> EMF eliminates the separate PutMetricData network call — the metric is
> derived from a log line the application was going to write anyway. It
> does nothing to change how CloudWatch bills or bounds metrics: every
> distinct combination of values in the dimension sets declared inside
> the `_aws` envelope still creates a real, separately-billed metric,
> exactly as if PutMetricData had been called with those dimensions.
> High-cardinality fields are safe in EMF only if they're left out of the
> declared dimension sets and kept as plain log fields instead. ^card-emg4

Because the dimension sets an EMF log line declares still generate real, billable CloudWatch metrics, EMF removes the extra ==API call== on the request path, not the cardinality cost of the dimensions themselves. ^card-p79l
