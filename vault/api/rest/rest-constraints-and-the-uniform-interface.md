---
topic: api-design
category: api-rest
tags: [rest, architectural-style, uniform-interface, statelessness, api-design]
citations: ["Fielding, Architectural Styles and the Design of Network-based Software Architectures, Ch. 5"]
---

# REST constraints and the uniform interface

Fielding's dissertation does not define REST as a technology or a
wire format. It defines REST as an architectural style: a set of
named constraints layered onto the existing client-server style,
each one added because it solves a specific distributed-systems
problem, and each one paid for with a specific cost in efficiency
or simplicity elsewhere.

Fielding's dissertation does not define REST as a set of
technologies; it defines REST as an ==architectural style== — ^card-p05x
constraints applied to a base style, each chosen deliberately.

The **client-server** constraint is the base: separate the user
interface concerns from data storage concerns, so the two can
evolve independently and clients can be ported across platforms
without touching the server.

REST layers **statelessness** on top of that base. This is an
architectural requirement, not an accident of the transport under
it: each request from client to server must contain all the
information needed to understand and process it, and the server
must keep no client session context between requests.

Why is REST's statelessness constraint an architectural ^card-09nm
requirement on the server's design, rather than merely a
description of how the underlying transport happens to behave? ::
Because REST demands that *no server-side session state survive
between requests* — any request must be self-contained, carrying
everything needed to service it. That is a design discipline
imposed on the application, chosen because it lets any server in a
pool handle any client's next request and lets intermediaries sit
transparently between them, which is what makes horizontal scaling
and layered caching or load-balancing actually work. A protocol
happening not to carry state on the wire says nothing about
whether the application built on top of it still keeps a session
somewhere on the server.

**Cacheability** is the next constraint: responses must implicitly
or explicitly label themselves as cacheable or not, so a client or
intermediary can reuse a stored response for a later equivalent
request instead of repeating the full round trip. This trades a
little staleness risk for a large reduction in server load and
latency, exactly the kind of trade every REST constraint makes.

The **uniform interface** is the constraint that gives REST its
name and its most-quoted requirements. Fielding breaks it into
four sub-constraints that every component in the system must
honor identically, at the cost of some efficiency, because a
uniform contract is what lets components evolve independently
without renegotiating their interaction on every change.

What are the four sub-constraints Fielding groups under REST's ^card-hpuy
uniform interface? :: Identification of resources; manipulation of
resources through representations; self-descriptive messages; and
hypermedia as the engine of application state (HATEOAS).

*Identification of resources* means every resource — a concept,
not a file — is named by a stable identifier (a URI), independent
of the particular representation returned for it at any moment.
*Manipulation through representations* means a client with a
representation of a resource, plus whatever metadata comes with
it, has enough information to modify or delete that resource on
the server without any further out-of-band knowledge.
*Self-descriptive messages* means each message carries enough
information — media type, applicable methods, cache directives —
for a recipient to process it without consulting anything outside
the message itself. *Hypermedia as the engine of application
state* means a client discovers what it can do next from links and
forms embedded in the representations it receives, rather than
from out-of-band documentation baked into the client; how far real
APIs push that idea, and what it buys them, is its own subject.

A message that satisfies "self-descriptive messages" must carry
enough information for a recipient to process it without any
==out-of-band== knowledge beyond the message itself. ^card-sho0

> [!card] mcq
> Which single constraint in Fielding's REST style is explicitly
> optional rather than required of a conforming architecture?
> - [x] Code-on-demand
> - [ ] Statelessness
> - [ ] Uniform interface
> - [ ] Layered system ^card-1rx2

**Code-on-demand** is that optional constraint: a server may
extend client functionality by transferring executable logic —
Fielding's own example is downloadable applets — which the client
runs locally. It is optional precisely because it trades away
visibility (an intermediary can no longer fully understand a
message's effect just by inspecting it) for a real gain in client
extensibility, and a style can be "REST" without ever using it.

The **layered system** constraint says a client cannot generally
tell whether it is connected directly to the origin server or to
an intermediary along the way — a proxy, a gateway, a load
balancer — and each layer can only see and act on the layer
immediately adjacent to it.

> [!card] recall
> Explain what the layered-system constraint requires of a client
> and of the components between a client and an origin server, and
> name one capability this buys a deployment that a strictly
> direct client-to-server connection would not have.
> ---
> A client must be unable to tell, from the interaction alone,
> whether it is talking to the origin server or to some
> intermediary, and each component in the chain can only interact
> with the layer immediately next to it rather than reaching past
> it. This lets operators insert shared caches, load balancers, or
> security gateways transparently, and lets a legacy service sit
> behind a translating gateway, all without any client-side change. ^card-q2et

Put all six constraints together — client-server, statelessness,
cacheability, uniform interface, layered system, and the optional
code-on-demand — and almost nothing that calls itself a "REST API"
in production actually satisfies every one of them at once. Most
skip hypermedia-driven navigation entirely and hand clients a
fixed set of documented endpoints instead; many keep some form of
session affinity for performance reasons that quietly violates
strict statelessness; layering and cacheability are honored to
varying degrees depending on the deployment.

> [!card] recall
> Fielding's REST is a set of six constraints, yet almost no
> production "REST API" satisfies all of them. Given that, what is
> the more useful question to ask about a given API than "is it
> RESTfully pure?"
> ---
> Which specific constraints the API is choosing not to honor —
> for instance dropping hypermedia-driven navigation for a fixed,
> documented set of endpoints, or relaxing statelessness for a
> performance shortcut — and what capability that trade-off costs
> the system (independent client evolution, transparent
> intermediaries, horizontal scalability) in exchange for whatever
> it gains. "RESTful" is a spectrum of deliberate trades, not a
> pass/fail label. ^card-y8kz
