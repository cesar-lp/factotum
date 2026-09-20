---
topic: security
category: security-crypto
tags: [digital-signatures, rsa-pss, ecdsa, ed25519, non-repudiation]
citations: ["Aumasson, Serious Cryptography, Ch. 10, 12"]
---

# Digital Signatures

A signature and a MAC both let a recipient check that a message
hasn't been tampered with and came from whoever holds the right key.
Given that overlap, it's fair to ask why signatures exist at all
instead of just using a MAC everywhere. The answer comes down to who
can produce the tag and who can be convinced by it afterward.

Why can a digital signature provide non-repudiation while a MAC cannot, even though both let a recipient verify integrity and origin? :: A MAC is built from a key both parties share, so either one of them could have produced any given tag — the recipient can verify it, but can't prove to a third party which side made it. A signature is produced with a private key that only the signer holds; verification uses a separate public key, so anyone can confirm the signature is valid, but only the private key's holder could have produced it. That asymmetry is what lets a third party accept the signature as proof the signer, specifically, produced it. ^card-9jhe

Producing a signature doesn't mean running the signing algorithm over
the entire message. Every practical scheme signs a fixed-size digest
of the message instead, never the message's raw bytes.

> [!card] mcq
> Why does every practical signature scheme sign a hash of the message
> rather than the message itself?
> - [x] Signing is a slow, size-limited operation, so it needs a small, fixed-size input regardless of how long the actual message is
> - [ ] Hashing the message first makes the signature shorter than the message, which is required by definition
> - [ ] Signing algorithms cannot process binary data, only fixed-size digests
> - [ ] It's purely a legacy convention with no remaining technical reason ^card-70wp

Skipping that step isn't a minor inefficiency — it changes what the
scheme can even guarantee. Feeding a multi-megabyte document directly
into RSA's signing operation isn't just slow; RSA (like its use in
encryption) can only operate on inputs up to roughly its modulus size,
so a raw document exceeding that size can't be signed as one unit at
all. Hashing first collapses any message, of any length, down to one
short value the signing operation can always handle, and the digest's
own collision resistance (a property this vault covers separately) is
what makes committing to that short value as good as committing to
the whole document.

Once a message is reduced to a digest, three different families
compete to turn that digest into a signature, and they differ in more
than just which hard problem backs them.

**RSA-PSS** signs the digest using RSA's trapdoor function with
randomized padding — the padding is what makes two signatures over the
same input look different each time even under the same key. **ECDSA**
runs on an elliptic curve and needs a fresh secret value for every
single signature it produces, generated independently each time.
**Ed25519** also runs on an elliptic curve, but derives that
per-signature secret value deterministically from the digest and the
signing key itself, rather than drawing it fresh — so the same message
signed twice under the same key produces the identical output both
times.

> [!card] mcq
> Which of the three schemes below produces a *different* signature
> every time it signs the exact same message under the exact same key?
> - [x] ECDSA, because it draws a fresh secret value independently for every signature
> - [ ] Ed25519, because it derives its per-signature value deterministically from the message
> - [ ] Both ECDSA and Ed25519 behave identically here
> - [ ] Neither — determinism is a universal requirement for elliptic-curve signing ^card-27vt

ECDSA's requirement that this per-signature secret value be generated
fresh each time isn't a loose guideline; it has two hard conditions
attached, and failing either one is catastrophic rather than merely
weakening.

What two conditions must ECDSA's per-signature secret value satisfy for every signature, and what class of failure results if either is dropped? :: It must be unique across every signature made with that key, and unpredictable to anyone else. Reusing the same value across two different messages, or using a value an attacker can guess or bias, both count as violations — and either one moves straight from "somewhat weaker" to "catastrophically broken," not a gradual loss of margin. ^card-cy7j

The reason that failure is catastrophic rather than gradual is
algebraic: two ECDSA signatures produced under the same key with the
same per-signature secret give an attacker two equations sharing that
one unknown value, which can be solved directly to recover it — and
recovering that value from a single reused instance is enough to solve
for the signing key underneath it, using nothing but arithmetic. No
brute force, side channel, or hardware access is required once the
reuse is spotted.

If the same ECDSA per-signature secret value is reused to sign two different messages under the same key, what can an attacker recover? :: The signer's private key itself, computed directly from the two signatures and messages by solving a small system of equations — not just information about that one session's signature. ^card-rwyx

This exact failure is what broke the PlayStation 3's code-signing
scheme: Sony's implementation used the same fixed value for that
per-signature secret on every ECDSA signature it ever produced, instead
of a fresh one each time, and researchers who noticed the pattern
across two signed pieces of software solved for Sony's signing key
directly. From that point on, anyone could sign arbitrary code so the
console would accept it as genuine — the entire platform's code-signing
trust collapsed from one reused value.

> [!card] recall
> Explain, in terms of the underlying algebra, why the PS3 hack was
> able to recover Sony's actual signing key rather than just forge one
> extra signature. What single implementation mistake made this
> possible?
> ---
> Sony's ECDSA implementation reused the same per-signature secret
> value for every signature instead of generating a fresh one each
> time. Two signatures made with the same key and the same reused
> value share one unknown in their signing equations; with two such
> equations in hand, that shared unknown — and from it, the private
> signing key itself — can be solved for directly with basic algebra.
> The mistake wasn't in any single signature; it was using a fixed
> value where the scheme requires a fresh, unpredictable one every
> time. ^card-2ocq

Stepping back, it's worth separating three primitives that get
conflated constantly because all three involve a key and produce
output that "looks cryptographic": encryption, a MAC, and a signature
answer three different questions. Encryption asks "can only the
intended party read this?" A MAC asks "has this been altered, and does
the sender share my key?" A signature asks "can I prove, to anyone,
exactly who produced this?" — only the third one survives being shown
to a party that doesn't hold either secret involved.

> [!card] mcq
> A contract needs to be sent such that a court could later confirm,
> without trusting either party's word, that a specific individual
> agreed to it. Which primitive alone is fit for that job?
> - [x] A signature, because verification uses a public key while production requires a private key only one party holds
> - [ ] A MAC, because it also proves message integrity and origin
> - [ ] Encryption, because it hides the contract from anyone but the intended reader
> - [ ] Any of the three, since all three bind a key to the message ^card-l3hl
