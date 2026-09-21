---
topic: aws
category: aws-kinesis
tags: [kinesis, lambda, event-source-mapping, batching]
citations: ["Amazon Kinesis Data Streams Developer Guide — 'Using AWS Lambda with Amazon Kinesis'"]
---

# Lambda Integration and Batch Processing

`the-kinesis-client-library-and-checkpointing.md` covers running your own
fleet of consumers with the KCL. Lambda is the alternative: instead of
running workers, you let Lambda's own poller — the event source mapping
described in `event-sources-and-invocation-modes.md` — read the stream
and invoke your function for you. This note is about the Kinesis-specific
consequences of handing that job over, not Lambda's general retry
machinery, which `error-handling-and-retries.md` already covers.

The mapping polls each shard and invokes the function with a **batch** of
records at once, and by default exactly one concurrent invocation runs
per shard — a shard's records are always delivered to one invocation at a
time, in order, unless you explicitly raise the
==parallelization factor== to run more than one invocation per shard ^card-3pt7
concurrently (at the cost of processing several sub-sequences of that
shard out of strict overall order relative to each other).

Two settings tune how a batch gets assembled before Lambda is invoked at
all: `BatchSize` caps how many records one invocation receives, and
`MaximumBatchingWindowInSeconds` caps how long the mapping will wait to
fill that batch before invoking anyway with whatever it has.

What trade-off do BatchSize and MaximumBatchingWindowInSeconds together control? :: Latency versus efficiency — a larger batch size or longer batching window lets the function process more records per invocation (fewer, cheaper invocations, better throughput), but delays how quickly any individual record reaches the function; smaller batches and a shorter window reduce that per-record latency at the cost of more frequent, smaller invocations. ^card-0hu6

The behavior that catches people off guard is what happens when
processing a batch throws: by default, Lambda treats the **entire batch**
as failed and retries the whole thing, not just the record that caused
the error.

> [!card] mcq
> A Kinesis-triggered Lambda function processes a batch of 100 records
> and throws on record 57. With default settings, what happens on retry?
> - [x] The Lambda service retries the entire batch of 100 records, including the 56 that already succeeded
> - [ ] Only record 57 is retried, since Lambda tracks per-record success
> - [ ] The batch is discarded and Lambda moves on to the next batch
> - [ ] Records 1–56 are checkpointed and only 57–100 are retried by default ^card-4oi5

Because a shard's records are ordered and delivered to one invocation at
a time, a batch stuck retrying doesn't just fail in isolation — it
==blocks== that shard from making any further progress at all, since the ^card-h8c8
mapping won't advance past a batch it hasn't yet succeeded on.

That single fact is why one malformed record, or one call to a
dependency that's down, can stall an entire partition of a stream for
hours if nothing bounds the retrying — the mapping will patiently retry
the same full batch indefinitely, by default, until it either succeeds or
the records fall out of the stream's retention window.

Why can a single bad record in a Kinesis-Lambda batch stall far more than just that one record's processing? :: Because the shard delivers records to one invocation at a time in order, a batch that keeps failing blocks the mapping from advancing past it at all — every record behind the bad one on that shard, not just the bad one, is stuck waiting until the batch succeeds, is bisected past the failure, or expires from retention. ^card-qg8s

Four mitigations address this, each in a different way. `ReportBatchItemFailures`
lets the function tell the mapping exactly which records in the batch
actually failed, so only those are retried and the successful ones get
checkpointed instead of being redone. `BisectBatchOnFunctionError` splits
a failing batch into two smaller batches and retries each half
separately, narrowing in on which record is actually the problem instead
of retrying all of them as one unit forever. `MaximumRetryAttempts` and
`MaximumRecordAgeInSeconds` put a ceiling on how long the mapping will
keep trying before it gives up on a batch and moves on. And an
on-failure destination captures the batch that was ultimately given up
on, so it isn't simply lost once the mapping stops retrying it.

> [!card] recall
> A stream partition has been stalled for two hours because one record in
> a batch consistently throws an exception. Explain what
> `ReportBatchItemFailures` and `BisectBatchOnFunctionError` each do
> differently to address this, and why using both together is more
> effective than either alone.
> ---
> ReportBatchItemFailures lets the function report which specific record
> IDs in the batch failed, so the mapping checkpoints past the succeeding
> records and only retries the ones actually reported as failed — but it
> depends on the function being able to identify the bad record itself.
> BisectBatchOnFunctionError instead narrows the search from the
> platform's side: when a batch fails without that fine-grained report,
> it splits the batch in two and retries each half, repeating the split
> until the failing batch is small enough to isolate the offending record
> without the function needing to identify it. Used together, a function
> that can identify some failures reports them directly, while bisection
> continues narrowing down whatever it can't. ^card-ct5q

Which of these four Kinesis-Lambda mitigations is the only one that changes what the function reports about its own processing, rather than something the event source mapping decides on its own? :: ReportBatchItemFailures — it requires the function to return which record IDs in the batch actually failed; the other three (bisecting, retry/age limits, and an on-failure destination) are mapping-level behaviors configured independently of anything the function reports. ^card-v17n
