---
topic: identity
category: identity-oauth
tags: [oauth, authorization-code, redirect, token-exchange, delegation]
citations: ["RFC 6749 (OAuth 2.0 Authorization Framework)"]
---

# The authorization code flow

`oauth-roles-and-the-delegation-problem.md` sets up the roles; this note
walks the canonical sequence that connects them — the flow every other
OAuth grant type is a variation or simplification of.

```
1. Client redirects the user's browser to the authorization
   server, with its client id, requested scope, and redirect
   URI attached
2. User authenticates and consents at the authorization
   server itself
3. Authorization server redirects the browser back to the
   registered redirect URI, carrying an authorization code
4. Client sends that code to the token endpoint directly,
   authenticating itself to the authorization server
5. Authorization server returns tokens in that same response
```

Step 2 is the detail worth pausing on: the resource owner authenticates
and consents at the authorization server, never at the client. The
client redirects the browser away and never sees the credentials the
resource owner enters.

Why does the resource owner have to authenticate at the authorization server rather than at the client that is requesting access? :: Because the whole point of the delegation model is that the client never learns the resource owner's login credentials at all. If the client collected them itself, it would be back to the pre-OAuth password anti-pattern — full, unscoped access to an unguarded credential — regardless of what the rest of the flow looked like. ^card-pzlb

The authorization code that comes back in step 3 has two properties
that do all the real work in this flow. It is ==short-lived==, typically ^card-8vuv
expiring within a minute or two of being issued, so a copy that leaks
has only a narrow window in which it could even be attempted.

It is also ==single-use==: the token endpoint will only ever redeem it ^card-s6bi
once, so a copy read out of a browser history entry or a server log
after the real exchange has already happened is worthless — there is
nothing left to redeem.

Redeeming the code takes more than presenting it, though. At the token
endpoint, the client must also authenticate itself before it receives
anything back.

At the token endpoint, redeeming the authorization code also requires the client to authenticate itself. If the code by itself were enough to obtain tokens, what would that undermine? :: It would mean that anyone who managed to observe the code as it passed through the browser — a channel outside the client's control — could redeem it directly, without ever being the registered client at all. Requiring the client to also prove its own identity at the exchange step ties the redemption to a specific, known client, so a bare intercepted code isn't sufficient on its own. ^card-rulp

That's the structural insight underneath the whole flow: the code and
the resulting tokens deliberately travel by different routes. The code
rides through the user's browser as part of a redirect — a channel that
is convenient but not private. The tokens are handed over only inside a
direct, server-to-server call the browser never sees. That split only
works because the code is a single-use reference rather than a usable
credential in its own right.

Why is it acceptable for the authorization code to travel through the user's browser, a channel the client doesn't fully control, when the tokens it eventually produces are kept off that same channel? :: Because the code alone grants nothing — it has to be redeemed at the token endpoint by a client that authenticates itself, so someone who merely observes the code in transit gains nothing usable from it. The tokens, once issued, are what actually unlock access, so they're confined to the direct call between the client and the authorization server instead. ^card-4qom

> [!card] mcq
> Put these in the order they actually occur in the authorization code
> flow: (A) the client exchanges the code at the token endpoint, (B)
> the authorization server redirects the browser back with a code, (C)
> the resource owner consents at the authorization server, (D) the
> client redirects the browser to the authorization server.
> - [x] D, C, B, A
> - [ ] D, B, C, A
> - [ ] C, D, A, B
> - [ ] D, C, A, B ^card-zreb

> [!card] recall
> Walk through the authorization code flow from the initial redirect to
> the client having tokens in hand, naming which party performs each
> step and which channel — through the browser, or directly
> server-to-server — each step uses.
> ---
> The client redirects the user's browser to the authorization server
> (browser channel), carrying its client id, scope, and redirect URI.
> The resource owner authenticates and consents at the authorization
> server itself (still browser channel, but the client is not a party
> to it). The authorization server redirects the browser back to the
> client's registered redirect URI carrying a short-lived, single-use
> authorization code (browser channel again). The client then sends
> that code to the token endpoint directly, authenticating itself
> (a direct call, no browser involved), and the authorization server
> returns tokens in that same response. ^card-lccp
