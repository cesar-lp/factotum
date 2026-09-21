---
topic: aws
category: aws-observability
tags: [x-ray, tracing, sampling, opentelemetry]
citations: ["AWS X-Ray Developer Guide — 'How X-Ray works', 'X-Ray concepts', 'Configuring sampling rules'"]
---

# Distributed Tracing with X-Ray

`vault/aws/lambda/observability-and-cost-model.md` covers why tracing
exists at all — logs show one invocation, tracing shows where
cross-service latency went. This note is about how a trace actually gets
assembled, since "turn on tracing" hides a fair amount of machinery.

A **trace** is not one object anyone emits directly — it's the set of
records sharing one **trace id** that X-Ray assembles after the fact.
Each service the request touches contributes its own **segment** — a
record of that service's own work: when it started, when it finished, and
whether it errored. A segment breaks down further into **subsegments**,
which record a specific downstream call or an internal phase of that
service's own work — a subsegment for the outbound DynamoDB call is a
child of the segment describing the function that made it.

What is a segment, and what is a subsegment, in an X-Ray trace? :: A segment is one service's own record of the work it did for a request — start time, end time, fault status. A subsegment is a finer-grained breakdown within that segment, typically a specific downstream call (an outbound HTTP or SDK call) or a distinct phase of the service's own internal processing. ^card-6t6d

The trace only holds together across services because the trace id
travels with the request. Each hop carries it in the
==X-Amzn-Trace-Id== HTTP header, alongside the sampling decision for that ^card-zin3
request. A service that receives the header and forwards it downstream
extends the same trace; a service that drops it — because it isn't
instrumented, or strips unrecognized headers — causes the next hop to
mint a fresh trace id of its own. The result isn't an error, just a
trace that quietly ends at that component, with everything downstream of
it invisible under the original trace id.

> [!card] mcq
> A request traces cleanly through API Gateway and a Lambda function, but the trace shows nothing for a downstream call to a third internal service — no error, no gap flagged, it just isn't there. What's the most likely explanation?
> - [x] The downstream service didn't forward the X-Amzn-Trace-Id header, so it started a new trace instead of continuing the existing one
> - [ ] X-Ray silently drops any trace with more than two hops
> - [ ] The downstream service exceeded its sampling reservoir for the day
> - [ ] Segments can only be produced by services fronted by API Gateway ^card-kxyj

Why does a service failing to propagate the trace header produce a trace that looks merely incomplete, rather than an outright error? :: X-Ray doesn't validate that every hop in a call chain reports back — it just groups whatever segments carry the same trace id. A service that doesn't forward the header starts its own new trace id, so its segment is real and recorded, just filed under a different trace. Nothing fails; the original trace just ends one hop early. ^card-xz5q

Tracing every request would mean paying to record and store every
request's spans, which is unaffordable at volume — so X-Ray traces a
representative sample, not the complete traffic. The default sampling
rule combines a fixed reservoir with an additional rate: X-Ray always
records a fixed number of requests per second (the reservoir,
satisfying a base rate even during quiet periods), and on top of that
traces a configurable ==percentage== of any requests beyond the ^card-fnyn
reservoir.

This is also why you can't reliably retrieve a trace for one specific
customer-reported slow request after the fact: if that request wasn't
one of the sampled ones, no segments were ever recorded for it, no
matter how interesting it turns out to be in hindsight.

The sampling decision itself is made exactly once, at the edge of the
call chain, and honored by every downstream service that receives it via
the trace header — a service doesn't independently decide whether to
record its own segment. That's what keeps a trace from ending up
half-sampled: either the whole chain records, or none of it does.

> [!card] recall
> Explain why the sampling decision for a trace is made once, at the entry point, and carried downstream via the trace header, rather than each service independently deciding whether to sample its own segment.
> ---
> If each service decided independently, a trace could end up partially recorded — some services logging segments, others not — which would produce timelines with holes that look like missing instrumentation rather than an intentional sampling gap, and would make percentage-based sampling rates impossible to reason about across a call chain. Deciding once and propagating the decision guarantees a trace is either fully captured or not captured at all. ^card-u4ib

Within a segment or subsegment, you attach data two ways, and the
distinction is about what you can later search on. ==Annotations== are ^card-a868
indexed key-value pairs — you can filter and group traces by them (find
every trace where `customerTier` was `enterprise`). Metadata is attached
to the segment for context when you're already looking at it, but it
isn't indexed, so you can't query traces by a metadata field.

Why would you deliberately choose to record a value as X-Ray metadata rather than as an annotation, given that metadata isn't searchable? :: Annotations are indexed, and every indexed field has a cost and cardinality implication for the trace store; attaching everything as an annotation to keep options open would bloat the index with fields nobody queries. Metadata is the right choice for context you want visible when inspecting a trace you already found some other way, but never need to filter or group traces by. ^card-727q

The **service map** is not something you draw — it's a view X-Ray
derives automatically from the segments it has collected, inferring
which services called which from the parent-child relationships between
segments and subsegments across all recently traced requests.

Instrumenting a service for X-Ray requires three pieces working
together: the ==X-Ray SDK== (or the AWS Distro for OpenTelemetry) in the ^card-jgw1
application to create segments and subsegments and inject the trace
header, a daemon or collector process to receive those spans locally and
forward them to the X-Ray service, and IAM permission for whatever
process does that forwarding to call the X-Ray API. Skipping the IAM
permission is a common way tracing silently produces nothing — the SDK
calls succeed locally, but the daemon's uploads are denied.

The AWS Distro for OpenTelemetry (ADOT) is the portable alternative to
the X-Ray SDK: it instruments using the vendor-neutral OpenTelemetry API
and can export to X-Ray or to other tracing backends, so switching
tracing backends later doesn't mean re-instrumenting every service —
only reconfiguring the exporter.
