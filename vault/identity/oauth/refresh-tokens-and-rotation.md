---
topic: identity
category: identity-oauth
tags: [refresh-token, rotation, reuse-detection, revocation, token-security]
citations: ["RFC 6749 (OAuth 2.0 Authorization Framework)", "RFC 9700 (Best Current Practice for OAuth 2.0 Security)"]
---

# Refresh tokens and rotation

A short-lived access token limits how much damage a leak does: it only
works for a short window, then stops on its own. But forcing the user
to re-authenticate every few minutes just to get a new one is
unusable. A refresh token resolves that tension: a much longer-lived
credential that lets the client obtain new access tokens without
asking the user to sign in again.

What tension does a refresh token resolve, and how? :: A short access-token lifetime limits the damage of a leak but makes constantly re-authenticating the user unworkable; a longer-lived refresh token lets the client obtain new access tokens on its own, without the user's involvement, so the access token can stay short-lived without the usability cost. ^card-l3jx

Because it lasts far longer and can mint fresh access tokens on
demand, the refresh token is the more valuable of the two secrets —
losing an access token costs an attacker a short window, losing a
refresh token costs far more.

## Where it's redeemed

A refresh token is redeemed only at the token endpoint — the client
sends it directly to the authorization server in exchange for a new
access token. It is never sent to a resource server; a resource server
receiving what looks like a refresh token has no interface for
accepting one.

Where is a refresh token ever redeemed, and where does it never go? :: It is redeemed only at the token endpoint, in a direct exchange with the authorization server for a new access token; it is never sent to a resource server, which has no interface built for accepting one. ^card-gzdi

## Rotating the secret on every use

Reissuing the same refresh token indefinitely means one leaked copy
stays useful forever. ==Rotation== closes that: every time a refresh ^card-pwra
token is redeemed, the authorization server issues a brand new one
alongside the new access token, and invalidates the token that was
just spent.

That invalidation is what makes ==reuse detection== possible: if a ^card-5ya4
token that has already been redeemed and replaced shows up again, the
authorization server learns that two different parties must be holding
what was supposed to be a single, moved-forward secret. A legitimate
client always presents the latest token it was issued, so an
already-spent one reappearing points to theft.

The response isn't to invalidate just that one resurfaced token — the
whole chain descending from the original grant gets revoked at once,
on the assumption that if the chain was stolen, every token derived
from it downstream may already be in the attacker's hands too.

> [!card] mcq
> A stolen refresh token gets redeemed by an attacker, and the
> authorization server issues them a new one in its place. Later, the
> legitimate client — still holding what it thinks is its current
> refresh token — tries to redeem that same now-superseded token too.
> What should the authorization server do?
> - [x] Recognize that an already-redeemed token was presented again, and revoke the entire chain of tokens descending from that grant, not just the one just presented
> - [ ] Silently issue a fresh token to the legitimate client and ignore the earlier redemption, since the client is the one behaving normally
> - [ ] Accept the redemption from whichever party asks first each time, since only one holder can be legitimate at once
> - [ ] Extend the lifetime of the original refresh token so both parties can keep using it ^card-oq33

Why does rotating on every redemption matter far more for a client that cannot keep a secret than for one that can? :: A client relying on one static, unrotated refresh token depends entirely on that single value never leaking, and a client that cannot keep a secret is far more likely to have exactly that happen; rotating limits how long any one leaked copy stays valid and lets theft surface on the very next redemption, which matters most for the clients least able to protect a long-lived static value in the first place. ^card-o388

## Why this makes revocation practical

Why do refresh tokens make revoking access practical, given how much less often they're redeemed than access tokens are used? :: Revoking a session just means invalidating its refresh token (or chain) at the authorization server; the short-lived access token already in the client's hands keeps working only until its own brief expiry, so a short access-token lifetime bounds how long a revoked session can keep functioning, rather than a revoked credential remaining usable indefinitely. ^card-gdk0

> [!card] recall
> Explain why a refresh token is considered the higher-value secret
> compared to the access token it's used to obtain, in terms of what
> each is worth to an attacker who steals it.
> ---
> An access token is worth only as much damage as its short remaining
> lifetime allows before it expires on its own. A refresh token is
> worth far more: it lasts much longer and can be redeemed repeatedly
> to mint new access tokens, so stealing it gives an attacker sustained
> access rather than a brief window — which is exactly why rotating it
> on every use and detecting reuse exist specifically to protect it. ^card-9b23
