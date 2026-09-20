---
topic: aws
category: aws-lambda
tags: [lambda, observability, tracing, logging, cost-model]
citations: ["AWS Lambda Developer Guide — 'Monitoring and troubleshooting Lambda applications', 'AWS Lambda pricing'"]
---

# Observability and Cost Model

Because Lambda hides the server entirely, the only way to see what a
function actually did is through what it emits and what AWS instruments
around it — there's no host to SSH into and tail a log file on. This note
covers the two pieces of that (logs and traces) and the shape of Lambda's
cost model, deliberately without pricing numbers, since those are exactly
the kind of figure that drifts and shouldn't be drilled.

Anything a function writes to standard output or standard error during
invocation is captured and shipped to ==CloudWatch Logs==, grouped into a ^card-bm22
log group per function, without the function needing to configure a
logging destination itself.

Log output alone tells you what happened inside one invocation but not
how that invocation's latency was spent across the services it called —
that gap is what distributed ==tracing== closes, by instrumenting a ^card-j1o5
request as it crosses service boundaries (API Gateway, the function, a
downstream DynamoDB call) and stitching those spans into one timeline.

> [!card] mcq
> A function's total latency looks high, but its own CloudWatch logs show the handler code finishing quickly. What's the most direct way to find where the remaining time went?
> - [x] Enable tracing to see a timeline of the invocation's spans across every service it called, including time spent outside the function's own code
> - [ ] Increase the function's memory allocation, which always reduces latency regardless of cause
> - [ ] Add more log statements inside the handler
> - [ ] Switch the function from zip packaging to a container image ^card-m4cp

Why can CloudWatch Logs alone be insufficient to diagnose latency that isn't the function's own code running slowly? :: Logs only capture what the function itself chose to print during its own invocation; time spent in cold start, in the platform's own invocation overhead, or inside a downstream service the function called doesn't show up as a log line, so a trace spanning those boundaries is needed to see where the time actually went. ^card-3pm3

Lambda's cost model is built around actual consumption rather than
provisioned capacity: what you're billed for is a function of the
==number of invocations== and the amount of compute time each invocation ^card-nxml
consumes (duration multiplied by allocated memory), not a fixed hourly
rate for a server sitting idle.

What does it mean, conceptually, that Lambda charges per invocation and per duration-times-memory rather than a flat rate for having the function deployed? :: A function that is deployed but never invoked costs nothing to run (aside from any provisioned concurrency kept warm), and a function that runs efficiently — finishing quickly, using less allocated memory — costs less per call than one that runs the same workload slowly or over-provisioned; cost tracks actual usage rather than the mere existence of the function. ^card-3f4c

> [!card] recall
> Explain why provisioned concurrency changes Lambda's usual "pay only
> for what you use" story — what are you now paying for that you
> wouldn't be paying for with on-demand scaling alone, and why does that
> tradeoff exist? ^card-kz47

Memory allocation in Lambda's cost model is not purely a cost lever: it
also determines the proportional share of ==CPU== a function's execution ^card-84sw
environment receives.

So raising memory can make a compute-bound function finish faster, and
sometimes cost about the same or less overall, despite the higher
per-millisecond rate.
