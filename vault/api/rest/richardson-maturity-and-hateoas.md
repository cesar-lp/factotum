---
topic: api-design
category: api-rest
tags: [rest, hateoas, richardson-maturity-model, hypermedia, api-design]
citations: ["Richardson & Ruby, RESTful Web Services", "RFC 9110"]
---

# Richardson maturity model and HATEOAS

Leonard Richardson proposed a way to talk about how thoroughly an HTTP
API actually uses REST's uniform interface — one of REST's named
constraints, covered elsewhere — rather than treating "RESTful" as a
single yes-or-no label. The model is a ladder of four levels, each rung
adopting one more piece of what HTTP already offers.

At the bottom, **level 0** exposes exactly one endpoint for everything.
A client sends every request to that same URL, usually via `POST`, and
the real meaning of the call — which operation, on which thing — lives
entirely inside the request body. HTTP itself contributes almost
nothing here beyond acting as a transport tunnel; this is the same shape
as a classic RPC or SOAP call, just carried over port 80.

What does level 0 of the maturity model look like, and what role does HTTP actually play in it? :: A single endpoint handles every kind of request, typically via POST, with the operation and its target encoded entirely in the body. HTTP is used only as a transport tunnel — it doesn't contribute any of its own routing or verb semantics to the design. ^card-9ao9

**Level 1** breaks that single endpoint apart into many — one URL per
resource instead of one URL for the whole API. A client now sends
requests to `/orders/42` instead of describing "the order with id 42"
inside a generic payload. This note doesn't develop how those URLs
should be designed; that's its own concern. What matters for the ladder
is only that identifying distinct things by distinct addresses is a
separate, earlier step than the next one.

**Level 2** is where most production APIs that call themselves RESTful
actually sit. It means using HTTP's own verbs and status codes for what
they're already defined to mean, instead of treating HTTP purely as a
delivery pipe for an arbitrary payload. Which verb suits which
operation, and which status code fits which outcome, is exactly what
the HTTP protocol category works out in detail — the fact that belongs
here is only the shape of the move itself: verbs and status codes stop
being ignored and start doing real, load-bearing communication.

What single move separates level 1 from level 2 of the maturity model? :: Level 2 starts using HTTP's own verbs and status codes as they're actually defined to mean something, rather than using HTTP only as a generic transport for a payload that carries all the real meaning itself. ^card-kdeb

> [!card] mcq
> An API assigns a distinct URL to every resource and issues correct,
> meaningful HTTP status codes for every outcome, but its verbs and
> status codes are exactly what you'd expect from their definitions —
> nothing here yet tells a client what it's allowed to do next beyond
> what it already assumed. Which level of the Richardson Maturity Model
> does this sit at?
> - [x] Level 2
> - [ ] Level 1
> - [ ] Level 3
> - [ ] Level 0 ^card-s75j

At the top of the ladder sits ==level 3==, where responses stop being ^card-eou1
plain data and start carrying hypermedia controls — one of the elements
the uniform interface calls for. A response doesn't just report a
resource's state; it also embeds information about what the client can
legitimately do from here.

That idea has a name: ==HATEOAS==. ^card-4g0z

A response carries links describing the actions available next, so a
client discovers those options by reading the response rather than by
having them baked in beforehand. Instead of constructing a URI from a
template the client author memorized ahead of time, the client follows
a link the server handed it right now.

What does it mean, concretely, for a response to embed HATEOAS-style hypermedia controls? :: The response body includes links (or link-like descriptions) naming the actions available from the current state, so the client reads those out of the response instead of relying on a URI it already knew how to build. ^card-nx1v

The promised payoff follows directly from that: if clients only ever
follow the links a response gives them, a server is free to move,
restructure, or rename its URIs at will, because no client ever hard-
coded one. Discoverability, in other words, is supposed to buy the
server room to change its mind about addresses without breaking anyone
downstream.

What is the specific payoff HATEOAS is supposed to deliver, and what does it assume about how clients navigate? :: It's supposed to let a server change its URIs freely without breaking existing clients, on the assumption that clients navigate purely by following links returned in responses rather than by constructing URIs from a template they hard-coded in advance. ^card-v9xf

Here's the part worth being honest about: level 3 is rare. Very few
production APIs actually reach it, and the reasons are not simply that
teams are lazy or ill-informed.

> [!card] recall
> Level 3 / HATEOAS is uncommon in real APIs even though it's the top of
> the maturity ladder. Give at least two concrete reasons this happens,
> beyond "nobody bothered."
> ---
> Clients tend to hard-code URIs anyway, because reading and following
> links on every call is more work than remembering a path once. Client
> tooling and code generators (SDK generators, typed API clients) are
> largely built around fixed, known endpoints, not around dynamically
> discovered ones. And the decoupling benefit HATEOAS promises rarely
> shows up in practice: a client still has to understand what a given
> link relation *means* in order to do anything useful with it, and that
> understanding already couples the client to the server's semantics —
> so moving the URI saves less than it looks like it should. ^card-luus

> [!card] mcq
> Which statement best captures why HATEOAS's decoupling promise often
> fails to fully materialize, even in a correctly implemented level-3 API?
> - [x] A client still has to understand what a given link relation means to act on it, and that semantic understanding already couples it to the server — moving the URI itself saves comparatively little
> - [ ] HTTP has no mechanism for including links in a response body at all
> - [ ] Search engines refuse to index APIs that use hypermedia links
> - [ ] Level 3 requires a different transport protocol than levels 0-2 ^card-yhqg

None of this makes level 3 wrong or level 2 a cop-out. It's a genuine
tradeoff: hypermedia buys real flexibility for a server whose clients
truly do navigate link-by-link, at the cost of complexity that mostly
pays for itself only when that assumption holds.
