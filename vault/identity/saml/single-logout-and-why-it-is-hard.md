---
topic: identity
category: identity-saml
tags: [saml, single-logout, front-channel, back-channel, partial-logout]
citations: ["OASIS SAML 2.0 Core", "OASIS SAML 2.0 Profiles"]
---

# Single Logout and Why It Is Hard

Single logout promises that ending a session in one place ends it
everywhere. In practice it largely does not deliver on that promise,
and the reason starts well before any protocol detail: a user who
signed in to several service providers through one identity provider
does not have one session to end. Each SP established and holds its
own local session independently, so "log the user out" is really
"reach every one of those SPs and get each one to end its own record"
— a fundamentally different, and much harder, problem than ending a
session at a single application.

Why is single logout a genuinely hard problem, rather than a feature that a better-specified protocol could simply deliver? :: Because there is no single session to terminate — each service provider the user visited established and holds its own independent local session, so ending "the" session really means separately reaching every one of those service providers and getting each to end its own record, and any one of them can be unreachable, slow, or unresponsive when that attempt is made. ^card-sp4w

Two shapes exist for making that attempt, and they differ in exactly
where the unreliability shows up.

In ==front-channel== logout, the identity provider drives the user's ^card-b322
own browser through each service provider in turn, so every one of
them receives its logout request as a step the browser is redirected
through.

That chain is only as strong as its weakest link: if any single
service provider along the way is slow to respond, broken, or simply
never finished loading in the browser, the chain stalls right there.

> [!card] mcq
> A user logs out and the identity provider begins driving their
> browser through five service providers in sequence to notify each
> one. The third service provider's logout endpoint hangs and never
> returns. What is the resulting state for the user?
> - [x] Stranded mid-chain — the first two service providers had their sessions ended, the third is unresolved, and the fourth and fifth were never reached at all
> - [ ] All five sessions end anyway, since the identity provider tracks the chain independently of the browser
> - [ ] Only the third service provider's session survives; the rest end normally
> - [ ] The browser automatically skips the unresponsive service provider and completes the rest of the chain transparently ^card-j9l8

The alternative moves the requests off the user's browser entirely.
In ==back-channel== logout, the identity provider calls each service ^card-cxr0
provider directly, server to server, with nothing routed through the
browser and nothing for the user to sit through or get stuck in the
middle of.

That directness is also what makes it more robust than driving the
user's browser through every stop — but robustness here isn't free:
it depends on every one of those service providers having implemented
a listener for this kind of request in the first place, and being
reachable when the identity provider calls it.

> [!card] mcq
> Comparing front-channel and back-channel single logout, what does
> back-channel logout require that front-channel logout does not?
> - [x] Every service provider must implement a server-to-server logout endpoint and be reachable when the identity provider calls it directly
> - [ ] The user's browser must remain open and connected until every service provider responds
> - [ ] The identity provider must know the user's session state at each service provider in advance
> - [ ] Service providers must share a single logout endpoint with each other ^card-rwcg

Whichever shape is used, the outcome that a deployment should expect
as *normal*, not exceptional, is ==partial logout==: some service ^card-3e93
providers end their session, and some do not, because one was down,
one was slow, or one was never actually loaded in the browser to
receive its step of the chain.

The awkward part isn't just that partial logout happens — it's that, ^card-f7n9
from where any single service provider sits, there's no way to tell
it apart from complete success. Why can't a service provider tell the difference between "logout succeeded everywhere" and "logout succeeded only here"? :: Because each service provider only ever observes its own local outcome — that its own session was ended — and has no visibility into whether the identity provider's requests to every other service provider in the same logout also succeeded; "everywhere" is a property of the whole set, and no single member of that set is positioned to observe the whole set.

> [!card] recall
> Given that single logout can silently degrade to partial logout, and
> that a service provider has no way to detect when that has happened,
> explain why many real deployments deliberately choose short session
> lifetimes over relying on single logout as the mechanism that ends
> access promptly.
> ---
> A short-lived session bounds how long a session that single logout
> failed to end can remain usable, without depending on every service
> provider's logout endpoint working, being implemented at all, or
> being reachable at the moment it matters. Single logout is best
> effort by construction — no participant can confirm the others
> succeeded — so a deployment that needs a reliable bound on stale
> access gets it from expiry, which degrades predictably, rather than
> from a logout chain that degrades silently. ^card-enyy
