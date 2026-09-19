---
topic: concurrency
category: os-concurrency
tags: [data-structures, locks, concurrency, hand-over-hand-locking]
citations: ["Arpaci-Dusseau, OSTEP, Ch. 29 (Lock-based Concurrent Data Structures)"]
---

# Lock-Based Concurrent Data Structures

Making an existing data structure thread-safe usually starts with the
simplest possible approach: wrap every method that touches it with a
single lock, acquired on entry and released on exit. This is easy to
reason about because it reduces to the sequential, single-threaded case,
but it turns the whole structure into one serialization point — only one
thread can be inside it at all, even for operations on unrelated parts.

A concurrent counter built this way (lock, increment, unlock) is correct
but scales poorly: as more threads increment it, contention for the one
lock dominates and throughput can flatten or even fall as threads are
added, because threads spend more time waiting than working.

Why can more threads on a coarsely-locked shared counter fail to raise throughput? :: Every increment must pass through the same single lock, so beyond a small number of threads the added threads mostly wait for the lock rather than doing useful work, and the extra contention and context-switching overhead can make total throughput worse, not better. ^card-ztae

One common fix is a sloppy or approximate counter: each CPU keeps a
local count protected by its own local lock, and a global count,
protected by a separate global lock, is updated only periodically by
summing the local counts in. This trades perfect real-time accuracy for
far less lock contention, since most increments never touch the shared
global lock at all.

A linked list can do better than one lock for the whole list by using
==hand-over-hand locking==: a thread holds the lock on a node only long ^card-8gfx
enough to grab the lock on the next node before releasing the first,
letting different threads work on different parts of the list at once.

Why does hand-over-hand list locking trade more overhead for real parallelism? :: Every step down the list now costs an extra lock acquire and release (more overhead than one list-wide lock), but because no single lock covers the whole structure, threads operating on distant parts of the list can genuinely run in parallel instead of queuing behind one another. ^card-czxy

A concurrent queue commonly uses two locks — one for the head (where
consumers dequeue) and one for the tail (where producers enqueue) — so
that an enqueue and a dequeue happening at the same time do not have to
wait on each other at all, as long as the queue is not empty or
single-element in a way that makes head and tail the same node.

For a hash table, the simplest concurrent design gives each bucket (or
each of some fixed number of buckets) its own lock rather than one lock
for the whole table, so operations on different buckets can proceed
without contending for a shared lock at all.

Why lock a concurrent hash table per bucket instead of with one table-wide lock? :: Operations that hash to different buckets touch entirely disjoint state, so per-bucket locks let those operations run fully in parallel, while a single table-wide lock would serialize every operation regardless of which bucket it targets. ^card-dc1d

> [!card] mcq
> A concurrent linked list uses one lock for the entire list. What is the main downside compared to hand-over-hand locking, assuming both are implemented correctly?
> - [x] Every operation serializes behind the single lock, even ones touching disjoint parts of the list
> - [ ] The single-lock version is not correct under concurrent access
> - [ ] The single-lock version requires more lock acquire/release calls per traversal
> - [ ] Hand-over-hand locking eliminates the need for locks entirely ^card-0ygh

> [!card] recall
> Explain the general strategy behind making a data structure "more
> concurrent" once a single coarse lock becomes a bottleneck: what is
> being traded for what, and why finer-grained locking is not free. ^card-kuo4
