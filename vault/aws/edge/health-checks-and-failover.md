---
topic: aws
category: aws-edge
tags: [route53, health-checks, dns-failover, availability]
citations: ["Amazon Route 53 Developer Guide — 'Configuring DNS failover'"]
---

# Health Checks and Failover

`route53-routing-policies.md` covers how a policy picks among multiple
records; this note covers the mechanism that lets a policy stop
answering with a record at all — Route 53's health checks, and the
failover behavior they drive.

A single vantage point failing to reach a target proves very little: it
might mean the target is down, or it might mean that one path, one
network segment, or one transient blip is bad. A Route 53 health check
is performed from a distributed set of ==global== health checkers, and a ^card-90uk
target is only declared unhealthy once enough of them agree — which is
what stops a single bad vantage point from tripping a failover that
every other location would disagree with.

> [!card] mcq
> A Route 53 health check against an origin is failing from checkers in
> one AWS region but passing everywhere else. What does Route 53 do?
> - [x] It aggregates results across all checker locations and only marks the target unhealthy once enough of them agree it's down
> - [ ] It immediately fails over, since any checker failure is treated as authoritative
> - [ ] It ignores health checks originating from a single region
> - [ ] It averages the regions' latencies and fails over only if the average crosses a threshold ^card-rmhi

Why does Route 53 require agreement across multiple checker locations rather than acting on the first failing checker? :: A single checker's failure could reflect a problem local to that checker's own network path rather than the target itself, so acting on one result alone would fail over on noise. Requiring a quorum of checkers to agree filters out a single bad vantage point and only trips failover when the target is unreachable from a broad, geographically distributed sample. ^card-1xqg

Route 53 offers three kinds of health check, and each one can only see
what it's built to look at. An **endpoint check** polls an HTTP,
HTTPS, or TCP endpoint directly and can optionally require a specific
string to appear in the first part of the response body — which is the
difference between confirming a server answers on a port and confirming
the application behind it actually works.

Why does matching a string in the response body catch failures that a plain HTTP status check misses? :: A broken application can still return a 200 status — a database connection error rendered onto an otherwise normal-looking page, for instance — so a check that only looks at the status code would call that server healthy. Requiring a specific string in the body forces the response to actually contain evidence the application ran correctly, not just that something answered the port. ^card-idsz

A **calculated health check** doesn't test anything itself — it combines
the results of up to 256 other health checks with AND/OR/NOT logic,
letting you express something like "unhealthy only if both of these
independent checks fail." A **CloudWatch-alarm-based health check**
instead tracks the state of an existing alarm, which is the only route
to failing over on a condition DNS has no way to observe directly, such
as a queue depth, an error rate computed from logs, or any custom metric
your code publishes. `alarms-evaluation-and-missing-data.md` covers how
that underlying alarm actually evaluates and treats missing data — a
calculated or alarm-based check inherits whatever ambiguity that alarm
has baked in.

What does a CloudWatch-alarm-based health check make possible that an endpoint check fundamentally cannot? :: An endpoint check can only observe what a request to the endpoint itself reveals — reachability, status, or matched body text. An alarm-based check can fail over on any condition CloudWatch tracks, including things with no direct HTTP surface at all, like a queue backing up, an elevated server-side error rate, or a custom application metric — signals DNS has no way to probe directly. ^card-2828

The honest limitation of DNS failover, and the reason it is not a
substitute for a load balancer: a health check failing only changes
which record Route 53 hands out to resolvers asking from that point
forward. Resolvers that already cached the old answer keep using it
until that answer's ==TTL== expires, and some resolvers cache past what ^card-4xyb
they were given regardless.

Recovery time is therefore bounded below by that cached-answer lifetime
plus however much caching ignores it — DNS failover operates on a
timescale of minutes, not the sub-second timescale of a load balancer
pulling an unhealthy target out of rotation.

> [!card] recall
> A team relies on Route 53 failover with a 300-second TTL as their only
> mitigation for an origin outage, and are surprised when some clients
> keep hitting the dead origin for over ten minutes after failover
> triggered. Explain why this is expected behavior rather than a Route
> 53 malfunction, and why an ALB target group achieves the same goal
> far faster.
> ---
> DNS failover only changes what Route 53 tells resolvers going forward
> — it can't reach into a resolver that already cached the old answer
> and force it to re-ask early. That cached answer stays valid for up to
> the record's TTL, and some resolvers ignore or extend the TTL beyond
> what was configured, so ten-plus minutes of stale answers is within
> expected behavior for a 300-second TTL. An ALB target group instead
> sits in the request path itself: it stops routing to an unhealthy
> target immediately, with no DNS cache anywhere in the middle to wait
> out. ^card-b2i0

Health checks aren't free — each one is billed per check, per
observation interval, per checker location, and the cost scales with
how many endpoints you watch and how tight the interval is set. That
cost is a real reason teams under-instrument: it's tempting to health-
check only the top-level entry point and skip the origins or
dependencies behind it, which leaves exactly the failures a calculated
or alarm-based check exists to catch invisible until they surface at
the edge.

Why does health-check cost push toward under-instrumentation, and what specifically goes unwatched as a result? :: Each health check is billed per endpoint, per checker location, and per evaluation interval, so watching every origin, dependency, and internal signal adds up quickly. Teams respond by health-checking only the most visible endpoint and skipping the components behind it, which means a failure in an internal dependency has no dedicated check to surface it — it's only noticed once it degrades the top-level endpoint enough to fail that one check too. ^card-nzik
