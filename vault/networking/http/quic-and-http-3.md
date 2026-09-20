---
topic: networking
category: http-protocol
tags: [quic, http-3, udp, connection-migration, transport]
citations: ["RFC 9000 (QUIC)", "RFC 9114 (HTTP/3)"]
---

# QUIC and HTTP/3

HTTP/2's multiplexing removes head-of-line blocking at the
application layer, but the fix does not reach all the way down: TCP
still delivers bytes in one strict order and has no notion of
separate streams, so a single lost segment still stalls every stream
sharing that connection until it is retransmitted. QUIC is a new
transport built to remove that remaining layer of blocking.

QUIC runs on top of ==UDP== rather than replacing TCP in place. ^card-gk4j

That choice was not about speed or simplicity; it was chosen because
it was the only foundation actually deployable across the real
internet.

TCP's behavior is implemented inside operating system kernels, and
the middleboxes sitting on paths across the internet — firewalls,
NATs, load balancers — have been built and tuned against decades of
that exact behavior. A protocol that tried to ship as "an improved
TCP" would get rewritten, dropped, or mishandled by equipment that
assumes TCP looks a certain way. That fossilization of assumed
behavior is called protocol ==ossification==, and it is what made ^card-1zlb
incrementally evolving TCP itself impractical at internet scale.

What made UDP a workable foundation for a new transport, when a modified TCP was not? :: UDP carries almost no behavior for middleboxes to have ossified around, and because TCP lives in the OS kernel while UDP just carries arbitrary payloads, QUIC's own logic can run entirely in userspace — shipping and evolving with an application's own release cycle instead of waiting on kernel and network-equipment upgrades everywhere. ^card-g0w4

Within a single QUIC connection, data is organized into multiple
streams — but unlike HTTP/2's streams, which are a framing concept
layered on top of one ordered TCP byte stream, a QUIC stream is a
transport-level primitive with its own independent delivery.

How does QUIC avoid the transport-layer head-of-line blocking that persists under HTTP/2 running over TCP? :: QUIC makes streams a transport-level primitive with independent delivery, so a packet loss only stalls the one stream whose data it carried; data for every other stream can still be delivered to and read by the application immediately, unlike a single TCP byte stream where any loss blocks everything queued behind it. ^card-k4su

A QUIC connection is identified by a connection ID that each endpoint
chooses and exchanges, not by the traditional four-tuple of source
and destination IP and port that identifies a TCP connection.

Because identity no longer depends on the network path, a client can
change networks entirely — moving from Wi-Fi to a cellular radio, for
instance — in the middle of a connection, and the same session keeps
running without being torn down and rebuilt. This capability is
called ==connection migration==. ^card-z82s

> [!card] mcq
> A phone switches from Wi-Fi to cellular mid-download, changing its
> IP address and port entirely. What happens to its QUIC connection?
> - [x] It survives, because QUIC identifies the connection by a connection ID rather than by IP and port
> - [ ] It is dropped, since QUIC connections are still tied to the four-tuple exactly like TCP
> - [ ] It survives, but only after the application performs a fresh TLS handshake
> - [ ] It survives only if the client stays on the same subnet ^card-cty2

QUIC does not run its cryptographic handshake as a separate layer
stacked above a transport handshake the way TCP plus TLS does.
Instead, the TLS 1.3 handshake (treated here as a given building
block — its internal steps belong to a separate note) is integrated
directly into QUIC's own connection handshake, so transport
parameters and cryptographic keys are negotiated in the same
exchange rather than one after another.

> [!card] recall
> Explain why integrating the TLS 1.3 handshake into QUIC's own
> connection handshake, instead of running a transport handshake and
> then a cryptographic handshake on top of it in sequence, lets a
> QUIC connection typically become usable in fewer round trips than
> TCP plus TLS 1.3. ^card-xc0k

HTTP/3 is HTTP carried over QUIC rather than over TCP. Its request
and response semantics — methods, status codes, headers as
concepts — are unchanged from earlier HTTP versions; what changes is
the transport underneath, where those semantics are mapped onto
QUIC's own streams instead of TCP's single ordered byte stream.

What does HTTP/3 change relative to earlier HTTP versions, and what does it deliberately leave untouched? :: HTTP/3 leaves HTTP's request-response semantics, methods, and status codes unchanged; what it changes is the transport underneath, mapping those semantics onto QUIC streams instead of a TCP connection, which is where HTTP/3 inherits QUIC's independent per-stream delivery and connection migration. ^card-wj8d
