---
topic: identity
category: identity-sessions
tags: [jwt, token-format, algorithm-confusion, base64url, security-pitfalls]
citations: ["RFC 7519 (JSON Web Token)", "RFC 8725 (JWT Best Current Practices)"]
---

# JWT Structure and Pitfalls

A JSON Web Token is a compact string built from exactly three parts
joined by dots:

```
header.payload.signature

header    - names the algorithm and token type
payload   - the claims: who, what, when
signature - computed over the header and payload together
```

Cloze on the shape:

A JWT is always ==three== base64url segments separated by dots — never ^card-ukrx
more, never fewer, regardless of how many claims the payload carries.

Each segment is base64url text, and that choice of encoding is easy to
mistake for something stronger than it is.

Base64url is ==encoding==, not encryption. ^card-tt6e

That one fact has an unforgiving consequence. Anyone holding a token
can decode the header and payload with nothing more than a text editor
— there is no key involved, because none is needed. Every claim placed
in the payload is exposed to anyone who ever sees the token in transit,
in a log line, in a browser's storage, or on the wire to a proxy that
was never supposed to read it.

Why is putting a customer's account balance or medical status directly into a JWT's payload a disclosure risk, even if the token's signature is never broken? :: The payload is base64url-encoded, not encrypted, so decoding it requires no key at all — anyone who obtains the token, whether through a log, a proxy, a browser extension, or a network capture, can read every claim in plain sight. The signature only proves the claims weren't altered; it does nothing to hide them. Putting confidential data there is a disclosure with extra steps. ^card-tfhs

The header is where the second class of pitfall lives, because the
header is attacker-supplied: whoever holds the token controls what its
`alg` field says, and a verifier that blindly trusts that field is
handing the attacker a say in how their own forgery gets checked.

> [!card] mcq
> A resource server verifies incoming JWTs by reading the `alg` field
> out of each token's own header and using whatever algorithm it
> names. An attacker takes a token that was legitimately issued with
> an RSA signature, strips the signature, sets `alg` to an HMAC scheme,
> and signs the result using the issuer's RSA *public* key as if it
> were a shared HMAC secret — since that public key is, well, public.
> What lets this forged token pass verification?
> - [x] The verifier let the token's own header dictate which algorithm to check the signature under, instead of fixing that choice itself
> - [ ] HMAC and RSA produce identical signature bytes for the same input, so the forgery is coincidentally valid
> - [ ] The attacker guessed the issuer's actual RSA private key
> - [ ] This only works if the payload's claims are also left unencrypted ^card-ovx8

That specific attack has a sibling that skips signing entirely. The
JWT spec allows an `alg` value of ==none==, meaning the token asserts ^card-fs0e
outright that no signature was ever applied.

A verifier that honors an `alg` of `none` accepts the token's claims at
face value, because it was told, by the token itself, not to check
anything.

What is the defense against both algorithm confusion and the `none` algorithm, stated as a single principle? :: The verifier — never the token — decides which algorithm (or short list of algorithms) is acceptable, and rejects anything else outright, including `none`. The token's own `alg` field is treated as untrusted input to be checked against that fixed list, not as an instruction to follow. ^card-rfv3

> [!card] recall
> Someone justifies a design decision by saying "we use JWTs, so our
> tokens are secure." Explain why that sentence answers no security
> question by itself, using the two pitfalls above.
> ---
> "JWT" names a token *format* — three base64url segments with a
> header, payload, and signature — not a security guarantee. A system
> using JWTs can still leak every claim in plain sight, since the
> encoding isn't encryption, and can still be forged outright if its
> verifier trusts the token's own header to pick the algorithm,
> including accepting `none`. Whether JWTs are secure here depends
> entirely on what's encoded in the payload and how the verifier is
> configured — questions the phrase "we use JWTs" never touches. ^card-2olv

Put together, the two failure modes share a root cause: both come from
treating something the token carries — a claim's confidentiality, or
the header's algorithm choice — as already trustworthy, when the token
is exactly the thing under examination.

Why does it make sense that algorithm confusion and payload disclosure are both described as coming from the "same root cause," even though one is about the header and the other is about the payload? :: Both mistakes trust content that arrived inside the token itself instead of verifying it against something fixed outside the token: algorithm confusion trusts the attacker-controlled `alg` header to say how to check the signature, and payload disclosure implicitly trusts that whoever can see the token isn't supposed to read the claims. In both cases the token is the artifact being examined, so nothing it asserts about itself can be taken as already established. ^card-f72z
