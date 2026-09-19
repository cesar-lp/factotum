---
topic: concurrency
category: amp
tags: [linearizability, sequential-consistency, quiescent-consistency, correctness-conditions]
citations: ["Herlihy & Shavit, The Art of Multiprocessor Programming, Ch. 3 (Concurrent Objects)", "Herlihy & Wing, \"Linearizability: A Correctness Condition for Concurrent Objects\" (1990)"]
---

# Linearizability, Sequential Consistency, and Quiescent Consistency

OSTEP never has to define what a "correct" outcome of concurrent access
even means beyond mutual exclusion around a critical section. Once you
build concurrent objects meant to be used without a surrounding lock —
the stacks, queues, and lists later notes in this category cover — you
need a precise answer to what a concurrent history of operations is
allowed to look like, and there are several genuinely different answers.

An object is ==linearizable== if every operation appears to take effect ^card-brcq
instantaneously at some single point between its invocation and its
response — its linearization point — such that the resulting total order
across every operation on the object is consistent with real time: if
operation A finished before operation B started, A's linearization point
must come first.

What must a sequentially consistent history preserve, and what is it explicitly free to ignore? :: It must preserve each individual thread's own program order — the order that thread issued its own operations in; it is free to ignore real time entirely, so an operation from one thread can be placed after a later-starting operation from another thread in the overall total order, as long as no single thread's own order is violated. ^card-xu7g

==Quiescent consistency== only constrains operations separated by a ^card-6yx3
quiescent point — a moment when no operation is in flight anywhere on the
object: anything before quiescence must precede anything after it in the
total order, but operations that overlap within a busy stretch may be
reordered freely, which is what lets a quiescently consistent
implementation (such as a batching counter) outperform a linearizable one.

> [!card] mcq
> Which of these correctness conditions does NOT compose — meaning every individual object satisfying it does not guarantee the whole multi-object system also satisfies it?
> - [x] Sequential consistency
> - [ ] Linearizability
> - [ ] Quiescent consistency
> - [ ] None of the above — all three compose ^card-phex

Why can sequential consistency reorder threads' operations relative to real time? :: Sequential consistency only has to find a single total order respecting each thread's own program order, with no constraint tying that order to when operations actually overlapped in real time; linearizability adds exactly that real-time constraint, which is also what lets each object's linearization order be picked independently of any other object and still combine consistently. ^card-heil

> [!card] recall
> Using the definition of a linearization point, explain why every
> linearizable history is automatically sequentially consistent, but a
> sequentially consistent history need not be linearizable. ^card-pncp

Why does linearizability's composability matter in practice, beyond the definition itself? :: It lets you verify one concurrent object at a time and then combine already-verified objects into a larger system without re-checking their interaction — a program built from a linearizable queue and a linearizable stack is guaranteed linearizable as a whole automatically, a guarantee sequential consistency cannot offer. ^card-2lyk
