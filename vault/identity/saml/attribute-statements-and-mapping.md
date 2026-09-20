---
topic: identity
category: identity-saml
tags: [saml, attributes, mapping, groups, integration]
citations: ["OASIS SAML 2.0 Core"]
---

# Attribute statements and mapping

Attribute statements carry everything about a subject beyond who they
are, and they're where a SAML integration's real work — and its real
breakage — tends to live. Names, groups, department, entitlements:
whatever an application needs to make a decision beyond "is this person
authenticated" arrives here.

The same fact can arrive under wildly different names depending on which
identity provider sent it: a long ==URI==-style name from one, and a ^card-ia2k
short, human-readable name from another for the exact same underlying
fact.

Same fact, different name depending on the source IdP — what does that ^card-coal
mean for a service provider's integration code? :: It can't assume attribute names are standardized across identity providers in practice. It has to map whatever naming convention each IdP actually uses onto its own internal fields, and that mapping is typically per-IdP rather than universal.

A single attribute's value isn't guaranteed to be a lone scalar. It can
be ==multi-valued==: one attribute carrying more than one entry at once, ^card-jnpz
as when a user belongs to two groups simultaneously.

Code that reads a group-membership attribute expecting a single string ^card-z8jn
works fine in testing and then throws in production. What's the most
likely cause? :: The attribute turned out to be multi-valued for that particular user — someone in two groups instead of one — and the code was never written to handle a list of values instead of a lone string.

> [!card] recall
> Explain why mapping an identity provider's groups onto a service
> provider's roles is described as "the usual purpose and the usual
> failure" of attribute statements. ^card-afsi

> [!card] mcq
> An assertion arrives without an attribute the service provider expects
> to be there. What does OASIS leave up to the SP to decide, rather than
> prescribing a single correct behavior?
> - [x] Whether to refuse the login outright or admit the user with no permissions — the SP must pick one deliberately, in advance
> - [ ] The SP must always refuse the login when any expected attribute is missing
> - [ ] The SP must always admit the user and grant default permissions
> - [ ] The identity provider is responsible for retrying with the attribute included ^card-c6oi

A missing attribute leaves a service provider with two possible ^card-ums4
responses. Name them, and explain the risk of not choosing between them
deliberately ahead of time. :: It can refuse the login outright, or admit the user but grant no permissions. The risk of not deciding on purpose is that some accidental code path decides the answer instead, and the actual behavior gets discovered in production rather than designed in advance.
