---
topic: aws
category: aws-opensearch
tags: [aggregations, buckets, metrics, analytics]
citations: ["OpenSearch Documentation — 'Aggregations'"]
---

# Aggregations

A `LIKE '%term%'` query against a relational column can find matching rows,
but it cannot cheaply answer "how many rows per category" or "what's the
average value across a filtered slice" without a separate `GROUP BY` and a
full scan. Aggregations are OpenSearch's answer to that class of question,
computed over the same inverted index used for search, and they are the
main reason teams reach for a search engine over pattern-matching a
database column.

A **bucket aggregation** groups matching documents into buckets based on a
==field value==, a range, or a computed criterion — like `GROUP BY` — and ^card-v7fz
each bucket then reports how many documents fell into it.

A **metric aggregation** computes a single number over the documents in a
==bucket== (or over the whole result set), such as an average, sum, ^card-4det
minimum, or count of distinct values.

> [!card] mcq
> Which of these is a metric aggregation rather than a bucket aggregation?
> - [x] Computing the average value of a numeric field across all matching documents
> - [ ] Grouping documents into one bucket per distinct value of a keyword field
> - [ ] Grouping documents into date-range buckets (e.g. one bucket per day)
> - [ ] Grouping documents into buckets by a histogram interval on a numeric field ^card-3gay

Bucket and metric aggregations are usually ==nested==: a bucket ^card-hpaa
aggregation (e.g. one bucket per product category) contains a metric
aggregation (e.g. average price) computed separately within each bucket,
producing a per-category breakdown in a single request instead of one
query per category.

Why can aggregations answer "count per category" far more cheaply than a relational `SELECT category, COUNT(*) FROM t GROUP BY category` run against a column with no index on it? :: The aggregation reads directly from the inverted index's already-built term dictionary and per-term document lists (or from doc values for numeric/keyword fields), so it doesn't have to scan every row's raw column value; an unindexed relational GROUP BY has to read and compare every row's value at query time. ^card-cxos

> [!card] mcq
> A team is deciding between a relational `LIKE '%error%'` query with a
> `GROUP BY` on a status column, and an OpenSearch aggregation over the
> same data, for a dashboard that needs live per-status error counts.
> Which factor most favors the aggregation approach?
> - [x] The aggregation is computed against pre-built index structures and can nest multiple grouping levels and metrics in one request, without a full unindexed scan each time
> - [ ] Aggregations guarantee strongly consistent, transactionally exact counts, which relational GROUP BY cannot provide
> - [ ] LIKE queries are not supported at all in relational databases
> - [ ] Aggregations always execute faster regardless of data volume or index design ^card-e2ux

Aggregations run over the documents matched by a query's ==query context== ^card-mj41
(or filter context) clauses, so the same request that finds matching
documents can simultaneously summarize them — a search result list and its
faceted counts (e.g. "12 results, 8 in category A, 4 in category B") come
back together in one round trip.

> [!card] recall
> Explain why computing aggregations over a filtered subset of documents
> (rather than the whole index) is the normal way aggregations get used in
> practice, and give an example of a dashboard feature that depends on
> this. ^card-2ncf
