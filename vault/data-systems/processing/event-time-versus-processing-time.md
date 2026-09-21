---
topic: data-systems
category: data-processing
tags: [stream-processing, event-time, processing-time, determinism, watermarks]
citations: ["Kleppmann, Designing Data-Intensive Applications, Ch. 11 (Stream Processing)"]
---

# Event Time versus Processing Time

Every note that follows in this category — windowing, watermarks, stream
joins — exists to manage one underlying fact: a stream processor has two
clocks, and they disagree. This note is about why they disagree and why
the disagreement is not a bug to be fixed but a condition to be designed
around.

**Event time** is when the thing actually happened — a sensor reading
taken, a click made, a payment authorized — usually a timestamp embedded
in the record itself. **Processing time** is when your system happens to
observe that record — the wall-clock time at the machine doing the
aggregating. Which clock a pipeline uses is not a matter of taste.

> [!card] mcq
> Why is the choice between event time and processing time not merely
> stylistic?
> - [x] Processing-time results are non-deterministic under replay, while event-time results are reproducible but may require waiting for data that has not yet arrived
> - [ ] Processing time is always slower to compute than event time
> - [ ] Event time requires more storage per record than processing time
> - [ ] The two clocks always agree in practice, so the choice has no real effect ^card-qh2i

The two clocks ==diverge== for reasons no amount of engineering removes: ^card-f3y4
network delay between producer and broker, retried deliveries after a
timeout, consumer rebalancing that pauses a partition mid-stream, and the
simplest case of all — a mobile client that buffers events while offline
and uploads an hour's worth the moment it reconnects. None of these are
failures; they are ordinary operation.

Grouping a stream by ==processing time== produces a count of events per ^card-sm2s
minute that depends on when the pipeline happened to read them, so
reprocessing the exact same input from a log can produce a different
number each run — the aggregation is a function of the run, not of the
data.

Why is a processing-time aggregation described as non-deterministic, while the same aggregation done by event time is reproducible? :: Processing time depends on when the system happened to observe each record — a quantity that varies with scheduling, retries, and load, and differs on every run even over identical input. Event time is a fixed property of the record itself, so grouping by it yields the same windows and the same totals no matter when or how many times the data is replayed. ^card-dwe4

That reproducibility comes at a cost: an event-time aggregation for a
given window cannot be called final until the pipeline is confident no
more events *for that window* are still in flight — which may be never,
if a source is offline indefinitely. Correctness and completeness pull in
opposite directions, and that tension is exactly what watermarks (covered
in `watermarks-and-late-data.md`) exist to negotiate: they let a pipeline
declare "probably done" without waiting for a guarantee that cannot be
had.

The gap between the two clocks — event time minus processing time, for
records currently arriving — is itself a signal worth tracking, not just
a theoretical curiosity. A pipeline usually monitors this ==skew== ^card-koa4
directly: a growing gap means the system is falling behind its input,
which shows up long before downstream aggregations look obviously wrong.

> [!card] recall
> A dashboard shows event-time-to-processing-time skew rising steadily
> over an hour, with no change in throughput. What does this indicate
> about the pipeline, and why is it visible in the skew metric before it
> shows up as an obvious failure elsewhere?
> ---
> Rising skew means events are taking longer to reach the processor
> relative to when they occurred — the pipeline is falling behind, even
> though the volume of events it is handling per second hasn't changed.
> This could be a slow consumer, a backed-up queue, or a struggling
> downstream sink. It surfaces in skew first because skew directly
> measures the lag between "happened" and "seen," while throughput and
> error-rate metrics only degrade later, once the backlog is large enough
> to cause visible timeouts or dropped windows. ^card-efcw

Between the two extremes sits **ingestion time** — the timestamp a
broker or gateway stamps on a record the moment it first enters the
system, independent of both when it happened and when the eventual
processor got around to reading it. It doesn't fix upstream delay (a
record can already be old by the time it's ingested), but it removes
processing-time's dependence on downstream scheduling and rebalancing,
which makes it a common pragmatic default when the source doesn't supply
a trustworthy event timestamp at all.

Ingestion time is a compromise chosen because a trustworthy ==event== ^card-20x0
timestamp is sometimes unavailable at the source, not because it solves
the underlying divergence — it only moves where the divergence is
measured from.
