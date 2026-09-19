---
topic: aws
category: aws-lambda
tags: [lambda, cold-start, latency, init-phase]
citations: ["AWS Lambda Developer Guide — 'Lambda execution environment'"]
---

# Cold Starts

A cold start is what happens when an invocation arrives and there is no
warm execution environment available to serve it, so the platform has to
build one from scratch before your handler code runs. This note builds
directly on `execution-model-and-lifecycle.md` — a cold start is nothing
more than the init phase happening synchronously, on the critical path of
that one request, instead of having already happened ahead of time.

A cold start occurs when a request needs a ==brand-new execution ^card-nw0f
environment==, which happens on a function's very first invocation, after
AWS reclaims an idle environment, or when scale-out needs more concurrent
environments than currently exist.

The delay a cold start adds comes entirely from work the ==init phase== has ^card-w47e
to do before invoke can start: provisioning the microVM, initializing the
runtime, and running your module-level code — none of which a warm
invocation has to repeat.

> [!card] mcq
> Which of these is NOT part of what makes a cold start slower than a warm invocation?
> - [x] The handler function's own per-request logic runs slower on a cold start
> - [ ] The execution environment (microVM) has to be provisioned
> - [ ] The runtime has to start up
> - [ ] Module-level initialization code has to run ^card-82uj

Why does a larger deployment package, or a runtime with a heavier startup sequence, tend to make cold starts worse? :: All of that additional code and any runtime bootstrapping has to be loaded and executed during init before the handler can run for the first time on that environment, so more bytes to fetch and more code to initialize directly lengthens the phase that a cold start puts on the request's critical path. ^card-rpqw

Moving expensive setup — parsing large config, opening the first
connection to a downstream service — out of the handler and into
module-level code doesn't eliminate a cold start's cost; it just makes that
cost visible during ==init== rather than hidden inside the first invoke, ^card-te6j
which is still where a cold-started request pays for it.

> [!card] recall
> A team notices their function's median latency is fine but their p99 is
> dominated by occasional multi-second spikes that correlate with traffic
> bursts rather than with any particular time of day. Explain the
> mechanism connecting bursty traffic to cold starts, given that Lambda
> scales out by adding new execution environments. ^card-antd

Keeping a runtime with less startup overhead, trimming unused dependencies
out of the deployment package, and avoiding heavyweight work at module
scope are the main levers under a function's own control for shortening
the init phase; none of them make a warm invocation faster, because a warm
invocation never pays init at all.

What lever, provided by the platform rather than by trimming your own code, keeps environments pre-initialized so an invocation skips init entirely? :: Provisioned concurrency, which keeps a chosen number of execution environments already initialized and idle, ready to serve an invoke immediately rather than going through init on the request's own critical path. ^card-5aa6

A cold start is bounded to the environments that are actually being
created; once a burst of traffic has enough warm environments to absorb
it, every additional request lands on ==reuse== instead of paying init ^card-r3ye
again, which is why cold starts show up disproportionately at the start of
a traffic spike rather than throughout it.
