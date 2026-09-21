---
topic: aws
category: aws-edge
tags: [cloudfront-functions, lambda-at-edge, viewer-request, origin-request, edge-compute]
citations: ["Amazon CloudFront Developer Guide — 'Customizing at the edge'"]
---

# Edge Functions and Lambda@Edge

`cloudfront-distributions-and-behaviors.md` covers a behavior as a bundle
of static settings — cache policy, allowed methods, origin. Both compute
options in this note run custom code inside that same request path, and
the two exist because "run code at the edge" is not one problem: one tool
is built for enormous scale at near-zero cost, the other for real
compute that needs a runtime and a network.

**CloudFront Functions** run JavaScript directly on the CloudFront edge
location handling the request — the same server that would otherwise
just serve from cache — with sub-millisecond execution time. That speed
comes from a deliberately narrow environment: ==no network access== and ^card-r51o
no visibility into the request body, only headers, cookies, and the URI.
They attach to two trigger points only, viewer request and viewer
response, and they exist for exactly the class of work that fits inside
those limits: rewriting headers, issuing redirects, and normalizing a
cache key before the cache lookup even happens.

**Lambda@Edge** is a full Lambda function, written in Node.js or Python,
that runs at a regional edge cache rather than the edge location itself.
Unlike a CloudFront Function it can make ==network calls== and read the ^card-sy2d
request or response body, which is what lets it do things like call an
external auth service or rewrite a response based on downstream content
— capability CloudFront Functions structurally cannot offer.

Lambda@Edge attaches to four trigger points, and which one you pick
changes what the function actually sees on every request:

> [!card] mcq
> Which two Lambda@Edge trigger points fire on every request, including
> ones CloudFront serves straight from cache?
> - [x] Viewer request and viewer response
> - [ ] Origin request and origin response
> - [ ] Viewer request and origin request
> - [ ] Origin response and viewer response ^card-gknq

Origin request and origin response triggers only run on a ==cache miss== ^card-auh4
— when CloudFront actually has to go forward to the origin — while
viewer request and viewer response run on every single request
regardless of cache outcome.

Explain why putting an authorization check in an origin-request Lambda@Edge trigger is a bug, not just a suboptimal choice. :: Origin-request triggers only fire on a cache miss, so once a response for that path is cached, subsequent requests are served straight from the edge cache and never reach the origin-request trigger at all — meaning any check placed there is silently skipped for every cached response, letting unauthorized viewers receive content that was only supposed to pass through an authorization gate. ^card-po6k

The decision rule follows directly from that cost and coverage
difference: if a task can be done with CloudFront Functions, it should
be, because Lambda@Edge is strictly more expensive per invocation, adds
more latency per request, and — being a real Lambda function — is
subject to cold starts that a CloudFront Function's execution model
never experiences.

> [!card] recall
> A team needs to redirect mobile viewers to a different path based on
> the `User-Agent` header, with no origin lookups or body inspection
> involved. Which tool should they reach for, and why does reaching for
> the other one anyway carry a real cost rather than just being
> "unnecessary"?
> ---
> CloudFront Functions: the task only needs a header and a redirect, well
> within its no-network, no-body constraints. Using Lambda@Edge instead
> would mean paying its higher per-invocation cost, adding latency the
> simpler tool wouldn't add, and exposing the request path to cold
> starts, for a task that never needed a runtime or network access in
> the first place. ^card-uzth

Two operational constraints catch people who have used Lambda outside
CloudFront before. A Lambda@Edge function must be authored and deployed
in ==us-east-1== regardless of where the distribution or its viewers are, ^card-2khy
because CloudFront then replicates it out to edge locations globally.

Lambda@Edge also associates a specific published ==version== with a ^card-ivu1
trigger — never an alias. There's no "point at $LATEST and let it float"
option; each new deployment has to be published and the trigger's
association updated to it by hand.

Given those constraints, the single highest-value thing either tool does
is normalizing the cache key in a viewer-request CloudFront Function —
stripping irrelevant query parameters or headers before the cache
lookup so that requests differing only in ignorable ways still hit the
same cached object, which `cache-keys-and-invalidation.md` covers from
the caching side.

`origin-access-control-and-private-origins.md` covers locking the origin
itself down, which is a separate concern from anything an edge function
does to the request or response in flight; `vault/aws/lambda/` covers
the Lambda execution model, cold starts, and packaging that apply to a
Lambda@Edge function's own runtime once it's invoked.
