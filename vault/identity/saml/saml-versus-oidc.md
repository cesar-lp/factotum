---
topic: identity
category: identity-saml
tags: [saml, oidc, federation, trust-model, protocol-comparison]
citations: ["OASIS SAML 2.0 Core", "OASIS SAML 2.0 Profiles"]
---

# SAML versus OIDC

`id-tokens-and-oidc.md` and `the-authorization-code-flow.md` already
cover what OIDC actually does — its token, its claims, its redirect
sequence. This note takes that mechanism as given and asks a different
question: of everything that differs between SAML and OIDC, which
differences change what actually gets built, and which one usually
ends up deciding the choice.

Format and era are the most visible difference, and the least useful
one to argue about. SAML is XML, shaped by an enterprise world where
documents got signed and exchanged between institutions long before
REST APIs existed. OIDC is JSON, carried over ordinary web redirects
with a token endpoint, specified after mobile apps and browser-based
single-page apps were already the normal shape of a client.

SAML's XML, document-signing shape ==predates== the REST-and-JSON web ^card-faef
almost entirely, which is why it still reads like a format built for
mail between institutions rather than for a browser tab.

Where the two diverge in practice, more than in format, is how trust
gets set up in the first place. A SAML relationship is built by two
parties deliberately exchanging configuration — metadata files,
certificates pinned by hand on both sides — so a SAML federation is a
fixed set of pairings, each one set up on purpose, one at a time.

An OIDC integration instead starts by fetching the provider's
==discovery== document from a well-known URL, which lists its ^card-1vbm
endpoints and where to find its current signing keys, rotated on the
provider's own schedule rather than pinned by the relying party.

Why is it fair to say a SAML federation is "a set of deliberate pairings" while an OIDC integration is "closer to pointing at a URL," even though both end with a service trusting an identity provider? :: Because a SAML trust relationship has no equivalent of a published discovery source — the two sides exchange metadata and pin each other's certificates by hand, and there's no self-updating document either side can just point at later. An OIDC relying party instead reads a published endpoint listing and refreshes keys automatically, so onboarding a new provider looks much more like consuming a URL than negotiating a bespoke bilateral setup. ^card-0aya

That difference in how trust is set up shows up again in what actually
arrives at the service during a login. A SAML identity provider hands
back a signed XML document that the user's browser itself posts
straight to the service. An OIDC provider hands back a code, and the
code is redeemed for tokens in a direct call the browser never sees.

A client redeems an authorization code for tokens over a channel the browser never touches. A SAML assertion has no equivalent redemption step — why does it have to be self-contained and signed for direct delivery, when an OIDC code can get away with being a short-lived, opaque reference instead? :: Because nothing in a SAML exchange calls the identity provider back to redeem anything — the browser posts the assertion straight to the service, so it has to carry everything the service needs to trust it, signature included, in that one document. An OIDC code can be a bare reference precisely because it's never trusted on its own; it only becomes meaningful once the client presents it directly to the token endpoint, a step SAML's browser-post model has no room for. ^card-i3ol

None of that says where each protocol actually lives today. SAML
remains entrenched in enterprise and education, because that is where
the identity providers and the procurement relationships already are.
OIDC is entrenched in consumer, mobile, and API-shaped work, because
that is the world it was specified for.

> [!card] mcq
> A university IT department runs an identity provider already used
> by a dozen partner institutions, all connected years ago through
> exchanged XML metadata files and pinned certificates. A new campus
> portal needs single sign-on against that same identity provider.
> Which protocol fits with the least new work, and why?
> - [x] SAML — the identity provider and its partners already speak it, so adding the portal is one more pairing into an existing federation
> - [ ] OIDC — JSON is inherently simpler to parse than XML, regardless of what the identity provider already speaks
> - [ ] OIDC — mobile-era protocols are always the better choice for a brand-new integration
> - [ ] Neither; the identity provider should be replaced before adding any new service ^card-yqlb

> [!card] mcq
> A small startup is building a mobile app with social login and no
> enterprise customers, current or planned. Someone suggests
> supporting SAML "in case a big customer ever asks for it." What's
> the honest assessment?
> - [x] Skip it for now — a greenfield consumer app choosing SAML ahead of need is making work for itself; OIDC already fits a mobile, API-shaped product, and SAML support can be added later if an enterprise customer's identity provider actually requires it
> - [ ] Build SAML support now, since supporting both protocols from day one is always safer
> - [ ] Build SAML support now, since SAML is the more modern, actively developed specification
> - [ ] Skip SAML forever — it is deprecated and no enterprise identity provider still requires it ^card-8vq0

> [!card] recall
> Someone asks which protocol, SAML or OIDC, is simply the better one
> to standardize on. What's the honest answer, and what actually
> decides the choice in a given situation?
> ---
> Neither is the newer-and-therefore-better option. SAML is not
> deprecated, and for an enterprise whose identity provider only
> speaks SAML, it's often the only option on the table. A greenfield
> consumer application choosing SAML anyway is creating work it
> doesn't need. What decides the choice in practice is usually who
> runs the identity provider a given service has to trust — not which
> specification a team finds more appealing. ^card-n3cr
