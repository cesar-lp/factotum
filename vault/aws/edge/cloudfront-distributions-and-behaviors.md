---
topic: aws
category: aws-edge
tags: [cloudfront, cdn, cache-behaviors, origins, price-class]
citations: ["Amazon CloudFront Developer Guide — 'Working with distributions'"]
---

# Distributions and Cache Behaviors

A CloudFront **distribution** is the unit of configuration for a CDN
deployment: one or more origins behind it, and an ordered list of rules
that decide, per request, which origin handles it and how it gets
cached. Everything else in this category — origin protection, cache
keys, signed access — configures something a distribution already owns.

An **origin** is wherever content actually lives: an S3 bucket, an
Application Load Balancer, an API Gateway endpoint, or any HTTP server
at all, AWS-hosted or not. A distribution can front several origins at
once, and an **origin group** pairs a primary with a secondary so
CloudFront fails over automatically on 5xx or timeout — the same
active-passive shape as Route 53 failover routing, but enforced at the
edge instead of at DNS resolution.

A **cache behavior** maps a path pattern (`/api/*`, `/images/*`, the
default `*`) to a bundle of settings: which HTTP methods are allowed
through, the viewer protocol policy (redirect to HTTPS or require it
outright), which cache policy and origin request policy apply, and
whether CloudFront compresses the response. Behaviors are evaluated as
an ==ordered== list, and the first pattern that matches the request path ^card-14y1
wins — the default `*` behavior only fires when nothing more specific
does.

> [!card] mcq
> A distribution has behaviors for `/api/*` (no caching, all methods
> allowed) and the default `*` (aggressive caching, GET/HEAD only),
> listed in that order. A new behavior for `/api/v2/*` is added but
> placed *after* the existing `/api/*` entry. What happens to requests
> for `/api/v2/orders`?
> - [x] They match `/api/*` first and never reach the `/api/v2/*` behavior at all, since the list is evaluated in order and the first match wins
> - [ ] CloudFront merges both matching behaviors' settings
> - [ ] The more specific pattern always wins regardless of list position
> - [ ] The request falls through to the default `*` behavior instead ^card-s41n

Why does a mis-ordered behavior list fail silently rather than throwing a configuration error? :: Because CloudFront's rule is purely mechanical — first matching pattern in list order wins — so a behavior placed after a broader pattern that also matches is simply never reached; nothing about that is invalid configuration, it just silently routes requests through the wrong cache policy, allowed-methods list, or origin. ^card-lw4j

Putting dynamic API traffic and static assets on the ==same== distribution ^card-a4o5
is a common design, and for good reason: one domain name, one TLS
certificate, and no cross-origin request handling to configure between
"the site" and "the API" it calls. The failure mode that makes people
distrust the pattern is not the distribution itself, it's forgetting
that dynamic and static content need genuinely different cache
behaviors — applying one shared cache policy across both paths is what
actually causes stale API responses or an uncached static asset, not
the decision to co-host them.

What is the actual argument for serving both a static frontend and its backing API from a single CloudFront distribution rather than two? :: A single distribution means a single public domain and a single TLS certificate to provision and rotate, and it avoids CORS entirely, since browser requests to the API originate from the same origin as the page that made them — two separate distributions on different domains would need CORS headers configured on the API side for no benefit. ^card-rr7w

A distribution's **price class** controls which subset of CloudFront's
edge locations serve it — from every location worldwide down to only
North America and Europe. Restricting the price class is a direct
trade: it lowers cost, but viewers in excluded regions get routed to a
more distant edge location (or the origin itself), trading latency for
savings rather than eliminating any capability.

Explain the price-class trade-off: why does restricting a distribution to fewer edge locations not simply "turn off" service in the excluded regions. :: A restricted price class only removes the nearby edge locations from serving that content — requests from an excluded region still succeed, they're just routed to the nearest edge location that remains in the allowed set (or to the origin), so those viewers see higher latency rather than an outage; the setting trades cost against latency, not availability. ^card-0nnk

An origin group exists specifically for ==availability==, not for load ^card-sic6
splitting: CloudFront sends every request to the primary member and
only retries against the secondary when the primary answers with a
configured failure status or times out, so the secondary sits idle
under normal operation rather than sharing traffic with it.

> [!card] recall
> A team wants to spread read traffic across two origins for capacity
> reasons, and configures an origin group to do it. Explain why an
> origin group is the wrong tool for that goal, and what CloudFront
> actually does with the two members instead.
> ---
> An origin group is active-passive failover, not load balancing —
> CloudFront always routes to the primary first and only falls back to
> the secondary on a matching failure response or timeout. To spread
> read traffic across two origins under normal conditions, you'd need
> something else in front of them (e.g. an ALB with two targets, or DNS
> weighting), not an origin group, which leaves the secondary unused
> whenever the primary is healthy. ^card-f7lw

`cache-keys-and-invalidation.md` covers what a cache policy actually
controls once a behavior has selected one; `origin-access-control-and-private-origins.md`
covers locking an origin down so it can only be reached through the
distribution that fronts it.
