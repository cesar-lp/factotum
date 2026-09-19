---
topic: concurrency
category: amp
tags: [spin-locks, cache-coherence, backoff, queue-locks, mcs-lock, clh-lock]
citations: ["Herlihy & Shavit, The Art of Multiprocessor Programming, Ch. 7 (Spin Locks and Contention)", "Mellor-Crummey & Scott, \"Algorithms for Scalable Synchronization on Shared-Memory Multiprocessors\" (1991)"]
---

# Spin Locks in Practice: Coherence Traffic, Backoff, and Queue Locks

OSTEP's locks note covers test-and-set and ticket locks as *algorithms*
and judges the ticket lock fair. It never asks what a spin lock actually
costs the memory system underneath — this note picks up exactly there:
cache-coherence traffic, and the queue-lock designs built to avoid it.

Every failed spin on a plain test-and-set lock still issues the
read-modify-write instruction, and because an RMW forces the
cache-coherence protocol to invalidate every other core's cached copy of
that line, a thread ==spinning on test-and-set generates coherence traffic ^card-fgs1
on every single iteration==, even while just checking whether the lock is
free.

==Test-and-test-and-set== fixes the worst of this by spinning on an ^card-utst
ordinary read first — which the coherence protocol can satisfy from a
cached, shared copy with no traffic — and only issuing a real test-and-set
once that read suggests the lock looks free.

Why does TTAS still cause a coherence-traffic burst exactly when a lock is released? :: Every spinning thread's cached copy of the lock is invalidated by the release's write, so all of them re-read at once and then all race to issue a real test-and-set simultaneously — a thundering herd — even though the scheme avoided traffic the entire time nothing was changing. ^card-jhoy

==Exponential backoff== has a thread that just failed to acquire the lock ^card-a1jd
wait a randomized delay that grows on each successive failure before
retrying, trading a little individual latency for less simultaneous
contention on the next release.

> [!card] mcq
> In an MCS queue lock, what does each waiting thread actually spin on?
> - [x] A flag inside its own locally-allocated queue node, which its predecessor writes to on release
> - [ ] The single global lock variable, exactly like test-and-set
> - [ ] A randomized exponential-backoff timer, not a memory location
> - [ ] Its successor's queue node ^card-kvv8

Because each waiting thread in a CLH or MCS queue lock spins on its own
node rather than one shared variable, an acquire or release causes ==only ^card-nrac
a constant number of cache invalidations== no matter how many threads are
waiting, unlike test-and-set, test-and-test-and-set, or backoff locks,
where a single release can invalidate every spinner's cache at once.

Why does MCS suit NUMA machines better than CLH, given what each thread spins on? :: MCS's spin target is always the thread's own locally-allocated node, so the spin loop hits local memory; CLH's spin target is the predecessor's node, which on a non-cache-coherent or NUMA machine may live in another node's memory, turning every spin iteration into a remote access. ^card-zhfa

> [!card] recall
> A ticket lock already gives FIFO fairness. Explain what problem CLH and
> MCS queue locks are solving on top of that fairness — what does a
> ticket lock's shared "now serving" counter still cost on every release
> that these designs avoid? ^card-05oh
