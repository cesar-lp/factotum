---
topic: identity
category: identity-oauth
tags: [oauth, pkce, public-client, mobile-security, authorization-code]
citations: ["RFC 7636 (PKCE)", "RFC 6749 (OAuth 2.0 Authorization Framework)"]
---

# PKCE and Public Clients

OAuth clients split into two categories based on where their code
actually runs. A confidential client runs on infrastructure its
operator controls — a backend server whose configuration nobody outside
the operator can read — so it can hold a credential and present it when
it talks to the authorization server.

A mobile app or a single-origin browser application is a different
animal: its code ships to, and executes on, a device the operator does
not control.

That second kind of client is what OAuth calls a ==public client==. ^card-iyw3

Anyone can decompile an installed app or open a browser's developer
tools and read whatever was compiled or bundled into it. A credential
embedded that way isn't a secret at all — it's a string every
installation carries, sitting in the open for whoever looks.

Why can a confidential client authenticate itself at the token endpoint while a public client cannot? :: A confidential client's code never leaves infrastructure its operator controls, so it can hold a credential nobody outside the operator can read. A public client's code ships to and runs on the end user's device, so any credential embedded in it is readable by anyone who inspects that copy — it identifies the app's code, not a holder of a secret. ^card-8xfc

That distinction opens a real hole in the authorization code flow. The
flow's whole point is that whoever redeems the code for a token has to
be the same party the authorization server issued it to, and a
confidential client proves that by presenting its credential at the
token endpoint. A client with no credential to present has no way to
prove that — so without some other safeguard, whoever gets hold of the
code, not only the party it was issued to, can walk up and redeem it.

Getting hold of it is not hypothetical. On a mobile platform, the
authorization server redirects back to the app using a custom URL
scheme rather than an HTTPS URL, and nothing in the platform stops a
second, malicious app from registering that exact same scheme. The
operating system has no way to arbitrate which installed app should own
it, so it can just as easily deliver the redirect — and the
authorization code riding on it — to the attacker's app instead of the
legitimate one.

> [!card] recall
> A user has both a legitimate app and a malicious app installed on
> their phone, and both apps have registered the same custom URL
> scheme. Explain how the malicious app can end up receiving an
> authorization code that was meant for the legitimate app. ^card-95nz

PKCE (Proof Key for Code Exchange) closes that hole without relying on
any credential at all.

Before sending the authorization request, the client generates a random
==verifier==, discarded once this one flow finishes. ^card-mjd2

It derives a challenge from that value and sends only the challenge on
the authorization request; the verifier itself never travels over that
leg. Later, redeeming the code at the token endpoint, the client
presents the original value, and the authorization server checks that
running the same derivation over it reproduces the challenge already on
file for that code.

Deriving the challenge takes a cryptographic hash, and the value being
hashed has to be a high-entropy random pick — both are requirements PKCE
leans on rather than anything it defines itself.

> [!card] mcq
> An attacker intercepts an authorization code from a PKCE-protected
> exchange and immediately presents it at the token endpoint. What
> happens?
> - [x] The exchange is refused — the attacker never obtained the value needed to reproduce the challenge already on file for that code
> - [ ] The exchange succeeds, since PKCE only protects the authorization request itself
> - [ ] The exchange succeeds as long as the attacker also supplies the correct redirect URI
> - [ ] The exchange is refused, but only when the intercepting party is itself a registered client ^card-6p99

Why does intercepting the redirect never expose what's needed to redeem the code it's carrying? :: Only the challenge — a one-way derivation of the verifier — ever travels on the authorization request that gets redirected. The verifier itself is withheld until the separate exchange at the token endpoint, so capturing the redirect captures the code but not the one value that could still redeem it. ^card-gn49

PKCE was designed with public clients in mind, but current guidance
recommends it for ==confidential== clients as well, since a code can ^card-6tm5
leak in ways that have nothing to do with whether a client can hold a
credential — a stray log line, a referrer header, a misconfigured
proxy — and a freshly generated, never-transmitted verifier defeats that
leakage regardless of which kind of client it happens to. (The old
implicit flow, which skipped the code exchange entirely, was retired
for reasons of its own that go beyond this.)
