---
topic: identity
category: identity-saml
tags: [saml, sso, sp-initiated, idp-initiated, correlation]
citations: ["OASIS SAML 2.0 Bindings", "OASIS SAML 2.0 Profiles"]
---

# SP-initiated versus IdP-initiated SSO

A SAML login can start from either end, and which end it starts from is
not a matter of convenience — it changes what the service provider is
able to verify about the response it eventually gets back.

In the SP-initiated flow, the user arrives at the service provider
first. The SP has no session for them yet, so it issues an AuthnRequest
of its own, carrying a fresh identifier, and sends the user on to the
identity provider to authenticate.

When the identity provider finishes, it returns a Response, and that
Response carries ==InResponseTo== set to the identifier the SP put in ^card-ji14
its own request. The SP can check that value against the request it
remembers issuing, which is exactly what lets it confirm this credential
answers something it actually asked for, and lets it look up what the
user was trying to reach so it can send them there once login succeeds.

What does matching the returned Response's InResponseTo against its own issued request let the SP do for the user's original destination, beyond simply confirming the credential is genuine? :: It lets the SP look up the destination it recorded when it issued that request, so once login succeeds it can send the user on to the resource they originally tried to reach, rather than dropping them at some generic landing page. ^card-37n8

In the IdP-initiated flow, there is no earlier request for a Response to
answer. The user starts at the identity provider's own portal, picks an
application, and the IdP simply posts a Response at that service
provider directly.

Because nothing preceded it, that Response is ==unsolicited==: it has no ^card-fw31
matching identifier from the SP side at all, and the field that would
normally carry one is absent.

Why does an SP-initiated Response carrying InResponseTo let the SP do something an IdP-initiated Response structurally cannot? :: The SP-initiated Response's InResponseTo lets the SP match the credential against a request it remembers issuing, confirming this is an answer to something it actually asked for. An IdP-initiated Response has no prior request to match against in the first place, so there is nothing for the SP to correlate it to, no matter how carefully it checks. ^card-6cpw

An SP that accepts a Response with no preceding request is accepting a
credential it never asked for. Nothing is wrong with that by itself —
portal-driven login is a legitimate use case — but the SP has to treat
it deliberately rather than by default: honor unsolicited responses
only where it has explicitly opted in to that behavior, and never
assume that the destination such a response points the user toward is
safe just because the credential is valid (a valid login says nothing
about whether the follow-on redirect target was chosen safely). Keeping
the acceptance window for such a response tight cuts down how long a
captured one stays usable.

> [!card] mcq
> A service provider is configured to accept both SP-initiated and
> IdP-initiated responses. It receives a Response with no InResponseTo
> field at all. What is the correct interpretation?
> - [x] It's an unsolicited response the SP never requested, so the SP cannot check it against any request it remembers issuing
> - [ ] It's a malformed SP-initiated response and should be rejected outright
> - [ ] InResponseTo is optional in both flows and its absence carries no meaning
> - [ ] The SP should treat it as SP-initiated and search its own logs for a matching request ^card-w2j1

Why must a service provider treat the destination carried by an unsolicited response as untrusted input, even after the credential itself checks out? :: Because a valid credential only proves who the user is, not that the place the response is pointing them toward afterward was chosen safely — with no request of its own behind the response, the SP has no expectation of its own to check that destination against, so it has to validate it independently rather than following it on the strength of the login alone. ^card-0n5y

> [!card] recall
> Explain why SP-initiated login is preferred wherever a service
> provider has the choice, and what an SP that does support the
> IdP-initiated flow anyway has to do to keep that choice from becoming
> a weakness.
> ---
> SP-initiated login gives the SP its own request to check an incoming
> Response against, so it can confirm the Response answers something it
> asked for and know exactly where the user was headed. IdP-initiated
> login gives up that basis entirely — the Response arrives unsolicited,
> with nothing on the SP side to correlate it to. An SP that still wants
> to support it has to opt in deliberately rather than accept unsolicited
> responses by default, and must treat whatever destination such a
> response carries as untrusted rather than following it automatically. ^card-ak0q
