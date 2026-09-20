---
topic: identity
category: identity-oauth
tags: [client-credentials, machine-to-machine, service-authentication, scope, token-endpoint]
citations: ["RFC 6750 (Bearer Token Usage)", "RFC 9700 (OAuth 2.0 Security Best Current Practice)"]
---

# Client Credentials and Machine-to-Machine Auth

Most of this vault's OAuth notes are about a user delegating some of
their access to a client. This grant is the exception: there is no
user anywhere in it. A backend job, a cron task, or one service
calling another calls the token endpoint directly, on its own behalf,
and gets back a token.

That's possible because of an inversion worth naming precisely. In
every delegated flow, the party granting access and the party using
it are different, and the flow exists to get the former's consent
before the latter acts.

Here the client authenticates as ==the resource owner== itself — ^card-3znw
there is no separate party to ask, so there is nothing to consent to.

Because nobody needs to approve anything, the pieces that exist to
carry that approval back to the client simply have no job here: no
redirect, no browser in the loop at all. The client goes straight to
the token endpoint with its own credentials and gets a token back in
one request.

What replaces the missing approval step is the client proving who it
is. It does that the same way any confidential party would: presenting
a shared secret to the token endpoint, or, in setups that need
something stronger than a secret sitting in config, signing an
assertion the token endpoint can verify instead. Either way the token
endpoint is convinced by cryptographic proof of identity, not by a
code handed back from a redirect.

> [!card] mcq
> A nightly batch job needs to call an internal billing service with
> no human present to approve anything. Which grant fits, and why?
> - [x] Client credentials — the job is itself the party being authorized, so there's no separate owner whose consent the flow needs to collect
> - [ ] An authorization code flow, since it's the most widely supported grant
> - [ ] Whichever grant the billing service's frontend already uses
> - [ ] None — server-to-server calls should never carry an OAuth token ^card-8op0

The token that comes back is meaningful, but only about one thing.

What does an access token issued by the client credentials grant assert, and what can it never assert on its own? :: It asserts that the specific service holding the client's credentials was authenticated by the authorization server, and it carries whatever scope was granted to that service. It never asserts anything about an end user, because no end user was ever party to the exchange — there is no identity in the token for any individual, only for the calling service itself. ^card-b74r

That limit is exactly what makes using this grant for anything
user-facing a mirror-image mistake of using a delegated grant here.
A request made with this token can be attributed only to the service,
never to whichever user happened to trigger it — so it cannot be
scoped down to one user's records, no matter how the calling code
tries to pass a user id alongside it.

> [!card] mcq
> An internal API accepts a client-credentials token and, because the
> caller passes a `user_id` query parameter, returns that user's
> private records. What is the actual security consequence?
> - [x] Every caller holding a valid service token can read every user's data, since the token itself carries no restriction to any one user
> - [ ] Nothing — the token still proves the request came from a trusted service
> - [ ] The risk is limited to whichever user_id values are guessable
> - [ ] This is safe as long as the service's client secret is kept private ^card-kcwi

Scope hasn't disappeared just because there's no user to delegate it.
A service should still be issued only the scope its job actually
requires — a reporting job that reads one table has no business
holding a token that can also write to it — for the same reason a
delegated client shouldn't hold more than the user granted: whatever
the token can do, anyone who steals it can do too.

In this grant, why does scope still need to be kept narrow even though there's no user delegating anything? :: The token carries the calling service's full authority for whatever scope it's issued, with no user boundary limiting it further. If the credentials or the token leak, the damage is bounded by that scope — a narrowly scoped service token limits what an attacker gains, while an overbroad one hands over everything the service could ever touch. ^card-a0ch

One more piece falls away along with the missing consent step. A
renewal mechanism exists in delegated flows to let a client get a new
access token without re-running the original approval dance with the
user each time one expires.

This grant never runs that dance in the first place, so it has no
==refresh token== — the client already holds its own long-lived ^card-tuvg
credential, so when its access token expires it just calls the token
endpoint again the same way it did the first time.

> [!card] recall
> A service integration is failing because its client-credentials
> token expired and the code was written expecting a refresh token to
> renew it. What should the code do instead, and why does this grant
> not issue one?
> ---
> It should simply request a brand-new access token from the token
> endpoint using its client credentials again, exactly as it did the
> first time. A refresh token exists to avoid repeating a user's
> consent step; this grant never had one, since the client's own
> credential is reusable on demand, so there is nothing a refresh
> token would save it from repeating. ^card-lvig
