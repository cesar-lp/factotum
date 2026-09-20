---
topic: identity
category: identity-oauth
tags: [oauth, state, nonce, redirect-uri, openid-connect]
citations: ["RFC 6749 (OAuth 2.0 Authorization Framework)", "RFC 7636 (PKCE)"]
---

# State, Nonce, and Redirect URI Validation

The authorization code flow appears to work fine without any of the
three checks below, which is exactly why they're easy to skip. Each one
only earns its keep the moment something is actively attacking the
flow.

Before sending the authorization request, the client generates an
unguessable ==state== value, includes it on that request, and later ^card-7mg2
checks that the exact same value comes back on the response — binding
the response it receives to the request it actually initiated, rather
than to any response that happens to arrive at its callback.

Without that check, an attacker can start the flow themselves, obtain a
result tied to the attacker's own account, and hand it to a victim to
complete — causing the victim's client session to end up bound to the
attacker's account instead of the victim's own. This is the concrete
shape a cross-site request forgery takes against the authorization
response; the general category is a named concept this note leaves to
the material on request forgery generally.

> [!card] mcq
> An attacker starts the authorization flow themselves, obtains a
> result tied to the attacker's own account, and tricks a logged-in
> victim into completing it — leaving the victim's client session bound
> to the attacker's account. Which check would have stopped this?
> - [x] state — the client would find that the returned value does not match the one it sent for a request the victim never initiated
> - [ ] nonce — nonce only binds a returned identity claim to its own request, not a whole session to an account
> - [ ] exact redirect URI matching — the redirect went to the client's own genuine callback, so no mismatch there would trigger
> - [ ] none of the three checks are relevant to this attack ^card-zljp

A separate OpenID Connect parameter, nonce, is sent along with the ^card-8ceb
authorization request and echoed back inside the identity claim the
authorization server returns. What does nonce being echoed back inside that claim let the client check, and what attack does that check defeat? :: The client checks that the value inside the returned claim matches the one it sent, binding that specific claim to that specific request. That defeats replay: presenting a previously captured, genuine identity claim again as if it were the answer to a fresh request.

> [!card] mcq
> An attacker previously captured a legitimate identity claim issued for
> another session, and now resubmits that exact same claim to the
> client, hoping the client accepts it as the answer to a request the
> client is making right now. Which check catches this?
> - [x] nonce — the value inside the replayed claim won't match the one the client sent for its current request
> - [ ] state — state only governs which request an authorization response is bound to, not what a returned identity claim contains
> - [ ] exact redirect URI matching — that constrains where a response can be delivered, not whether a claim is fresh
> - [ ] none of the three checks apply to a replayed identity claim ^card-uj0b

The third check sits with the authorization server rather than the
client. When it receives an authorization request, the server must
compare the redirect URI supplied on that request against the URI
registered for that client ==exactly==, not by prefix or substring. ^card-m022

Loose matching turns the authorization endpoint into an open redirect:
an attacker who can construct a URI that merely starts with, contains,
or otherwise partially resembles the registered one can redirect the
response — authorization code included — to a destination of their own
choosing, one the client's operator never registered and never agreed
to receive anything at.

> [!card] mcq
> A registered redirect URI is `https://app.example.com/callback`. The
> authorization server accepts any supplied URI that begins with that
> string. An attacker requests authorization using
> `https://app.example.com/callback.attacker.evil/`, which passes that
> check. What failure mode does this demonstrate?
> - [x] The authorization endpoint behaves as an open redirect, delivering the authorization code to a destination the client never registered
> - [ ] A replay of a previously issued authorization code
> - [ ] A forged authorization response bound to the wrong request
> - [ ] A failure that only exact nonce matching could have caught ^card-mu7o

> [!card] recall
> State, nonce, and exact redirect URI matching protect three different
> things — the response, the identity claim, and the destination the
> code is delivered to. Explain the pattern common to all three: what
> each one binds a step of the flow to, and why that binding is exactly
> the kind of gap that stays invisible until an attacker specifically
> targets it. ^card-mp14
