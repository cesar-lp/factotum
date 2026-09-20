---
topic: api-design
category: api-rest
tags: [rest, representations, media-types, content-negotiation, api-design]
citations: ["Fielding, Architectural Styles and the Design of Network-based Software Architectures, Ch. 5"]
---

# Representations and media types

REST's uniform interface names resources and representations as
two separate things for a reason: conflating them is what leads
people to say "the API returns JSON" as if JSON were the resource
itself, rather than one snapshot of it.

A resource is the underlying concept an API exposes — an order, a
customer, the current state of a search — independent of any
particular format. What actually crosses the wire in response to a
request is a ==representation== of that resource: a specific byte ^card-gmee
sequence, in a specific format, capturing the resource's state at
that moment.

Because a resource and its representation are separate things, the
same resource can have more than one valid representation at
once, and a client picks among them through content negotiation:
an `Accept` header telling the server which formats the client can
use, and a response `Content-Type` telling the client which one it
got.

Why can the same order resource legitimately have both an ^card-sl0v
`application/json` representation and a `text/html` representation
returned from the same URI, without either one being "the real"
order? :: Because the resource is the order's state as a concept,
not any particular encoding of it; JSON and HTML are just two
different serializations of that same underlying state, produced
for different consumers (a program versus a browser). Neither
byte stream *is* the resource — each is one representation of it,
selected via content negotiation, and the server is free to
produce further representations (XML, a PDF invoice) without the
resource itself changing at all.

> [!card] recall
> A teammate says "the resource at `/orders/42` is just the JSON
> object it returns." Explain what's wrong with that statement,
> using the resource/representation distinction.
> ---
> The JSON object is one representation of the resource, produced
> for that particular request, not the resource itself. The
> resource is the order's actual state as a concept on the server;
> that state existed before this request and can be serialized
> into more than one representation — JSON, XML, an HTML page — at
> the server's discretion, without the underlying resource ever
> having been "the JSON." Treating one representation as identical
> to the resource breaks down the moment a second, differently
> formatted representation of the same resource has to exist. ^card-wgoj

A representation's shape isn't left to guesswork: the contract for
what a given representation must structurally look like is
declared by its ==media type==, the same mechanism (`Content-Type` ^card-9pxg
and `Accept`) that HTTP uses to negotiate which one is being sent
or requested.

What does declaring a representation's media type as ^card-wwc6
`application/json` actually guarantee about its content, and what
does it leave completely unspecified? :: It guarantees only that
the bytes parse as syntactically valid JSON — an object, array,
string, number, boolean, or null, correctly nested and quoted. It
says nothing about which fields exist, which are required, or what
any of them mean; that has to be established separately, whether
through documentation, a JSON Schema, or convention shared out of
band with whoever consumes the representation.

> [!card] mcq
> A team defines a custom media type,
> `application/vnd.example.order+json`, for its order
> representations instead of using the generic
> `application/json`. What does the custom media type buy them
> that the generic one does not?
> - [x] A single negotiable identifier for a specific, versionable field contract, so a client can request or detect exactly that shape instead of just "some JSON"
> - [ ] Faster parsing, since custom media types skip standard JSON parsing rules
> - [ ] It is required by RFC 9110 for any resource with more than one field
> - [ ] It removes the need for an Accept header entirely ^card-ii7d

A standard media type like `application/json` or `text/html` is
reused across countless unrelated APIs, so it only carries a
syntax-level guarantee. A custom (often "vendor") media type such
as `application/vnd.example.order+json` narrows that promise to
one specific, named shape — this exact API's order fields, this
exact API's conventions — at the cost of being meaningless to any
client or tool that hasn't specifically been taught what it means.

What trade-off does a team accept when it chooses a custom vendor ^card-3k3z
media type for its representations instead of a generic standard
one? :: It gains a precise, negotiable contract for exactly one
shape of data — useful for distinguishing versions or variants of
a resource's representation — but loses the broad, out-of-the-box
interoperability a generic media type gets from every existing
HTTP client, proxy, and tool already knowing what to do with it.
Some APIs fold a version number into the custom type itself as one
way of managing that contract's evolution over time, though how
far to take that is a separate design question on its own.
