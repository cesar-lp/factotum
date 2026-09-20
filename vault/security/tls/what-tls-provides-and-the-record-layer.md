---
topic: security
category: security-tls
tags: [tls, record-layer, transport-security, rfc-8446]
citations: ["Ristić, Bulletproof TLS and PKI, Ch. 1", "RFC 8446"]
---

# What TLS Provides, and the Record Layer

TLS sits directly on top of TCP and directly below whatever application
protocol is using it — HTTP, SMTP, or anything else that just wants a
byte stream. It doesn't replace TCP's job of reliable, ordered delivery;
it wraps that stream in a protected one, handing the application
back something that still looks like a plain socket to read from and
write to, except every byte crossing it is now protected in transit.

That wrapping buys the connection three properties. Confidentiality: an
eavesdropper on the wire cannot read the data. Integrity: neither the
eavesdropper nor an active attacker can modify data in transit without
detection. Server authentication: the client gets cryptographic
assurance that it's really talking to the server it intended to reach,
not an impostor. Client authentication — the server verifying who the
client is — is available but optional; the vast majority of TLS
connections on the web run with only the server authenticated.

> [!card] mcq
> Which of TLS's core connection properties is optional rather than
> guaranteed by default?
> - [x] Client authentication
> - [ ] Confidentiality
> - [ ] Integrity
> - [ ] Server authentication ^card-gf1h

TLS's own handshake is easy to confuse with TCP's, since both are
called "the handshake" and both happen at connection setup, but they
solve different problems: TCP's three-way exchange only synchronizes
sequence numbers to establish a reliable ordered stream, while TLS's
handshake, running after that stream already exists, negotiates
cryptographic parameters and authenticates the server before any
application data is protected.

Why is it wrong to think of "the TLS handshake" as just another name for the same handshake TCP already performed? :: They run at different layers and establish different things. TCP's three-way handshake only synchronizes initial sequence numbers so both sides can maintain a reliable, ordered byte stream — it has no cryptographic content. TLS's handshake runs on top of that already-established stream, and its job is to negotiate cryptographic parameters and authenticate the server (and optionally the client) before any data is protected. TLS assumes a working TCP connection; it doesn't set one up. ^card-l91c

Below the handshake and the protected data stream sits the **record
layer**, the piece that actually does the protecting. It takes
whatever the layer above hands it — handshake messages or application
data — and breaks it into fixed-size chunks, each capped at a maximum
plaintext size, before anything is encrypted.

What does the record layer do with data handed to it from above, before any encryption happens? :: It fragments that data into records, capped at a maximum plaintext size, which become the unit that everything downstream — encryption, integrity checking, sequencing — operates on. ^card-h543

Fragmentation into records isn't cosmetic bookkeeping. Each record is
protected as its own independent unit: encrypted and integrity-checked
on its own, rather than the connection being treated as one giant blob
that gets encrypted once end to end.

What does it mean that TLS protects a connection "per record" rather than treating the whole byte stream as one unit? :: Each record is individually encrypted and integrity-checked as a separate unit, with its own protection applied at the record layer, rather than the entire connection's data being wrapped once as a single undifferentiated blob. A receiver processes and verifies records one at a time as they arrive. ^card-cn4o

Records never carry their sequence number on the wire. Each side
instead keeps an implicit counter, starting at zero and incrementing
by one for every record sent or received, and that counter is folded
into the per-record protection so a receiver can tell whether a record
arrived out of order, was duplicated, or was dropped and silently
replaced by something else.

Why does TLS include an implicit sequence number in a record's protection instead of just transmitting the number alongside the record? :: An implicit, independently-maintained counter on each side achieves the same ordering check while giving an attacker nothing to tamper with — there's no transmitted field to reorder, strip, or forge a replacement for. If the number were sent in the clear, an attacker could rewrite it directly; folding an implicit value into the protection instead means any attempt to reorder, replay, or drop-and-splice records changes what the receiver's own counter computes, and the record fails its check. ^card-eg11

Sequence numbers are what let a receiver catch record reordering and
replay rather than just corruption: a record that's been captured and
re-sent later, or two records swapped in transit, will each still pass
a plain integrity check on their own content, since neither record's
bytes were altered. Only comparing against the expected sequence value
exposes that something arrived in the wrong place.

> [!card] mcq
> Two TLS records, each individually well-formed and unmodified, are
> swapped in transit by an active attacker. What catches this?
> - [x] The sequence number folded into each record's protection, since the reordered record no longer matches the value the receiver expects next
> - [ ] The record's plaintext size field, since swapped records are usually different lengths
> - [ ] Nothing at the record layer — reordering is only detectable at the application layer
> - [ ] The TLS version field encoded at the start of each record ^card-jsk9

Zoom out from records and sequence numbers and the pattern is the same
everywhere: TLS does not invent encryption, hashing, or signatures — it
composes existing cryptographic primitives (an AEAD cipher, a hash, a
signature scheme) into a specific protocol structure, negotiating which
ones to use and gluing them together correctly. The security of a TLS
connection rests on primitives designed elsewhere; TLS's own
contribution is the framing around them.

What is the difference between saying TLS "provides confidentiality and integrity" and saying TLS "composes primitives that provide confidentiality and integrity"? :: TLS does not implement its own novel encryption or hashing — it negotiates and assembles existing, independently-designed cryptographic primitives (a cipher, a hash, a signature scheme) into a protocol structure: the handshake to agree on and authenticate them, the record layer to apply them per unit of data. The properties an application observes come from those underlying primitives being used correctly; TLS's own contribution is the negotiation and framing around them, not the primitives themselves. ^card-1z4a
