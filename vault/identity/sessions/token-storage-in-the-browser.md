---
topic: identity
category: identity-sessions
tags: [token-storage, local-storage, backend-for-frontend, script-injection, in-memory]
citations: ["OWASP Session Management Cheat Sheet", "OWASP Cross-Site Request Forgery Prevention Cheat Sheet"]
---

# Token storage in the browser

Deciding where a browser-based application keeps its session
credential is often framed as picking the best storage location. It's
more accurate to see it as choosing which of two different attacks the
credential is exposed to, because no location in the browser is immune
to both.

Keep the credential in localStorage or sessionStorage and any script
running on the page — including one that has no business touching
authentication — can read it, because both are ordinary
JavaScript-accessible storage with no restriction based on which
script is asking.

What can read a credential stored in localStorage or sessionStorage, and what does a single script injection cost the application that stores it there? :: Any script running on the page, regardless of what it's actually there to do — neither storage mechanism restricts access based on which code is asking. A single script injection is enough to read the value out and exfiltrate it once, and the credential stays compromised until it's revoked or expires, not just for the moment that script happens to run. ^card-1tmj

Put the credential in a cookie marked so page script cannot read it at
all, and that exfiltration path disappears — but the browser now
attaches the cookie to requests on its own, which is precisely the
property that enables request forgery, so the application takes on a
forgery defense as the price of closing the script-injection path.

> [!card] mcq
> A team moves its session credential from localStorage to an HttpOnly
> cookie. What has this move traded away, and what has it gained?
> - [x] It removes the script-injection exfiltration path, but the browser now attaches the credential automatically, which is exactly the property that enables cross-site request forgery
> - [ ] It removes both the script-injection exposure and the forgery exposure, since the credential is no longer readable by any script at all
> - [ ] It gains nothing, since a page script can still read any cookie regardless of how it is marked
> - [ ] It only matters for first-party scripts; a cross-site forged request would not be affected either way ^card-r60u

Keeping the credential ==in memory== only — a variable that lives ^card-uim8
inside the running page and nowhere else — avoids both exposure
surfaces at once: there's no persistent location for an injected
script to read from, and nothing for the browser to attach on its own
to an unrelated request. The cost is that it doesn't outlive a page
reload or survive being opened in a new tab, so the application has to
re-establish it every time the page context resets.

Why is keeping a session credential only in memory described as leaking the least of the in-browser options, despite being impractical for most applications on its own? :: Because it removes both exposure surfaces at once — there is no persistent, script-readable location and no ambient value the browser attaches to requests by itself — so neither a script injection nor a forged cross-site request has anything to reach for. The cost is that the value is gone the moment the page reloads or a new tab is opened, so it has to be re-obtained on every reset of the page context, which is why it rarely stands alone for anything beyond a short-lived, single-tab flow. ^card-d6vx

The ==backend-for-frontend== pattern sidesteps the choice rather than ^card-pinq
resolving it: a server-side component holds the real credential, and
the browser holds only a conventional session cookie scoped to that
component, never the value a downstream API actually checks.

Why does backend-for-frontend count as avoiding the storage decision rather than picking a side of it? :: Because the credential a downstream API actually checks never reaches browser-accessible storage or page script context at all — it stays on the server-side component. The browser only ever holds a cookie tied to that intermediary, so neither the script-injection exposure of script-readable storage nor the forgery exposure of an automatically-attached credential ever applies to the real credential; the trade is pushed onto infrastructure instead of being made in the browser. ^card-q7p0

> [!card] recall
> A browser-based application needs to keep a session credential
> somewhere. Lay out the exposure each in-browser option carries —
> script-readable storage, a cookie page script cannot read, and an
> in-memory variable — and explain what lets backend-for-frontend avoid
> having to pick among them.
> ---
> Script-readable storage such as localStorage or sessionStorage is
> exposed to any script running on the page, so one injection leaks the
> credential permanently. A cookie page script cannot read removes that
> exposure but is attached to requests automatically by the browser,
> which is the exact property that enables cross-site request forgery,
> so it needs a forgery defense alongside it. An in-memory variable
> leaks the least of the three but survives neither a reload nor a new
> tab. Backend-for-frontend avoids the choice by keeping the real
> credential server-side entirely, so the browser never holds anything
> a script or a forged request could get real use out of. ^card-wnkr
