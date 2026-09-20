---
topic: identity
category: identity-sessions
tags: [cookies, samesite, httponly, cookie-scope]
citations: ["OWASP Session Management Cheat Sheet", "RFC 6265bis (HTTP State Management)"]
---

# Cookie attributes and scope

`http-fundamentals.md` covers the basic mechanism: a server hands out a
value in `Set-Cookie`, and the browser resends it in the `Cookie` header on
later requests to that site. What that note doesn't cover is everything
that decides *how* that value behaves once it exists — and each attribute
below is best understood by the specific exposure it closes.

A cookie marked ==Secure== will only ever be sent over an encrypted ^card-0xvj
connection; over plain HTTP, the browser withholds it entirely, so a value
that never travels in the clear can't be picked off by anyone sitting on
the network path between client and server.

A cookie marked ==HttpOnly== is invisible to `document.cookie` and to any ^card-8kvs
other page script — it can still be sent as a normal request header, but
nothing running in the page can read or copy its value.

> [!card] mcq
> A site has a stored cross-site scripting flaw: an attacker's injected
> script now runs in the victim's browser, in the page's own origin, and
> tries `document.cookie` to steal the session value for exfiltration.
> Which single attribute defeats exactly this attempt?
> - [x] HttpOnly, since it hides the value from any script running in the page, regardless of how that script got there
> - [ ] Secure, since it only governs whether the cookie travels over plaintext connections
> - [ ] SameSite, since it only governs whether the cookie attaches to cross-site requests
> - [ ] Path, since it only narrows which URLs on the site receive the cookie ^card-y1oe

Dropping Secure creates a different exposure than dropping HttpOnly: describe what an attacker gains from a missing Secure attribute that a correctly-set HttpOnly attribute does nothing to stop. :: An attacker positioned on the network path — an open Wi-Fi network, a compromised router — can read the cookie directly off an unencrypted request, because Secure is what keeps it from ever being sent in the clear in the first place; HttpOnly only stops page scripts from reading it and has no effect on what travels over the wire. ^card-yot3

`SameSite` decides whether the cookie rides along on a request that
originates from another site, and its three values are not shades of the
same protection — they draw the line in different places. `Strict`
withholds the cookie on any cross-site request, full stop, including a
user simply clicking a link from another site into yours. `Lax` still
attaches it on that top-level navigation case, but withholds it on
cross-site subrequests like an embedded image or a background fetch. This
is one layer among several against cross-site request forgery, a topic
covered elsewhere in full.

> [!card] mcq
> A partner site links directly to an authenticated page on yours, and the
> click is expected to land the user already signed in — the cookie must
> attach on that very first cross-site navigation. Which SameSite setting
> would break this by withholding the cookie even on that top-level click?
> - [x] Strict — it withholds the cookie on any cross-site request, including top-level navigation
> - [ ] Lax — it still attaches the cookie on top-level cross-site navigation
> - [ ] None — it attaches the cookie on every cross-site request
> - [ ] None of them affect top-level navigation, only subrequests ^card-btou

The most permissive setting, `SameSite=`==None==, attaches the cookie to ^card-g18l
every cross-site request, subrequest and top-level navigation alike;
because that removes the cross-site restriction entirely, the
specification requires pairing it with Secure, and a browser receiving it
without that pairing discards the cookie outright rather than honoring a
maximally exposed setting over plaintext.

Scope is where the mistakes run the opposite direction from the
attributes above — people narrow those, but widen scope by accident.
Setting `Domain=example.com` on a cookie meant only for
`www.example.com` doesn't just cover that one host: it widens the
cookie's reach to *every* subdomain of `example.com`, including ones run
by other teams, third-party vendors, or infrastructure the cookie's owner
doesn't control — any of which can now read and send it.

`Path` looks like a similar scoping control but isn't a security boundary
at all: narrowing it to `/account` only changes which request URLs the
browser automatically attaches the cookie to. Any script running on the
same origin can read and write cookies across every path on that origin
through `document.cookie`, regardless of which path loaded the script, so
Path restricts automatic attachment on the wire without restricting
script access at all.

The ==__Host-== prefix collapses the scope decisions above into ^card-ttjn
browser-enforced constraints instead of conventions a developer can get
wrong.

A cookie carrying that prefix is rejected outright unless it also sets
Secure, omits `Domain` entirely — pinning it to exactly the host that set
it, never a wider set of subdomains — and sets `Path=/`.

```
Set-Cookie: __Host-session=abc123; Secure; Path=/; SameSite=Lax
```

> [!card] recall
> A cookie is set with `Domain=corp.example.com` from an app running at
> `app.corp.example.com`. An unrelated legacy app at
> `old.corp.example.com` turns out to receive this cookie on every
> request too. Explain why this happened, and name the prefix that would
> have made this exact mistake impossible for the browser to accept. ^card-v2zc
