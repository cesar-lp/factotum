---
topic: aws
category: aws-api-gateway
tags: [api-gateway, caching, invalidation, logging, metrics, x-ray]
citations: ["AWS Developer Guide — Amazon API Gateway, 'Enable API caching to enhance responsiveness', 'Setting up CloudWatch API logging and metrics', 'Trace requests with X-Ray'"]
---

# Caching and Observability

Response caching and observability sit on opposite sides of the same
concern: caching hides backend calls to make responses faster, and
observability exists partly to see through that hiding when something
goes wrong.

**Response caching** (REST APIs only) stores a method's response for a
configurable TTL, keyed by the request parameters that make up the cache
key, so identical subsequent requests are served straight from the cache
without invoking the integration at all. This reduces backend load and
latency for repeated reads, at the cost of a problem caching always
creates: ==staleness==. ^card-9dpl

The invalidation problem is structural, not incidental. API Gateway's
cache has no mechanism to be notified when the underlying backend data
changes — there is no push from a DynamoDB write or a Lambda deploy that
flushes the relevant cache entry. A caller with the right IAM permission
can send a `Cache-Control: max-age=0` header to force a specific request
to bypass and refresh the cache, but that requires every caller who needs
fresh data to know to do so and to have that permission granted — it is
not automatic, and there's no way to invalidate a cache entry from the
backend side at all. In practice, cache correctness rests on TTL choice,
not on any invalidation signal.

> [!card] mcq
> The backend data behind a cached API Gateway response changes. What
> happens to the cached response?
> - [x] Nothing automatically — it remains cached until its TTL expires or a caller explicitly bypasses/invalidates it
> - [ ] API Gateway detects the backend change and invalidates the entry immediately
> - [ ] The next request always gets fresh data regardless of TTL, since caching only applies to identical repeated requests within one second
> - [ ] The cache is cleared automatically on the next deployment ^card-2wnu

Why can't a Lambda function "tell" API Gateway to invalidate a cache entry it knows is now stale? :: There is no API for the backend side of an integration to push an invalidation signal into API Gateway's cache; invalidation is only reachable from the caller side, via an explicit header on a request with the right permission, so a backend that knows its own data changed has no direct way to act on the cache holding a now-stale response for it. ^card-3nkq

Observability is where you find out what caching (or anything else) is
actually doing. **Access logs** record who called what — caller identity,
method, path, response status, and whatever fields you configure — at the
edge of the gateway, independent of what happened inside the integration.
**Execution logs** go further: a full trace of the request's path through
API Gateway itself, including ==authorizer invocation, mapping template ^card-l6xr
evaluation, and the integration request/response==, which is what you'd
actually read to debug a mapping-template failure or an authorizer
returning an unexpected result (see
`request-validation-and-mapping-templates.md` and
`authorizers-and-access-control.md`).

**Metrics** (CloudWatch) give you the aggregate numbers — call counts,
latency and integration latency, and 4XX/5XX error counts — at the API,
stage, or method level, useful for noticing that something changed
without yet knowing why.

**Tracing** (AWS X-Ray) is what stitches a single request into one
timeline across service boundaries — API Gateway, the Lambda function it
invoked, and whatever that function called downstream — the same
distributed-tracing need described from the Lambda side in
`../lambda/observability-and-cost-model.md`. Metrics and logs each show
one service's view of a request; tracing is the only one of the four that
shows the whole path a single request actually took.

> [!card] recall
> A request is slow. Metrics show elevated latency at the API Gateway
> stage level, but the Lambda function's own duration metric looks normal.
> Explain which observability tool actually answers where the extra time
> went, and why metrics alone — from either service — can't answer it. ^card-p3yv

Why would you reach for execution logs rather than access logs to debug a request that returns the wrong data because a mapping template applied the wrong transformation? :: Access logs only record request/response metadata at the edge — caller, path, status — with no visibility into what happened during template evaluation; execution logs specifically trace the internal pipeline stages, including the mapping template's input and output, which is the only place that failure would actually be visible. ^card-g8vn
