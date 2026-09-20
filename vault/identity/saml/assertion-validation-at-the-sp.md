---
topic: identity
category: identity-saml
tags: [saml, assertion-validation, replay, destination, in-response-to]
citations: ["OASIS SAML 2.0 Core", "OASIS SAML 2.0 Profiles"]
---

# Assertion Validation at the Service Provider

A service provider (SP) that receives an assertion cannot treat "it
verifies" as "I should believe it." Each check below exists because
skipping it lets through one specific, concrete kind of forged,
misdirected, or reused assertion — the list is really a list of
failures being prevented, not a formality to tick off.

```
1. signature   present where the SP requires it, made with the key
               configured for that issuer
2. issuer      the expected party, not merely a party that signed
               something
3. audience    names this SP specifically
4. validity    not expired, small clock-skew allowance
5. InResponseTo  matches a request this SP actually issued
6. Destination matches the endpoint the message arrived at
7. replay      assertion id not already consumed
```

Checking that a signature verifies is not the same as checking that
the SP looked in the right place for it. An SP that accepts any
signature found anywhere in the document — rather than requiring the
specific element it reads to carry one, made with the key it has on
file for that issuer — can be handed a message where the part that
verifies and the part the SP actually trusts are not the same part.

> [!card] mcq
> An SP's response-handling code checks "does this document contain a
> valid signature from a key I recognize?" and, finding one, proceeds
> to read claims out of an assertion element elsewhere in the same
> document — one the signature does not cover. Which check was
> implemented wrong?
> - [x] The signature check — the SP must require the signature over the specific element it reads, not merely find one somewhere in the document
> - [ ] The issuer check — the key belongs to an untrusted party
> - [ ] The audience check — the assertion was minted for a different SP
> - [ ] Nothing was implemented wrong; a valid signature anywhere in the document is sufficient ^card-c94c

An assertion whose issuer, audience, and signature all check out can
still be replayed weeks later against the exact same SP, on the exact
same day it was minted, because none of those checks say anything
about whether this particular assertion has been *seen before*. That
requires a fourth kind of state entirely: a record of consumed
assertion ids.

Guarding against reuse means the SP has to remember the identifier of
every ==replay== it has already accepted, for at least as long as the ^card-w3qs
assertion's stated validity window remains open — a signed assertion
is otherwise just as usable the second time it's presented as the
first, since nothing about its signature changes between uses.

> [!card] mcq
> An attacker captures a legitimately issued assertion in transit
> while it is still inside its validity window, and resubmits the
> identical assertion to the same SP a minute later. Its signature
> verifies, its issuer and audience are correct, and it has not
> expired. What is the SP's last line of defense here?
> - [x] Recognizing that this assertion's id has already been consumed and rejecting the resubmission
> - [ ] The expiry check, since a minute is close to the clock-skew allowance
> - [ ] The audience check, since a captured assertion was not minted for the attacker
> - [ ] There is no defense once signature, issuer, and audience all check out ^card-hpee

Matching the endpoint a message actually arrived at against the
endpoint the assertion names, the ==Destination== value, is what ^card-gmbz
stops a message that was captured at one endpoint from being replayed
successfully against a different one — an assertion aimed at one SP
endpoint, or one URL belonging to the same SP, gains nothing by
arriving somewhere else, because that mismatch alone is grounds for
rejection.

> [!card] mcq
> An SP operates two endpoints for receiving assertions. An assertion
> correctly signed, correctly issued, and correctly scoped to this SP
> is intercepted on its way to the first endpoint and resubmitted to
> the second one instead, before it expires and before it has been
> consumed anywhere. Which check catches this?
> - [x] Matching the endpoint the message arrived at against the Destination named in the assertion
> - [ ] The audience check, since the two endpoints belong to different services
> - [ ] The replay check, since the assertion has already been "used" once
> - [ ] The validity-window check, since resubmission takes time ^card-ge16

When a flow was initiated by the SP itself, the SP sent a request and ^card-4mfq
is now expecting a specific response back — not just a response from
the right issuer, about the right audience, that hasn't expired, but
one answering a request this SP can actually point to. What is the SP's obligation with respect to InResponseTo? :: To check that value against the request it itself issued and still holds a record of, rejecting any assertion whose InResponseTo does not match a request this SP actually made.

> [!card] recall
> Name the two ways of getting SP-side assertion validation wrong that
> look, from the outside, exactly like a system working normally —
> right up until the one request that should have been refused isn't.
> ---
> Believing any assertion that merely verifies — signed by some
> recognized key — without also confirming it was minted for this SP
> by the issuer this SP expects, addressed to the endpoint it arrived
> at, and answering a request this SP actually made; and never
> remembering which assertion ids have already been consumed, so a
> signed assertion stays reusable indefinitely by anyone who obtains
> it. ^card-ftdq
