---
topic: identity
category: identity-saml
tags: [saml, metadata, trust-model, key-rotation, federation]
citations: ["OASIS SAML 2.0 Metadata", "OASIS SAML 2.0 Core"]
---

# SAML Metadata and Trust Establishment

An identity provider and a service provider have to agree on a pile
of configuration before either one can accept a message from the
other: where to send things, how to address the sender, which key
signed what. Metadata is the document each side publishes so the
other can be configured without a phone call.

A metadata document names the participant with an ==entityID==, a URI ^card-ve96
that identifies who is speaking rather than where a message should be
delivered.

Beyond that name, the same document lists the endpoints a message
should be sent to, which bindings the participant supports for
delivering it, and the public keys it will use to sign or decrypt.

What does a SAML metadata document publish about a participant, beyond the URI that names it? :: The endpoints where messages should be sent, the bindings supported for delivering them, and the public keys the participant will use to sign or decrypt. ^card-ssan

Now the part worth understanding properly, because it breaks from how
trust usually works elsewhere on the web. SAML trust is ==direct==. ^card-sk00

Each side is configured with the exact key the other one will use —
not a policy for discovering that key, the key itself, handed over out
of band and dropped straight into the other party's configuration.

> [!card] mcq
> A relying party validating a SAML assertion's signature needs to
> decide which key to trust for that signature. How does it decide?
> - [x] It already has that specific key configured, handed to it directly by the signing party — there is no chain to walk and no third party to ask
> - [ ] It builds a chain from the signing certificate up to a trusted root, the same way a TLS client does
> - [ ] It queries a well-known endpoint at connection time to fetch the current signing key
> - [ ] It trusts any key presented, since SAML has no concept of key validation ^card-gneu

Because there is no authority in the path vouching for the key, a
self-signed certificate carries no red flag in SAML the way it would
in a browser validating a TLS chain. The certificate here is just a
container for a key both sides were separately told to expect, not a
claim some third party is backing.

> [!card] recall
> Explain why a self-signed certificate is normal and unremarkable in
> a SAML deployment, when the same thing would be a serious warning
> sign for a TLS certificate presented by a public website.
> ---
> A TLS client has no prior relationship with the site it's connecting
> to, so it relies on a chain up to a CA already sitting in its trust
> store to decide the key is legitimate; a self-signed leaf skips that
> vouching entirely, which is exactly the failure mode chain validation
> exists to catch. A SAML relying party never walks a chain at all — it
> was configured in advance with the specific key it should see, out of
> band. The certificate is only a wrapper carrying that already-trusted
> key, so whether it happens to be self-signed says nothing about
> whether the key inside it is the right one. ^card-ct3x

Directness has an unglamorous consequence: nothing about a SAML key
renews itself.

Why does nothing about a SAML relationship's signing keys "renew itself" the way a JWKS-based setup might? :: There is no discovery step for either side to repeat — each party's copy of the other's key is a static piece of its own configuration, set once out of band. When a key changes, that configuration has to be edited by hand on both sides; nothing is fetched or re-resolved automatically the way a service consulting an issuer's published key set would. ^card-ojrs

A federation of even a handful of parties turns that structural fact
into its real operational headache: not designing the trust model,
but coordinating the update.

> [!card] mcq
> One IdP in a SAML federation rotates its signing key. What has to
> happen for every service provider trusting that IdP to keep working?
> - [x] Each service provider's own configuration must be updated by hand with the new key — nothing propagates on its own
> - [ ] Nothing — the new key is discovered automatically the next time a signature is verified
> - [ ] Only the service providers whose certificates are about to expire need to act
> - [ ] The identity provider pushes the new key to a shared registry that all service providers poll ^card-vn14
