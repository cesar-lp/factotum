---
topic: identity
category: identity-auth0
tags: [auth0, management-api, authentication-api, m2m, scopes]
citations: ["Auth0 Docs — 'Authentication API'", "Auth0 Docs — 'Management API'", "Auth0 Docs — 'Access Tokens for the Management API'"]
---

# Management API versus Authentication API

A lot of confusion about "calling Auth0" resolves the moment you name
which of its two APIs you actually mean, because they exist for
opposite audiences and behave nothing alike.

The Authentication API is the one every end-user login flow talks to —
its `/authorize`, `/oauth/token`, and `/userinfo` endpoints are what
issue and describe tokens for a real person signing in. It's meant to
be reached from a browser or a mobile app, and `identity-oauth`'s notes
on the authorization code flow and token validation cover what happens
on that side in detail — this note doesn't repeat it.

The Management API is a completely different surface: it administers
the tenant itself. Creating a user, assigning a role, reading a
profile, updating a connection's settings — all of that goes through
it, not through anything an end user's login ever touches.

What does the Auth0 Management API let you do that the Authentication API does not? :: Administer the tenant's own configuration and data as an operator — create and update users, assign roles, read profiles, change connection settings, and similar tenant-management operations, as opposed to running an end user's own login and token issuance. ^card-qix9

Because it's a different API, it needs its own token, and that token is
requested against its own audience: every Management API call expects
an access token whose audience is ==https://<tenant-domain>/api/v2/==, ^card-5tkg
distinct from any audience an application's own resource server uses.

Getting that token is itself an M2M problem, not a user-login problem —
there's no person to authenticate against the tenant's own
administration surface. `client-credentials-and-machine-to-machine.md`
covers the grant mechanics; here, what matters is that a Machine to
Machine application is registered specifically to call the Management
API, authorized against it with an explicit, deliberately chosen set of
scopes, and it's that application's client credentials — not any
end user's session — that obtain the token.

That deliberateness matters because Management API scopes are coarse
and dangerous by vault standards. A scope like ==update:users== doesn't ^card-8m3h
mean "update one field the app owns" — it means write access to every
user in the tenant. An M2M client should hold only the scopes it
actually exercises, not a broad grant kept around in case something
later needs it, because every scope it holds is exactly what an
attacker gets if that client's credentials leak.

Why are Management API scopes described as "coarse and dangerous" compared to a typical application-level permission? :: Because a Management API scope like read:users or update:users doesn't limit access to one resource or one record — it grants that operation across every user (or connection, or role, and so on) in the whole tenant. Holding a scope you don't actually use turns a credential leak into tenant-wide exposure rather than something narrowly scoped. ^card-xwmh

Two mistakes follow from forgetting which API is which.

> [!card] mcq
> A team ships a single-page application that calls the Management API
> directly from the browser to look up a user's roles, using client
> credentials embedded in the frontend bundle. What's wrong with this?
> - [x] It ships credentials capable of administering the entire tenant to anyone who can read the bundle, since the Management API has no concept of a reduced, browser-safe credential
> - [ ] Nothing — the Management API is designed to be called from any client type, the same as the Authentication API
> - [ ] It would work, but only after the SPA is registered as a confidential client instead of a public one
> - [ ] The call would simply fail CORS and nothing more, with no security exposure either way ^card-cn59

The second mistake is treating the Management API as a place to serve
runtime traffic from — reading a user's profile on every request an
application handles, say, instead of caching what a token already
carries or maintaining the application's own store. Its ==rate limits== ^card-vz98
make that untenable at any real request volume: they're sized for
occasional administrative operations, not for standing in as a
database behind a live application.

Why does using the Management API as a runtime data store for an application fail, independent of any scope or authentication mistake? :: Its rate limits are set for infrequent administrative calls, not for per-request application traffic — a live application reading it on every request will get throttled well before it reaches ordinary production load. It's a control plane for administering the tenant, not a substitute for the application's own database. ^card-dzw9
