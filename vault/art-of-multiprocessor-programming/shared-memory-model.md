---
topic: concurrency
category: amp
tags: [registers, atomicity, shared-memory, memory-hierarchy]
citations: ["Herlihy & Shavit, The Art of Multiprocessor Programming, Ch. 4 (Foundations of Shared Memory)", "Lamport, \"On Interprocess Communication, Parts I & II\" (1986)"]
---

# The Shared-Memory Model: What a Register Actually Promises

OSTEP's locks and threads notes treat a shared variable's reads and writes
as simply working — a write happens, a later read sees it. AoMP takes
nothing for granted about what a single memory cell (a *register*) promises
under truly concurrent access, and the answer turns out to be a hierarchy
of guarantees, not one universal behavior.

A ==safe== register only makes a promise about non-overlapping accesses: a ^card-wnbg
read that does not overlap any write returns the last value written. If a
read overlaps a concurrent write, this weakest guarantee lets it return
any value at all — not necessarily the old or the new one — because
nothing guarantees the bits changing underneath a concurrent reader are
seen consistently.

A ==regular== register strengthens safe by also constraining overlapping ^card-x113
reads: a read overlapping a write must return either the value being
written or the value already there, never garbage. Two overlapping reads,
however, are not required to agree on an order — one reader can observe
the new value while a later reader still sees the old one.

An ==atomic== register is what most programmers implicitly assume memory to ^card-hs9w
be: every read and write behaves as if it took effect at a single instant,
so all accesses agree on one total order consistent with real time, exactly
like a memory cell in a sequential program.

Why does a shared boolean flag fail as a mutual-exclusion primitive on atomic hardware? :: An atomic register only guarantees that one single read or one single write is indivisible; checking the flag and then setting it are two separate atomic accesses with a gap between them, and another thread can run in that gap, so the check-then-set pair itself is not atomic even though each half of it is. ^card-qrnb

> [!card] mcq
> Peterson's algorithm relies on each thread's own `flag[i]` being written by only that one thread, while any thread may read it. What register class does that require?
> - [x] Single-writer, multi-reader (SWMR)
> - [ ] Multi-writer, multi-reader (MWMR)
> - [ ] Single-writer, single-reader (SWSR)
> - [ ] Multi-writer, single-reader (MWSR) ^card-wd8z

> [!card] recall
> Explain why a 64-bit counter updated with two separate 32-bit stores on
> older 32-bit hardware might only satisfy the "safe" register guarantee
> rather than "atomic" — and what a reader could observe as a result. ^card-ep3c
