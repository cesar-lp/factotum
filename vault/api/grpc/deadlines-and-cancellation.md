---
topic: api-design
category: api-grpc
tags: [grpc, deadlines, cancellation, distributed-systems, timeouts]
citations: ["gRPC Core Concepts (grpc.io)"]
---

# Deadlines and Cancellation

A **timeout** is a duration: "wait up to 3 seconds." Each piece of code
that sets one invents its own budget, measured from whenever that code
happens to start waiting. A **deadline** is different in kind, not just
in name.

A ==deadline== is a fixed point in time — "give up at 14:32:07.500" — ^card-8rt1
and it is attached to the request itself, so every hop that touches the
request is reasoning about the exact same moment, not about its own
freshly-started clock.

That difference matters most once a request fans out across services.
Suppose A calls B, and B calls C to satisfy A's request:

```
A --(deadline: 14:32:07.500)--> B --(same deadline)--> C
```

If A propagates its deadline unchanged down to B and then to C, all
three agree on the instant after which the answer is worthless. C can
check the deadline before doing expensive work and skip it entirely if
that instant has already passed — there is no point computing an answer
for a caller that has already stopped listening.

Why does forwarding the *same* deadline from A to C, rather than letting each hop compute its own, let C avoid wasted work? :: Because C can compare the shared deadline against the current time and see that A's budget is already exhausted, before doing any work — a fresh, locally-invented budget at C would look fine on its own and give no such signal. ^card-o5mv

Per-hop timeouts fail exactly where propagated deadlines succeed. If A
grants itself 3 seconds, and B — unaware of how much of that budget is
already spent — grants *itself* a fresh 3 seconds before calling C, and
C does the same again, the caller's true wait grows with every hop
added to the chain rather than staying capped at what the caller
actually asked for.

> [!card] mcq
> Service A sets a 2-second timeout and calls B. B, using its own
> independent 2-second timeout rather than A's deadline, calls C, which
> also applies its own 2-second timeout. In the worst case, roughly how
> long can the overall chain take before every hop gives up?
> - [ ] 2 seconds, since all three timeouts are identical
> - [x] Up to 6 seconds, since each hop's budget is measured from when that hop starts, independent of the others
> - [ ] 2 seconds, because gRPC caps total chain latency at the first hop's timeout automatically
> - [ ] It is undefined and gRPC refuses the call ^card-eleo

A ==propagated== value like this is only useful if it survives the ^card-xu7j
whole chain unmodified in what it points to; a hop is free to give up
*earlier* than the deadline if it wants to, but extending it back out
undoes the whole guarantee, since a later hop would again be reasoning
about a moment the original caller never agreed to.

Only the caller is in a position to set that moment in the first place.
A knows why it needs the answer and how long that answer stays useful —
maybe it is serving an interactive request with a two-second budget,
maybe it is a background job that can wait a minute. B and C have no
way to know that; a deadline they invented themselves would just be a
guess about someone else's patience.

Why should the deadline for a request always originate with the caller that made it, rather than with whichever service is doing the most expensive part of the work? :: Only the original caller knows how long its own answer remains useful for — a downstream service can guess at a reasonable budget for its own work, but it has no visibility into what the caller is willing to wait for or why, so a deadline it invented would be disconnected from the actual reason the request exists. ^card-cdki

**Cancellation** is the other half of the same idea: an explicit signal
that a request is no longer wanted, sent independently of whether any
deadline has expired — the caller might simply have gone away, or the
user might have closed the screen that triggered the request.

> [!card] recall
> A deadline expires partway through a long-running unit of work on the
> server. What should the server do at that point, and why does doing
> nothing further with the request's resources matter, even though the
> work has already been started?
> ---
> Stop doing further work on that request as soon as the expiry is
> noticed, and release whatever resources (memory, held locks, worker
> threads, downstream calls in flight) were allocated to it. Continuing
> past that point burns compute on an answer nobody will read, and
> holding resources for it starves other requests that could still be
> served in time. ^card-5cdw

A cancellation signal propagates the same way a deadline does: if A
cancels its call to B, B should stop its own work and, if it has
already called C on A's behalf, propagate that cancellation onward
rather than letting C keep working for an answer that will never be
delivered anywhere.

What happens to a downstream call C when the upstream service B notices that A has cancelled? :: B should stop the work it was doing for A, and if it already has a call to C in flight for that same request, cancel that call too rather than letting C run to completion for nothing. ^card-hwjh
