---
topic: api-design
category: api-grpc
tags: [load-balancing, retries, backoff, hedging, grpc]
citations: ["gRPC documentation (grpc.io)"]
---

# Retries, load balancing, and connection reuse

`streaming-semantics-and-flow-control.md` establishes that many calls
share one HTTP/2 connection. That fact quietly breaks an assumption
most deployments are built on: a network load balancer distributes
*connections*, not the calls riding inside them.

An HTTP/1.1 client that opens a new connection per request gives an
ordinary load balancer plenty of opportunities to spread work evenly,
because every request is a fresh connection the balancer gets to
place. A gRPC client that opens one long-lived connection and sends
ten thousand calls down it gives the balancer exactly one decision to
make, at connect time. Every one of those ten thousand calls lands on
the same backend, and no amount of cleverness in the balancer changes
that afterward — it never sees the individual calls, only the
connection they all travel on.

Why can an ordinary network load balancer end up sending every one of a client's ten thousand gRPC calls to a single backend, even though it appears to be doing its job correctly? :: The balancer only makes a placement decision once, at connection time, because it operates on connections rather than on the individual calls multiplexed inside them. A gRPC client that opens one long-lived connection and streams many calls through it gives the balancer exactly one opportunity to distribute load; every subsequent call rides that same already-placed connection, invisible to the balancer as a separate unit of work. ^card-72qb

There are two structurally different fixes, and they solve the problem
at different layers.

**Client-side load balancing** puts the decision inside the client
itself: the client learns the full set of backend addresses (typically
from a name-resolution or service-discovery mechanism) and picks which
backend to connect to per call, rather than trusting an intermediary
to do it. This works well when the client is code you control — an
internal service — and can be trusted to hold that address list and
balance fairly across it.

> [!card] mcq
> A team wants gRPC calls balanced across backends without introducing
> any extra network hop between client and server. Which approach
> achieves that?
> - [x] Client-side load balancing — the client itself resolves backend addresses and chooses per call
> - [ ] A standard Layer 4 load balancer placed in front of the backends
> - [ ] Increasing the number of connections the load balancer accepts
> - [ ] Reducing the client's connection pool to a single connection ^card-jpxz

The other fix moves the decision into an intermediary, but only one
built to understand the protocol riding over the connection. A
==proxy== that is aware of gRPC/HTTP/2 semantics can look inside a ^card-7xcl
connection, see each individual call multiplexed over it, and balance
per call instead of per connection — restoring the granularity an
ordinary connection-level balancer lost.

That contrast is worth stating in isolation: a connection-aware proxy
solves the same problem client-side load balancing solves, but for
clients you do not control, by moving the per-call visibility into
infrastructure the client never has to know about — the proxy is the
answer when the client is outside your control, or when centralizing
balancing logic in infrastructure beats duplicating it into every
client.

## Retry policy

Connection-and-call placement is one half of keeping a gRPC deployment
healthy under load; the other half is what a client does when a call
fails.

Whether a call is even safe to retry is decided by two things
together: the operation's own semantics — is repeating it going to
double-apply an effect the first attempt may already have caused? —
and the status the call actually failed with, since only certain
failures indicate the work never happened at all. `deadlines-and-cancellation.md`
covers what a deadline is, and a sibling status-codes note covers
which statuses are retry-safe; the point here is only that both checks
have to pass before a retry is attempted, not either alone.

> [!card] recall
> A call fails. Name the two independent things that must both be true
> before that call is safe to retry, and explain why checking only one
> of them is not enough.
> ---
> First, the operation's own semantics must tolerate being repeated —
> retrying something that isn't safe to double-apply can cause the
> effect to happen twice. Second, the failure must have come back with
> a status that indicates the work did not actually happen, since some
> failures mean the server did the work but the response never made it
> back. Checking only the status ignores whether re-running the
> operation itself is safe; checking only the operation's semantics
> ignores whether this particular failure even indicates it's worth
> retrying at all. Both conditions have to hold together. ^card-faz7

Once a call is judged retry-safe, an unconstrained retry loop is its
own hazard. If every failing call automatically retries, and the
retries themselves fail for the same reason the first call did — the
downstream dependency is overloaded or slow — the retries add more
load onto exactly the dependency that is already struggling, which can
turn a merely slow dependency into a fully down one.

A retry budget caps the fraction of a service's total outbound
call volume that is allowed to be retries, rather than letting each
failing call retry independently and without limit.

Why does an unbounded per-call retry policy risk turning a slow downstream dependency into a full outage, and what does a retry budget change about that? :: Each individual retry looks reasonable in isolation, but when many calls are failing for the same reason — an overloaded dependency — unbounded retries multiply the total load hitting that dependency at exactly the moment it can least absorb more, deepening the very problem causing the failures. A retry budget caps what fraction of overall outbound traffic is allowed to be retries, so once that ceiling is hit, further failures are surfaced as failures instead of adding more retry traffic on top of an already-struggling dependency. ^card-gfqu

Retries that do happen should also be spaced out rather than fired
back-to-back. Exponential backoff grows the delay between successive
retry attempts geometrically, and adding random jitter to that
delay prevents many clients that failed at the same moment from
retrying in the same synchronized wave and re-creating the exact load
spike that caused the failures in the first place.

> [!card] mcq
> A large number of clients all fail a call at roughly the same
> instant because a backend briefly stalled. All of them retry using
> plain exponential backoff with no jitter. What is the likely result?
> - [x] The retries stay synchronized across clients, arriving in waves that hit the backend at the same moments, reproducing the load spike
> - [ ] The retries spread out evenly over time regardless of jitter, because exponential backoff alone guarantees that
> - [ ] The backend never receives any of the retries, since backoff always exceeds the deadline
> - [ ] Exponential backoff prevents any client from retrying more than once ^card-odb6

The opposite trade from backoff is waiting less, not more. Rather
than delaying after a failure, ==hedging== sends one or more duplicate ^card-l5au
copies of a call *before* any failure has occurred — proactively,
after a short delay if the first attempt hasn't returned yet —
specifically to cut tail latency for calls that would otherwise be
waiting on a single slow attempt.

Hedging cuts tail latency by sending duplicate calls proactively, without waiting for a failure — what does a service pay for that benefit, and how does that cost differ from what a retry costs? :: Hedging pays in extra load: every hedged call means more than one copy of the same operation is sent to backends, consuming capacity regardless of whether the original attempt would have succeeded on its own. An ordinary retry only spends that extra load after a failure has actually happened, so it adds work in proportion to how often calls fail; hedging adds work in proportion to how often calls are merely slow, which can be a much larger and more constant tax on capacity. ^card-zjph
