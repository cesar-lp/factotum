---
topic: aws
category: aws-kinesis
tags: [kinesis, producers, put-records, kpl, at-least-once]
citations: ["Amazon Kinesis Data Streams Developer Guide — 'Adding data to a stream'"]
---

# Producers and PutRecord Semantics

`streams-shards-and-partition-keys.md` covers what a shard's limits are;
this note covers what it actually looks like to write to one, and where
producers get that wrong in ways that lose data silently.

`PutRecord` writes a single record per call. `PutRecords` writes a batch
of up to 500 records in one HTTP request, which is the only realistic way
to approach the 1,000 records/s per-shard limit without drowning in
per-call overhead.

The critical fact about `PutRecords` is that it can **partially fail**.
The call itself returns HTTP 200 as long as the request was well-formed —
that status code says nothing about whether every record inside it was
accepted. Each entry in the response instead carries its own result, and
a producer that only checks the top-level status code will believe a
batch succeeded when some fraction of it silently did not.

> [!card] mcq
> A producer calls PutRecords with 500 records and receives an HTTP 200
> response. What does that response status code alone guarantee?
> - [x] Only that the request was well-formed and processed — individual records inside it may still have failed and must be checked separately
> - [ ] That all 500 records were durably written to the stream
> - [ ] That none of the records were written, since 200 only confirms validation
> - [ ] That the records were written in the exact order they were submitted ^card-etue

The response's ==FailedRecordCount== field gives the number of entries ^card-dxrz
that failed, and each failed entry's own result carries an error code —
typically a throttling or internal error — rather than a record id.

The correct handling is to walk the per-record results and retry
**only** the entries that failed, not the whole batch — resubmitting
already-successful records risks duplicates for no benefit, since
Kinesis has no idempotency key to deduplicate them against.

Why is retrying an entire failed PutRecords batch, rather than just the failed entries, the wrong approach even though it is simpler to code? :: It needlessly resubmits records that already succeeded, and Kinesis has no built-in deduplication, so each resubmitted record becomes a genuine duplicate in the stream — the correct approach reads FailedRecordCount and each entry's own result, then retries only the entries that actually failed. ^card-wir3

That entry-level retry has a consequence worth stating plainly: because
only some records go back out, and they go out after everything else in
the original batch has already landed, a retried record can end up
sequenced *after* records that were originally submitted alongside it but
succeeded on the first attempt — the retry can reorder records relative
to their original submission order.

> [!card] recall
> A batch of 500 records is submitted with PutRecords. Ten fail and are
> retried in a second call. Explain why the ten retried records are not
> guaranteed to end up in their original relative position among the
> other 490, even though the whole batch shared the same partition key.
> ---
> Kinesis assigns sequence numbers at the moment a record is actually
> accepted, not at the moment it was first attempted. The 490 that
> succeeded on the first call were sequenced immediately; the 10 that
> failed are only sequenced later, on the retry, after whatever else has
> been written to that shard in between — so their position in the
> shard's log reflects when the retry landed, not when the batch was
> originally submitted. ^card-n1wt

Throttling shows up as an explicit ==ProvisionedThroughputExceededException==, ^card-ylda
thrown when a shard's write limit is exceeded — whether from one producer
sending too fast or several producers combining to exceed the shared
limit. Backing off immediately and retrying at full speed just recreates
the same collision; exponential backoff with jitter is required, not a
nice-to-have, because without the random jitter component, multiple
throttled producers retry in lockstep and re-collide on the same
schedule.

The **Kinesis Producer Library** (KPL) exists to make high-throughput
producing practical. Its main trick is **aggregation**: it packs many
small user records into a single Kinesis record before sending it, which
is how a producer gets past the 1,000-records/s shard limit when its
records are individually tiny — aggregation trades record count for
record size, and the 1 MB/s limit is far harder to hit with small
payloads than the 1,000/s count limit is. The KPL also handles batching
into PutRecords calls and automatic retries on the caller's behalf.

That aggregation is not free. Records sit in a buffer for a configurable
window before being flushed, adding latency the application must accept,
and because the wire format is now several logical records packed into
one Kinesis record, every consumer reading that stream must de-aggregate
each Kinesis record back into its constituent user records before
processing — a plain consumer that does not use the matching de-aggregation
logic sees one giant opaque record instead of many.

Underneath all of this, Kinesis gives producers an honest but modest
guarantee: writes are ==at-least-once==. A `PutRecord` or `PutRecords` ^card-nrkc
call that times out on the client side may well have succeeded on the
server side — the client has no way to distinguish "the write never
happened" from "the write happened but the acknowledgment was lost" — so
a producer that retries on timeout can produce a genuine duplicate.

Does a client-side timeout on a Kinesis PutRecord call mean the write definitely failed? :: No — the client cannot distinguish a write that truly failed from one that succeeded but whose acknowledgment was lost in transit, so a timed-out call may have already been durably written; retrying it can therefore create a duplicate, which is why consumers must tolerate at-least-once delivery rather than assume every record they see is new. ^card-798z
