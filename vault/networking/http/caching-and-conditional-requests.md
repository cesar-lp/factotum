---
topic: networking
category: http-protocol
tags: [caching, cache-control, etag, validation, http]
citations: ["RFC 9111 (HTTP Caching)", "RFC 9110 (HTTP Semantics)"]
---

# HTTP Caching: Freshness and Validation

`http-fundamentals.md` already covers the conditional GET mechanics —
`If-Modified-Since` and a `304 Not Modified` reply. This note is about
the model that decides *when* a cache even needs to ask, and the
`Cache-Control` vocabulary that controls it.

Every cached response lives in one of two phases, and confusing them is
the root of most caching bugs. The **freshness** phase asks a question
that needs no network trip at all: is the stored copy still within its
lifetime, so it can just be handed back? Once that lifetime expires the
response becomes **stale**, and caching moves into the **validation**
phase, which asks a different question of the origin server: has this
actually changed, or can the stale copy be reused anyway? A cache miss
skips both phases; a fresh hit skips validation entirely; only a stale
hit needs to talk to the origin.

What are the two phases HTTP caching splits into, and what question does each answer? :: The freshness phase asks whether a stored response is still within its lifetime and can be served with zero network trips. Once that lifetime expires the response is stale, and the validation phase takes over, asking the origin server whether the stale copy still matches reality before reusing or replacing it. ^card-fsjp

`Cache-Control` directives mostly exist to control that first phase —
how long something stays fresh, and for whom — plus a few that override
the model outright.

> [!card] mcq
> A response is served with `Cache-Control: no-cache`. What must a cache
> do before it can reuse a stored copy of that response for a later
> request?
> - [x] Revalidate with the origin server first — no-cache does not forbid storing the response, only reusing it without asking
> - [ ] Nothing — the response must never be reused at all
> - [ ] Discard it immediately, since no-cache forbids storage
> - [ ] Reuse it freely without contacting the origin, since only a separate directive requires validation ^card-27mu

Storage and reuse are two different permissions, and the directive that
actually withholds the first one is spelled differently. The
==no-store== directive is the one that forbids a cache from keeping any ^card-ki1c
copy of the response at all, in any form, for any later use.

`Cache-Control` also separates *who* a response is fresh for. A
response marked ==private== is meant for a single end user's own cache ^card-tfya
(a browser), not for a cache shared across many users; a `public`
response may be stored by anyone, including a shared cache sitting
between the origin and every client it serves. A CDN that ignored the
distinction and stored the wrong one would end up serving one user's
personalized page to every other visitor.

If a response carries both `max-age=60` and `s-maxage=600`, what freshness lifetime applies in a private browser cache versus a shared cache like a CDN? :: A private cache without special support for s-maxage just uses max-age, so it treats the response as fresh for 60 seconds. A shared cache uses s-maxage instead, which exists specifically to override max-age for shared caches, so it treats the same response as fresh for 600 seconds. ^card-j7zb

A response marked ==immutable== tells a cache the underlying resource ^card-xds3
will never change for the rest of its freshness lifetime, so even an
explicit user reload should skip revalidation entirely rather than
checking just in case.

What does Cache-Control: must-revalidate change about how a cache is allowed to handle a stale response, compared to ordinary staleness handling? :: Ordinarily a cache is permitted to serve a known-stale response anyway if it can't reach the origin, for example during a network outage. must-revalidate removes that fallback: the cache must fail the request rather than serve stale content without successfully validating it first. ^card-y8ux

Once a response goes stale, validation needs something to compare ^card-yc1q
against — a **validator**. HTTP defines two independent kinds. What are the two kinds of validators HTTP caching uses to check whether a stale response has actually changed, and what does each compare? :: An ETag is an opaque token — often a content hash — representing the exact representation, compared for equality between what the cache has and what the origin currently serves. Last-Modified is a timestamp of when the resource last changed, compared by date. A cache sends whichever validator it has back to the origin (as If-None-Match or a conditional date header) and gets a 304 back if nothing has changed.

ETags come in two comparison strengths. A weak validator is prefixed
with ==W/== and only claims the representation is semantically ^card-suhk
equivalent, not byte-for-byte identical — so it's good enough to skip
re-sending a page whose content is unchanged in meaning, but it cannot
be trusted for something like a range request that needs exact
identity between the ranges being stitched together.

Why does an incorrect Vary header on a response stored in a shared cache risk poisoning that cache for other users? :: Vary lists which request headers split a single URL into separate cached variants — Accept-Language and Accept-Encoding are common examples. If a response's Vary header omits a request header that actually changes the response body, the shared cache stores just one variant under that URL and may later serve it to a different user whose request differed exactly on the omitted header — handing them the wrong language or an encoding their client can't decode. ^card-w7wb

Waiting out the validation round-trip is itself a latency cost, which
is what the newest directive addresses. The ==stale-while-revalidate== ^card-p4xv
directive lets a cache serve its stale copy to the user immediately
while it revalidates with the origin in the background, trading a small
window of possible staleness for making that request's latency
disappear entirely — the served copy just might be a few seconds out of
date until the background check completes.
