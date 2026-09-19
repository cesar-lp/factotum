---
category: data-systems
tags: [distributed-systems, clocks, partial-failure, fencing-tokens]
citations: ["Kleppmann, Designing Data-Intensive Applications, Ch. 8"]
---

# The Trouble with Distributed Systems

A single machine's software either works deterministically or crashes
entirely; a distributed system instead suffers **partial failure**, where
some parts of the system are broken (a slow network, a dead node, a
delayed message) while others keep working, and the failure mode is often
non-deterministic — you cannot always tell whether a request failed, is
merely slow, or succeeded but the response was lost.

Networks in practice are asynchronous and provide no bound on how long a
packet takes to arrive, or whether it arrives at all; a request can be
delayed, dropped, reordered, or duplicated, and there is no reliable way
for the sender to distinguish "the remote process is slow" from "the
network is slow" from "the remote process is dead."

> [!card] mcq
> A client sends a write request and gets no response within its timeout.
> Why can't the client safely conclude the write did not happen?
> - [x] The request, the processing, or the response could each have been delayed or lost independently — the write may have succeeded and only the acknowledgment was lost
> - [ ] TCP guarantees that a timeout always means the request was never received
> - [ ] Timeouts only occur when the server explicitly rejects a request
> - [ ] The client can always tell success from failure by checking its local clock ^card-o751

Because failure detection via timeout can't distinguish a slow node from
a dead one, choosing a timeout value is a tradeoff: too short and you
declare healthy-but-slow nodes dead (spuriously triggering failover or
duplicate work); too long and real failures take longer to detect,
increasing the window of ==unavailability==. ^card-9uv8

**Time-of-day clocks** (NTP-synchronized wall-clock time) can jump
backward or forward and are unsuitable for measuring elapsed time or
ordering events; ==monotonic clocks== only ever move forward and are ^card-fr76
appropriate for measuring durations, but are meaningless to compare
across different machines.

> [!card] mcq
> Why is it unsafe to use time-of-day clock timestamps from two different
> machines to determine which of two writes happened first?
> - [x] Clocks on different machines drift and are only approximately synchronized, and a clock can even jump backward after NTP resync, so the timestamp order may not match the real causal order
> - [ ] Time-of-day clocks are not available on server hardware
> - [ ] Monotonic clocks must be used instead, and they are comparable across machines
> - [ ] Timestamps are always accurate to the nanosecond on modern hardware ^card-c10m

A process can experience an unbounded pause — from garbage collection, VM
suspension, or the OS deprioritizing it — during which it believes it
still holds a lock or lease it was granted, even though the lease expired
and was granted to another process while it was paused.

A ==fencing token== is a monotonically increasing number issued alongside ^card-kg0z
a lock or lease grant; a resource being protected can then reject any
write carrying a number lower than the highest one it has already seen,
protecting against a paused process that wakes up believing it still
holds the lock.

> [!card] mcq
> A client holds a lease on a storage service, then experiences a 30-second
> GC pause during which its lease expires and is granted to another
> client. Both clients then try to write. What prevents the stale client's
> write from corrupting data?
> - [x] A fencing token: the storage service rejects the write carrying the older (lower) token, since a newer token has already been seen
> - [ ] The stale client's write is automatically delayed until its lease is valid again
> - [ ] TCP guarantees the stale client's connection is closed during the pause
> - [ ] The storage service trusts whichever write arrives first, regardless of token ^card-fp4c

Why can't a distributed system simply ask "is this node still alive?" and get a reliable answer? :: Because the only way to ask is over the same asynchronous network that might be the thing failing — a lack of response is ambiguous between "the node is dead," "the node is just slow," and "the network dropped the request or response," so liveness can only ever be inferred via timeouts, never known for certain. ^card-h16i
