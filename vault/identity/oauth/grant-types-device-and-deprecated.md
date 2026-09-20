---
topic: identity
category: identity-oauth
tags: [oauth, device-grant, implicit-flow, password-grant, grant-selection]
citations: ["RFC 8628 (Device Authorization Grant)", "OAuth 2.1 draft"]
---

# Choosing a Grant, and the Two That Were Removed

Different grants exist because different clients face different
constraints. A server-side web app can hold a secret and redirect a
real browser. A CLI tool or a smart TV usually can't do either — there
may be no way to render a browser at all, and even if there were,
typing a password on a remote control is not something to build a
product around. The device authorization grant exists for exactly
that shape of client.

The flow keeps credential entry off the constrained device entirely by
splitting the interaction across two devices:

```
1. The constrained device asks the authorization server for a
   device code and a short user code, plus a verification URL.
2. It displays the user code and the URL to the person in front of
   it — on a TV screen, a terminal, whatever it has.
3. The person opens that URL on a separate device with a real
   keyboard and a real browser, logs in normally, and enters the
   short code.
4. Meanwhile, the constrained device repeatedly checks back with
   the authorization server's token endpoint, asking whether that
   approval has happened yet.
5. Once the person finishes, the next check succeeds and returns
   tokens to the constrained device.
```

The constrained device never sees a password and never has to embed a
browser — both properties fall directly out of moving the actual login
onto a second, unconstrained device.

That repeated checking in step 4 is the device grant's own term for
itself: the constrained device ==polls== the token endpoint at an ^card-5hzy
interval the authorization server hands it, rather than being pushed a
result.

> [!card] mcq
> A CLI tool run by developers who are fully trusted employees needs to
> obtain tokens on a machine with no browser installed. The team
> proposes just prompting for the corporate password directly in the
> terminal, since it's faster to build. What should it use instead, and
> why does trust in the developers not change the answer?
> - [x] The device authorization grant — the problem is the CLI's inability to open a browser, not whether the people running it are trusted, and collecting a password directly creates the same risks regardless of who's typing it
> - [ ] The password grant, since a trusted internal team removes the usual objection to it
> - [ ] The implicit grant, since it needs no client secret
> - [ ] Whichever grant returns the longest-lived token, since developer time is expensive ^card-a35t

The implicit grant was built for a different constraint: browser-based
apps that, at the time, had no way to make a server-side call at all,
so it returned the access token directly in the redirect back to the
app instead of through a separate exchange.

Directly in the redirect meant appended after the "#" — the part of a
URL called the ==fragment==, which the browser keeps to itself and ^card-ru77
never transmits to a server as part of the request.

That property is exactly what killed the grant. A value that lives
only in the browser still lands in browser history and gets written
into logs by anything that captures the full URL a user visited, and
unlike a value sent as part of a request, it arrives with no way to
verify which application asked for it in the first place.

Why specifically was the implicit grant removed, as distinct from other grants? :: It returned the access token through the browser itself rather than through a direct exchange with the authorization server, so the token ended up sitting in browser history and in any log that records full URLs, with no mechanism to authenticate which application the token was meant for. That combination — front-channel exposure plus no client authentication — is unique to implicit; removing it left PKCE as the answer for browser-based apps that still need a comparable flow without a client secret. ^card-m3ao

Resource owner password credentials looks superficially similar — it's
also gone from OAuth 2.1 — but it fails for an entirely different
reason. The client itself collects the user's actual password and
exchanges it for tokens, which throws away the reason OAuth exists in
the first place: keeping the password out of any hands but the
authorization server's.

Why specifically was the resource owner password credentials grant removed, and how does that reason differ from why implicit was removed? :: It requires the client to handle the user's real password directly, which reintroduces exactly the credential-sharing problem OAuth was designed to eliminate. A password typed into one client can't be scoped, can't require a second factor, and can't support logging in through a federated identity provider, and the pattern trains users to hand their password to whatever third-party interface asks for it. Implicit failed on where the token traveled after being issued; password credentials fails on requiring the password to exist inside the client at all. ^card-jup7

Three grants, but the questions that pick between them collapse to
two. What kind of client is this — one that can keep a secret, one
that can't, one with no user present at all? And can it open a
browser, or is a browser simply not available to it?

Given a browser-based single-page app, a confidential server-side app, and a CLI tool with no display, which of the three needs the device authorization grant, and what single fact about it forces that choice? :: The CLI tool with no display. The deciding fact isn't trust or how the app is deployed — it's that the client has no way to render a browser for the person using it, so the login has to happen on a second device while the first one polls for the result. ^card-7zkl
