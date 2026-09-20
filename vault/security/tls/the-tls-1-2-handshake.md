---
topic: security
category: security-tls
tags: [tls, tls-1-2, handshake, key-exchange, forward-secrecy]
citations: ["RFC 8446", "Ristić, Bulletproof TLS and PKI, Ch. 4"]
---

# The TLS 1.2 handshake

Before a single byte of application data moves, TLS 1.2 runs a full
round trip of negotiation whose job is threefold: agree on a cipher
suite, let the client authenticate the server, and derive a shared
secret neither of them had before the connection started. The messages
below are the handshake protocol's own content type, distinct from the
record layer that will later carry encrypted application data.

```
Client                                               Server
  ClientHello                  -------->
                                <--------      ServerHello
                                                Certificate
                                        ServerKeyExchange*
                                          ServerHelloDone
  ClientKeyExchange
  ChangeCipherSpec
  Finished                      -------->
                                <--------      ChangeCipherSpec
                                                     Finished
  Application Data              <------->      Application Data

  * only sent for DHE/ECDHE cipher suites
```

**ClientHello** opens the connection: the client's highest supported
version, a random value, and a list of cipher suites it's willing to
use. **ServerHello** answers with the version and cipher suite the
server picked from that list, plus a random value of its own. Both
randoms feed into the key derivation later, alongside whichever secret
the key-exchange step produces — their job is to make that derivation
depend on values freshly chosen for this connection, not just on
whatever long-term secret gets contributed.

Why do both ClientHello and ServerHello contribute a random value that feeds into the derived keys, rather than the derivation depending only on the key-exchange secret? :: Because the key-exchange secret alone could, for RSA key transport, be replayed or reused across attempts if nothing else varied the derivation. Mixing in a random chosen fresh by each side ties the resulting keys to this specific handshake instance, so two handshakes never derive the same keys even if a client reused a premaster secret. ^card-z00p

Right after ServerHello, the server sends its **Certificate** message —
its certificate chain, handed over so the client has something to
authenticate against. What the client does with that chain to decide
whether to trust it is a separate concern; here it's simply the
message that carries the chain across.

## Two ways to establish the shared secret

TLS 1.2 offers two structurally different paths from "nobody has a
shared secret yet" to "both sides derive the same master secret," and
the choice is made by which cipher suite ServerHello picked.

**RSA key transport** puts all the work on the client. The client
generates a 48-byte premaster secret itself, encrypts it under the
public key published in the server's certificate, and sends the
result as the ClientKeyExchange message. Only whoever holds the
matching private key can recover that value, so the server decrypts it
to obtain the same premaster secret. No ServerKeyExchange message
appears at all in this path — there's nothing for the server to
contribute beyond the key it already published.

**DHE/ECDHE**, by contrast, has both sides contribute. The server
sends a ServerKeyExchange message carrying its ephemeral key-exchange
parameters, and — because those parameters are freshly generated for
this connection and otherwise carry no proof of who sent them — signs
them with its long-term private key. The client's ClientKeyExchange
then carries the client's own ephemeral contribution. Each side
combines its own ephemeral value with the other's to land on a shared
premaster secret that neither side transmitted directly.

Why does RSA key transport need no ServerKeyExchange message at all, while every DHE/ECDHE suite requires one? :: ServerKeyExchange exists to carry a fresh, connection-specific contribution from the server toward the shared secret. Under RSA key transport the server contributes nothing beyond the public key it already published in its certificate — the client alone generates the secret and sends it, encrypted, in ClientKeyExchange — so there's nothing left for a ServerKeyExchange message to carry. ^card-f5qe

Why must the server sign the ephemeral parameters it sends in ServerKeyExchange, when RSA key transport needs no equivalent signature on anything the server sends? :: An unsigned ephemeral value carries no proof of origin, so an attacker sitting between client and server could substitute their own ephemeral parameters and complete a key exchange with each side separately. The signature binds those freshly generated, otherwise-anonymous parameters to the server's long-term identity. RSA key transport doesn't need this because the client already encrypts directly to the identity-bound public key from the certificate — there's no freestanding ephemeral value in that path for an attacker to swap in. ^card-5of7

> [!card] mcq
> A cipher suite negotiated in ServerHello uses ECDHE. Which message
> carries the server's ephemeral key-exchange contribution?
> - [ ] Certificate
> - [x] ServerKeyExchange
> - [ ] ServerHello itself
> - [ ] ChangeCipherSpec ^card-9qbg

Once both sides have a shared premaster secret, by whichever path,
each independently derives the same master secret and the working
keys from it. Nothing about that derivation step differs between the
two paths — the divergence is entirely in how the premaster secret
came to be shared.

**ChangeCipherSpec** is not itself a handshake message — it belongs to
its own tiny protocol — but it marks the moment each side switches
from sending records in the clear to sending them protected under the
==newly negotiated session keys==. Everything a side sends after its own ^card-gb3y
ChangeCipherSpec, including that side's Finished message, is
encrypted.

**Finished** is the last message either side sends before application
data, and it is a MAC over a hash of every handshake message
exchanged so far, in order — ClientHello through whatever preceded
this Finished. That transcript coverage is the point: if an attacker
tampered with any earlier plaintext message (the offered cipher suite
list, a parameter in ServerKeyExchange, anything), the transcript hash
the peer computes will no longer match the hash the sender protected,
and the connection is aborted before any application data flows.
Verifying Finished is what turns "we exchanged some messages" into
"we exchanged exactly these messages, unmodified."

> [!card] recall
> A network attacker can intercept and modify the plaintext handshake
> messages in TLS 1.2 (ClientHello, ServerHello, ServerKeyExchange,
> and so on) before either side has derived any keys. Explain why the
> Finished message still lets both sides detect that tampering
> occurred, even though the tampering happened before any encryption
> was in place.
> ---
> Finished carries a MAC computed over a hash of the entire handshake
> transcript as each side actually saw it, and it is only sent after
> both sides have derived the session keys. If the attacker altered
> any earlier message, the two sides' views of the transcript diverge,
> so their independently computed transcript hashes diverge too. The
> receiver recomputes the expected hash from its own record of the
> handshake and compares it against the value inside the peer's
> Finished message; a mismatch means some earlier message was changed
> in transit, and the connection is torn down rather than proceeding
> to application data. ^card-r5pw

Counting message flights, a full TLS 1.2 handshake takes two round
trips before application data can be sent: one round trip for
ClientHello/ServerHello-through-ServerHelloDone, and a second for
ClientKeyExchange-through-Finished on both sides. Only after that
second round trip completes can either side send application data.

How many round trips does a full TLS 1.2 handshake require before either side can send application data? :: Two — one for the ClientHello/ServerHello exchange (through ServerHelloDone), and one for the ClientKeyExchange/ChangeCipherSpec/Finished exchange on both sides. ^card-ay9j

## Why RSA key transport costs you forward secrecy

Here is the consequence the whole path comparison has been building
toward. In RSA key transport, the premaster secret's only protection,
from the moment it's encrypted until the moment it's used, is the
server's long-term RSA private key. Every session that ever used that
cipher suite with that certificate encrypted its premaster secret
under the exact same public key.

That means if the server's private key is ever compromised — stolen,
subpoenaed, factored, however — an attacker holding recordings of past
traffic can decrypt every one of those recorded premaster secrets
retroactively, derive the resulting session keys, and read every past
session that used RSA key transport with that key. The compromise
doesn't have to happen during the session; it can happen years later
and still unlock everything recorded up to that point.

DHE/ECDHE doesn't have this failure mode, because the value each side
contributes to the shared secret is generated fresh per connection and
never has to be transmitted in a form the long-term private key
protects. Losing the server's long-term signing key later tells an
attacker nothing about ephemeral values that were never encrypted
under it in the first place.

Why does recovering a server's long-term RSA private key at some point in the future let an attacker decrypt recordings of every past session that used RSA key transport with that key — and not merely future sessions from that point on? :: Because in RSA key transport the premaster secret for every such session was encrypted directly under that one long-term public key, and nothing else protected it. The private key is the only thing standing between a recorded, encrypted premaster secret and the session keys derived from it, so possessing that key at any later time — not just at the time of the session — is sufficient to unlock recordings made arbitrarily long before. ^card-axsz
