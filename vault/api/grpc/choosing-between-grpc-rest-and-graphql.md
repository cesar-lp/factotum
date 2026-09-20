---
topic: api-design
category: api-grpc
tags: [grpc, rest, graphql, api-design, tradeoffs]
citations: ["gRPC documentation (grpc.io)"]
---

# Choosing between gRPC, REST, and GraphQL

Every other note in this category was deliberately kept away from
this comparison, so that the choice could be made honestly, on the
axes that actually decide it, rather than as a feature checklist where
gRPC wins every row because it's the newest entrant.

## Who the client is

The single biggest determinant of fit is not a technical property of
the wire format at all — it's whether you control both ends of the
call. gRPC's generated stubs and shared `.proto` contract, covered in
`idl-and-generated-stubs.md`, assume the caller and callee can be
rebuilt together against the same schema. That assumption holds for
service-to-service traffic inside infrastructure you own, and breaks
down the moment the caller is a browser tab or a third party's
integration you don't control the release cycle of — a build step and
generated stubs are a cost you can absorb for your own fleet of
services, but not one you can impose on an unknown public client.

> [!card] mcq
> A mobile team ships a public app that talks to a backend the same
> company controls, but app releases can lag weeks behind backend
> deploys because of app-store review. Which property of gRPC makes it
> the weaker fit here compared to a service-to-service call inside the
> same backend?
> - [x] The generated-stub contract assumes both sides can be rebuilt and redeployed together, which a store-gated client release cycle breaks
> - [ ] gRPC cannot run over a mobile network's radio link at all
> - [ ] Protobuf messages are too large to transmit over cellular connections
> - [ ] gRPC requires the client to be written in the same language as the server ^card-hdu0

Given a situation where a company's own backend team owns both the ^card-d1t5
publisher and every subscriber of an internal call, and both are
redeployed on the same release train — why does that situation favor spending the cost of a generated-stub contract, when the same cost would be a poor trade for a public-facing endpoint? :: When one team (or coordinated teams) can rebuild and redeploy both sides together, the generated-stub contract's cost — a build step, regenerated code, coordinated schema changes — is paid once by people who already coordinate deploys anyway, and it buys strong typing and compact encoding in return. A public endpoint has no such coordination: an unknown, independently-released population of clients cannot be forced through the same build step, so the same contract cost buys nothing but friction for the very clients you can't afford to friction out.

## Payload shape and streaming

Binary encoding and built-in streaming — both covered on their own
terms elsewhere in this category — only pay for themselves when a
workload is large or chatty enough to feel their absence: high call
volume between services, large messages where a compact wire format
measurably cuts bandwidth, or a workload that is naturally a stream
rather than a single request-response pair. A handful of small,
infrequent calls between a browser and a backend rarely lives in that
regime, which is part of why gRPC's fit tracks service-to-service
traffic more than it tracks payload size in isolation.

## The shape problem GraphQL actually addresses

REST and gRPC both organize an API around a fixed set of resources or
RPC methods, each with a fixed response shape decided by the server
ahead of time. That works cleanly when one
client's needs line up with that shape, and works badly when many
different clients each want a different slice of related data: a
mobile screen that needs only three fields off a resource still gets
the whole representation, and a dashboard that needs data assembled
from five related resources has to make five separate round trips (or
wait for a bespoke endpoint that stitches them together).

Those are the two failure modes GraphQL is a response to. Fetching a
full fixed representation when only a few of its fields are needed is
==over-fetching==. Needing several separate calls because no single ^card-yjkw
fixed shape covers what one screen actually wants is
==under-fetching==. GraphQL addresses both by putting one endpoint in ^card-sd3y
front of a schema and letting each caller specify, per request, the
exact shape of data it wants back — the client, not the server,
decides which fields and which related entities come back together.

A team building a dashboard that combines slices of five different resource types is deciding between REST, gRPC, and GraphQL. Which problem is actually driving that decision, and why does that point specifically at GraphQL rather than at gRPC's efficiency advantages? :: The problem is under-fetching — no single fixed response shape from a REST resource or a gRPC method covers everything the dashboard needs, so assembling the view requires either many round trips or a bespoke aggregating endpoint maintained just for that one screen. gRPC's advantages are about how efficiently a single fixed-shape call is encoded and transported, which doesn't touch the actual problem of the shape itself being wrong for this client. GraphQL addresses the shape problem directly by letting the client specify which fields and related entities it wants in one query, which is a different axis of the decision than transport efficiency entirely. ^card-e3fh

## Contract evolution, compared

`api-versioning-and-evolution.md` covers where a REST contract's
version can live and what counts as a breaking change; a sibling note
in this category covers how Protobuf fields evolve. The two styles
don't just place their version markers differently — they evolve
their contracts on fundamentally different units. A REST resource's
representation evolves as one document: adding, removing, or
retyping a field changes what that whole representation means, and
that's the unit REST's breaking-change rules are written around. A
Protobuf message evolves field-by-field, each one independently
numbered, which is why an old client can keep decoding a message a
newer server has since extended — the parts it doesn't recognize
simply don't affect the parts it does.

> [!card] recall
> Contrast how a REST API and a gRPC API each let a server add new
> data to a response over time without breaking clients that haven't
> updated. What is the underlying difference in what each contract
> treats as its unit of change?
> ---
> A REST API relies on additive, optional fields within a
> representation and on tolerant clients that ignore fields they
> don't recognize — the representation as a whole is the unit, and
> compatibility is a discipline the client and server both have to
> observe. A gRPC API gets compatibility more structurally: each
> Protobuf field carries its own permanent number, so an old client
> decoding a message simply skips numbered fields it wasn't compiled
> to know about, without that unrecognized data disturbing the fields
> it does understand. The unit of evolution is the individual
> numbered field rather than the representation as a whole, which is
> why Protobuf's compatibility rules can be more mechanical than
> REST's "be a tolerant reader" convention. ^card-y9k8

## What you give up

Choosing gRPC (or GraphQL's single endpoint) is also choosing what
you lose, and the sharpest loss is one most teams don't notice until
it's already gone.

`caching-and-conditional-requests.md` covers how HTTP caching actually
works — freshness lifetimes, validators, the whole `Cache-Control`
vocabulary — and none of that machinery cares about clever
configuration; it cares about the *shape of the traffic*. It keys on
a URL and a method, storing and revalidating a response for a
specific `GET /orders/42` the way a shared cache or CDN understands
natively. Collapsing an API onto one RPC-shaped `POST` endpoint — which
is what both gRPC and a GraphQL server do — removes the very thing
that machinery keys on: there is no longer a distinct, stable URL per
resource for a cache to store against, so a generic HTTP cache simply
has nothing to hold onto, no matter how well the payload itself is
designed.

Why does putting an API behind a single POST-shaped endpoint forfeit most of HTTP's caching machinery, even if every individual response would otherwise be perfectly cacheable? :: HTTP caching keys on the combination of URL and method, not on payload content — that's what lets a shared cache or CDN store and revalidate a response without understanding anything about what's inside it. A single RPC-shaped POST endpoint gives every distinct logical request the same URL and method, so there's no longer a stable per-resource identifier for a generic cache to key on. The cache has no way to tell one request apart from another at the layer it actually operates on, regardless of how cacheable the underlying data would be under a resource-per-URL design. ^card-3ntg

Debuggability follows the same pattern: a REST call is legible to any
HTTP tool without special support — a URL, a method, human-readable
headers — while an RPC-shaped binary call generally needs
protocol-aware tooling just to be read off the wire at all.

## The honest position

None of this ranks the three outright, and treating it as a ranking
is the mistake this whole comparison exists to head off. Service-to-
service traffic inside infrastructure you control, where both ends
redeploy together and call volume or payload size actually stress a
connection, is where gRPC earns the cost of its generated-stub
contract and its departure from HTTP caching. A public API serving
clients you don't control and can't force through a build step is
usually where REST wins, precisely because it stays legible to
ordinary HTTP tooling and keeps that caching layer intact. GraphQL
isn't a competitor to either on transport grounds at all — it's a
response to a client-shape problem, over-fetching and under-fetching
across many differently-shaped consumers of the same data, and it's
worth reaching for only when that specific problem, not raw
efficiency or public reach, is the one actually being solved.

> [!card] mcq
> A team is deciding among REST, gRPC, and GraphQL for a new public
> API whose clients are third-party developers the team has never met
> and cannot coordinate a release with. Which factor should weigh most
> heavily against gRPC here?
> - [x] gRPC's generated-stub contract assumes clients can be rebuilt against a shared schema, which an unknown, uncoordinated client population cannot be required to do
> - [ ] gRPC cannot express the data model third-party developers would need
> - [ ] gRPC responses cannot be validated by external developers
> - [ ] gRPC is slower than REST for every workload regardless of payload size or call volume ^card-ftp2
