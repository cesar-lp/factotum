---
topic: aws
category: aws-kinesis
tags: [kinesis, firehose, delivery-streams, s3, transformation]
citations: ["Amazon Kinesis Data Firehose Developer Guide — 'What Is Amazon Data Firehose?'"]
---

# Firehose and Delivery to Destinations

`streams-shards-and-partition-keys.md` and its neighbours describe a
Kinesis data stream: shards you provision, consumers you write, records
you can re-read. Firehose looks like it belongs to the same family, but
it answers a different question, and the one property below is what
decides which service a given problem actually needs.

A Firehose delivery stream is a **managed pipeline, not a stream you
read from**. There are no shards to size, no consumer application to
write against it, and — the property that matters most — ==no replay==: ^card-ivcn
once a record has been delivered to its destination, Firehose no longer
holds a copy of it anywhere.

Why does "no replay" belong at the center of the Kinesis-vs-Firehose decision rather than as a minor limitation? :: Every other Firehose property (no shards, no consumer code, buffered delivery) is a convenience; losing the ability to re-read data already sent is a hard constraint. If a downstream consumer needs to reprocess history, catch up after an outage, or feed a second independent application from the same records, only a data stream can do that — Firehose has already discarded the data by the time you'd want it back. ^card-yaw1

Firehose delivers to a fixed set of destinations: **S3**, **Redshift**,
**OpenSearch**, **Splunk**, and generic ==HTTP endpoint== targets (which ^card-fvun
covers most third-party SaaS integrations). Redshift and OpenSearch
delivery both actually land the data in S3 first and load it from there,
so S3 is the one destination present in every configuration whether or
not it's the final target.

Firehose never delivers a record the instant it arrives. It buffers and
flushes on whichever of two thresholds is hit first — a ==size== threshold ^card-st5z
or a time threshold — so end-to-end latency is measured in seconds to
minutes, never the milliseconds a direct stream consumer can achieve.

> [!card] mcq
> A team configures a Firehose delivery stream with a 5 MB buffer size
> and a 300-second buffer interval, then complains that records intended
> for near-real-time alerting are arriving late. What is the correct
> diagnosis?
> - [x] Firehose is working as designed — it only flushes on a size or time threshold, so latency is inherently seconds-to-minutes, not milliseconds
> - [ ] The delivery stream is misconfigured and should be replaced with a smaller buffer size of zero
> - [ ] This indicates a hot shard is throttling the delivery stream
> - [ ] Firehose delivers in real time by default; something else in the pipeline must be delaying it ^card-h7ih

On the way to a destination, Firehose can transform each record with an
invoked ==Lambda== function, convert the output to Parquet or ORC, and ^card-y8kl
compress it before writing. Converting to a columnar format at ingest
time, rather than after the fact, is what turns S3 into a data lake a
query engine can actually scan efficiently instead of a pile of raw JSON.

Why does converting to Parquet or ORC at ingest time matter more than doing the same conversion later as a batch job? :: A query engine like Athena reading columnar Parquet/ORC can skip whole column blocks it doesn't need and read far less data per query than scanning row-oriented JSON, so the cost and latency of every downstream query depend on the format being right from the start. Deferring the conversion to a later batch job means every query run before that job completes still pays the JSON-scan cost, and the raw JSON has to be stored and processed twice. ^card-3eb2

For S3 destinations, Firehose can also apply **dynamic partitioning**,
routing each record into a different S3 prefix based on the record's own
content (a field like customer ID or event date) rather than only a
fixed time-based prefix.

Dynamic partitioning's payoff shows up downstream, not at write time: :: a query engine scanning S3 uses the prefix structure to prune which objects it has to read at all, so a partition layout that matches how you actually filter queries (by customer, by date, by event type) can turn a full-bucket scan into reading a handful of objects — while a layout that doesn't match query patterns leaves that pruning unavailable no matter how the data is compressed or formatted. ^card-qgty

Firehose does not fail silently when a record can't be delivered or
transformed. Records that fail Lambda transformation, and records that
fail delivery to the destination, are both written to a designated ==S3 ^card-uzdm
error== prefix rather than dropped.

> [!card] recall
> Data that should be in a destination table is missing, and the Firehose
> delivery stream shows no obvious stream-level error. Where do you look
> first, and why is that the right first place rather than the
> destination's own ingest logs?
> ---
> The S3 error output prefix Firehose writes failed transformation and
> failed delivery records to. Firehose is explicitly designed to route
> failures there instead of dropping them silently, so a missing-data
> investigation should check whether the records exist there — with the
> reason for the failure attached — before assuming the records were
> never produced or looking elsewhere in the pipeline. ^card-xmup
