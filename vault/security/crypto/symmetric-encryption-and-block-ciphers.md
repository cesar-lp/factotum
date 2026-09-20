---
topic: security
category: security-crypto
tags: [symmetric-encryption, block-ciphers, aes, modes-of-operation, malleability]
citations: ["Aumasson, Serious Cryptography, Ch. 3"]
---

# Symmetric Encryption and Block Ciphers

A symmetric cipher belongs to one of two families. A **block cipher**
transforms a fixed-size chunk of plaintext — the block — into a
same-size chunk of ciphertext, one block at a time, under a shared key.
A **stream cipher** instead derives a pseudorandom keystream from the
key and combines it with the plaintext one bit or byte at a time, with
no fixed block boundary at all.

What is the core structural difference between a block cipher and a stream cipher? :: A block cipher transforms fixed-size chunks of plaintext (blocks) all at once under the key. A stream cipher generates a pseudorandom keystream from the key and combines it with the plaintext one bit or byte at a time, with no block boundary at all. ^card-dvaa

AES is the dominant block cipher in use today, and whatever the key
length — 128, 192, or 256 bits — it always operates on the same fixed
128-bit block; a longer key buys more security margin, never a bigger
block. Structurally, AES is best understood as a **keyed permutation**:
fix the key, and encryption becomes a ==bijection== — a perfectly ^card-upd4
reversible, one-to-one mapping — from the space of all possible input
blocks onto the space of all possible output blocks. No two distinct
plaintext blocks under one key can ever land on the same ciphertext
block, which is exactly what lets decryption undo encryption uniquely.

A block cipher only defines how to transform a single fixed-size
block, and a real message is almost never exactly one block long, so
something has to decide how to apply the block cipher across many
blocks to cover an arbitrary-length message. That something is a
**mode of operation**. The simplest possible choice — encrypt each
block independently, with no other input at all — is itself a mode,
and it is the one that fails most visibly.

**Electronic Codebook (ECB)** mode encrypts every block independently,
under the same key and nothing else. That independence is its entire
flaw: two identical plaintext blocks anywhere in a message, or across
two different messages under the same key, always produce identical
ciphertext blocks, because nothing distinguishes one occurrence from
another.

```
ECB:  C[i] = Encrypt(key, P[i])           -- no chaining at all
```

> [!card] mcq
> An image is encrypted block-by-block with ECB mode, and the
> ciphertext bytes are then rendered back as an image (the famous
> "encrypted penguin" example: a cartoon penguin's flat, solid-colored
> background stays clearly visible as flat, uniform regions in the
> "encrypted" picture). Why does the shape survive?
> - [x] Identical plaintext blocks always encrypt to identical ciphertext blocks under ECB, so any repeated pattern in the plaintext survives as a repeated pattern in the ciphertext
> - [ ] ECB fails to change the file format, so image viewers just decode the original data unmodified
> - [ ] ECB only encrypts pixel color values and leaves pixel positions untouched
> - [ ] The encryption key was too short to fully randomize the pixel data ^card-91js

A mode fixes ECB's independence problem by feeding information
forward from block to block, so that what gets encrypted depends on
more than just that one block's own contents. Each family of modes
does this differently, and the difference matters for both performance
and failure behavior.

Cipher Block Chaining XORs each plaintext block with the *previous
block's ciphertext* before running it through the block cipher, so
identical plaintext blocks no longer produce identical ciphertext —
the chaining makes every block's encryption depend on everything
encrypted before it in that message. The very first block has no
previous ciphertext to XOR against, so an initialization vector fills
that role instead.

```
CBC:  C[i] = Encrypt(key, P[i] XOR C[i-1]);  C[0] uses the IV in place of C[-1]
```

In this chaining mode, what gets XORed with a plaintext block before it's encrypted, and why does that fix the pattern-leakage problem seen when blocks are encrypted independently with no chaining at all? :: The previous block's ciphertext (or the IV, for the first block) is XORed in before encryption. Because that input differs depending on everything encrypted so far in the message, two identical plaintext blocks no longer produce identical ciphertext blocks. ^card-8w4g

Counter mode takes a completely different approach: it encrypts a
counter (combined with a nonce) to produce a keystream block, then
XORs that keystream with the plaintext block — the block cipher is
never applied to the plaintext or ciphertext directly. That trick
turns a block cipher into something that behaves like a ==stream ^card-0qfr
cipher==: blocks can be processed in any order or in parallel,
decryption is the identical operation as encryption, and the
ciphertext comes out exactly as long as the plaintext, with no
padding needed anywhere.

```
CTR:  keystream[i] = Encrypt(key, nonce || counter_i);  C[i] = P[i] XOR keystream[i]
```

Chaining modes that encrypt the plaintext directly, block by whole
block, need the plaintext to be an exact multiple of the block size —
so a message that doesn't line up evenly has to be padded out before
encryption, with the padding stripped back off after decryption. A
mode built around a keystream never has this problem, because it
never encrypts the plaintext directly in the first place.

Why do chaining modes that encrypt the plaintext directly in whole blocks require padding, while a counter-based, keystream-driven mode does not? :: Modes that encrypt the plaintext directly need it to be an exact multiple of the block size, so a shorter final chunk must be padded out to a full block before encryption. A keystream-driven mode never encrypts the plaintext itself — it encrypts a counter to build a keystream and XORs that with the plaintext — so the ciphertext can match the plaintext's exact length with no padding at all. ^card-00d6

Reusing the extra per-message input is dangerous in both families, but
*what* it destroys differs sharply between them. Reusing the IV in a
chaining mode leaks the XOR relationship between the first blocks of
two messages: if two plaintexts share a common prefix, an attacker who
sees both ciphertexts under the same IV can tell exactly how far the
prefixes agree, and in the worst case can recover a whole message by
comparison against a known one. Reusing the nonce/counter start in a
counter-based mode is worse for confidentiality outright: the
keystream depends only on the key, nonce, and counter, so an identical
nonce regenerates an identical keystream, and XORing the two
ciphertexts cancels that keystream out completely, exposing the XOR of
the two plaintexts directly — from which both plaintexts are often
fully recoverable with basic cryptanalysis.

> [!card] recall
> Reusing the IV or nonce under the same key is dangerous in both a
> chaining-style mode (like CBC) and a counter-style mode (like CTR),
> but the mechanism and severity differ. Explain what goes wrong in
> each.
> ---
> Chaining mode (CBC): a reused IV leaks the XOR relationship between
> the first blocks of the two messages, revealing shared-prefix
> information and letting an attacker compare ciphertexts for equality
> patterns. Counter mode (CTR): a reused nonce/counter regenerates the
> identical keystream, so XORing the two ciphertexts cancels the
> keystream out and directly exposes the XOR of the two plaintexts —
> often enough to recover both plaintexts outright, a more direct and
> severe break than the chaining mode's leak. ^card-bojh

Everything above only protects **confidentiality** — none of these
constructions, on their own, protect **integrity**. Encryption alone
gives no guarantee that a ciphertext hasn't been tampered with, and an
attacker who doesn't know the key can often still change the
corresponding plaintext in a predictable way. A cipher with this
property is called ==malleable==: flipping a bit in a counter-mode ^card-8zka
ciphertext flips the corresponding bit of the decrypted plaintext
directly, because the combination is a plain XOR; flipping a bit in a
chaining-mode ciphertext block corrupts that block unpredictably but
flips the same bit position in the *following* block's plaintext,
because of how the XOR chains forward. Either way, the attacker never
needs the key, and nothing about the decryption process itself
detects that anything happened.

Why doesn't a ciphertext successfully decrypting — producing some plaintext at all — mean it wasn't tampered with along the way? :: These constructions provide no integrity check whatsoever; decryption always produces some plaintext for any ciphertext, valid or attacker-modified, since there's nothing to reject it against. Malleability means an attacker without the key can flip bits in the ciphertext to make predictable, controlled changes in the decrypted plaintext, and nothing in the cipher or mode itself notices or signals that the ciphertext changed. ^card-fdjh
