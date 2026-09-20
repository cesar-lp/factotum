---
topic: identity
category: identity-oauth
tags: [oauth, delegation, authorization, roles, authentication]
citations: ["RFC 6749 (OAuth 2.0 Authorization Framework)"]
---

# OAuth roles and the delegation problem

Before OAuth, an application that needed to act on a user's behalf
against some other service had exactly one option: ask for the user's
username and password directly, then log in as that user whenever it
needed access. That arrangement has three problems that compound each
other. The access it grants is unlimited — the application can do
anything the user could do, not just the one thing it was built for.
It's unrevocable on its own — the only way to cut the application off
is to change the password, which locks out every other application
sharing that same password too. And it's indistinguishable from the
user — the resource server sees the exact same login as the human, with
no way to tell which application is actually acting, or to hold it to a
narrower standard.

Why do the "unlimited access," "unrevocable," and "indistinguishable from the user" problems all trace back to the same root cause when an application is given the user's own password? :: All three come from handing over a credential that was designed to prove identity, not to describe a bounded permission. It carries no scope, no separate identity of its own, and no way to invalidate it without invalidating everything else that credential unlocks — so every one of these failures is really the same failure seen from a different angle. ^card-0g4f

OAuth replaces that shared secret with a ==delegated== ^card-rsup
authorization grant.

Instead of handing over the credential that proves who the resource
owner is, the resource owner directs an authorization server to issue
the requesting application a separate credential that proves only what
it's allowed to do, and for how long. That grant is scoped, it can be
revoked on its own without touching the resource owner's actual login,
and every request made with it is identifiable as coming from that
specific application rather than from the resource owner directly.

To make that handoff work, OAuth names four roles. The
==resource owner== is the party capable of granting access to a ^card-9oyx
protected resource, because it's theirs — ordinarily a person.

The client is the application requesting access on the resource
owner's behalf. The authorization server authenticates the resource
owner, collects their consent, and issues tokens. The resource server
holds the protected data and accepts those tokens as evidence of what
the caller is allowed to do.

Why does OAuth define the authorization server and the resource server as two separate roles instead of merging them into one? :: Because they solve different problems, on different schedules, and often for different operators. The authorization server's job — establishing who the resource owner is and what they've agreed to let the client do — happens once, up front. The resource server's job — deciding whether to honor a token on a given request — happens on every call afterward, without needing to know how consent was originally collected. Separating them lets one authorization server's tokens be honored by many resource servers, and lets a resource server enforce access purely from a token's face, with no involvement in how it was issued. ^card-1egv

> [!card] mcq
> A photo-printing application asks to read a user's photos stored with
> a separate photo-hosting service. The user approves the request on
> the photo-hosting service's own login page, and the printing
> application is then given a token to fetch photos from the hosting
> service's API. Which role does the photo-hosting service's API itself
> play?
> - [x] Resource server
> - [ ] Authorization server
> - [ ] Client
> - [ ] Resource owner ^card-p979

> [!card] mcq
> A resource owner granted a client access to their calendar through
> OAuth. They now want to cut off just that one client while leaving
> their own login, and every other connected application, untouched.
> What property of the grant makes that possible?
> - [x] The client holds a separate, scoped credential distinct from the resource owner's own login, so revoking it doesn't touch that login
> - [ ] The resource owner changes their password, which happens to affect only that one client
> - [ ] OAuth grants automatically expire the first time they're used
> - [ ] The authorization server and resource server share one revocation list keyed by password ^card-wze1

This whole structure is easy to mistake for something it isn't. OAuth
2.0 is a delegated *authorization* framework — it answers "what is this
application allowed to do" — not an authentication protocol, which
would answer "who is this person."

> [!card] recall
> OAuth 2.0 is often summarized as being "not an authentication
> protocol." Explain the mistake that warning is aimed at, and name the
> standard built specifically to add authentication on top of OAuth.
> ---
> The mistake is treating a successful token grant — the client
> obtaining an access token — as proof of the resource owner's
> identity, and logging the user in on that basis. A token only proves
> that some scope of access was authorized; it was never designed to
> carry a verified identity, which made this practice error-prone and
> inconsistent across implementations. OpenID Connect was built on top
> of OAuth 2.0 specifically to add a standardized authentication layer,
> so applications would no longer need to improvise identity out of an
> access grant. ^card-w7xh
