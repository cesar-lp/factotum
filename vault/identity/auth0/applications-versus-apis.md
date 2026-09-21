---
topic: identity
category: identity-auth0
tags: [auth0, application, api, audience, client-id, opaque-token]
citations: ["Auth0 Docs — 'Applications'", "Auth0 Docs — 'APIs'", "Auth0 Docs — 'Application Types'"]
---

# Applications versus APIs

`tenants-and-the-auth0-domain.md` covers the container everything below
lives in; this note covers the two kinds of thing you register inside it.
Auth0's dashboard treats "Applications" and "APIs" as separate tabs for a
reason — they represent opposite ends of a token's journey, and treating
them as interchangeable registration forms is the most common beginner
mistake in an Auth0 tenant.

An **Application** is a client: something that asks for tokens on a
user's or its own behalf. Registering one gives you a client_id, a
setting for allowed callback and logout URLs, and a list of grant types
the application is permitted to use — the mechanics of any one of those
grants (the authorization code flow, PKCE) belong to
`identity-oauth`, not here.

QA: What does registering something as an Application in Auth0 actually represent, as opposed to registering it as an API? :: An Application represents a client — the party asking for a token, whether that's a browser app, a mobile app, or a backend service. It's defined by how it authenticates itself and where it's allowed to send users, not by what it does with a token once it has one. ^card-75x4

An **API**, by contrast, is a resource server: something that *receives*
tokens and has to decide whether to honor them. Registering one gives it
an identifier — a URI you choose, which becomes the ==audience== value ^card-j008
clients request tokens for — and a signing algorithm, which governs how
the tokens minted against that identifier are verified.

Why does an Auth0 API registration need its own identifier separate from any Application's client_id? :: Because the identifier names the resource server a token is meant for — the audience — which is an entirely different question from which client asked for the token. A client_id identifies who's asking; an API identifier identifies who's supposed to receive what gets issued. ^card-2dua

Auth0 offers several Application types — Single Page Application, Native,
Regular Web App, and Machine to Machine — and the choice among them isn't
cosmetic labeling. It decides whether the application can hold a
==client secret== at all: a Regular Web App or a Machine to Machine ^card-1ze1
application runs on infrastructure its operator controls and gets one, while
a Single Page Application or Native app ships its code to the end user's
browser or device and does not. That single fact cascades into which
grant types the application is even allowed to use, since any grant that
authenticates the client with a secret is off the table for a type that
was never issued one.

> [!card] mcq
> A team registers a browser-based single-page application in Auth0 and
> later tries to configure it to use the client credentials grant, which
> requires the caller to authenticate with a client secret. What happens?
> - [x] It isn't possible — a Single Page Application is a public client type with no client secret, so no grant that authenticates via a secret is available to it
> - [ ] Auth0 issues a client secret on request for any application type, so this works once requested
> - [ ] It works, but the secret is sent to the browser on first login and rotated automatically
> - [ ] It works only if the SPA also registers a custom domain ^card-rjy3

> [!card] recall
> Explain why an application's type in Auth0 (Single Page Application vs.
> Regular Web App vs. Machine to Machine) is a security-relevant choice
> rather than a UI label — what does it actually gate, and why can't a
> Single Page Application be reconfigured into having a client secret
> later? ^card-i761

The interaction between Applications and APIs that trips people up most
often is what happens when a client requests a token without specifying
an audience at all. With no API to mint the token against, Auth0 falls
back to issuing a token scoped only to reading the user's own profile
from Auth0's own endpoint — and that fallback token comes back
==opaque==, not as a JWT, because there's no resource server identifier ^card-770y
for a signed, self-contained token to be minted for in the first place.

Why does a token requested with no audience parameter come back as an opaque string instead of a JWT that a resource server can validate? :: Because the audience names which registered API the token is meant for, and without one, Auth0 has nothing to mint a resource-server-scoped, self-contained token against — it falls back to a token for Auth0's own user-profile endpoint instead, which is opaque by design rather than a signed JWT carrying claims a downstream API could verify. ^card-r1vk

That fallback is the root cause behind the single most common Auth0
support question — "my access token isn't a JWT" — and the fix is always
the same: the client has to request a token for a specific, registered
API by passing that API's identifier as the audience, at which point
Auth0 has a signing algorithm and a resource server identity to mint the
token against, and it comes back as a JWT the API can validate on its own
using the checks covered in `token-validation-at-the-resource-server.md`.
