---
topic: api-design
category: api-grpc
tags: [grpc, http2, grpc-web, wire-mapping, browsers]
citations: ["gRPC over HTTP/2 Protocol Specification", "gRPC-Web documentation"]
---

# gRPC over HTTP/2, and gRPC-web

`http-2-binary-framing-and-multiplexing.md` covers what a stream is and
how framing and multiplexing work in general. This note is only about
how gRPC maps its own concepts onto that machinery, and about what
happens when a browser tries to speak gRPC directly.

## The mapping

gRPC doesn't invent its own transport — it defines a specific way of
using HTTP/2 that already exists. Each piece of a gRPC call corresponds
to a specific piece of an HTTP/2 exchange:

```
gRPC concept                HTTP/2 mechanism
-----------------------------------------------------
one RPC call             -> one HTTP/2 stream
service.Method name      -> the :path pseudo-header
metadata (request)       -> HTTP/2 request headers
each protobuf message    -> length-prefixed frame in
                             the stream body
final outcome (status)   -> HTTP/2 trailers
```

The call's method name travels as an ordinary path, exactly the way a
REST endpoint's path would: something like
`POST /package.Service/MethodName`.

What HTTP/2 mechanism does a gRPC call's service-and-method name travel as, given that gRPC reuses ordinary HTTP/2 request routing rather than a mechanism of its own? :: It travels as the request's path — an HTTP/2 :path pseudo-header, formatted as /package.Service/MethodName — the same field an HTTP request would normally use to route to an endpoint. ^card-buvq

Inside the body of that one stream, messages don't just get
concatenated — each one is ==length-prefixed==, carrying its own byte ^card-hic8
length ahead of its contents, so the receiving end knows exactly where
one message ends and the next begins within the same stream.

```
[1-byte compressed flag][4-byte message length][message bytes]
[1-byte compressed flag][4-byte message length][message bytes]
...
```

Why does gRPC length-prefix each message inside a stream's body, rather than relying on the stream simply ending after one message? :: A single gRPC stream can carry more than one message — as in a streaming call — so the receiving end needs a way to tell where one message stops and the next starts within the same continuous body. A length prefix ahead of each message's bytes gives it exactly that boundary, independent of when the stream itself eventually ends. ^card-eogu

## Why the outcome arrives in trailers

An HTTP response ordinarily reports its outcome up front, in its status
line and headers, before the body is sent. gRPC can't always do that,
because whether a call succeeded often isn't known until the handler
has finished producing its response — and for a streaming call, not
until well after the first bytes of the body are already on the wire.

That's exactly why gRPC needs ==trailers==: a block of header-shaped ^card-ggh9
fields sent after the message body, once the outcome is actually known.
The gRPC status code and any status message are sent there, as
trailing fields, rather than in the leading response headers.

> [!card] mcq
> A gRPC response's leading HTTP/2 headers arrive with HTTP status 200.
> What can the client conclude about whether the RPC succeeded?
> - [x] Nothing yet — the gRPC status travels in trailers, sent after the body, and 200 only means the HTTP-level exchange started normally
> - [ ] The RPC succeeded, since 200 in the leading headers is gRPC's success signal
> - [ ] The RPC failed, since a successful RPC would omit headers entirely
> - [ ] It depends on the :path value in those same headers ^card-dnxk

This is precisely why a call's outcome is not knowable from the
response headers alone: the headers only confirm that the exchange
began, and the actual result waits in a trailer block that hasn't been
sent yet at that point.

> [!card] recall
> Explain why gRPC's use of trailers, rather than reporting outcome in
> the leading response headers, is a necessary consequence of how gRPC
> calls (including streaming ones) actually complete.
> ---
> Whether a call succeeded is often not known until the handler has
> finished — for a streaming call, that can be long after the first
> response bytes are already on the wire, since messages are being sent
> as they become available. Putting the outcome in leading headers would
> require knowing the result before any of the body could be sent, which
> streaming makes impossible. Trailers let the outcome be reported once
> it's actually known, after the body, without holding up delivery of
> everything that came before it. ^card-m1u7

## Why a browser can't just speak gRPC

A browser's `fetch` and `XMLHttpRequest` APIs are built for the
request/response shape of ordinary HTTP: they let a caller set request
headers and read response headers and a body, but they don't expose
HTTP/2 trailers, and they don't let a caller control the underlying
framing of the request. Both of those are things gRPC depends on — the
status lives in trailers, and messages rely on a specific length-prefix
framing inside the body.

Because that gap is in the browser's HTTP client APIs themselves, not
in what version of HTTP the browser happens to negotiate, no amount of
browser or server modernness closes it: a browser cannot speak gRPC
natively no matter how recent its HTTP/2 support is.

Why is the obstacle to a browser speaking gRPC directly not fixable by using a newer browser or a newer HTTP/2 server, and where does the limitation actually sit? :: The limitation sits in the browser's HTTP client APIs (fetch, XMLHttpRequest), which don't expose HTTP/2 trailers and don't let calling code control request framing — both of which gRPC's wire mapping depends on. Since neither gap is a matter of protocol version, upgrading the browser or the server's HTTP/2 support doesn't change what the browser's own APIs expose. ^card-6piy

## gRPC-web

gRPC-web solves this with a proxy that sits between the browser and a
real gRPC backend, translating in both directions: it accepts a
browser-friendly encoding (framing and status information carried in a
way ordinary browser HTTP APIs can actually read) and speaks genuine
gRPC on to the backend, then translates the backend's response back
the other way.

That translation isn't free. Introducing the proxy adds an extra
network hop between the browser and the backend that a native gRPC
client talking directly to the server wouldn't need. It also doesn't
carry over every capability of full gRPC: client streaming and
bidirectional streaming are not generally available through gRPC-web,
leaving it well suited to simple request/response calls and
server-streaming calls but not to the full range of call shapes gRPC
otherwise supports.

What are the two costs of putting a translating proxy in front of a gRPC backend so browsers can reach it through gRPC-web? :: An extra network hop between the browser and the backend that a direct gRPC client wouldn't incur, and a loss of capability — client streaming and bidirectional streaming are not generally available through gRPC-web, unlike with a native gRPC client. ^card-cbc8
