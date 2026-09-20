---
topic: api-design
category: api-grpc
tags: [grpc, status-codes, error-handling, api-design]
citations: ["gRPC over HTTP/2 Protocol Specification", "gRPC-Web documentation"]
---

# Status codes and the error model

Every gRPC call ends with a status: either `OK`, meaning the call
completed as the caller asked, or one of a small, fixed set of failure
codes. The interesting work isn't memorizing the list — it's knowing
which of two plausible-looking codes actually applies, because several
pairs get confused constantly.

## Wrong regardless of state, or wrong given the current state

`INVALID_ARGUMENT` and `FAILED_PRECONDITION` are both raised before a
request is allowed to do its work, which is exactly why they're easy to
mix up. The question that separates them is whether the request would
still be wrong if the system were in some other state.

A request missing a required field, or carrying a value outside its
valid range, is `INVALID_ARGUMENT` no matter what state the server is
in — no amount of retrying or waiting fixes a malformed request, because
the problem is entirely in the request itself.

A request to delete a directory that still has files in it is a
different kind of wrong. The request is well-formed, and the exact same
request would succeed if the directory happened to be empty first — the
failure depends entirely on system state, not on anything wrong with the
request's shape. That's what "precondition" means in the name: a
condition of the world, not of the message.

Given a request rejected before any business logic ran, what single question distinguishes whether it should be INVALID_ARGUMENT or a state-dependent code like FAILED_PRECONDITION? :: Whether the exact same request would succeed if the system were simply in a different state. If it would always fail regardless of state, it's INVALID_ARGUMENT; if changing something about the system (not the request) would let it succeed, it's the state-dependent code. ^card-9tdx

> [!card] mcq
> A client sends a well-formed request to delete a non-empty directory,
> which the server rejects. What status code fits, and why isn't it
> INVALID_ARGUMENT?
> - [x] The request's shape is fine; it fails only because of the directory's current contents — a state-dependent failure, not a malformed one
> - [ ] INVALID_ARGUMENT, because deleting a non-empty directory is never a valid operation
> - [ ] INVALID_ARGUMENT, because the client should have checked the directory first
> - [ ] Either code is equally correct here ^card-e795

## A precondition failure that came from contention

There's a third code that looks like a cousin of the state-dependent
one above but means something distinct: a concurrency conflict, such as
a transaction aborting because another writer touched the same row
first. Unlike an ordinary precondition failure, retrying the identical
request right away can succeed, because the "bad state" was transient
contention rather than a durable fact about the system.

An ==ABORTED== response is the signal that the failure was a ^card-6xe7
concurrency conflict rather than a durable precondition, and that the
right response is to retry at a higher level — redo the whole operation,
not just resend the same request — rather than to treat the state as
fixed and unchangeable.

Why does ABORTED call for retrying at a higher level, rather than simply resending the identical request the way a client might after a transient network blip? :: Because the failure came from a concurrency conflict — another operation touched the same data first — and that condition may already be gone by the time of a bare retry, or may recur if the retry doesn't redo enough of the surrounding operation. Retrying at a higher level lets the client redo whatever read-modify-write sequence led to the conflict, not just replay one request against data that has since moved on. ^card-11ly

## Who you are, whether you're allowed, and whether it exists

Three more codes get confused because they all sound like "you can't
have this": `NOT_FOUND`, `PERMISSION_DENIED`, and `UNAUTHENTICATED`.

> [!card] mcq
> A client calls a method that requires a valid credential, but the
> call carries no credential at all (not an invalid one — none). Which
> status code fits?
> - [x] UNAUTHENTICATED — the caller's identity was never established in the first place
> - [ ] PERMISSION_DENIED — the caller isn't allowed to do this
> - [ ] NOT_FOUND — hiding the method's existence from an anonymous caller
> - [ ] FAILED_PRECONDITION — the call arrived in the wrong state ^card-fudd

`UNAUTHENTICATED` and `PERMISSION_DENIED` differ by exactly one step in
the pipeline: `UNAUTHENTICATED` means the caller's identity was never
established, while `PERMISSION_DENIED` means the identity is known but
that identity isn't allowed to do this particular thing. `NOT_FOUND`
answers a third, unrelated question — the resource genuinely doesn't
exist — though a server may also choose to return `NOT_FOUND` instead
of `PERMISSION_DENIED` when it would rather not confirm that a resource
exists at all to a caller who shouldn't know.

## Deadlines and unreachability

`DEADLINE_EXCEEDED` reports that the call didn't finish before its
deadline ran out — the specifics of what a deadline is and how it
propagates belong elsewhere; the status code itself just marks that
outcome as distinct from the request being wrong or the state being
wrong.

`UNAVAILABLE` is the one code in the set that's ==generally safe to retry==, ^card-6n80
because it signals that the service could not be reached or serve the
request right now — an overload, a restart, a transient network
problem — rather than anything wrong with the request or a conflict
that a retry would repeat.

The exact policy for how and when to retry is a separate concern; what
matters here is the property of the code itself: `UNAVAILABLE` is a
signal about transient reachability, not about the request being flawed.

## When nothing else fits

`UNKNOWN` and `INTERNAL` are what a client sees when something failed
in a way that never got classified into one of the other codes —
`UNKNOWN` typically when an error crossed a boundary that couldn't
translate it into a proper gRPC status (an error from a different RPC
system, for instance), and `INTERNAL` when server-side invariants were
violated in a way the server itself doesn't expose more specifically.
Both are signals that something failed to classify itself, not that the
client did anything wrong.

## The set is fixed, and richness travels separately

The whole set of possible codes is small and fixed by the protocol —
it is never extended per-service or per-application. That's a deliberate
structural choice: because a client can enumerate every possible
outcome in advance, it can branch on the code exhaustively, with no
"unknown code I've never seen" case to worry about.

What does it mean, structurally, that a gRPC status code comes from a small fixed set defined by the protocol rather than one a service can extend? :: It means a client can write exhaustive handling over every possible code in advance — there is no way for a service to introduce a new code the client hasn't already accounted for. Any richer, service-specific detail about a failure has to travel by some other means than inventing a new code. ^card-u2yd

That "other means" is a separate mechanism, error details, attached
alongside the code rather than replacing it. This is a different design
from a typical HTTP API, which reuses a much larger status code space
and instead carries richness in a problem-details response body; gRPC
keeps the code space small and fixed and pushes the richness entirely
into that separate error-details channel.

## A status describes the call, not the application

A status is a property of the call itself, not a verdict rendered by
the server's application code. A call can fail — and receive a status
like `UNAVAILABLE` or `DEADLINE_EXCEEDED` — without the server
application ever having run at all, if the failure happened in the
transport or in infrastructure sitting in front of it.

> [!card] recall
> Explain why it's possible for a gRPC call to come back with a
> definite status code even though the server's application logic never
> executed. What kinds of failures produce that outcome?
> ---
> A status describes the outcome of the call as a whole, not specifically
> a decision made by the application handler. If the service is
> unreachable, overloaded, or the deadline expires before a connection
> is even established, the call fails and gets a status like
> UNAVAILABLE or DEADLINE_EXCEEDED, without the request ever reaching
> the application code that would otherwise have handled it. ^card-wcq4
