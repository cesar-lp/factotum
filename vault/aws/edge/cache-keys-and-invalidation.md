---
topic: aws
category: aws-edge
tags: [cloudfront, cache-key, cache-policy, ttl, invalidation]
citations: ["Amazon CloudFront Developer Guide — 'Controlling the cache key'"]
---

# Cache Keys and Invalidation

`cloudfront-distributions-and-behaviors.md` covers what a behavior
attaches to a request; this note is about the one setting inside it
that causes most CloudFront production incidents — the **cache key** —
because both directions of getting it wrong look like a working cache
until the wrong content shows up for the wrong user.

The cache key is the identity CloudFront uses to decide whether a
request is a hit against something already stored. By default it is
==only== the host and the path — nothing else about the request, not ^card-f7ja
even the query string, factors in unless you explicitly add it.

A **cache policy** lists exactly which headers, cookies, and query
string parameters become part of that key, on top of host and path.
Anything not listed is invisible to the cache: two requests that differ
only in an unlisted header are, as far as CloudFront's cache is
concerned, the identical request.

That invisibility cuts two opposite ways, and both are common mistakes
rather than exotic ones. Forward too little and a response that
genuinely varies — by `Accept-Language`, by a session cookie deciding
which account's data comes back — collapses into a single cache entry,
so the second user to hit that path gets the first user's response
cached under their nose. Forward too much — a session cookie no
response actually depends on, or a tracking query parameter that's
different on every request — and the cache key becomes unique per
request, so the hit rate falls to effectively zero: every request looks
like a miss because nothing ever matches a prior key.

> [!card] mcq
> An API behind CloudFront returns per-user data based on a session
> cookie, but the cache policy forwards no cookies to the cache key.
> What is the most likely symptom?
> - [x] One user's cached response gets served to a different user requesting the same path
> - [ ] Every request becomes a cache miss
> - [ ] CloudFront rejects the request with an error
> - [ ] The origin receives no cookie at all, so the app breaks server-side ^card-aijk

Why does forwarding a unique tracking query parameter into the cache key destroy the hit rate even though the underlying page content never actually changes? :: Because the cache key is the literal request identity CloudFront hashes on — a parameter that's different on every single request makes every request's key different too, so no later request ever matches an earlier one's key even though the response body they'd get is identical; the cache still "works," it just never has anything cached under the key it's asked for. ^card-a1dz

A **cache policy** and an **origin request policy** are separate
settings precisely because "part of the cache key" and "sent to the
origin" are different questions. An origin request policy can forward a
header (say, `Authorization` or a client's `User-Agent`) to the origin
for the origin's own use without that header ever becoming part of the
cache key — the origin sees it, but CloudFront still treats requests
that differ only in that header as ==one== cache entry. ^card-ru1r

What real-world need does splitting "cache policy" from "origin request policy" satisfy that a single combined policy couldn't? :: It lets an origin receive information it needs to generate a response — like a client identifier for logging, or an auth header the origin itself validates — without that information fragmenting the cache, which would happen if every distinct header value forced a distinct cache entry; the split separates "what the origin needs to see" from "what actually varies the cached content." ^card-e8sb

TTL is decided by a precedence, not a single number: the origin's own
`Cache-Control` (or `Expires`) header is honored first, and the
behavior's minimum, default, and maximum TTL settings only constrain or
override it — a maximum TTL caps how long an object can be cached even
if the origin asked for longer, and a minimum forces caching even if
the origin asked for none.

What is CloudFront invalidation, and why is it a poor fit for routine deploys? :: Explicitly requesting that CloudFront discard cached copies of specific paths across every edge location. It works, but it is slow (can take minutes to propagate globally) and billed per path after a monthly free allotment, which makes it a poor fit for routine deploys — it exists as an escape hatch for mistakes and emergencies, not a deploy step. ^card-adgu

Why should versioned filenames (e.g. `app.a1b2c3.js`) be the default deployment strategy instead of invalidating the old filename on every release? :: Because a versioned filename makes the new asset a cache miss automatically — no invalidation call needed, no propagation delay, and the old version keeps serving correctly to anyone still holding a stale HTML page that references it — whereas invalidation is slower, costs money past the free tier, and only takes effect after it propagates to every edge location. ^card-2utc

CDNs in general handle `Vary` poorly — treating each distinct value of a
`Vary`-named header as its own cache entry rather than reasoning about
it — which is exactly why CloudFront's model asks you to forward
headers into the cache key ==explicitly== through a cache policy instead ^card-hfnz
of relying on the origin's `Vary` header to do it implicitly.

`http-fundamentals` and its neighbours in `vault/networking/http/` cover
`Cache-Control` and `Vary` semantics at the protocol level; this note is
only about what CloudFront does with them once they arrive at the edge.
