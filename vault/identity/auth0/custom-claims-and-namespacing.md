---
topic: identity
category: identity-auth0
tags: [auth0, custom-claims, actions, oidc, namespacing]
citations: ["Auth0 Docs — 'User Profile Claims and Scope'", "Auth0 Docs — 'Create Custom Claims'"]
---

# Custom claims and namespacing

`actions-and-the-extensibility-pipeline.md` covers what a post-login
Action can do in general; this note covers the one thing almost every
Action ends up doing — adding a claim to a token — and the rule that
makes it fail silently if you get it wrong.

An Action sets a custom claim by writing to the token object it's
handed, something like `api.idToken.setCustomClaim(name, value)`. Give
that call an unqualified name like `roles`, and the Action reports
success, deploys cleanly, runs on every login — and the token it
produces never has the claim. Nothing throws. Nothing logs a failure.
The claim is just absent.

Why does an Action that calls setCustomClaim with an unqualified name like "roles" appear to succeed while the resulting token never carries the claim? :: Auth0 silently drops any custom claim whose name is not a namespaced URI — the Action runs to completion and returns normally, but the token-issuing step discards the claim rather than raising an error, so nothing in the Action's own execution log reveals the problem. ^card-cpj4

The fix is to give the claim a namespaced name instead: something
shaped like `https://myapp.example.com/roles` rather than `roles`. That
requirement isn't Auth0 being fussy about syntax — it follows from what
an ID token and an access token actually are. Both are OIDC and OAuth2
documents whose top-level claim names are drawn from one flat,
==shared== space across every issuer and every party that might ever ^card-hlns
read one, the way two unrelated programs can each define a variable
called `x` without colliding only because each keeps its own scope.

A handful of names in that flat space are reserved by the OIDC spec
itself — `sub`, `email`, `name`, and the rest of the standard claim set
— and those can be set unqualified, wherever the token type allows
setting them at all. Everything else is unclaimed territory that a
future spec revision, another vendor's integration, or a library
further down the request path might one day define with a different
meaning. An unqualified claim called `role` collides with that
territory the instant a standard `role` claim gets defined, or the
instant some other consumer of the same token already expects `role`
to mean something else. Auth0 refuses the ambiguity outright instead of
gambling on it, which is the entire reason the namespace requirement
exists.

Which OIDC claims are the exception — the ones that can be set unqualified rather than needing a namespaced URI? :: The OIDC standard claims, such as sub, email, and name — the small reserved set the spec itself already owns, so there is no shared-namespace collision to guard against for those specific names. ^card-4r39

The namespace string itself doesn't have to point anywhere. Auth0 never
fetches it, checks that it resolves, or cares whether a server answers
at `myapp.example.com`— the URI only has to look like one, so that its
prefix can't collide with anyone else's.

Does Auth0 require the custom claim's namespace URI to actually resolve to a real, reachable page? :: No — the namespace is never dereferenced. It only has to be a syntactically valid URI that nobody else is likely to also pick, which is why any domain you control (real or not) works as long as it's distinct. ^card-q8vt

A few hosts are carved out as namespaces specifically because Auth0
itself already uses them: a custom claim namespaced under
==auth0.com== is rejected, on the same logic that makes an unqualified ^card-i5rk
name rejected — the space is already spoken for.

Setting a claim has a cost that has nothing to do with namespacing.
Every claim in a token is a ==copy== of some fact about the user, ^card-0cc8
bundled and signed at issuance time. That duplication is what makes
the token self-contained — a resource server reads it straight off
the token with no round trip back to Auth0 — but it also stops
tracking its source the moment it's minted. Change the user's role in
your database a minute after a token was issued, and every request
that token authorizes for the next several minutes to hours still
carries the old role, because nothing about that field updates before
the token expires.

Why is a claim's value described as "stale until the token expires," and what does that trade off against? :: Because the claim is a snapshot copied into the token at issuance, not a live lookup — updating the underlying data does nothing to a token already issued, so the token keeps asserting the old value until it naturally expires. That staleness is the cost of the token being self-contained: reading the claim needs no callback to Auth0, but acting on stale data is possible for as long as the token remains valid. ^card-xluj

> [!card] mcq
> A team decides to simplify their API by putting a user's full profile
> — every attribute, every group membership, every preference — into
> custom claims on the access token, so the API never has to call
> anywhere else to look anything up. What is the most likely operational
> failure this produces first?
> - [x] Requests start failing with 431-class errors, or get rejected by an intermediate proxy, because the resulting header is too large
> - [ ] The token's signature becomes invalid once it holds too many claims
> - [ ] Auth0 silently truncates the token to fit a fixed size, dropping the newest claims added
> - [ ] Nothing breaks; tokens have no practical size limit ^card-wac1

A token isn't a header field in the abstract — it typically travels
*inside* one, as a bearer token on an `Authorization` header, and every
byte added to it is a byte every request now carries and every server
or proxy along the path now has to parse. Piling on claims to avoid
lookups just moves the cost from "occasional database call" to "every
request's header," and header size limits are a harder wall than most
API response bodies ever hit.

One more decision custom claims force is easy to lose track of: adding
a claim to the ID token and adding the same claim to the access token
are two separate calls in the Action, against two separate token
objects, not one setting that covers both. An Action can set a claim on
one and not the other, and Auth0 will not infer that you meant both.

> [!card] recall
> A post-login Action adds a namespaced roles claim to the ID token only.
> A client later calls an API and expects that same roles claim to be
> present on the access token it presents to the resource server.
> Explain why it won't be there, and what the Action would need to do
> differently.
> ---
> Setting a custom claim on the ID token and setting one on the access
> token are independent operations in a post-login Action — each token
> has its own object to write to, and populating one has no effect on
> the other. The Action needs a second, explicit call that sets the
> claim on the access token's own token object; nothing about the ID
> token claim propagates automatically. ^card-8k3m

`jwt-structure-and-pitfalls.md` and `token-validation-at-the-resource-server.md`
cover what happens after a claim lands in the token — how the three
segments are structured, and how a resource server is supposed to
verify the signature before trusting anything the payload says. This
note stops at the point Auth0 decides whether the claim goes in at
all.
