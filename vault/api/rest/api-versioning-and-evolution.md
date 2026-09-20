---
topic: api-design
category: api-rest
tags: [api-versioning, breaking-changes, deprecation, tolerant-reader, sunset-header]
citations: ["Richardson & Ruby, RESTful Web Services", "RFC 9110", "RFC 8594"]
---

# API versioning and evolution

Not every change to an API's contract deserves the word "breaking," and
the distinction is worth being precise about, because a new version is
expensive to introduce and even more expensive to retire.

A change is breaking when an existing, unmodified client could receive
a response or send a request that the new contract no longer handles
the way the client expects. Concretely: removing a field a client reads,
renaming a field, tightening a validation rule so previously-accepted
input is now rejected, changing a field's type, and changing a default
value a client was relying on all count as breaking — each one can turn
a client that worked yesterday into one that fails today, with no
change on the client's side at all.

Name five distinct kinds of change to an API's contract that count as breaking, each capable of failing an unmodified client. :: Removing a field, renaming a field, tightening a validation rule, changing a field's type, and changing a default value. ^card-b72q

Against that, purely ==additive== change — a new optional field, a new ^card-fadq
endpoint, a new optional query parameter — leaves every existing client
untouched, because nothing that client already depends on has moved or
disappeared.

That contrast leads to the cheapest rule in this whole area: the
cheapest version is the one you never cut. Every version you ship has
to be introduced, documented, supported in parallel with the others,
and eventually retired — so a design that gets the same result through
an additive change avoids all of that cost, not just some of it.

What does the principle "the cheapest version is the one you never cut" mean in practice? :: Introducing, maintaining, and retiring a new API version carries real ongoing cost, so a change that can be made additively — without forcing a new version at all — is strictly cheaper than even a well-executed version bump, because it skips that whole lifecycle entirely. ^card-byg6

## Where the version lives

When a breaking change really is unavoidable, the version has to be
signaled somewhere, and there are three common places to put it.

> [!card] recall
> Name the three common places an API can signal its version, and give
> one real tradeoff for each — not just an advantage, but something it
> actually costs you.
> ---
> URI path versioning (e.g. `/v2/orders`) is simple, cache-friendly, and
> visible in logs and browser bars, but it means the same underlying
> resource now lives at two different URIs depending on version, and it
> tempts teams into big, infrequent version bumps rather than gradual
> change. Custom header versioning (e.g. an `Api-Version` header) keeps
> one stable URI per resource, but it's invisible to a browser address
> bar or a plain `curl` call without extra flags, harder for a newcomer
> to discover, and a cache keyed only on the URL can't tell two versions
> of the same request apart without extra care. Media-type versioning
> (e.g. `Accept: application/vnd.example.v2+json`) ties the version to
> the requested representation format rather than to resource identity,
> which is arguably the most REST-purist of the three, but it needs
> clients willing to construct custom Accept headers and needs caches to
> vary their stored responses by that header or risk serving the wrong
> version back. ^card-1njy

> [!card] mcq
> Versioning by putting the version inside the media type requested via
> the Accept header (as opposed to the URI path or a custom header) ties
> the version most directly to which of these?
> - [x] The representation format being requested for the resource
> - [ ] The resource's own identity and URI
> - [ ] The HTTP method used for the request
> - [ ] The transport protocol version (HTTP/1.1 vs HTTP/2) ^card-kft6

No single placement wins outright — path versioning optimizes for
visibility and cacheability, header versioning for a stable resource
identity, media-type versioning for purity of that same identity at the
cost of client and cache cooperation. (Other API styles, like an IDL
with its own field-numbering scheme, solve this differently again, but
that's a separate comparison.)

## Evolving without a version bump

Given that a version is expensive, most day-to-day API evolution should
be additive-only: add fields and endpoints, never remove or repurpose
one, and let unrelated clients simply not notice.

That only works, though, if clients cooperate on their end. A
==tolerant reader== is a client built to ignore fields it doesn't ^card-oglk
recognize in a response, rather than treating any unexpected field as
an error.

A server can only get away with additive-only evolution, without
bumping a version, to the extent its clients are actually built this
way; a strict client that errors on any unfamiliar field turns even a
harmless new field into a breaking change in practice, no matter what
the server's contract technically promises.

When a breaking change genuinely can't be avoided, RFC 8594 defines a
pair of headers for announcing it ahead of time. A `Deprecation` header
marks that a version (or a specific field or endpoint within it) is on
its way out. The ==Sunset== header goes further, giving a concrete date ^card-j4zr
after which the server may actually stop serving it.

What is the difference in what a Deprecation header and a Sunset header each communicate to a client? :: Deprecation signals that something is being phased out, without necessarily committing to when. Sunset gives a concrete date (or date-time) after which the resource or version may no longer be available at all — it's the deadline, where Deprecation is just the warning. ^card-jbp5

> [!card] recall
> A version has been marked deprecated and given a Sunset date. Describe
> what actually needs to happen, in practice, between that announcement
> and the version being fully retired — not just "wait for the date."
> ---
> The server needs to actually monitor who's still calling the deprecated
> version and communicate with those remaining consumers directly where
> possible, since headers alone don't guarantee anyone reads them. Only
> once traffic has genuinely migrated (or the Sunset date has passed and
> the server is willing to accept breaking the stragglers) does the
> server stop serving the version outright — typically by returning an
> error for it rather than silently changing its behavior — so that
> retirement is a deliberate cutover, not something that happens quietly
> in the middle of everyone's night. ^card-f108
