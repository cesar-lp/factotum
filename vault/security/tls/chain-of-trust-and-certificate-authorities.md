---
topic: security
category: security-tls
tags: [pki, certificate-authority, chain-of-trust, trust-store]
citations: ["Ristić, Bulletproof TLS and PKI, Ch. 5"]
---

# Chain of Trust and Certificate Authorities

`certificates-and-x509.md` covers what a single certificate asserts,
and how its Basic Constraints extension marks it as either a CA
certificate or a leaf. This note is about what connects those
certificates into something a relying party can actually decide to
trust — and this note stops at how a chain is *built* and *why the
trust model is shaped the way it is*; the mechanics of checking one
against revocation and hostname state are a separate note's territory.

A certificate never stands alone. A server presents a **leaf**
certificate (also called an end-entity certificate) for its own
identity, which was signed by an **intermediate** CA's certificate,
which was in turn signed by a **root** CA's certificate. The root
signed itself — a self-signed certificate, since there's nothing above
a root to sign it — and it's the root that a relying party has to
already trust before any of this works.

> [!card] mcq
> Why is a root CA's own certificate self-signed rather than signed by
> some other certificate?
> - [x] There is nothing above a root in the hierarchy to sign it — a root's trustworthiness comes from being placed directly in a trust store, not from another certificate vouching for it
> - [ ] Self-signing is a historical artifact with no remaining technical reason
> - [ ] Root certificates are signed by the intermediate CAs beneath them instead
> - [ ] A root's certificate does not need a signature field at all ^card-jr16

Connecting a presented leaf up to a root a relying party already
trusts is **path building**: assembling the sequence of intermediate
certificates that links the leaf to some root, since a server
typically sends the leaf plus its intermediates but not the root
itself. **Path validation** is the separate step of checking that the
assembled chain is actually acceptable — each certificate's signature
verifies against the next one up, constraints like Basic Constraints
and Key Usage are respected at every link, and the chain terminates at
a trusted root.

Why are path building and path validation described as two separate steps rather than one? :: Path building only answers a structural question — can a sequence of certificates be assembled that connects the presented leaf to some root the relying party trusts? Path validation answers a different question afterward — is that assembled sequence actually acceptable, checking each signature and each certificate's constraints along the way? A chain can be successfully built and still fail validation, so collapsing the two into one step would hide which kind of failure occurred. ^card-9j6s

Whether a given root is one "a relying party already trusts" is
decided by a **trust store** — the fixed set of root certificates an
operating system or browser ships and maintains. Nothing in the TLS
protocol itself designates any root as trustworthy; trust is
established entirely outside the protocol, by whichever vendor curates
that particular trust store.

> [!card] mcq
> What actually decides whether a given root CA is trusted when a TLS
> client validates a certificate chain?
> - [x] The trust store maintained by the operating system or browser vendor, external to the TLS protocol itself
> - [ ] A field inside the root certificate marking it as globally trusted
> - [ ] The CA/Browser Forum, which directly configures every client's trust decisions
> - [ ] The TLS handshake, which negotiates trust dynamically with the server at connection time ^card-xm5z

A root's certificate can be signed by more than one other CA at once —
**cross-signing** — so the same key pair ends up certified under
multiple root certificates. This lets a newer or less widely deployed
root be treated as valid by clients that don't yet carry it in their
trust store, as long as those clients trust one of the other roots
that cross-signed it, and it also gives a CA a path to transition away
from an aging root without breaking older clients overnight.

Why would a certificate authority want its root cross-signed by another, already widely-trusted CA? :: Cross-signing lets the same key be certified under more than one root, so clients that don't yet carry the newer root in their trust store can still validate a chain through the other, already-trusted root instead. It extends practical trust to a root before every client's trust store has caught up to it, and gives a CA room to migrate off an aging root gradually. ^card-omgi

Root CAs deliberately keep their signing key ==offline==, disconnected ^card-hs0h
from any network, and use it only rarely — typically just to sign
intermediate certificates in a controlled ceremony. Day-to-day
certificate issuance is delegated to intermediates instead, precisely
because a root compromise is catastrophic: every certificate ever
issued under that root, through every intermediate beneath it, becomes
suspect at once, while losing an intermediate's key only puts that one
intermediate's slice of the hierarchy at risk.

Why does keeping a root CA's key offline and delegating routine issuance to intermediates limit the damage of a key compromise? :: An offline root key is rarely used and much harder for an attacker to reach, and an intermediate's compromise only threatens the certificates issued under that one intermediate. A root key's compromise, by contrast, would threaten every certificate issued through every intermediate beneath it — the entire hierarchy at once — so keeping the root offline and delegating issuance narrows the blast radius of a successful attack. ^card-yz5l

This hierarchy has a structural weakness that no amount of careful
validation logic can fix: any CA sitting in a client's trust store is
equally capable of signing a valid certificate for *any* domain name,
including one it has no relationship with and never should have
certified. A relying party's trust decision isn't really "trust this
one CA I care about" — it's "trust every CA in the store, for every
name," because validation treats a chain from any trusted root as
equally valid regardless of which root it happens to be.

> [!card] recall
> Explain the "weakest link" property of the CA trust model: why does
> adding one poorly-run CA to a trust store weaken security for
> domains that have no relationship with that CA at all?
> ---
> Trust store validation doesn't scope a CA's authority to any
> particular set of domains — any CA in the store can issue a
> seemingly valid certificate for any name at all. A relying party
> isn't trusting only the specific CA a given site actually uses; it's
> trusting every CA in its store equally, for every name. A single
> careless or compromised CA can therefore produce a certificate that
> validates perfectly for a domain it has no legitimate relationship
> with, so the system's overall security is bounded by its weakest
> participating CA, not by the average or the best. ^card-eutj
