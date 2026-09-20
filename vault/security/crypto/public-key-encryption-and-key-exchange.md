---
topic: security
category: security-crypto
tags: [public-key-crypto, rsa, elliptic-curves, diffie-hellman, forward-secrecy]
citations: ["Aumasson, Serious Cryptography, Ch. 10-12"]
---

# Public-Key Encryption and Key Exchange

Symmetric cryptography (covered elsewhere in this vault) has a
bootstrapping problem: both sides need the same secret before they can
talk, and getting that secret to both of them without anyone else
seeing it is exactly the problem cryptography was supposed to solve.
Public-key cryptography sidesteps this with a different shape of
secret entirely: a **keypair**, generated together as one mathematical
unit, where one half can be handed to literally anyone — published,
emailed, printed on a business card — while the other half never
leaves its owner and is never transmitted anywhere.

What single design idea distinguishes public-key cryptography from symmetric cryptography, and what problem does it remove? :: A keypair in which one half can be published openly while the other half never leaves its owner. It removes the need to pre-share a secret between the two parties before they communicate. ^card-94pa

The asymmetry between the two halves isn't a matter of policy — one
being "kept secret" by choice — it's mathematically enforced. The
math that makes this possible is a ==trapdoor function==: a function ^card-ps7l
that anyone can compute easily in the forward direction, but that is
computationally infeasible to invert unless you hold a specific piece
of extra information that makes inversion easy again.

Two families of trapdoor function dominate practical use, and they
rest on two different unsolved math problems.

> [!card] mcq
> RSA and elliptic-curve cryptography both rely on a problem believed
> to be computationally hard. Which pairing is correct?
> - [x] RSA rests on integer factoring; elliptic-curve schemes rest on the discrete logarithm problem over a curve's point group
> - [ ] RSA rests on the discrete logarithm problem; elliptic-curve schemes rest on integer factoring
> - [ ] Both rest on integer factoring, just over different number fields
> - [ ] Both rest on the same discrete logarithm problem, just phrased with different notation ^card-2l6c

Factoring a large number and taking a discrete logarithm in an
ordinary multiplicative group are both hard, but not equally hard for
a given key size — the best known attacks against ordinary factoring
and ordinary discrete logs run in *subexponential* time (methods like
the general number field sieve), while the best known attack against
the elliptic-curve discrete log problem is fully *exponential*. That
gap is why a 256-bit elliptic-curve key is generally reckoned
comparable in strength to a 3072-bit RSA key rather than a 256-bit
one.

Why does elliptic-curve cryptography reach the same practical security level as RSA using dramatically smaller keys? :: Because the best known algorithm for breaking the elliptic-curve discrete log problem is fully exponential in the key size, whereas the best known algorithms for factoring (which RSA relies on) run in subexponential time — so RSA needs a much larger key to buy back the security that subexponential attacks chip away at. ^card-lw6z

RSA and elliptic curves, as described so far, are encryption
primitives: one side has a public key, and anyone can use it to
encrypt something only the matching private key can open. Diffie-Hellman
(DH) and its elliptic-curve variant (ECDH) do something different in
kind, not just in mechanism — they are **key agreement**, not
encryption. Nobody ever encrypts the shared value and sends it across;
instead, each side publishes one number, keeps a second number
private, and combines its own private number with the other side's
public number to independently land on the identical result.

```
Public, agreed in advance: a large prime p, a generator g
Alice picks secret a,  sends A = g^a mod p
Bob picks secret b,    sends B = g^b mod p
Alice computes B^a mod p = g^(ab) mod p
Bob computes   A^b mod p = g^(ab) mod p
Both now hold the same value g^(ab) mod p, without either
ever having sent it.
```

> [!card] recall
> In a Diffie-Hellman exchange, what does each side transmit, and what
> does each side compute afterward to arrive at the shared secret?
> Why is this called "key agreement" rather than "key exchange" in the
> strict sense, or encryption?
> ---
> Each side transmits only its own public value (g raised to its
> private exponent, mod p) — never the shared secret itself. Each side
> then raises the *other* party's public value to its *own* private
> exponent, and both computations land on the same number because
> exponentiation mod p commutes: (g^a)^b = (g^b)^a. Nothing that
> travels over the wire is the secret, and nothing is decrypted —
> both parties compute it independently, which is why "agreement" is
> the more accurate word than "exchange" or "encryption." ^card-0llx

ECDH follows the identical shape with elliptic-curve point
multiplication standing in for modular exponentiation: each side
publishes a point derived from multiplying a fixed base point by its
own private scalar, and each computes the shared point by multiplying
the *other* side's public point by its own scalar.

A keypair used for agreement doesn't have to be reused across
sessions, and whether it is reused matters a great deal. An
**ephemeral** keypair is generated fresh for one session and discarded
immediately afterward — never written to disk, never reused for the
next conversation. Using a fresh keypair per session gives ==forward secrecy== as a property of the agreement itself: even if an attacker ^card-2kzi
later steals whatever long-term signing or identity key was used to
authenticate the exchange, that theft does not let them recompute
session values that were never derived from — and never dependent
on — the long-term secret in the first place. Each session's shared
value depended only on that session's own throwaway numbers, which no
longer exist anywhere to be recovered.

Notice that this is a property of the key-agreement primitive on its
own — generate ephemeral keys per session, throw them away after — and
has nothing to do with any particular protocol's handshake design;
it's the mechanism, not the wrapper around it, that this note is
scoped to.

So far this note has treated public-key encryption (RSA, or an
elliptic-curve encryption scheme) and public-key *agreement*
(Diffie-Hellman, ECDH) as separate tools, but there's a reason
practical systems reach for both together rather than RSA-encrypting
everything directly: RSA cannot encrypt a message larger than roughly
its modulus size — a 2048-bit RSA key cannot directly encrypt more
than a couple hundred bytes at once — and even well within that limit,
public-key operations are orders of magnitude slower per byte than a
symmetric cipher. Neither RSA nor ECC encryption is built to move bulk
data; they're built to move small values, like keys.

> [!card] mcq
> An application needs to send a 500 MB file confidentially to a
> recipient who has published an RSA public key. What's the correct
> approach?
> - [x] Generate a random symmetric key, encrypt the file under it with a symmetric cipher, and encrypt only that symmetric key with RSA
> - [ ] RSA-encrypt the file in 200-byte chunks and concatenate the results
> - [ ] Use a larger RSA modulus so the whole file fits in one encryption operation
> - [ ] Skip RSA and send the file over Diffie-Hellman directly, since DH has no size limit ^card-oor9

This pattern — encrypt the bulk payload symmetrically, and use the
public-key operation only to protect that one small symmetric key —
is **hybrid encryption**. It's not a workaround or an optimization
bolted on after the fact; it's the standard, expected way public-key
encryption gets used at all, because the alternative simply doesn't
scale to real message sizes. How the symmetric portion is keyed and
the cipher mode it runs in belong to symmetric encryption, not here.

Why is bulk data essentially never encrypted directly with RSA, even when the data fits under the size limit? :: Public-key operations are computationally far more expensive per byte than symmetric encryption, and RSA's size ceiling (tied to its modulus) makes it unsuitable for anything beyond a small fixed-size value in the first place — so RSA is used to protect a symmetric key instead, and that key does the actual bulk encryption. ^card-0ro9
