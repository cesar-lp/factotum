---
topic: identity
category: identity-sessions
tags: [session-architecture, revocation, horizontal-scaling, token-size, hybrid-credential]
citations: ["RFC 7519 (JSON Web Token)", "RFC 8725 (JWT Best Current Practices)", "OWASP Session Management Cheat Sheet"]
---

# Stateless Tokens Versus Server Sessions

When an application decides how to recognize a returning, logged-in
user on every request, it is really choosing where the truth about
that login lives — and the choice isn't a matter of one option simply
beating the other.

```
server-side session          self-contained credential
------------------------     ------------------------
id is meaningless alone      id (the token) carries the claims
every request costs a        no lookup needed to read it
  lookup against a store
truth lives on the server    truth lives in the credential itself
revoke = delete a row,       revoke = nothing, until it expires,
  effective next request       unless a list is kept server-side
```

A server-side session hands the client an identifier that means
nothing by itself — it's a lookup key, not a statement of fact. Every
request that carries it costs a round trip to wherever that lookup
happens. What that round trip buys back is that the server always
holds the current truth: to end a session, delete its row, and the
very next request carrying that identifier finds nothing there.

A self-contained credential inverts both halves of that trade. There's
nothing to look up, since the credential already carries what a lookup
would have returned, and any server that can verify it can accept it
without touching shared storage — which is what lets a fleet scale
horizontally without needing session storage every instance can reach.

> [!card] mcq
> A team is building the login system for an internal admin console.
> Compromised sessions must stop working within seconds of an operator
> clicking "revoke," and the handful of servers involved already share
> a fast, low-latency data store. Which architecture fits this
> requirement more directly?
> - [x] A server-side session — revocation is deleting a row, and the shared store the fleet already has removes the usual objection to paying a lookup on every request
> - [ ] A self-contained credential — it avoids the lookup entirely, which is the more important property here
> - [ ] Either one, since a shared data store makes the two architectures equivalent
> - [ ] Neither; instant revocation is only possible without any credential at all ^card-q2sd

A self-contained credential's truth is fixed the moment it's issued,
and nothing server-side can revise it afterward — there is no message
that can be sent to take back a claim that's already been bundled and
signed into something the client is holding.

The credential remains valid until its own stated ==expiry==, no ^card-u6wg
matter what happens on the server in the meantime.

> [!card] mcq
> A public API serves millions of read-mostly requests per second
> across a fleet that autoscales aggressively and has no shared session
> store by design. Session revocation, when it happens at all, is
> tolerable within a few minutes rather than instantly. Which
> architecture fits?
> - [x] A self-contained credential — no per-request lookup matches the scale, and the tolerance for a delayed revocation absorbs the one thing this approach can't do instantly
> - [ ] A server-side session — the scale argues against it, but the lack of a shared store argues against it even more directly
> - [ ] A server-side session, because revocation tolerance is irrelevant to the choice
> - [ ] Neither approach can serve a fleet this large ^card-445s

What actually drives the choice between the two, stated as the two questions that matter :: How fast a revoked login must stop working — instantly, or is a bounded delay acceptable — and whether the fleet already has, or is willing to run, storage every instance can reach for a lookup. Everything else in the comparison (lookup cost, scaling ease) follows from the answers to those two questions rather than standing on its own. ^card-n06m

Once revocation absolutely cannot wait for expiry, teams building on a
self-contained credential reach for a fix, and the fix is where the
architecture quietly stops being what it claimed to be.

The usual response to "we need to revoke a self-contained credential
early" is to keep a ==revocation list== of tokens that must be rejected ^card-v5js
even though they haven't expired yet.

Why does adding a revocation list to a self-contained-credential system undo the appeal of choosing that architecture in the first place? :: The entire point of a self-contained credential was skipping the per-request lookup. A revocation list has to be checked on every request to catch an early-revoked credential before it's honored, which brings the lookup straight back — for the one case, early revocation, that motivated wanting it "stateless" at all. The system ends up paying the server-side session's cost while keeping the self-contained credential's downsides, like still needing to check that list against wherever it's kept. ^card-1u5f

A second cost of the self-contained approach has nothing to do with
revocation at all: the credential's size.

A server-side session identifier is a small, fixed-size lookup key no
matter how much data the session holds, because that data stays on the
server. A self-contained credential has no such floor — every claim
folded into it travels along, in full, on every single request it's
attached to, because the credential itself is the payload, not a
pointer to one.

Why does it matter more that a self-contained credential grows with every claim added than it would for an ordinary piece of request data of the same size? :: Because the credential rides along on every request the client makes for as long as the login lasts, not just once — so a credential that accumulates claims over time doesn't cost extra bytes on one transfer, it costs those extra bytes on every request, indefinitely, for every client carrying one. ^card-s51f

> [!card] recall
> Describe the common hybrid pattern teams reach for once they've felt
> both the revocation-list irony and the token-size cost of a purely
> self-contained credential, and explain what role a short lifetime
> plays in it.
> ---
> Issue a self-contained credential with a short lifetime, and pair it
> with a separate, stateful mechanism — typically called a refresh step
> — that the client uses to obtain a new one once the short-lived
> credential expires. The short lifetime bounds how long a revoked
> login can keep working without any revocation list at all: the
> credential simply stops being honored once it expires, and revocation
> only has to reach the stateful refresh step, not every resource
> server checking the short-lived credential itself. This trades a
> little steady-state lookup cost, at refresh time, for keeping the
> per-request path lookup-free. ^card-6qx0
