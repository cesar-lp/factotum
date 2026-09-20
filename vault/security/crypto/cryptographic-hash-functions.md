---
topic: security
category: security-crypto
tags: [hash-functions, sha-2, sha-3, merkle-damgard, collision-resistance]
citations: ["Aumasson, Serious Cryptography, Ch. 6"]
---

# Cryptographic Hash Functions

A cryptographic hash function takes an input of any length and produces
a fixed-size digest, and the entire value of that digest depends on
three distinct guarantees holding at once. They get lumped together as
"the hash is secure," but a construction can satisfy one while failing
another, so it's worth naming them separately.

**Preimage resistance**: given only a digest h, it should be infeasible
to find any input x such that hash(x) = h. **Second-preimage
resistance**: given a specific input x1, it should be infeasible to
find a *different* input x2 with the same digest. **Collision
resistance**: it should be infeasible to find *any* two distinct inputs
x1 and x2 — neither one fixed in advance — that hash to the same
digest. These are ==three separate properties==, not three names for ^card-igny
the same thing, and breaking one does not automatically break the
others.

Why does breaking second-preimage resistance not automatically mean collision resistance is broken too, even though both involve two inputs hashing to the same output? :: Second-preimage resistance is a much narrower target: the attacker is handed a specific input x1 in advance and must find a second one matching x1's exact digest. Collision resistance lets the attacker pick BOTH inputs freely, searching the entire space of pairs for any match at all — a vastly larger search than being pinned to one fixed starting point — so a construction can remain second-preimage resistant while a birthday-style search still finds it a collision. ^card-x2yt

> [!card] mcq
> An attacker is given a specific file F and asked to produce a
> different file that hashes to the same digest as F. Which property
> is this attacker trying to break?
> - [x] Second-preimage resistance
> - [ ] Preimage resistance
> - [ ] Collision resistance
> - [ ] Non-repudiation ^card-ghb7

Which resistance property is broken if an attacker can only produce two DIFFERENT, previously-unspecified inputs that happen to share a digest, without being able to target any particular existing input? :: Collision resistance. The attacker never had to match a digest chosen by someone else, or match a specific pre-existing input — they just had to find some colliding pair anywhere in the space of possible inputs, which is exactly what a birthday-style search hunts for. ^card-39x2

Most widely deployed hash functions, including MD5 and SHA-2, are built
with the **Merkle-Damgard construction**: the message is split into
fixed-size blocks, and a compression function folds each block into a
running internal state, chaining the output of one block into the input
of the next, until the final state becomes the digest.

```
Merkle-Damgard: state_0 = IV
state_i = compress(state_(i-1), block_i)
digest = state_n
```

That chaining structure has a well-known side effect called a
**length-extension attack**: given only hash(message) and the length of
message — without knowing message's actual content — an attacker can
compute hash(message || padding || extra) for attacker-chosen extra,
because the published digest IS the compression function's internal
state, and the attacker can simply resume the chain from there.

> [!card] recall
> Explain why the Merkle-Damgard construction makes length-extension
> attacks possible, and name one practical consequence for how
> Merkle-Damgard hashes must NOT be used.
> ---
> The final digest of a Merkle-Damgard hash is exactly the compression
> function's last internal state, with nothing extra mixed in
> afterward. An attacker who knows that digest and the original
> message's length therefore has everything needed to resume the
> chain — they can compute the hash of the original message with
> attacker-chosen data appended, without ever seeing the original
> message. The consequence: naively checking authenticity as
> hash(secret || message) is unsafe, because an attacker can extend it
> without knowing the secret; a proper MAC construction is needed
> instead. ^card-s8ma

**SHA-3**, standardized specifically because of concerns like
length-extension, is built differently: a *sponge construction* that
absorbs input into a large internal state and then squeezes output back
out, with no exposed intermediate chaining value the way Merkle-Damgard
exposes its running state as the digest. SHA-3 is not vulnerable to
length-extension attacks for exactly that structural reason, while
==SHA-2==, despite being far newer and stronger than MD5, still is, ^card-1bgn
because it is still built on Merkle-Damgard.

Why is SHA-2 vulnerable to length-extension attacks despite having no known practical collision or preimage weaknesses, while SHA-3 is not? :: Vulnerability to length extension is a property of the CONSTRUCTION, not the strength of the compression function. SHA-2 uses Merkle-Damgard, where the digest equals the internal chaining state directly, so an attacker can resume computation from a known digest. SHA-3 uses a sponge construction where the digest is squeezed from a larger internal state that is never fully exposed, so there's no chaining value an attacker can resume from, regardless of how strong either function's core is against brute-force search. ^card-js01

An n-bit hash's collision resistance is not n bits — it's roughly n/2
bits, a direct consequence of the birthday-style argument covered
separately for the general balls-and-bins model. This is precisely why
SHA-1, with a 160-bit digest, was retired once its effective 80-bit
collision resistance became reachable by well-resourced attackers: the
preimage resistance of a 160-bit hash was never in question, only the
much cheaper collision search.

> [!card] mcq
> Roughly how many bits of collision resistance does an n-bit
> cryptographic hash function provide, and why does that number matter
> for retiring a hash function like SHA-1?
> - [x] About n/2 bits — a birthday-style collision search is far cheaper than an exhaustive preimage search, so a hash gets retired once n/2 bits becomes reachable, well before n bits does
> - [ ] Exactly n bits — collision resistance and preimage resistance scale identically
> - [ ] About log(n) bits — collisions are found almost immediately regardless of digest size
> - [ ] n bits for SHA-1 specifically, since it predates the birthday attack being known ^card-01fs

It's worth separating cryptographic hashing sharply from an unrelated
idea that shares only the word "hash": universal and perfect hashing,
used for hash *tables*, are designed to minimize collisions cheaply
across a known key distribution and carry no resistance-to-a-deliberate-
adversary requirement at all — a cryptographic hash function has to
resist an attacker actively searching for collisions, while a hash
table's hash function only has to behave well on typical, non-adversarial
input.

Finally: a hash function on its own provides no authenticity guarantee.
Given hash(message), anyone — not just the legitimate sender — can
recompute hash(message) themselves, or compute hash(anything), because
the function takes no secret input. This is the core reason a
cryptographic hash is ==not a MAC==: a MAC's whole point is that only ^card-wuaj
someone holding a secret key can produce a valid tag, and a bare hash
has no key to hold.

Why does publishing hash(message) alongside a message give a receiver no way to verify the message came from a specific sender? :: Because a hash function has no key — anyone who intercepts the message can recompute its hash, and anyone who wants to forge a different message can compute that message's hash too. The digest proves the message wasn't accidentally corrupted in a way that happens to change the hash, but it proves nothing about who produced either the message or the matching digest, since no secret was involved in producing it. ^card-h4kx
