---
topic: security
category: security-tls
tags: [x509, certificates, pki, subject-alternative-name]
citations: ["Ristić, Bulletproof TLS and PKI, Ch. 4"]
---

# Certificates and X.509

A public key on its own proves nothing about who it belongs to — anyone
can generate a keypair and claim any name they like. A **certificate**
solves that by binding an identity to a specific public key: it's a
statement of the form "this public key belongs to this subject," made
credible by having someone other than the subject vouch for it.

That's the core framing worth holding onto: a certificate is not a
container or a wrapper around a key, it is a signed statement — the
issuer's signature over the subject's identity and public key, made
with the issuer's own private key. Anyone holding the issuer's public
key can check that the statement hasn't been altered and really came
from that issuer; what they're deciding to trust is the issuer's
judgment about the binding, not the binding itself.

Why does a public key need a certificate at all, rather than a party just publishing "here is my public key" directly? :: A bare claim like that is unverifiable — nothing stops an attacker from publishing a different key under the same claimed name. A certificate turns the claim into a statement signed by a third party (the issuer), so a relying party can check who is vouching for the binding between that identity and that key, rather than trusting an unauthenticated assertion from the subject itself. ^card-vmpb

**X.509** is the standard format that structures this statement into a
defined set of fields:

```
X.509 certificate (simplified)
├── Version
├── Serial Number
├── Signature Algorithm     (used by the issuer to sign)
├── Issuer                  (who is making this statement)
├── Validity
│   ├── Not Before
│   └── Not After
├── Subject                 (who this statement is about)
├── Subject Public Key Info (the key being bound to the subject)
├── Extensions
│   ├── Subject Alternative Name (SAN)
│   ├── Key Usage / Extended Key Usage
│   └── Basic Constraints
└── Issuer's Signature      (over everything above)
```

Most of those fields exist to say something trustworthy about a single
one of them: **Subject Public Key Info**, which holds the actual
public key being certified. Identity, issuer, validity, and the
signature itself are all scaffolding built around getting that one
field believed.

What does the Subject Public Key Info field contain, and why can the rest of a certificate's fields be described as scaffolding around it? :: It contains the actual public key being certified. Every other field — subject identity, issuer, validity window, extensions, the issuer's signature — exists to make a trustworthy, verifiable statement about that one key; none of those other fields would need to exist if there were nothing to make a credible claim about. ^card-pahl

The **issuer** field names the party that produced the signature at
the bottom of the certificate — it identifies who is making the
statement, which is a separate question from whether that party's
statements are worth trusting. That second question is what a chain of
trust answers.

What does the issuer field in a certificate actually assert? :: It names the entity whose private key produced the signature covering the rest of the certificate — who is making the "this key belongs to this subject" statement. It says nothing on its own about whether that issuer is trustworthy; that judgment comes from outside the certificate, via the chain leading back to a trust store. ^card-k1oe

The **subject** field names who the certificate is about, but modern
TLS clients don't rely on it for the check that matters most day to
day: matching the certificate against the hostname a connection was
made to. That matching is done against the **Subject Alternative
Name** (SAN) extension instead — a list of names (DNS names, IP
addresses, and other identifier types) the certificate is valid for.
An older convention checked the Common Name inside the subject field
for this purpose, but that's legacy behavior; current clients ignore
the Common Name for hostname matching and look only at SAN.

> [!card] mcq
> A certificate's subject field has Common Name "example.com", but its
> Subject Alternative Name extension lists only "example.org". Which
> name does a modern TLS client treat as authoritative for matching
> against the hostname it connected to?
> - [x] Only the names listed in the Subject Alternative Name extension
> - [ ] The Common Name, since it's the primary identity field
> - [ ] Both are checked and either match is accepted
> - [ ] Neither — hostname matching does not use certificate fields ^card-xrln

The **validity** section is two timestamps, Not Before and Not After,
marking the window during which the certificate is meant to be
considered current — a field the certificate carries, independent of
whatever a relying party later does with it at connection time.

A certificate's validity window is a stated field, not a guarantee about when it will actually stop being honored — true or false? :: True. Not Before and Not After simply record the interval the issuer signed the certificate as valid for; they're part of what the issuer's signature covers, but how a relying party checks and reacts to that window is a separate concern from the field itself. ^card-ftc6

**Key Usage** and **Extended Key Usage** are extensions that constrain
what the certified key is permitted to be used for — signing, key
encipherment, code signing, and so on — narrowing a key's role instead
of leaving it valid for any cryptographic purpose the holder likes.

> [!card] mcq
> What does a certificate's Key Usage extension do?
> - [x] Restricts the certified public key to specific permitted purposes, such as signing or key encipherment
> - [ ] Records how long the private key has been in use
> - [ ] Lists which applications are allowed to present the certificate
> - [ ] Specifies which hash algorithm was used to compute the certificate's fingerprint ^card-v7vq

A related extension, **Basic Constraints**, marks whether a certificate
is allowed to sign other certificates at all — set to CA:TRUE, it
identifies a certificate authority's own certificate rather than an
end-entity ("leaf") certificate issued to a server or user.

What does the Basic Constraints extension being set to CA:TRUE on a certificate indicate? :: That the certificate belongs to a certificate authority and is permitted to sign other certificates, distinguishing it from an end-entity certificate issued to a server or user, which is not allowed to sign further certificates. ^card-m0mz
