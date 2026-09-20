---
topic: security
category: security-crypto
tags: [aead, authenticated-encryption, aes-gcm, chacha20-poly1305, nonce-reuse]
citations: ["Aumasson, Serious Cryptography, Ch. 8"]
---

# Authenticated Encryption and AEAD

The previous note's closing point is the gap this one fills: a block
cipher mode like CBC or CTR protects confidentiality but gives no
integrity at all, and ciphertexts under either mode are malleable — an
attacker without the key can flip bits and change the corresponding
plaintext in a predictable way. **AEAD** (Authenticated Encryption
with Associated Data) closes that gap by bundling encryption with an
authenticity check in one construction: encryption produces a
ciphertext plus an authentication tag, and decryption verifies that
tag before releasing any plaintext at all, so a tampered or forged
ciphertext is rejected outright instead of silently decrypting into
attacker-influenced data.

The previous note showed that encryption alone (in modes like CBC or CTR) provides no integrity — ciphertexts are malleable. What does AEAD add on top of encryption to close that gap? :: AEAD bundles encryption with an authenticity check in a single construction, producing a ciphertext plus an authentication tag. Decryption verifies the tag first and only releases plaintext if it matches, so a tampered or forged ciphertext is rejected outright rather than silently decrypting into attacker-influenced data. ^card-d4o8

AEAD schemes take a third input beyond the key and the plaintext:
**associated data**, which is covered by the authenticity check but
never encrypted — it travels alongside the ciphertext unchanged, yet
any tampering with it still makes tag verification fail. A packet
header, sequence number, or protocol version field is a natural fit: a
receiver has to be able to read that field before it can even decide
how to process the rest of the message, so it can't be encrypted, but
the sender still wants a guarantee that nobody altered it in transit.

What is "associated data" in an AEAD scheme, and why would a protocol want to authenticate a field that it deliberately leaves unencrypted? :: Associated data is input the AEAD scheme covers with the authenticity check but never encrypts — it's folded into the tag computation but transmitted as plain data. It's used for fields a receiver must read before or without decrypting, like a header or sequence number, while still detecting whether that field was altered in transit. ^card-kqeg

**AES-GCM** is the most widely deployed AEAD construction. It pairs
AES, run in a counter-style mode for encryption, with a separate
authentication step (built on a polynomial-based universal hash) that
covers both the ciphertext and the associated data to produce the
tag. **ChaCha20-Poly1305** is the leading alternative: it pairs the
ChaCha20 stream cipher with the Poly1305 authenticator, and its main
practical advantage is that it runs fast in ==software== without ^card-gfme
needing dedicated AES hardware instructions, which matters on
lower-end mobile and embedded processors where AES-GCM performs
noticeably worse without that hardware support.

> [!card] mcq
> Which pairing correctly describes the two leading AEAD
> constructions in wide use today?
> - [x] AES-GCM pairs AES (in a counter-style mode) with a universal-hash-based authentication step; ChaCha20-Poly1305 pairs the ChaCha20 stream cipher with the Poly1305 authenticator
> - [ ] Both constructions are built entirely from AES, differing only in key length
> - [ ] AES-GCM adds authentication by encrypting the message twice under two different keys
> - [ ] ChaCha20-Poly1305 requires dedicated AES hardware instructions to run efficiently ^card-9mvl

Reusing a nonce is dangerous in every mode discussed so far, but
reusing a nonce under AES-GCM specifically is far more dangerous than
reusing an IV under a chaining mode like CBC. A reused CBC IV leaks a
bounded amount of information: the relationship between the first
blocks of the two colliding messages, and nothing beyond those two
ciphertexts. GCM's authentication tag depends on an internal hash key,
derived once from the encryption key by encrypting a fixed block; two
ciphertexts produced under a reused nonce give an attacker enough
algebraic information to recover that internal hash key outright. Once
it's recovered, the attacker can forge a valid authentication tag for
*any* ciphertext of their choosing under that encryption key, going
forward indefinitely — a total, ongoing break of integrity, not a
one-time leak confined to the two colliding messages.

> [!card] recall
> Why is nonce reuse under AES-GCM considered catastrophically worse
> than IV reuse under a chaining mode like CBC, rather than just
> "another instance of the same mistake"?
> ---
> A reused CBC IV leaks a bounded amount of information — the
> relationship (shared-prefix pattern) between the two colliding
> messages, and nothing beyond those two ciphertexts. GCM's
> authentication tag depends on an internal hash key derived once from
> the encryption key; two ciphertexts produced under a reused nonce
> give an attacker enough algebraic information to recover that hash
> key directly. Once recovered, the attacker can forge valid
> authentication tags for arbitrary future ciphertexts under that key —
> a total, ongoing break of integrity, not a one-time leak limited to
> the colliding messages. ^card-m1fa

In GCM, does an attacker need many messages encrypted under the same reused nonce to recover that internal hash key, or is a single collision enough? :: A single collision is enough — comparing just one pair of ciphertext-and-tag values produced under the same key and the same reused nonce already gives the attacker enough algebraic information to solve for the internal hash key. ^card-6s4b

A well-designed AEAD decryption routine never hands back a
decrypted-but-unverified plaintext alongside a "the tag didn't match"
warning — it returns either the verified plaintext or an outright
error, and nothing in between.

Why does a well-designed AEAD decryption API return either the verified plaintext or an error, rather than the decrypted bytes plus a separate "tag invalid" flag the caller is expected to check? :: Handing back unauthenticated plaintext creates a real chance it gets used before any caller checks the flag, which defeats the entire purpose of authenticating it. AEAD implementations verify the tag first and release plaintext only if it matches, collapsing "decrypt" and "check integrity" into one atomic, fail-closed operation with no unverified data ever exposed. ^card-6kzj

Before AEAD constructions were standardized, a system that needed both
confidentiality and integrity had to compose an encryption scheme and
a MAC by hand, and there are three generic ways to order that
composition: encrypt the plaintext and then MAC the resulting
ciphertext; MAC the plaintext and then encrypt the plaintext together
with that MAC; or compute the MAC and the encryption independently
over the plaintext and send both. Of the three, only the first order
has been proven secure in general, for any secure cipher paired with
any secure MAC — the other two orders have real historical failure
cases where an otherwise-reasonable cipher-and-MAC pairing turned out
to be exploitable. AEAD sidesteps the whole question: encryption and
authentication are built together as one primitive, so there's no
generic-composition choice left for an implementer to get wrong.

> [!card] mcq
> A designer needs to combine an existing cipher and an existing MAC
> by hand (rather than using an AEAD construction) to get both
> confidentiality and integrity. Which generic composition order has
> been proven secure for any secure cipher paired with any secure MAC?
> - [x] Encrypt the plaintext, then compute the MAC over the resulting ciphertext
> - [ ] Compute the MAC over the plaintext, then encrypt the plaintext together with that MAC
> - [ ] Compute the MAC over the plaintext and encrypt the plaintext independently, then send both
> - [ ] All three orderings are equally secure as long as the underlying cipher and MAC are each individually secure ^card-9com
