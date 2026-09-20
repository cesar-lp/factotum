---
topic: identity
category: identity-saml
tags: [saml, nameid, identity, persistent, transient]
citations: ["OASIS SAML 2.0 Core"]
---

# NameID formats and user identity

Every assertion's `Subject` has to answer one question: who is this? The
NameID is that answer, and the format an integration picks for it is a
decision with consequences that outlast the integration that made it —
get it wrong and every downstream record keyed on that value inherits
the mistake.

The format that matters most for building a durable identity is
==persistent==: it returns the same opaque value for a given user on ^card-7r7b
every login from a given identity provider, which is exactly what makes
it usable as a primary key in the service provider's own user table.

The opposite design goal produces ==transient==: a fresh, unlinkable ^card-z1dt
value minted per session, so that two logins by the same person can't be
correlated by comparing NameIDs. That deliberate unlinkability is also
why it can never serve as a key — there's nothing stable to key on.

> [!card] mcq
> A service provider needs a value that stays the same across every
> login by a given user, suitable for looking up that user's row in its
> own database. Which NameID format fits?
> - [x] Persistent
> - [ ] Transient
> - [ ] emailAddress
> - [ ] Unspecified ^card-hsxr

An SP wants to let a user complete a single sensitive one-off action via ^card-xyij
SSO while explicitly avoiding any way to correlate that session with the
person's other visits. Which NameID format serves that goal, and why is
it unusable for anything the SP wants to persist? :: Transient — it mints a new value per session by design, specifically so sessions can't be linked. That same unlinkability is why the value can't be stored anywhere as a stable reference to the user; next login, it's different.

What does the unspecified NameID format promise about the value it ^card-miof
carries? :: Nothing in particular — it makes no guarantee about stability, uniqueness, or shape. The SP gets whatever string the IdP decided to send, with no format-level contract behind it.

> [!card] recall
> Using an email address as a user's primary identifier can break in two
> distinct ways — one when addresses change through ordinary life, and a
> worse one caused by a self-service email-change feature at the
> identity provider. Explain both. ^card-7dgf

Why is a self-service email-change feature at the identity provider ^card-1rnk
dangerous for a service provider that keys identity on the emailAddress
NameID format? :: Because a user could change their address at the IdP to one that currently identifies — or previously identified — a different account at the SP. The SP would then treat that incoming assertion as belonging to the account tied to that address, effectively handing over someone else's identity.

A NameID isn't a bare string with meaning on its own. It's ==scoped==: ^card-i5in
qualified by the identity provider that issued it, and sometimes by the
service provider it was issued for. Two different IdPs minting the
identical value therefore doesn't mean they're naming the same person —
the string only means something within its issuer's scope.
