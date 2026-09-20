---
topic: networking
category: http-protocol
tags: [websockets, upgrade-handshake, real-time, server-sent-events]
citations: ["RFC 6455 (WebSocket)"]
---

# WebSockets and the Upgrade Mechanism

HTTP is shaped as request-response: a client sends a request and a
server sends back exactly one response to it. Nothing in that shape
lets a server send a message on its own initiative — it can only ever
reply to something the client asked for first. A chat app or a live
feed needs the opposite: either side pushing a message the moment it
has one. WebSockets exist to get from the first shape to the second
without needing an entirely separate connection setup from scratch.

The way there is the ==Upgrade== handshake: a client sends an ^card-ief3
ordinary HTTP request asking the server to switch the protocol
running on this same TCP connection, and if the server agrees, both
sides stop speaking HTTP on it and start speaking a different,
bidirectional protocol instead.

The request carries `Connection: Upgrade` and `Upgrade: websocket`
headers, plus a client-generated nonce in the `Sec-WebSocket-Key`
header. That key exists to confirm the server actually understood
this as a WebSocket request rather than, say, a transparent proxy
that forwarded the request but knows nothing about WebSockets.

How does the server prove it understood the request, given the client's Sec-WebSocket-Key? :: It concatenates the client's key with a fixed, spec-defined GUID, takes the SHA-1 hash of that concatenation, base64-encodes the result, and returns it in a Sec-WebSocket-Accept header — a value only a server implementing the WebSocket handshake would compute correctly. ^card-7yz9

> [!card] mcq
> A client sends `Upgrade: websocket` and `Connection: Upgrade`
> headers along with a Sec-WebSocket-Key. Which response tells it the
> switch succeeded?
> - [x] 101 Switching Protocols, with a matching Sec-WebSocket-Accept header
> - [ ] 200 OK, with a Upgrade-Confirmed header
> - [ ] 204 No Content
> - [ ] 302 Found, redirecting to a `ws://` URL ^card-qldj

The server signals success with a ==101== status, the one status ^card-9ces
code whose entire job is to say the protocol on this connection is
about to change.

Once that response goes out, the connection is no longer HTTP at
all — no further requests or responses travel on it. Both sides
switch to the WebSocket framing protocol, exchanging discrete frames
that carry text or binary payloads in either direction independently,
until either side closes the connection.

After the 101 response, is the traffic on that connection still HTTP? :: No — the connection has switched entirely to WebSocket framing; there are no more HTTP requests or responses on it, only WebSocket frames sent by either side until the connection closes. ^card-cero

Not every "server needs to push updates" problem calls for a full
duplex protocol, though. ==Server-Sent Events== give a server a ^card-owsu
plain-HTTP, one-way channel to the client, with reconnection handled
automatically by the browser's own EventSource API — no separate
handshake, no client-to-server frames, and no custom reconnect logic
to write.

> [!card] mcq
> An app needs a one-way stream of live updates from server to
> client, delivered over plain HTTP, with reconnection handled
> automatically by the browser. What fits without the overhead of a
> full-duplex protocol?
> - [x] Server-Sent Events
> - [ ] WebSockets
> - [ ] Long polling, reissued manually on every disconnect
> - [ ] Short polling on a fixed interval ^card-ky12

Plain polling — repeatedly issuing fresh HTTP requests to check for
new data — avoids any handshake at all, at the cost of latency
between updates and wasted requests when nothing has changed; it
remains a reasonable choice when updates are infrequent enough that a
persistent channel isn't worth holding open.

What connects HTTP/2 to the Upgrade mechanism this note describes? :: Nothing directly — HTTP/2 does not use the HTTP/1.1 Upgrade header to negotiate anything about itself, so a WebSocket connection cannot reuse this same 101 handshake on top of an HTTP/2 connection; running WebSockets over HTTP/2 instead needed a separate mechanism, an extended form of the CONNECT method defined for that purpose. ^card-80ez
