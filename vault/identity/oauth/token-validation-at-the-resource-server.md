---
topic: identity
category: identity-oauth
tags: [token-validation, jwks, resource-server, key-id, clock-skew]
citations: ["RFC 6750 (Bearer Token Usage)", "RFC 9700 (OAuth 2.0 Security Best Current Practice)"]
---

# Token Validation at the Resource Server

A resource server that receives a bearer token cannot just check that
it parses. Each of the checks below exists because skipping it lets
through a specific, concrete kind of forged or misused request — the
checklist is really a list of failures being prevented.

```
1. signature — was this minted by a trusted issuer?
2. issuer    — trusted by whom I expect, specifically?
3. audience  — minted for me, not for some other service?
4. expiry    — still within its lifetime (+ small skew)?
5. scope     — does it cover this exact operation?
```

Skip the first and anyone can hand the resource server a token they
wrote themselves, with any claims they like — nothing past that point
matters if the token wasn't produced by a key the resource server
actually trusts. Verifying it is a signature-verification question
this vault already covers separately; here it's step one of a longer
list, not the whole job.

A validly signed token doesn't finish the job on its own, though. It
just means *some* issuer the resource server trusts produced it — not
that it's the *right* one. In a system that trusts more than one
issuer at once, a token correctly signed by issuer B is worthless at
a resource server configured only for issuer A's users.

> [!card] mcq
> A platform's resource server is configured to accept tokens from
> its production auth server only. A staging auth server, used for a
> separate low-trust environment, is (by mistake) included in the same
> trusted signing-key set, so its tokens verify cleanly. A staging
> token is presented to the production resource server. Which check,
> done correctly, would still reject it?
> - [x] The issuer check — the token's issuer claim names the staging server, not the one this resource server is meant to accept requests from
> - [ ] The signature check — the token doesn't verify against any known key
> - [ ] The expiry check — staging tokens are always short-lived
> - [ ] No check catches this; trusting the signing key implies trusting the token ^card-khyb

A separate claim answers a separate question: was this token minted
*for this resource server specifically*, rather than for some other
service that happens to trust the same issuer. Getting that claim
right means comparing it against the resource server's own identifier
— what the claim represents in general, and the cross-service replay
that skipping it enables, belongs to the notes on access tokens, but
running the comparison is this resource server's job on every
request.

> [!card] mcq
> Two services, a reports API and a billing API, both accept tokens
> from the same issuer. A client obtains a token scoped for the
> reports API and sends it to the billing API instead. The token's
> signature is valid, it hasn't expired, and its issuer is the shared,
> trusted one. Which check is the billing API's last line of defense?
> - [x] Comparing the token's audience claim against its own identifier, and rejecting the token because it doesn't match
> - [ ] Re-checking the signature a second time, more strictly
> - [ ] Re-checking the issuer, since it's the same trusted issuer either way
> - [ ] There is no defense once the issuer is trusted ^card-gyrp

Expiry looks like the simplest check, but it has one deliberate
softener: a resource server should allow a small ==clock skew== rather ^card-2xdf
than rejecting the instant the clock ticks past `exp`.

Why is a small allowance for clock skew correct when checking a token's expiry, while accepting a token well past its stated expiry is not? :: Two independent clocks — the issuer's and the resource server's — are never perfectly synchronized, so a token that is only a few seconds past expiry by the resource server's own clock may not actually be expired at all; rejecting it would be a false positive caused by clock drift, not a real security problem. Accepting a token that is substantially expired is a different failure entirely: it erases the point of expiry by extending the token's usable life indefinitely, which the small allowance is never meant to do. ^card-jxm9

Every check so far can pass and the request can still be wrong for
the operation being attempted, because none of them says anything
about what the token is actually allowed to do.

> [!card] mcq
> A token has a valid signature, the correct issuer, the correct
> audience, and has not expired. It was granted scope `reports:read`.
> The caller uses it to call an endpoint that deletes a report. The
> resource server processes the request because every other check
> passed. What went wrong?
> - [x] The scope check was skipped — a token being valid says nothing about which operations it authorizes; that has to be checked against the specific action being performed
> - [ ] The audience check must have been skipped, since deletion requires a different audience
> - [ ] Nothing went wrong; a valid token authorizes any action the caller requests
> - [ ] The issuer should have refused to sign a token that could be misused this way ^card-8yi0

Running the signature check at all requires having the issuer's
current public keys on hand, and a resource server doesn't hold those
permanently — it fetches them, published as a ==JWKS==, from an ^card-bm3m
endpoint the issuer exposes for exactly this purpose.

An issuer doesn't sign every token with one key forever, and a JWKS
response can list several keys at once — the entry a given token was
signed with is picked out by a ==key id== carried in the token itself, ^card-ugp3
so the resource server knows which of the published keys to check
that specific signature against, including during the window where
an old and a new key are both still valid.

Fetching the JWKS on every single request would be wasteful, so
resource servers cache it — but a cache that's never refreshed
eventually stops working correctly rather than just going stale
quietly.

> [!card] recall
> A resource server cached an issuer's JWKS response once, at startup,
> and never refetches it. Weeks later the issuer rotates its signing
> key. What happens to tokens signed under the new key when they
> arrive at this resource server, and why?
> ---
> They fail signature verification and get rejected, even though
> they're entirely legitimate. The token names a key id the cached
> JWKS has never seen, so the resource server has no key to check the
> signature against — the failure isn't that an attacker gets through,
> it's that valid traffic starts breaking, because the cache was never
> given a chance to pick up the rotation. ^card-rx7s

Not every token is a JWT the resource server can inspect on its own.
An opaque token carries no claims at all — none of the checks above
can be run locally, because there's nothing local to check. The
resource server's only option is to call the issuer's
==introspection== endpoint and ask it directly whether the token is ^card-jlio
still active and what scope it carries.

Two ways of getting this wrong look, from the outside, exactly like a
working system, which is what makes them the most dangerous: accepting
any token that merely verifies without checking who it's for or
whether it's expired, and checking everything except scope. Both let
every request through looking completely normal, right up until the
first request that should have been refused isn't.
