---
topic: security
category: security-tls
tags: [tls, tls-1-3, handshake, forward-secrecy, protocol-design]
citations: ["RFC 8446", "Ristić, Bulletproof TLS and PKI, Ch. 4"]
---

# The TLS 1.3 handshake

`the-tls-1-2-handshake.md` ends on RSA key transport's forward-secrecy
failure. TLS 1.3 is, in large part, a protocol redesigned around that
one failure and a handful of others like it — it removes the paths
that could go wrong instead of just recommending against them. Before
getting to what's gone, here's what a full 1.3 handshake looks like
when it succeeds on the first try.

```
Client                                            Server

ClientHello
+ key_share            -------->
                                              ServerHello
                                              + key_share
                                    {EncryptedExtensions}
                                          {Certificate*}
                                    {CertificateVerify*}
                                              {Finished}
                        <--------
{Finished}              -------->
[Application Data]      <------->      [Application Data]

  {} = encrypted under handshake traffic keys
  [] = encrypted under application traffic keys
  * = CertificateRequest may also appear here for client auth
```

**The client guesses.** Rather than waiting to learn which group the
server wants, the ClientHello carries a key_share: the client picks
one or more groups it expects the server to accept and computes an
ephemeral key-exchange value for each, up front, in the very first
message. If the server is willing to use one of the groups the client
guessed, it replies with its own key_share for that same group in
ServerHello, and both sides can immediately derive handshake traffic
keys — no second flight needed just to exchange key material.

Why does putting a computed key_share directly into ClientHello let TLS 1.3 finish key agreement in a single round trip, when TLS 1.2 needed a full round trip just to exchange ServerKeyExchange and ClientKeyExchange? :: Because the client no longer waits to find out which group or parameters the server prefers before contributing its half of the exchange — it commits to a guess and sends its ephemeral value in the same flight as ClientHello. If the guess matches something the server accepts, the server's ServerHello reply already carries everything both sides need to derive a shared secret, collapsing what used to be two separate exchange messages into one guessed contribution plus one confirming reply. ^card-kith

The guess doesn't always land. If none of the groups in the client's
key_share match anything the server is willing to use, the server
can't complete ServerHello from what it has, so it sends a
**HelloRetryRequest** instead, naming a group it does support. The
client responds with a second ClientHello carrying a fresh key_share
for that group, and the handshake proceeds from there.

> [!card] mcq
> A client's ClientHello offers key shares for groups A and B. The
> server only supports group C. What does the server send back?
> - [ ] ServerHello with an empty key_share, deferring the choice
> - [ ] Alert and immediate connection termination
> - [x] HelloRetryRequest naming group C
> - [ ] ServerHello with a key_share for group A, ignoring the mismatch ^card-qnu0

A wrong guess costs an extra round trip — HelloRetryRequest plus a
second ClientHello — before the handshake can proceed to ServerHello.
That's the one case where a full 1.3 handshake isn't 1-RTT.

Once ServerHello carries a matching key_share, both sides derive
handshake traffic keys immediately, and that changes what the rest of
the handshake looks like compared to 1.2. The server's very next
message, **EncryptedExtensions**, is already protected under those
keys — it's the first encrypted message either side sends. Everything
the server sends after it — its certificate chain, a signature over
the transcript, and its Finished — is encrypted too, not just
Finished the way 1.2 protected only the last message of each flight.

Which TLS 1.3 handshake message is the first one sent under the newly derived handshake traffic keys, immediately after the key-share exchange completes? :: EncryptedExtensions — sent by the server right after ServerHello, before its certificate or Finished, and everything the server sends from that point through the end of its handshake flight is encrypted under those same keys. ^card-ja2e

That single design choice — deriving traffic keys from the very first
key exchange instead of at the end of the handshake — is why so much
more of a 1.3 handshake is confidential than a 1.2 one: a passive
observer who could read a 1.2 server's certificate chain in the clear
cannot read a 1.3 server's certificate chain at all. (A server may
also send a CertificateRequest here to ask the client for its own
certificate — the client-authentication story that builds on top of
that message belongs elsewhere.)

## What 1.3 removed, and why removal was the fix

Every prior TLS version added optionality: more cipher suites, more
key-exchange mechanisms, more negotiable behavior. TLS 1.3's authors
concluded that the optionality itself was the vulnerability — a
correctly implemented endpoint could still be attacked by being talked
down into an insecure choice that the protocol had never needed to
offer in the first place. So 1.3 doesn't just deprecate its weak
options; it deletes them from the protocol outright.

**RSA key transport is gone.** `the-tls-1-2-handshake.md` covers why:
the premaster secret's only protection was the server's long-term
private key, so compromising that key later decrypts every past
session that used it. TLS 1.3 has exactly one family of key-exchange
mechanisms — ephemeral (EC)DHE via key_share — so there is no RSA
key-transport option left for an implementation to misconfigure or
fall back to.

**Static (non-ephemeral) Diffie-Hellman is gone too.** A static DH
cipher suite reused the same server-side DH keypair, published
alongside the certificate, across every connection — structurally the
same mistake as RSA key transport, just wearing a DH exchange instead
of an RSA encryption. Requiring every key_share to be freshly
generated per connection closes that door along with RSA's.

Why did removing static (non-ephemeral) Diffie-Hellman close the same forward-secrecy gap as removing RSA key transport, even though static DH is a Diffie-Hellman exchange rather than an RSA encryption? :: Because the weakness was never specific to RSA — it was reusing the same long-term secret across many connections' key agreements. Static DH suites reused a fixed server-side DH keypair for every connection exactly the way RSA key transport reused a fixed RSA keypair, so recovering that long-term keypair later still unlocks every past session that used it. Requiring key_share to be freshly generated per handshake removes that reuse regardless of which algorithm family it would have applied to. ^card-p457

**Renegotiation is gone.** TLS 1.2 allowed either side to trigger a
fresh handshake mid-connection to change parameters, and an attacker
could splice attacker-controlled application data in front of a
renegotiated, now-authenticated connection, tricking the application
into treating it as if it came from the authenticated peer. 1.3 has no
in-band renegotiation message at all — a connection that needs new
keys or new parameters starts over instead.

What made TLS 1.2's in-band renegotiation exploitable by an attacker who controlled no keys at all, and how does removing renegotiation as a protocol feature close that off? :: An attacker could open a connection, inject their own data, and then splice in a client's renegotiation onto that same connection; the application saw the post-renegotiation, now-authenticated identity and mistakenly attributed the attacker's earlier injected data to that authenticated peer. Because the flaw lived in the ability to switch a connection's security context mid-stream and reattribute what came before, removing the ability to renegotiate at all — rather than patching how it bound old and new contexts together — removes the seam the attack depended on. ^card-oqav

**Compression is gone.** Compressing plaintext before encrypting it
let an attacker who could inject chosen bytes alongside a secret (say,
a cookie) watch the compressed length shrink whenever their guessed
byte matched part of the secret, leaking it a byte at a time — the
class of attack demonstrated as CRIME. Removing compression from the
protocol removes that side channel entirely, rather than leaving
implementations to disable it correctly on their own.

> [!card] recall
> Explain why compressing plaintext before encryption created a side
> channel that let an attacker recover secret bytes they couldn't
> otherwise read, and why removing compression from the protocol (as
> TLS 1.3 does) closes that channel more reliably than telling
> implementers to disable it.
> ---
> Compression makes the size of the ciphertext depend on redundancy in
> the plaintext. If an attacker can inject bytes of their own choosing
> next to an unknown secret and observe the resulting compressed
> length, a guessed byte that matches part of the secret creates
> extra redundancy the compressor squeezes out, shrinking the output
> just enough to detect a hit — letting the secret be recovered one
> byte at a time by trying every possibility. Making compression an
> optional, implementation-level setting left it exposed everywhere
> that setting was left on by default; deleting the mechanism from the
> protocol means there's no setting left to get wrong. ^card-c1cz

**Every non-AEAD cipher is gone.** 1.3 permits only AEAD algorithms,
which is a removal rather than a naming detail: cipher suites built
around separate encryption and MAC steps admitted attacks against how
those steps combined (padding oracles and MAC-timing issues among
them), and an AEAD construction removes that whole category by
binding confidentiality and integrity into one operation the protocol
can't get wrong in the same way.

Why does restricting TLS 1.3 to AEAD-only ciphers remove a whole category of past attacks, rather than just fixing the specific flaws found in older combined encrypt-and-MAC constructions? :: Those older flaws came from having two separate steps — encrypt, then authenticate, or the reverse — whose interaction an implementation had to get exactly right, and repeated real-world breaks showed that boundary was hard to implement safely no matter which order was chosen. An AEAD algorithm folds both jobs into a single operation, so there is no separate combining step left for an implementation to get wrong; the flaw class disappears along with the construction that made it possible, rather than being patched instance by instance. ^card-kmu7

Across every one of these removals, the pattern is the same: 1.3
doesn't add a safer default next to the old option, it takes the old
option away, on the theory that an option nobody should choose is a
liability even when the safe default sits right next to it.

Why does TLS 1.3 delete mechanisms like RSA key transport and compression outright, rather than simply defaulting to safer alternatives while still permitting the old ones for compatibility? :: Because leaving the insecure option reachable at all reintroduces the risk — an endpoint can still be downgraded, misconfigured, or attacked into using it regardless of what the default is. The protocol's authors treated that reachability itself as the vulnerability, so 1.3's design thesis is to shrink the protocol's own set of choices rather than to curate which choice is recommended. ^card-wm3n

(TLS 1.3 also adds a 0-RTT early-data mode built on resumed sessions;
that mechanism, and session resumption generally, is its own note.)
