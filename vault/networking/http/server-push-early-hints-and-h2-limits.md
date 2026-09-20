---
topic: networking
category: http-protocol
tags: [http2, server-push, early-hints, head-of-line-blocking]
citations: ["RFC 9113 (HTTP/2)", "RFC 8297 (Early Hints)"]
---

# Server push, Early Hints, and what HTTP/2 didn't fix

HTTP/2 multiplexing let a client stop waiting for one request to
finish before sending the next one on the same connection. Server
push tried to go further: rather than wait for the client to ask for
each resource in turn, the server could proactively send a resource it
expected the client would need — a stylesheet or script referenced by
the HTML it was already sending — before any request for it arrived.

That idea ran into a problem the server has no way to solve on its
own: it cannot know what the client already has cached. A browser
that already holds a fresh copy of that stylesheet from a previous
visit gets it pushed again anyway, paying bandwidth and connection
capacity for nothing. The server could try to guess based on what it
thinks clients typically lack, but guessing wrong is common, and
getting it wrong actively hurts rather than merely failing to help.

Why does HTTP/2 server push frequently waste bandwidth rather than simply providing no benefit? :: The server cannot see what the client already has cached, so it may push a resource the client already holds a valid copy of; that push still consumes bandwidth and server-push connection capacity, actively costing more than doing nothing. ^card-my34

Beyond the caching-blindness problem, push was hard to use correctly
in practice: getting real benefit required accurately predicting what
each specific client needed, tuning per-route, and avoiding pushing
things a proxy or intermediary would mishandle. The complexity-to-
payoff ratio was poor enough that major browsers dropped support for
HTTP/2 server push entirely.

==103 Early Hints== is the mechanism that replaced push's proactive ^card-yx9n
delivery with a much smaller commitment: an interim response, sent
before the final response is ready, that lists resources the client
will probably need — via ordinary `Link` headers — so the client can
start fetching them itself while the server is still preparing the
main response. The server still guesses what will be needed, but the
guess only costs a small header list; the client decides whether to
act on it, checking its own cache before fetching anything, which is
exactly the check server push could never make.

> [!card] mcq
> How does 103 Early Hints avoid the core problem that undermined HTTP/2 server push?
> - [x] It tells the client what it might need and lets the client decide whether to fetch it, so the client's own cache check still applies
> - [ ] It pushes the resources directly but only over a separate low-priority stream
> - [ ] It requires the client to advertise its full cache contents to the server first
> - [ ] It compresses the pushed resources so wasted pushes cost less bandwidth ^card-2ad8

A related, unglamorous optimization is ==connection coalescing==: when ^card-m2ne
a client already holds an open, suitable connection to a server (matching
scheme and a certificate valid for the new host), it can reuse that
connection for requests to a different hostname instead of opening a
new one, provided the existing connection's negotiated identity
actually covers that hostname. This cuts the handshake cost of serving
resources split across host names on the same underlying server or
CDN edge, independent of anything push or hints do.

Server push and Early Hints are both about *what* gets sent and when
requests are avoided. Neither touches a much more basic limitation:
HTTP/2 multiplexes many logical streams onto one TCP connection, but
==TCP itself has no concept of streams==. TCP guarantees only one ^card-mbz8
thing about delivery — bytes arrive at the application in the exact
order they were sent — and it enforces that guarantee by holding back
everything after a gap until a retransmission fills it, whatever that
later data belongs to.

The consequence is that one lost TCP segment stalls delivery of
*every* multiplexed HTTP/2 stream on that connection, not just the
stream whose data was in the lost segment, because TCP has no way to
hand the still-arrived bytes of unrelated streams to the application
early — they are simply later in the byte sequence than the gap.

> [!card] mcq
> On a connection with significant packet loss, how can HTTP/2's single
> multiplexed connection compare to HTTP/1.1's convention of six
> independent connections per host?
> - [x] HTTP/2 can perform worse, because a lost segment on the one connection stalls all multiplexed streams, whereas a loss on one of six independent HTTP/1.1 connections only stalls the requests on that one connection
> - [ ] HTTP/2 always performs better, because multiplexing means loss on one stream is fully isolated from the others
> - [ ] They perform identically, since both are built on TCP and inherit the same retransmission behavior per connection
> - [ ] HTTP/2 performs worse only because it disables retransmission to preserve stream ordering ^card-0y2m

> [!card] recall
> Explain, from TCP's in-order delivery guarantee alone, why HTTP/2
> multiplexing many streams onto one connection does not remove
> head-of-line blocking the way it appears to at the HTTP layer.
> ---
> TCP's guarantee is about bytes, not about the HTTP-layer streams
> multiplexed inside them: it will not deliver any byte to the
> application until every byte before it in the sequence has arrived.
> A lost segment creates a gap, and everything sent after that gap —
> regardless of which HTTP/2 stream it belongs to — sits in the TCP
> receive buffer undelivered until retransmission closes the gap. The
> multiplexing exists only above TCP; TCP's delivery order still
> applies to the whole connection as one sequence. ^card-li8b

This transport-level stall is exactly the kind of head-of-line
blocking that a transport built with independent streams as a native
primitive can eliminate — which is the reason HTTP/3 exists on top of
a different transport rather than another revision of HTTP/2's framing.
