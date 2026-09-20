---
topic: security
category: security-tls
tags: [tls, cipher-suites, version-negotiation, downgrade-attacks, tls-1.3]
citations: ["RFC 8446", "Ristić, Bulletproof TLS and PKI, Ch. 4"]
---

# Cipher suites and version negotiation

A cipher suite name is not one choice; it's a bundle of four, and up
through TLS 1.2 all four are named explicitly. Take
`TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256` apart:

```
TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
    |      |    |         |
    |      |    |         +-- MAC/PRF: SHA-256 drives the handshake's
    |      |    |             pseudorandom function and, pre-AEAD,
    |      |    |             would also drive a separate MAC
    |      |    +-- bulk cipher: AES-128 in GCM mode
    |      +-- authentication: RSA signs the key exchange
    +-- key exchange: ephemeral elliptic-curve Diffie-Hellman
```

Each slot answers a separate question. Key exchange decides how the two
sides agree on a shared secret. Authentication decides how the party
offering that key exchange proves it's really the server the client
thinks it's talking to (typically by signing part of the exchange with
its certificate's key). The bulk cipher is what actually protects
application data once the handshake is done. The fourth slot names the
hash feeding the handshake's PRF and, in pre-AEAD suites, a separate
MAC construction alongside the cipher.

That's four independently swappable parts, which is also four places a
weak or broken choice can hide. A client and server can each support a
long list of suites and still end up negotiating one where the bulk
cipher is fine but the key exchange is static RSA with no forward
secrecy, or one where the MAC construction has known weaknesses in its
padding handling.

Which single field in `TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256` determines whether the session has forward secrecy, and why? :: The key-exchange field, `ECDHE` — it names ephemeral elliptic-curve Diffie-Hellman, so a fresh key pair is generated per handshake and the shared secret can't be reconstructed later even if the server's long-term signing key leaks. A suite naming static `RSA` key exchange instead would tie the shared secret directly to that long-term key. ^card-0ztf

> [!card] mcq
> In a pre-1.3 cipher suite name, what does the authentication component (the `RSA` in `ECDHE_RSA`) actually certify?
> - [ ] That the bulk cipher is being used correctly
> - [x] That the party performing the key exchange holds the private key matching its certificate
> - [ ] That the two endpoints support the same TLS version
> - [ ] That the MAC algorithm has not been tampered with ^card-ousl

TLS 1.3 collapses this four-part naming almost entirely. Key exchange is
no longer named in the suite at all: 1.3 permits only (EC)DHE-family
exchanges, so every 1.3 handshake gets forward secrecy by construction
rather than by the suite you happened to pick. Authentication moves out
of the suite too, negotiated separately via a signature-algorithms
extension. What's left in a 1.3 "cipher suite" is just the bulk
algorithm and the hash for its key schedule — for example
`TLS_AES_128_GCM_SHA256` names an AEAD cipher and a hash, nothing more.

A ==1.3 cipher suite== field never names a signature or key-exchange algorithm — go look at `TLS_AES_128_GCM_SHA256` and there's nothing there but a bulk algorithm and a hash. ^card-zyis

The more consequential restriction is what 1.3 refuses to name at all
in that shortened suite: every option is an AEAD construction. There is
no CBC-mode suite, no RC4 stream cipher, no bare-MAC-with-block-cipher
combination on the list — a 1.3 endpoint simply cannot negotiate
anything else, full stop.

Why does restricting TLS 1.3's cipher suite list to AEAD-only constructions close off a whole category of past TLS vulnerabilities, rather than just one bug? :: Because most of the serious record-layer flaws in earlier TLS versions — padding-oracle attacks against CBC mode, MAC-then-encrypt ordering mistakes, weaknesses in RC4's keystream — were properties of the specific construction a suite named, not of TLS's design in the abstract. Removing every non-AEAD option removes the entire family of constructions those flaws lived in, rather than patching them one at a time. ^card-svqi

Version negotiation is a separate, older problem, and it's fragile for
a reason that has nothing to do with cryptography. Historically, a
client advertised the highest version it supported directly in the
ClientHello's version field, and a server picked the best version both
sides could do. That worked fine against compliant servers — but many
middleboxes and older server stacks turned out to be *version
intolerant*: instead of ignoring a version number they didn't
recognize, they dropped the connection outright. Every time a new TLS
version shipped, some fraction of the internet's middleboxes would
choke on seeing it in that field, regardless of whether the endpoint
behind them actually supported it.

The workaround, and the reason TLS 1.3 handles version selection the
way it does, is the `supported_versions` extension. A 1.3-capable
ClientHello sets its legacy version field to a frozen, familiar-looking
value (TLS 1.2) that intolerant middleboxes won't choke on, and lists
its real range of supported versions inside this extension instead,
where older implementations simply don't look.

Why does TLS 1.3 negotiate the protocol version through the `supported_versions` extension instead of raising the value in the ClientHello's legacy version field? :: Because some deployed middleboxes are version-intolerant: they abort the connection outright on seeing an unrecognized version number in that field rather than ignoring it. Freezing that field at a familiar value and moving the real version list into an extension lets 1.3-capable clients advertise their range somewhere those middleboxes never inspect. ^card-lqr4

That same fragility — a value visible to (and interpretable by) an
on-path attacker — is what makes downgrade attacks possible. An
attacker who can tamper with a ClientHello or ServerHello in transit
can strip out the higher-version options or the `supported_versions`
extension, forcing both sides down to an older, weaker version they'd
never have chosen on their own.

TLS 1.3's defense against that is a signal embedded somewhere the
attacker cannot edit without breaking the connection's own integrity
checks: specific, reserved sentinel values placed in the last 8 bytes
of the ServerRandom field. If a TLS 1.3-capable server ends up
negotiating TLS 1.2 (or lower) because of what looks like version
intolerance or interference, it sets those last 8 bytes to one fixed
sentinel; a different fixed sentinel signals a forced-down negotiation
to 1.1 or below. A client capable of 1.3 that later sees the
"downgraded" random value can detect that a downgrade happened and
abort, even though the visible version field itself was successfully
tampered with.

> [!card] recall
> A network attacker strips the `supported_versions` extension from a
> ClientHello, forcing negotiation down to TLS 1.2. Why can't the
> attacker also hide the fact that a downgrade happened from a
> 1.3-capable client?
> ---
> Because the server embeds a fixed sentinel value in the last 8 bytes
> of the ServerRandom whenever it negotiates a lower version than it's
> actually capable of. The client can independently check that field:
> a 1.3-capable server that ends up on 1.2 will have marked its
> ServerRandom accordingly, so the client detects the mismatch and
> aborts, even though the attacker successfully manipulated the
> version field itself. ^card-0662

Put the two halves of this note together and they say the same thing
from opposite directions. Every algorithm slot a protocol keeps
negotiable — a key exchange, a cipher, a version — is a slot an
on-path attacker gets to try to steer, not just a slot an honest client
gets to optimize. Cipher suite agility across TLS 1.2's history meant
weak suites stayed reachable for years after better ones existed.
Version agility meant an active attacker could aim two willing,
fully-patched endpoints at the oldest protocol either one still spoke.
Algorithm agility is never free: it is always, simultaneously, an
option a legitimate peer can pick and an option an adversary can try to
force.

What is the common failure mode shared by weak-cipher-suite negotiation and version-downgrade attacks, despite operating on completely different fields of the handshake? :: Both exploit the fact that a protocol which still permits an older or weaker option leaves that option available not just to a compliant peer choosing conservatively, but to an active attacker who can manipulate the negotiation to force it — the mere presence of the option in the negotiable set is the vulnerability, independent of whether either honest endpoint would ever have chosen it itself. ^card-u7hv
