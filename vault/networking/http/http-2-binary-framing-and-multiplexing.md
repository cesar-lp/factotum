---
topic: networking
category: http-protocol
tags: [http2, multiplexing, binary-framing, flow-control]
citations: ["RFC 9113 (HTTP/2)", "Grigorik, High Performance Browser Networking"]
---

# HTTP/2: binary framing and multiplexing

`connection-management-in-http-1-1.md` laid out the problem: HTTP/1.1
allows one request in flight per connection, pipelining could not fix
that because responses must return in request order, and browsers
compensated with roughly six parallel connections per origin plus domain
sharding — both of which cost handshakes and separate congestion
windows. HTTP/2 does not patch around that limit; it removes the
mechanism that caused it.

The change starts below HTTP's familiar request/response model. Where
HTTP/1.1 requests and responses are plain text terminated by line breaks,
HTTP/2 wraps every message in a **binary framing layer**. The unit of
communication is now the **frame** — a small binary structure with a
type, a length, and a stream identifier, and specific frame types exist
for header data, message body data, and connection control. Everything
HTTP/2 does is expressed as sequences of these frames.

What is the smallest unit of communication in HTTP/2's binary framing layer, and what does each one carry to identify where it belongs? :: A frame — a binary structure carrying a type, a length, and a stream identifier that says which logical stream the frame's contents belong to. ^card-qb4r

```
one TCP connection
├── stream 1 (request/response A)
│   ├── HEADERS frame
│   └── DATA frame(s)
├── stream 3 (request/response B)
│   ├── HEADERS frame
│   └── DATA frame(s)
└── stream 5 (request/response C)
    ├── HEADERS frame
    └── DATA frame(s)
```

On top of frames, HTTP/2 introduces the **stream**: an independent,
bidirectional sequence of frames exchanged between client and server,
carrying one request and its matching response.

What makes an HTTP/2 stream "independent," as distinct from just being a labeled group of frames? :: Each stream carries its own request and response and progresses without waiting on any other stream on the same connection, so work on one stream is not gated by the state of another — the streams share a connection but not each other's pace. ^card-hqf5

A single TCP connection carries many streams at once — this is
==multiplexing==. Unlike HTTP/1.1's six separate connections standing in ^card-vyro
for parallelism, HTTP/2 gets genuine concurrency from one connection,
because the streams sharing it are a construct of the protocol itself
rather than of the transport.

Each frame names the stream it belongs to, so frames from different
streams can be sent interleaved — a chunk of stream 1's response, then a
chunk of stream 3's, then more of stream 1's — and the receiving end
reassembles each stream from its own frames using the stream identifier.
Interleaving is what breaks the HTTP/1.1 constraint directly: a slow
response no longer has to occupy the connection to itself, so requests
queued after it are not stuck waiting on it. HTTP/2 removes head-of-line
blocking at the application layer.

How does frame interleaving on a single HTTP/2 connection prevent one slow response from delaying an unrelated request, given that HTTP/1.1 could not avoid exactly that? :: Frames from many streams share the same connection but are tagged with a stream identifier and can be sent interleaved; a stream still generating its response simply contributes no frames for a moment while other streams' frames continue to flow, so a slow response no longer occupies the whole connection the way a slow HTTP/1.1 response did. ^card-9lvg

Stream identifiers are more than routing labels: streams are numbered
so that client-initiated streams use odd numbers and server-initiated
streams use even numbers, letting either side open new streams without
coordinating with the other over which numbers are free.

Why does HTTP/2 assign odd stream identifiers to client-initiated streams and even ones to server-initiated streams, instead of both sides drawing from one shared counter? :: Splitting the numbering space this way lets client and server each open new streams independently, without asking the other side which numbers are already taken — a shared counter would need coordination between the two ends to avoid collisions. ^card-5532

Sharing one connection among many streams raises an obvious risk: a
single greedy stream could consume all the connection's capacity and
starve the rest. HTTP/2 addresses this with **flow control** applied at
two levels — a receiver can advertise how much data it is willing to
accept on one specific stream, and separately how much it is willing to
accept across the whole connection, so both an individual stream and the
connection as a whole stay bounded.

> [!card] mcq
> HTTP/2 flow control operates at which level(s)?
> - [x] Per individual stream and per connection as a whole
> - [ ] Per connection only, with no per-stream limit
> - [ ] Per individual stream only, with no connection-wide limit
> - [ ] Per TCP segment ^card-mqg3

HTTP/2 also lets a client assign each stream a **priority**, signaling
which responses it wants delivered first — for instance, render-blocking
CSS ahead of a background image — so a server with limited bandwidth can
choose what to send next. In practice this priority signaling delivered
much less than intended: clients, servers, and the intermediaries between
them applied it inconsistently or ignored it outright, so a stream's
declared priority frequently had little real effect on delivery order.

> [!card] recall
> HTTP/2 added a stream prioritization scheme so clients could hint which
> responses mattered most. Why did this feature largely underdeliver in
> practice, despite being part of the standard? ^card-1uaq

Multiplexing is also what makes two HTTP/1.1-era workarounds unnecessary.
The six-connections-per-origin convention existed to buy parallelism that
a single HTTP/1.1 connection could not provide; HTTP/2 provides that
parallelism natively, on one connection, so opening several connections
to the same origin no longer helps and mostly wastes the handshake and
congestion-window cost each one carries. Domain sharding existed to get
around that same per-origin connection limit; once one connection already
carries unlimited concurrent streams, splitting resources across
subdomains only adds DNS lookups and redundant connections instead of
parallelism.

Why do the six-connections-per-origin convention and domain sharding both stop making sense once a browser is talking HTTP/2 to a server? :: Both existed to work around HTTP/1.1 allowing only one request in flight per connection, by giving the browser more connections to spread requests across. HTTP/2 removes that limit directly — one connection carries many interleaved streams — so opening extra connections or extra subdomains no longer buys any additional parallelism, only added setup overhead. ^card-7nbs

HTTP/2 also compresses request and response headers (via HPACK) rather
than sending them as repeated plain text, but that compression scheme is
a separate mechanism from framing and multiplexing and is covered on its
own elsewhere.

Multiplexing eliminates head-of-line blocking at the application layer,
but a limit of the same shape still exists one layer down, at the
transport layer, where TCP's in-order delivery can stall every stream on
the connection behind a single lost packet — a separate note covers that
limit and how QUIC addresses it.
