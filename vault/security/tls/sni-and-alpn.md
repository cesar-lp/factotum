---
topic: security
category: security-tls
tags: [tls, sni, alpn, virtual-hosting, encrypted-client-hello]
citations: ["RFC 8446", "Ristić, Bulletproof TLS and PKI, Ch. 4"]
---

# SNI and ALPN

Both of these are TLS extensions carried in the ClientHello (the sibling
note on the handshake covers that message's full contents; here we only
need that it exists and that it's the first thing the client sends). They
solve two unrelated problems — which certificate to present, and which
application protocol to speak — but both do it the same way: settle the
question during the handshake itself, instead of after.

**Server Name Indication exists because of a genuine chicken-and-egg
problem.** A single IP address commonly hosts many unrelated sites — this
is ordinary virtual hosting, the same trick web servers have long used
for plain HTTP. For plain HTTP, the server can pick which site to serve
by reading the `Host` header, because that header arrives already usable.
TLS breaks that trick: the server has to choose *which certificate to
present* before the handshake has produced any way to decrypt anything,
and the one piece of information that would tell it which site the
client wants — the hostname — was, before this extension existed, only
ever carried inside the encrypted request that comes *after* the
certificate is already chosen and sent.

> [!card] recall
> State the chicken-and-egg problem that SNI solves. Why couldn't a TLS
> server, before SNI existed, simply wait and read the hostname the same
> way a plain HTTP server reads the `Host` header?
> ---
> A server fronting several hostnames on one IP must pick which
> certificate to send before the handshake finishes, but which
> certificate is correct depends on which hostname the client wants. That
> hostname is normally only available inside the request itself, and the
> request is carried by the connection the certificate is meant to
> secure — so the server would need to already be past certificate
> selection to learn the one fact it needs to make that selection. ^card-ld6c

The fix is almost embarrassingly direct: the client just says the
hostname earlier, in the clear, as an extension in its ClientHello. ==Server Name Indication== carries the intended hostname before any ^card-wvgc
certificate has been sent, so the server can look it up and hand back the
matching one.

Why does hosting many independent sites on a single IP address force a TLS server to know the client's intended hostname before it can even choose a certificate? :: Because each hostname may have its own certificate, and the server has no other channel to learn which site the client wants — the hostname would otherwise only appear inside the very request that a correctly-chosen certificate is needed to protect. ^card-bzi8

That directness is also the extension's weakness. SNI is not itself
encrypted (some deployments now wrap it under ECH, covered below, but
that isn't the default) — so it travels across the wire the same way it
always did: in the clear, in the client's first message, before any keys
exist to protect it. Anyone watching the connection — an ISP, a
network operator, anyone on the path — can read the hostname straight
out of the ClientHello.

> [!card] mcq
> A client connects over TLS to a server that also hosts several other
> sites on the same IP address. The client sends SNI in its ClientHello.
> What can a passive network observer, who cannot decrypt any TLS
> traffic, still learn from this exchange?
> - [x] Which hostname the client is connecting to
> - [ ] The full URL path the client will request
> - [ ] The contents of any cookies the client will send
> - [ ] Nothing at all — SNI is encrypted along with the rest of the handshake ^card-yp9z

So the practical result is a strange split: TLS hides the content of
your request but, by default, still tells anyone watching *which site*
you visited. ==Encrypted Client Hello== is the current attempt to close ^card-0wiu
that gap — it wraps the ClientHello, SNI included, under its own
encryption negotiated with a separate, published key for the server (or
the network in front of it), rather than leaving it in plaintext.

Why is Encrypted Client Hello described as an in-progress answer to SNI's leak rather than a settled fix? :: Because it depends on infrastructure the client and network must already support and agree on before the handshake starts — a server or middlebox that doesn't support it, or a network path where it's blocked or stripped, falls back to a plaintext SNI, so the leak it closes is closed only where ECH is actually deployed and reachable, not universally. ^card-xiy6

**ALPN answers a completely different question — which application
protocol should run over this connection — but reuses the same trick of
folding the decision into the handshake instead of settling it
afterward.** Before ALPN, a client and server that both spoke more than
one application protocol over the same port had to negotiate that choice
some other way once the connection was already up — for HTTP this meant
the `Upgrade` header dance, a request-response round trip spent purely on
asking "can we switch protocols?" before any real work began.

What did switching application protocols over an already-open connection cost before ALPN existed, using HTTP's own Upgrade mechanism as the example? :: A full extra request-response round trip spent purely on asking to switch protocols, before any real application data could be exchanged. ^card-2am0

Application-Layer Protocol Negotiation removes that cost by having the
client list every protocol it's willing to speak as one more ClientHello
extension, and having the server pick one of them and echo its choice
back in the ServerHello. By the time the handshake finishes, both sides
already know ==which application protocol the connection will carry== — ^card-hx18
there is no separate negotiation step left to run afterward.

> [!card] mcq
> A browser and a server both support two different application
> protocols over the same TCP port. Which mechanism lets them agree on
> one of those protocols as part of the TLS handshake, rather than
> negotiating it afterward at the application layer?
> - [x] ALPN
> - [ ] SNI
> - [ ] The cipher suite list in the ClientHello
> - [ ] Session resumption ^card-m4ez

ALPN doesn't care what the candidate protocols are — HTTP/1.1, HTTP/2,
or anything else a client cares to list — it only carries the client's
offer and the server's pick. That's also its limit: it's a selection
mechanism, not a definition of any protocol it selects.
