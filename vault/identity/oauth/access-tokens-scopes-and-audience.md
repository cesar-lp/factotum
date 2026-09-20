---
topic: identity
category: identity-oauth
tags: [access-token, scope, audience, opaque-token, token-security]
citations: ["RFC 6749 (OAuth 2.0 Authorization Framework)", "RFC 6750 (Bearer Token Usage)"]
---

# Access tokens, scope, and audience

An access token is a credential the client presents to a resource
server on every request it makes. The specification that defines it,
RFC 6749, deliberately says nothing about what the token looks like on
the wire — that silence isn't an oversight, it's the fork that
everything else in this note follows from.

## Opaque or self-contained

One option is for the authorization server to hand out a token that is
==opaque==: a random string with no internal structure, meaningful only ^card-i6zf
to the party that issued it. A resource server holding a token like
that can't decide anything about it on its own — there are no fields to
read — so it has to ask the authorization server what the token means
before it can honor the request.

The other option is a token that is ==self-contained==: it carries its ^card-oomx
own claims — who it was issued to, what it grants, when it expires —
bundled and signed, so a resource server can check it locally without a
round trip back to the issuer.

What does the choice between an opaque access token and a self-contained one trade off against each other? :: Revocation immediacy against per-request latency — an opaque token can be invalidated instantly at the authorization server but costs a lookup on every request, while a signed, locally-checkable token needs no round trip but keeps working until it expires, since there's nowhere to revoke a claim that's already bundled and signed. ^card-wad4

## Scope: what was granted, not just what was asked

Scope is the permission the client requested when it started the flow,
and separately, the permission the authorization server actually
granted when it issued the token. Those aren't guaranteed to match.

> [!card] mcq
> A client requests the scope `read write delete` when it starts an
> authorization flow. What must it assume about the access token it
> ultimately receives?
> - [x] The granted scope may be narrower than what was requested, so the client must check the token's actual scope rather than assume it got everything it asked for
> - [ ] The granted scope always exactly matches what was requested, or the authorization server would have rejected the request outright
> - [ ] Scope is negotiated once and then fixed for the lifetime of the client, regardless of what any single token grants
> - [ ] A narrower grant only happens when the resource owner is a different person than the client ^card-8341

Why must a client read the scope it actually got back rather than assume it received everything it requested? :: Because an authorization server is free to grant a narrower scope than was requested — for example if the resource owner only approves part of it — so a client that assumes the full grant and calls an action outside the actual scope will simply have that call rejected by the resource server. ^card-0rfn

## Audience: who the token was minted for

Audience is a different property from scope: it names the resource
server a token was minted for, rather than what the token permits once
it arrives there.

A token carries an intended ==audience== — the specific resource server ^card-6sgf
it's meant to be presented to — and that binding is what a resource
server is supposed to check before honoring the token at all.

Skip that check, and a token issued for one resource server becomes
usable against a different one that happens to trust the same
authorization server — the token was never meant for that destination,
but nothing stopped it from being replayed there.

What goes wrong if a resource server accepts a token without checking that the token's intended destination is itself? :: A token minted for one service can be replayed against a different service that trusts the same authorization server, letting whatever the token grants at its intended target apply somewhere it was never meant to reach — a privilege escalation across service boundaries, not a mere technicality. ^card-pbf0

Scope and audience each answer a different question about the same token — which question does each one answer? :: Scope answers what the token permits doing; audience answers where the token is allowed to be presented at all. A token can carry exactly the right scope and still be misused if presented to the wrong destination, and the reverse holds too. ^card-pfgq
