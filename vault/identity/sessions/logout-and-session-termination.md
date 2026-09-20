---
topic: identity
category: identity-sessions
tags: [logout, session-termination, revocation, global-signout]
citations: ["OWASP Session Management Cheat Sheet", "RFC 6265bis (HTTP State Management)"]
---

# Logout and session termination

The most common way to get logout wrong looks like it works: the client
deletes its stored value and the browser stops sending it, the user sees
a login screen again, and everyone moves on. Nothing about that touches
the server's copy of the session, which stays exactly as valid as it was
a moment earlier.

Why does clearing a cookie client-side, on its own, fail to actually end a session? :: It only removes the client's copy of the identifier; the server-held session it pointed to is untouched and remains valid, so anyone else who had already captured that identifier — through a network capture, a shared device, or a logged proxy — can still present it and be treated as the authenticated user. ^card-nhap

> [!card] mcq
> An attacker captured a user's session value an hour before the user
> clicks "log out," which only clears the browser's stored copy. What can
> the attacker do immediately afterward?
> - [x] Continue using the captured value normally — the server never invalidated the session it refers to
> - [ ] Nothing — the value stopped working the instant the browser cleared its copy
> - [ ] Continue using it only until the idle timeout elapses on the attacker's own inactivity, not the user's
> - [ ] Nothing — clearing a cookie client-side also broadcasts an invalidation to the server ^card-nm7r

Real logout has to reach the server: it must ==invalidate== the session ^card-9ad0
record itself, so that the identifier that used to point at valid state
now points at nothing, regardless of whether any particular client
happens to still be holding it.

Ending one session is not the same problem as ending all of a user's
sessions at once. **Global sign-out** — closing every session belonging to
a user, on every device, not just the one that clicked logout — is a
separate feature with its own requirement: sessions have to be
==enumerable== per user, meaning the server can look up every live session ^card-68bm
tied to a given account rather than only the one identifier a particular
request happened to present.

Why can't an ordinary per-request logout implementation automatically provide global sign-out as a side effect? :: An ordinary logout only knows the one identifier presented on the current request and invalidates that single record; global sign-out requires a separate index from user to all of their live sessions, which an implementation that only ever looks up sessions by their own identifier has no way to walk. ^card-ap5n

> [!card] recall
> Besides an explicit user-initiated logout, name two events after which a
> session should be terminated server-side even though the user never
> clicked anything, and explain in one sentence each why waiting for
> natural expiry would leave a window of risk open.
> ---
> A password change: if the account was compromised and the attacker is
> using it through an existing session, changing the password alone
> leaves that session running, so the attacker keeps access until it
> happens to expire on its own. A detected credential compromise more
> generally: whatever let the attacker in the first time may not recur,
> but the session they already established has no reason to end just
> because the credential that created it is now known to be bad. ^card-d9pq

Every case so far assumes there is a server-held record to delete. That
assumption breaks down for a ==self-contained== credential — one that ^card-p7bk
carries its own claims and its own expiry baked into the value itself,
verified by checking a signature rather than by looking anything up.
Nothing server-side ever pointed at that credential, so there is nothing
server-side to remove.

Terminating a self-contained credential early therefore takes one of only
two forms: give it a lifetime short enough that waiting it out is an
acceptable cost, or maintain a revocation list the server checks on every
use — which means checking a list on every request, the exact per-request
lookup a self-contained credential was meant to avoid.

What does it mean to say that a revocation list is the point where "stateless stops being free"? :: A revocation list reintroduces the server-side lookup on every request that a self-contained credential existed specifically to avoid — the credential is still self-contained in format, but early termination now costs the same per-request state check that a server-held session required all along. ^card-cz9f
