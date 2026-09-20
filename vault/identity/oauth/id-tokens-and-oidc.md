---
topic: identity
category: identity-oauth
tags: [oidc, id-token, authentication, claims, jwt]
citations: ["OpenID Connect Core 1.0"]
---

# ID Tokens and OpenID Connect

OAuth 2.0 only ever answers one kind of question: may this application
perform some action on the resource owner's behalf. It has nothing to
say about who that resource owner actually is, and for years people
answered that second question anyway, by treating a successful
authorization as if it were also a login. OpenID Connect (OIDC) is the
fix — a thin authentication layer specified on top of OAuth, not a
competing protocol.

The piece OIDC adds is the ID token: a signed set of claims describing a
specific authentication event, minted for the application to read
directly. It happens to be a signed JWT, but its structure as a token
format belongs to a different note — what matters here is what it
asserts and who it's addressed to.

Who it's addressed to is exactly where the confusion starts. An ID
token names the application as its intended reader.

Handing an ID token to an API as though it authorizes anything is a
mistake, because nothing about it grants permission to call that API —
it happens to be a JWT that some poorly-written server will decode
without checking, and decoding is not the same as being entitled to
accept it.

> [!card] mcq
> A backend service receives a request with an ID token in the
> Authorization header, instead of an access token. The service can
> decode it and see a valid signature and a readable set of claims.
> What should it do?
> - [x] Reject the request — an ID token is minted for the application to consume, not as proof of authority to call an API
> - [ ] Accept it, since the signature is valid and the claims are readable
> - [ ] Accept it only if the claims name an existing account
> - [ ] Accept it, because a valid JWT is sufficient identification for any service that trusts the issuer ^card-ap8q

The mirror-image mistake runs the other way. An application that wants
to know who authenticated should never go looking inside an access
token to find out.

Why is it a mistake to read a user's identity out of an access token, even when the token happens to contain a recognizable identifier? :: An access token is addressed to a resource server, not to the application, and exists to authorize an API call rather than to assert who authenticated. Whatever fields it happens to carry are an implementation detail of that resource server, not a contract the application can rely on — the only identity-claims contract OIDC defines lives in the ID token. ^card-pdua

Both mistakes look harmless in the moment — the wrong artifact gets
accepted, the call succeeds, nobody notices — right up until an
authorization server changes an internal format and every workaround
built on reading the "wrong" fields breaks at once.

Each ID token carries a fixed set of standard claims. `iss` names the
issuer that authenticated the user. `sub` names the user themselves,
with a stability guarantee worth its own paragraph below. `aud` names
the application the token was minted for — the intended reader
established above. `iat` and `exp` bound how long the token should be
treated as fresh.

`auth_time` is a fifth claim worth separating out: it records when the
authentication event itself happened, which is not the same moment as
`iat`. A long-lived session can reissue a token with a fresh `iat`
while `auth_time` still points back to whenever the user actually
entered credentials.

> [!card] recall
> Name the standard ID token claims that answer: who issued this, who
> is it for, when was it issued, when does it expire, and when did the
> user actually authenticate. Which pair looks redundant at first
> glance, and why isn't it? ^card-sric

One of those claims deserves special attention, because it's the field
applications reach for as the durable handle on "this is the same
person as before."

That identifier is the ==subject== claim — a value the issuer commits ^card-5d9e
to keeping stable for a given account for as long as the issuer
relationship exists.

An email address looks like it would work just as well for that
purpose, and it fails in ways that only show up later.

Why shouldn't an application key its user records on an email address instead of the identifier claim meant for that purpose? :: Email addresses change hands — people update them, employers reassign them, providers let old ones lapse and get reissued to someone else — while the identifier claim is defined specifically to stay fixed to one account for the life of the issuer relationship. Keying storage on email means a legitimate change silently orphans a user's history, or worse, a reissued address inherits somebody else's account. ^card-aq8j

The claims above cover what fits inside the token, but OIDC doesn't try
to cram every fact about a person into it. A profile picture, a phone
number, locale preferences — anything beyond the core claims — is
fetched separately, on demand.

An application does that by presenting its access token to the
==userinfo== endpoint, which returns those additional claims as a ^card-j31k
plain response rather than folding them into the signed token.

> [!card] recall
> Two artifacts exist after an OIDC flow finishes. One is addressed to
> the application and asserts who authenticated and when. The other is
> addressed to a resource server and authorizes calling it. Which is
> which, and what goes wrong if an application swaps their roles?
> ---
> The ID token is addressed to the application; the access token is
> addressed to the resource server. Swapping them means either sending
> a non-credential to an API, which a correctly written API should
> reject, or trying to derive identity from an artifact that was never
> defined to carry a stable, contractual identity claim. ^card-8aki
