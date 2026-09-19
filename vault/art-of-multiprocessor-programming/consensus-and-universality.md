---
category: amp
tags: [consensus, compare-and-swap, universal-construction, wait-free]
citations: ["Herlihy & Shavit, The Art of Multiprocessor Programming, Ch. 5-6 (The Relative Power of Primitive Synchronization Operations; Universality of Consensus)", "Herlihy, \"Wait-Free Synchronization\" (1991)"]
---

# Consensus and the Consensus Number Hierarchy

Neither OSTEP nor the rest of this vault asks whether a given hardware
primitive is *powerful enough* to build arbitrary concurrent objects.
Herlihy's consensus-number hierarchy answers exactly that, and explains
why compare-and-swap, not test-and-set, became the primitive real
hardware converged on.

In the consensus problem, n threads each propose a value and all of them
must agree on a single one of the proposed values, using a protocol that
is itself wait-free — every thread decides in a bounded number of its own
steps regardless of the others' speed or failures. The ==consensus ^card-13y8
number== of an object type is the largest n for which instances of that
type, plus any number of atomic read/write registers, can solve consensus
for n threads.

Atomic read/write registers alone have ==consensus number one==: no ^card-7xuo
protocol built only from registers can solve wait-free consensus for two
or more threads, no matter how many registers it uses or how cleverly
they are arranged.

Why doesn't Peterson's lock contradict registers having consensus number one? :: Peterson's lock is a blocking construction — a thread can wait indefinitely for another to release it — not a wait-free one; the consensus-number-one impossibility is specifically about wait-free protocols, so a blocking mutual-exclusion algorithm built from registers doesn't fall under it at all. ^card-8r5c

> [!card] mcq
> Test-and-set, fetch-and-add, and swap all have consensus number 2. What does that mean?
> - [x] Those objects, plus registers, can solve wait-free consensus for exactly 2 threads, but not for 3 or more
> - [ ] They can solve consensus for any number of threads, just more slowly than CAS
> - [ ] They cannot solve consensus for any number of threads at all
> - [ ] Their consensus number depends on how many registers are made available to the protocol ^card-qdek

Because compare-and-swap has an ==unbounded consensus number==, it is ^card-qfu8
called universal: any concurrent object's operations can be implemented in
a wait-free manner for any number of threads using CAS together with
ordinary registers, typically via a construction where each thread tries
to append its intended operation to a shared, agreed-on log of every
operation applied so far.

> [!card] recall
> Explain what it would mean, structurally, for the consensus hierarchy to
> collapse at some finite level k instead of being genuinely infinite —
> and why the existence of a universal (infinite-consensus-number) object
> like compare-and-swap rules that out. ^card-v47a

Why did CAS, not test-and-set, become the primitive for building concurrent data structures? :: CAS's unbounded consensus number makes it universal by itself, together with registers, for implementing any wait-free object regardless of how many threads contend; test-and-set's consensus number of two caps what it alone can wait-free-implement once more than two threads are involved, however it is combined with registers. ^card-2dqf
