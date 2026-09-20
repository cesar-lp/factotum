---
topic: security
category: security-crypto
tags: [mac, hmac, integrity, authenticity, constant-time]
citations: ["Aumasson, Serious Cryptography, Ch. 7"]
---

# Message Authentication Codes

A plain cryptographic hash of a message proves the message hasn't
changed since the hash was taken, but computing that hash requires no
secret at all — anyone, including whoever tampered with the message,
can recompute a matching hash for their altered version. A **message
authentication code (MAC)** closes that gap by mixing a secret into the
computation: producing or checking a valid tag requires the same key
the legitimate parties share, so a tag that checks out proves not just
that the message is unmodified but that it came from someone who holds
that key.

What does a MAC provide that an unkeyed hash of the same message cannot, and where does that extra guarantee come from? :: Authenticity — proof the message came from a holder of the secret key, not just anyone. An unkeyed hash only proves the message wasn't altered; producing or checking a MAC tag requires the same secret key the legitimate sender used, and that requirement is exactly what an attacker without the key can't satisfy. ^card-iyzp

A MAC scheme is a pair of operations built around one shared secret: the
sender runs a tagging function over the message and the key to produce
a tag, and the receiver runs the same function over the message they
received and their copy of the key, then checks the result against the
tag that arrived. Only someone holding that ==same secret key== can ^card-5c74
produce a tag the receiver will accept, and no amount of watching valid
message/tag pairs go by lets an outsider forge one for a new message.

The most common way to build a MAC is to wrap it around an existing
hash function, and **HMAC** is the standard way to do that safely.
Rather than hashing the key and message together in one pass, HMAC
applies the underlying hash function ==twice==: once over an ^card-qzn6
inner block that mixes the key with one padding constant, and again
over an outer block that mixes the key with a different padding
constant and feeds in the first result.

```
HMAC(key, msg) = H( (key XOR opad) || H( (key XOR ipad) || msg ) )
```

> [!card] mcq
> Which statement correctly describes how HMAC is structured?
> - [x] It applies the hash function in a nested, two-pass structure, hashing an inner key-and-message block and then hashing that result together with an outer key block
> - [ ] It hashes the key and message together in a single pass, the same as any other keyed hash
> - [ ] It encrypts the message with the key first and then hashes the ciphertext
> - [ ] It only hashes the key, using the message solely to select which hash function to run ^card-0gff

Why go to the trouble of this nested, two-pass structure instead of the
much simpler `H(key || message)`? Because the naive construction is
vulnerable to length-extension attacks against Merkle-Damgard hash
functions — an attacker who sees one valid tag can derive a valid tag
for a longer, attacker-extended message without ever learning the key.
HMAC's nested structure is specifically designed to defeat that attack,
since the outer hash call never exposes an internal state that an
attacker could pick up and extend on their own.

Why does HMAC hash the message through a nested, two-call structure instead of computing H(key || message) directly? :: Because H(key || message) is vulnerable to length-extension attacks on Merkle-Damgard hash functions, letting an attacker forge a tag for an extended message without knowing the key. HMAC's nested construction — hashing an inner key-and-message block, then hashing that result together with an outer key block — is built specifically to close off that attack. ^card-0va0

Hashing isn't the only way to build a MAC, either. CMAC builds a MAC
out of a block cipher instead of a hash function, running the cipher in
a chained mode over the message with the secret as the cipher key. The
existence of both families is a reminder that "MAC" names a security
goal, and HMAC is just the most common way of reaching it.

HMAC builds a MAC out of a hash function. Name a different family of MAC construction and the kind of primitive it's built from instead. :: CMAC, which builds a MAC out of a block cipher (such as AES) rather than a hash function, chaining the cipher over the message under the shared secret key. ^card-1h18

Verifying a tag safely takes more than just comparing two byte strings.
A naive comparison — the kind an ordinary equality check or `strcmp`
performs —
stops and returns as soon as it hits the first byte that doesn't match,
so the *time* the comparison takes depends on how many leading bytes
were correct. An attacker who can measure that timing, even faintly and
over a network by averaging many requests, can recover a valid tag one
byte at a time instead of guessing the whole tag at once.

Why must comparing a computed MAC tag against the received tag use a constant-time comparison rather than an ordinary early-exit string compare? :: An early-exit compare's running time depends on how many leading bytes matched, leaking that count through a timing side channel. An attacker who can measure the timing can recover a valid tag byte by byte instead of needing to guess it all at once, turning an otherwise-infeasible brute force into a fast, incremental one. Constant-time comparison always inspects every byte and reveals only equal-or-not. ^card-rows

Finally, a MAC is not a substitute for a digital signature, even though
both attach an authenticating tag to a message. A signature is built on
a key pair, so only the holder of the private key could have produced
it, and anyone with the public key can check that fact — including a
third party who never held any secret. A MAC has no such asymmetry: the
sender and receiver hold the identical key, so a valid tag proves the
message came from one of the two of them, but never proves *which*
one, which is why a MAC alone gives no ==non-repudiation==. ^card-t9st
