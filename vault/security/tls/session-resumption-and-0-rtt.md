---
topic: security
category: security-tls
tags: [tls, session-resumption, session-tickets, 0-rtt, replay-attacks]
citations: ["RFC 8446", "Ristić, Bulletproof TLS and PKI, Ch. 4"]
---

# Session resumption and 0-RTT

A full TLS handshake is not cheap, and it's not cheap in a way that
repeats on every single new connection to the same server. It costs at
least one extra round trip beyond the data the client actually wanted
to send, and it costs real computation: a signature to generate on the
server side, a signature to verify on the client side, on top of the
key-exchange math itself. A browser opening a dozen connections to the
same site, or a client reconnecting minutes after its last session
ended, gains nothing from redoing all of that from scratch — the two
sides already established that they trust each other; resumption exists
to let them skip re-establishing it.

Why does session resumption cost something worth avoiding even when the underlying key exchange itself is fast? :: Because a full handshake's cost isn't only the key-exchange computation — it also includes at least one additional round trip of latency before application data can flow, plus the signature generation and verification tied to authenticating the server (and possibly the client), and repeating all of that on every reconnect adds up even when each individual step is cheap. ^card-s0js

Pre-1.3 TLS offered two distinct resumption mechanisms, and they differ
in *where the state lives*. With session IDs, the server does the
remembering: after a full handshake, it caches the negotiated session's
parameters keyed by an ID it hands the client, and a client presenting
that ID back gets its old session parameters restored server-side.
Session tickets flip that around — the server encrypts the session
state itself under a key only it knows and gives the client that
opaque, encrypted blob to hold. Resumption then means the client
handing that ticket back; the server decrypts it, and if it's valid,
recovers the session state without ever having stored it itself.

> [!card] mcq
> A server wants to support session resumption without keeping any
> per-session cache — no memory or database entry for each active
> session. Which resumption mechanism achieves that?
> - [ ] Session IDs, since the ID itself is small
> - [x] Session tickets, since the session state is encrypted and handed to the client to hold instead of being cached server-side
> - [ ] Neither mechanism can avoid server-side state
> - [ ] Both mechanisms require identical server-side storage ^card-bpcf

What is the essential difference between session-ID resumption and session-ticket resumption in terms of where the resumable session state physically lives? :: With session IDs, the state lives on the server, indexed by an ID the client just echoes back; with session tickets, the state itself travels with the client as an encrypted blob, and the server needs no per-session storage at all — only the key it used to encrypt the ticket. ^card-70ti

TLS 1.3 discards both of these as separate mechanisms and unifies
resumption under a single model: pre-shared keys (PSKs). A session
ticket in 1.3 is really a PSK identity handed to the client; presenting
it back lets both sides derive fresh traffic keys from that shared
secret without a signature-based handshake at all. The session ID and
session ticket split — one mechanism keyed by server state, another by
an opaque client-held blob — disappears, because a PSK-based resumption
covers what both used to do, and does it inside the same key-schedule
machinery 1.3 already uses for its main handshake.

A ticket obviously can't be trusted forever, so it carries a lifetime,
and the server bounds how long a given ticket remains redeemable.
That's the first control. The second, more consequential one, is about
the *key* the ticket is encrypted under rather than the ticket itself.
Because a ticket just holds encrypted session state, anyone who
compromises the encryption key can decrypt every ticket ever issued
under it — past and future, for as long as that key stays in use. And
because tickets exist specifically to let a client skip the signed key
exchange, a stolen ticket-encryption key hands an attacker a shortcut
straight to the resumed session's traffic keys, bypassing whatever
protection that original handshake's ephemeral key exchange was
supposed to provide it. That's why ticket-encryption keys need to be
rotated on a short, deliberate schedule, independent of how long any
individual ticket's stated lifetime is.

What are the two separate controls placed on session tickets in 1.3, and how do they differ in what each one bounds? :: A ticket carries its own lifetime, bounding how long that specific issued ticket may still be redeemed; separately, the key used to encrypt tickets is rotated on its own schedule, bounding how long a single compromised encryption key can expose every ticket ever issued under it, regardless of any individual ticket's stated expiry. ^card-09lo

> [!card] recall
> A server issued a session ticket, and the client resumed the session
> under it weeks ago using an otherwise properly ephemeral, forward-secret
> original handshake. If the server's ticket-encryption key leaks today,
> explain what an attacker who also recorded that resumed session's
> traffic can now do, and why rotating the ticket key regularly is the
> mitigation.
> ---
> The leaked key lets the attacker decrypt the ticket from the recorded
> resumed session and recover the PSK (or cached session state) it
> protected, which in turn lets them derive that session's traffic keys
> and read the recorded traffic — even though the original full
> handshake used ephemeral key exchange. The ticket-encryption key acts
> as a long-lived secret sitting underneath what's supposed to be a
> forward-secret system, so every session ever resumed under that key
> is retroactively exposed once it leaks. Rotating the key frequently
> limits the window of sessions any single leaked key can expose,
> rather than leaving one key covering the server's entire ticket
> history. ^card-xwzq

PSK-based resumption in 1.3 also unlocks something the older mechanisms
never offered: 0-RTT early data. Because the client already holds a PSK
from a prior session, it can send encrypted application data in its
very first flight, before any handshake round trip completes at all —
zero round trips of added latency for that early portion, which is the
entire point for anything latency-sensitive.

What specific latency benefit does 0-RTT early data provide beyond what ordinary PSK-based 1-RTT resumption already saves compared to a full handshake? :: It lets the client send encrypted application data in its very first flight, before any handshake round trip completes at all — eliminating that remaining round trip's worth of latency even on top of what abbreviated PSK resumption already saves over a full signature-based handshake. ^card-4rnn

That speed comes at a real cost, and the cost is about replay, not
confidentiality. Early data is encrypted under a key derived from the
resumed PSK, and an attacker who is simply positioned to capture that
first flight can record it and resend it to the server again later, and
the server has no way, from inside the TLS layer, to tell that
replayed copy apart from a legitimate first attempt — TLS's usual
per-connection freshness guarantees don't extend to data sent before
the handshake finishes establishing them.

> [!card] mcq
> A payments API accepts a "transfer \$100 from account A to account B"
> request as 0-RTT early data. An attacker captures that early data
> flight and replays it to the server later. What does TLS itself do
> about this replay?
> - [ ] TLS rejects the replayed ClientHello automatically
> - [ ] TLS 1.3's PSK binder detects and blocks the duplicate request
> - [x] Nothing — TLS has no way to distinguish the replay from the original request; the application would need to reject it itself
> - [ ] The server's ticket lifetime check catches it ^card-wf1c

Since TLS can't solve this itself, the responsibility for 0-RTT safety
lands entirely on what the early data actually requests. Early data is
only safe to accept when the operation it carries is idempotent —
processing it twice has to leave the system in exactly the same state
as processing it once. A GET-style read, or a request explicitly
designed to be safely repeatable, tolerates replay by simply doing
nothing different the second time; a state-changing action like a
funds transfer or a one-time purchase does not.

Why is "0-RTT early data is only safe for idempotent requests" a statement about the application built on top of TLS rather than about TLS itself? :: Because idempotency describes a property of what a specific request does when processed twice — whether repeating it changes anything — and TLS has no visibility into request semantics at all. TLS can offer or withhold 0-RTT as a transport-level capability, but it cannot know or enforce whether the bytes inside early data represent a safely repeatable operation; that judgment belongs entirely to whatever application logic decides how to handle the request it receives. ^card-vmt1
