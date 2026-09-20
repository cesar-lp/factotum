---
topic: identity
category: identity-sessions
tags: [csrf, request-forgery, synchronizer-token, same-site, state-changing-get]
citations: ["OWASP Cross-Site Request Forgery Prevention Cheat Sheet"]
---

# CSRF and request forgery

The mechanism behind cross-site request forgery starts with one fact
about cookies: a browser attaches a site's cookies to a request for
that site ==automatically==, regardless of what caused the browser to ^card-7mi1
send that request in the first place.

That means a page loaded from any other origin can cause the victim's
browser to issue a request to the target site — a form that
auto-submits, an image tag whose `src` points at a state-changing
endpoint — and the browser attaches the victim's cookies to it exactly
as if the request had come from the target site's own page:

```
<img src="https://bank.example.com/transfer?to=attacker&amount=1000">
```

The server receives a request carrying a completely valid, correctly
authenticated session cookie. It has no built-in way to tell that
request apart from one the user actually intended to make from the
site's own interface.

Why doesn't requiring authentication defend against this on its own? :: Because the forged request is authenticated — it carries the victim's real, valid session cookie, attached automatically by the browser. What's missing isn't proof of who the user is; it's proof that the site's own page, rather than some other page the victim happened to have open, produced the request. Authentication and that second guarantee are different things, and the defenses below exist to supply the one authentication doesn't. ^card-e97u

The standard defense, the ==synchronizer token== pattern, supplies ^card-9h0f
exactly that missing guarantee. The server embeds a secret value in
the page it renders — tied to the session, sometimes rotated per
request — and requires that same value to come back in the body of
any state-changing request. A cross-origin attacker's page can still
trigger the request, but it cannot read the token out of the victim's
page to include it, since that would mean reading a cross-origin
response, which the browser's same-origin rules block. The value only
has to be unguessable, the same requirement any secret handed out this
way carries; how it's generated isn't this note's concern.

A lighter variant, double-submit, skips server-side token storage
entirely: the server sets the token as a cookie, client-side script
copies that same value into the request body, and the server just
checks that the two match. It avoids keeping per-session state, but it
depends on an assumption the synchronizer pattern doesn't need — that
only the legitimate site can ever set that cookie in the victim's
browser. Anywhere an attacker can plant a cookie for the target's
domain, such as a loosely-controlled sibling subdomain, they can
satisfy both halves of the check themselves without reading anything
from the victim's page at all.

> [!card] mcq
> An attacker cannot read any response from the target site's origin,
> but can set cookies scoped to that site's domain from a script
> running on a loosely-controlled sibling subdomain. The target site's
> only request forgery defense is double-submit: a cookie value copied
> into the request body. Which statement is correct?
> - [x] The attacker can plant the same value as both the cookie and the submitted body value, satisfying the check without ever reading the victim's page
> - [ ] The defense still holds, because the attacker still cannot read the victim's page
> - [ ] A synchronizer token would be equally defeated by this same attacker capability
> - [ ] Double-submit is strictly stronger than a synchronizer token in this scenario ^card-qqve

SameSite cookie restrictions add a strong partial mitigation, blocking
the browser from attaching a cookie at all on many cross-site
requests — but partial is the operative word, not a reason to rely on
it alone. Its more permissive setting still lets a cross-site
top-level navigation, such as a plain link, carry the cookie along.
That gap is exactly why a state-changing GET endpoint is a design
error independent of which forgery defenses are in place: anything
reachable by a plain navigation, a redirect, or an image tag's `src`
is reachable by an attacker's page, with no form submission or script
execution required at all. A GET request must never change state,
full stop — every other defense here assumes that already holds.

> [!card] mcq
> A site applies its most permissive SameSite setting to its session
> cookie and adds no other request forgery defense. An attacker's page
> contains a plain link that, when clicked, performs a top-level
> navigation to a GET endpoint on the target site that deletes the
> logged-in user's account. What happens?
> - [x] The cookie is still attached, because a top-level cross-site navigation is exactly the case a lenient SameSite setting still allows — the real defect is a GET that changes state at all
> - [ ] The cookie is withheld, because SameSite blocks all cross-site requests regardless of how they are triggered
> - [ ] The request fails, because GET requests never carry cookies cross-site
> - [ ] SameSite alone fully prevents this regardless of how the endpoint is designed ^card-z8qm

A last layer checks the Origin or Referer header the browser sends
along with the request against the host the server expects, rejecting
a mismatch outright.

What does checking the Origin or Referer header on an incoming request defend against, and why is it treated as a supplementary check rather than a sole defense? :: It gives the server another way to tell whether a request actually came from its own page, by comparing the header the browser attached against the host it expects — a cross-site forged request typically carries the attacker's origin or none at all. It's supplementary because these headers can be missing or stripped by some legitimate client and proxy configurations too, so an absence isn't automatic proof of forgery; it works best layered alongside a token-based defense rather than in place of one. ^card-ezqv

OAuth's authorization flow has its own instance of this same forgery
pattern, defended by a mechanism specific to that flow — not this
note's concern.

> [!card] recall
> Name the distinct categories of defense against cross-site request
> forgery covered here, and for each one say what specific guarantee it
> supplies that a forged, cookie-authenticated request otherwise lacks.
> ---
> The synchronizer token pattern (and its weaker double-submit variant)
> supplies proof that the site's own page produced the request, since a
> cross-origin attacker cannot read, or in the stronger version cannot
> plant, the value needed to pass the check. SameSite cookie
> restrictions remove the browser's automatic attachment of the cookie
> for most cross-site requests in the first place, though not for a
> top-level navigation. Origin and Referer checking gives the server an
> independent, if imperfect, signal about where the request actually
> came from. None of them substitute for the underlying rule that a GET
> must never change state. ^card-55ic
