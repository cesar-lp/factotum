---
topic: networking
category: http-protocol
tags: [http, message-format, semantics, methods, idempotency]
citations: ["RFC 9110 (HTTP Semantics)"]
---

# HTTP message format and semantics

Every HTTP request and response is built from the same three parts: a
start line, a set of header fields, and an optional body. A request's
start line names a method and a target, plus the HTTP version, for
example `GET /orders/42 HTTP/1.1`. A response's start line instead
carries the version, a status code, and a short reason phrase, for
example `HTTP/1.1 404 Not Found`. Headers follow as `name: value` lines,
and a blank line marks where they end and any body begins.

```
GET /orders/42 HTTP/1.1
Host: shop.example.com
Accept: application/json

```

```
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 27

{"id": 42, "status": "paid"}
```

Which three parts make up an HTTP message, and which one is optional? :: A start line, header fields, and an optional body — the body is the only one that may be absent (for example, on many GET requests or a 204 response). ^card-0asl

RFC 9110 draws a line that matters for everything else in this category:
it separates HTTP **semantics** — what a request or response *means*,
independent of how it travels — from the wire **syntax** each version
uses to encode that meaning. HTTP/1.1 spells out a message as literal
text lines like the ones above; HTTP/2 and HTTP/3 instead carry the same
start-line fields, headers, and body as binary frames, compressed and
multiplexed in ways specific to each version. A GET request still means
"retrieve this resource" and a 404 still means "not found" no matter
which version framed the bytes.

Why does upgrading a connection from HTTP/1.1 to HTTP/2 change nothing about what a client's GET request means or how a server is expected to handle it? :: Because GET's meaning is defined at the semantics layer, which RFC 9110 specifies independently of any version's wire format; HTTP/2 changes only how the request is framed and transmitted, not what the method, headers, or status codes signify. ^card-qqig

> [!card] recall
> RFC 9110 separates HTTP semantics from HTTP syntax. Explain what each
> term covers, and why that separation lets the same request meaning
> survive a move from HTTP/1.1 to HTTP/2 even though the two versions
> encode messages completely differently on the wire.
> ---
> Semantics is the meaning layer: what a method, header, or status code
> signifies — "create this resource," "the request was unauthorized,"
> and so on. Syntax is the encoding layer: how a message expressing that
> meaning is actually serialized onto the connection, whether as
> newline-delimited text (HTTP/1.1) or as binary frames (HTTP/2, /3).
> Because a client and server only need to agree on semantics to
> understand each other, a version change can swap out the entire wire
> format without altering what any request or response means. ^card-iuei

The common methods each carry a distinct semantic. `GET` retrieves a
representation of a resource without changing it. `POST` submits data to
be processed by the target resource, with the effect defined by that
resource — often creating a new subordinate resource, but not
necessarily. `PUT` replaces the resource at the given URL with the
supplied representation, creating it if it doesn't already exist.
`DELETE` removes the resource at the given URL. `PATCH` applies a
partial modification rather than a full replacement.

RFC 9110 also classifies methods along three axes that are frequently
confused with each other: **safe**, **idempotent**, and **cacheable**.

A method is called ==safe== when it is not expected to produce any ^card-pu3m
state-changing effect on the server.

In practice that means the request is read-only from the server's point
of view; `GET` and `HEAD` are the methods RFC 9110 defines this way.

> [!card] mcq
> Which of these methods is defined as "safe" — meaning a compliant
> server is not expected to produce any state-changing effect from it?
> - [x] GET
> - [ ] POST
> - [ ] PUT
> - [ ] DELETE ^card-q2v8

A method is called ==idempotent== when sending the identical request ^card-ggcu
multiple times produces the same effect on server state as sending it
once.

This is easy to misread as "returns the same response every time," but
that is not the definition — a second `DELETE` on an already-deleted
resource might return 404 instead of 200, yet the method still leaves
the resource in the same end state as after the first call.

What is the actual definition of an idempotent method, as opposed to the common misreading of the term? :: An idempotent method is one where issuing the identical request N times leaves the server in the same state as issuing it once — it is a guarantee about the resulting state, not about the response body or status code being identical on each call. ^card-82xn

`GET`, `PUT`, and `DELETE` are idempotent; `POST` and `PATCH` are not
guaranteed to be. `PUT` replacing a resource with the same representation
twice leaves that resource in one final state either way. `DELETE`
removing an already-gone resource leaves it gone either way. `POST`, by
contrast, is defined with no such guarantee: submitting the same order
form twice is commonly expected to create two separate orders, so retrying
a `POST` is unsafe without extra precautions like an idempotency key.

> [!card] mcq
> Which single statement correctly places POST, PUT, and DELETE on the
> safe/idempotent axes?
> - [x] POST is neither safe nor idempotent; PUT and DELETE are idempotent but not safe
> - [ ] POST and PUT are both idempotent and safe; DELETE is neither
> - [ ] All three are idempotent since they are standard HTTP methods
> - [ ] PUT is safe because it uses a fixed target URL ^card-lkhd

This distinction is exactly why an HTTP client can safely auto-retry a
timed-out `PUT` or `DELETE` on a flaky connection without first checking
whether the earlier attempt actually landed — repeating it changes
nothing further. A client cannot extend the same courtesy to a bare
`POST`: blindly retrying it risks a duplicate side effect, such as a
second charge or a second created record.

Why is it safe for an HTTP client to automatically retry a request that timed out if the method was PUT or DELETE, but not if the method was a plain POST? :: PUT and DELETE are idempotent, so repeating the exact same request changes server state no further than the first attempt did, even if the client can't confirm the first attempt succeeded. POST carries no such guarantee — the resource's handling might create a new effect (like a duplicate order) on every call, so an automatic retry risks applying the request's effect twice. ^card-onj5

**Cacheable** is the third, separate axis: whether a response to that
method may be stored by a cache and reused to satisfy a later request
without contacting the origin server again. `GET` responses are
cacheable by default, and `HEAD` responses are as well; `POST` responses
can be cacheable only when explicit caching information makes that
outcome possible. Note that caching behavior itself — the response
headers that control it and how a cache decides freshness — belongs to
a different note; the point here is only that cacheability is a distinct
property from safety and idempotency, not a proxy for either.

> [!card] recall
> Name a method that is both safe and idempotent, one that is idempotent
> but not safe, and one that is neither safe nor idempotent. For the
> idempotent-but-not-safe one, explain what "idempotent" guarantees about
> repeating it, given that it does modify server state. ^card-fhid
