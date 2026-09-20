---
topic: identity
category: identity-saml
tags: [saml, assertion, sso, conditions, statements]
citations: ["OASIS SAML 2.0 Core"]
---

# SAML roles and the assertion

SAML names three actors, and it's worth being precise about what each one
does before anything else in this category makes sense. The **identity
provider** authenticates the person and is willing to make statements
about them. The **service provider** doesn't authenticate anyone itself —
it consumes those statements and decides, on the strength of them, what
access to grant. Neither of those two is the one carrying messages
between them.

The person sitting at the browser is not one of the two parties actively
negotiating trust — that's the IdP and SP's job. SAML calls this third
party the ==principal==: the user whose browser passes messages back and ^card-uyha
forth between the other two without itself being party to the trust
relationship.

What does the identity provider do, and what does the service provider do with what it produces? :: The identity provider authenticates the principal and issues statements vouching for facts about them. The service provider consumes those statements to decide what access to grant, without authenticating the user itself. ^card-y80z

The **assertion** is the whole point of SAML: the artifact everything else
in this category exists to produce, transmit, or check. It's an XML
document in which the identity provider states things it is willing to
vouch for about a given subject.

SAML's assertion is a ==signed== XML document, which is what lets a ^card-dk82
service provider act on it having never spoken to the identity provider
directly: the document vouches for itself.

An assertion can carry a `Subject`, a set of `Conditions`, and one or
more statements about the subject. In outline:

```xml
<saml:Assertion>
  <saml:Subject>...</saml:Subject>
  <saml:Conditions NotBefore="..." NotOnOrAfter="...">
    <saml:AudienceRestriction>
      <saml:Audience>https://sp.example.org</saml:Audience>
    </saml:AudienceRestriction>
  </saml:Conditions>
  <saml:AuthnStatement>...</saml:AuthnStatement>
  <saml:AttributeStatement>...</saml:AttributeStatement>
</saml:Assertion>
```

> [!card] recall
> An assertion can carry three kinds of statement. Name them, and name
> the one that's essentially a dead limb in real deployments. ^card-cfgo

> [!card] mcq
> An assertion says: "this subject authenticated at 14:02, using a
> password." Which statement kind is this?
> - [x] Authentication statement
> - [ ] Attribute statement
> - [ ] Authorization-decision statement
> - [ ] Condition ^card-bggu

An assertion says instead: "this subject belongs to the group ^card-3w5v
finance-admins." Which kind of statement is this, and how does its
purpose differ from an authentication statement's? :: An attribute statement — it asserts facts about the subject, rather than describing how or when they authenticated. The third kind, the authorization-decision statement, was meant to convey a yes/no access decision directly, but it's essentially unused in practice.

Conditions restrict when and to whom an assertion is valid, and both
restrictions matter independently: a `NotBefore`/`NotOnOrAfter` window
bounds the time, and an ==audience== restriction bounds the service ^card-npg7
provider it may be used at.

An assertion minted for one service provider can't be presented to a ^card-46ox
different one, even if both trust the same identity provider. Why not? :: Because the assertion's Conditions element names an audience restriction that scopes it to the intended SP. A different SP falls outside that audience and must reject the assertion even though it trusts the issuing IdP — trusting the issuer doesn't make an assertion addressed elsewhere valid here.
