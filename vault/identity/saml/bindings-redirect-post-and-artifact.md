---
topic: identity
category: identity-saml
tags: [saml, bindings, relaystate, redirect, artifact]
citations: ["OASIS SAML 2.0 Bindings", "OASIS SAML 2.0 Profiles"]
---

# Bindings: Redirect, POST, and Artifact

A binding is how a SAML message physically travels between the two
parties, and the choice of binding is driven by one thing: what has to
happen to the message before it can survive that trip.

HTTP-REDIRECT deflates and encodes the message and packs the result
into a URL query parameter, riding along on an ordinary redirect. That
parameter is subject to the length limits browsers and intermediate
servers impose on URLs, which is exactly why this binding carries the
small AuthnRequest rather than a signed Response — a request is short
enough to survive compression into a query string, and a signed
Response, padded out by its signature, is not a safe bet against that
same limit.

HTTP-POST instead places the message as a field in an HTML form on a
page that auto-submits itself, which has no comparable size ceiling to
worry about. That headroom is what lets it carry the far larger signed
Response, where Redirect's URL-length constraint would be a real risk.

Why can't HTTP-REDIRECT just carry every message, including a large signed Response, since compression already shrinks it before it goes into the URL? :: Because compression reduces the size, it doesn't remove the ceiling — a URL still has a length limit that browsers and intermediate servers enforce, and a large signed Response can still exceed it even deflated. HTTP-POST's form field carries no such ceiling at all, which is why the larger message goes there instead. ^card-e7fn

HTTP-ARTIFACT sends neither the request nor the response itself through
the browser. Instead the browser only carries a short ==reference==, ^card-xbx4
which the receiving party then takes back to the sender directly,
outside the browser, to retrieve the actual message. Because the
payload itself is fetched over that direct channel, it never passes
through the user agent at all — the cost is that the two servers now
have to be able to reach each other, which the browser-only bindings
never require.

Given a fully populated, signed SAML Response and a hard constraint that it must never appear anywhere in the browser, which of the three bindings satisfies that constraint, and why do the other two fail it regardless of message size? :: HTTP-ARTIFACT, because it hands the browser only a short reference and fetches the real message over a direct server-to-server exchange. HTTP-REDIRECT and HTTP-POST both fail the constraint independent of size — both put the actual message through the browser itself, one in a URL and one in a form field, so the browser sees the payload either way. ^card-thc0

> [!card] mcq
> A SAML message is small enough to survive URL-length limits after
> compression, and there is no requirement to keep it off the browser.
> Which binding is the ordinary choice, and what property of the
> message made HTTP-POST unnecessary here?
> - [x] HTTP-REDIRECT — the message is small enough that packing it into a query parameter doesn't risk truncation, so POST's larger headroom buys nothing
> - [ ] HTTP-ARTIFACT — any message small enough to fit in a URL should be kept off the browser entirely
> - [ ] HTTP-POST — forms are always preferred once the message is confirmed to be well under any size limit
> - [ ] HTTP-REDIRECT — because Redirect is required for every request regardless of size ^card-aosu

Separately from how a message travels, a SAML exchange carries
==RelayState== alongside it: an opaque value the receiving party echoes ^card-36s7
back completely unchanged, whose job is to let the sender pick up where
the user's browser left off once the round trip finishes.

Because RelayState makes that round trip through the browser exactly
like the message itself does, the party that gets it back has to treat
it exactly the way anything else arriving via that path is treated:
assume it could have been read or replaced in transit, and never place
anything in it whose value depends on staying secret.

Why must the value that survives a round trip through the browser between request and response never carry confidential content, no matter how convenient it would be to stash it there? :: Because a value carried through the browser is exposed the same way anything else routed through it is — visible in the browser's own history and to whatever sits on the path — so anything placed there has to be safe to have seen, not merely useful for remembering the user's destination. ^card-c8ry

> [!card] recall
> Name the three bindings covered here and, for each, state in one
> sentence the mechanical fact that decides when it gets used — not
> which SAML message type "belongs" to it as a rule, but the physical
> constraint driving the choice.
> ---
> HTTP-REDIRECT packs the message into a URL query parameter after
> compression, so it's chosen when the message is small enough to stay
> safely under URL-length limits. HTTP-POST places the message in an
> auto-submitting form field instead, removing that size ceiling, so
> it's chosen when the message is too large to trust to a URL.
> HTTP-ARTIFACT sends only a short reference through the browser and
> fetches the real message through a direct exchange between the two
> servers, so it's chosen when the requirement is that the message never
> appear in the browser at all, regardless of its size. ^card-oppr
