---
topic: concurrency
category: os-concurrency
tags: [deadlock, resource-allocation, prevention, avoidance]
citations: ["Arpaci-Dusseau, OSTEP, Ch. 32 (Concurrency Bugs)"]
---

# Deadlock: Conditions, Prevention, Avoidance

Deadlock is a cycle of threads each holding a resource another thread in
the cycle needs, so none can ever proceed. The textbook example is two
threads that each grab one of two locks in opposite order: thread 1
takes lock A then wants lock B, while thread 2 has already taken lock B
and wants lock A — if both threads make it past their first lock, both
block forever on the second.

```
// thread 1              // thread 2
lock(A);                 lock(B);
lock(B);                 lock(A);
```

Four conditions are ==jointly necessary== for deadlock: mutual exclusion ^card-ypoe
(a resource can be held by only one thread at a time), hold-and-wait (a
thread holds one resource while waiting for another), no preemption (a
resource cannot be forcibly taken from the thread holding it), and
circular wait (a cycle of threads, each waiting on a resource the next
one in the cycle holds).

Why is it wrong to say any single one of the four conditions "causes" deadlock on its own? :: The four conditions are jointly necessary, not individually sufficient — deadlock requires all four to hold at once, so a system with mutual exclusion, hold-and-wait, and no preemption but no circular dependency chain among the specific threads involved will still not deadlock; breaking just one of the four is enough to rule deadlock out. ^card-zl35

Prevention attacks one condition so it can never arise. Hold-and-wait is
broken by requiring a thread to acquire all the locks it will ever need
in one atomic step up front, before doing any work — simple, but it
sacrifices concurrency since it demands knowing all needs in advance and
locking early. Circular wait is broken by imposing a total, agreed-on
==lock ordering== across the whole program: if every thread that needs ^card-sljt
locks A and B always acquires A before B, the opposite-order interleaving
above becomes impossible.

Why does a program-wide total lock ordering rule out circular wait specifically? :: If every thread acquires locks in the same fixed order, no thread can be holding a later lock in that order while waiting on an earlier one, which is exactly what a cycle in the wait-for graph would require; without a cycle, circular wait cannot occur. ^card-3qs7

No preemption is broken by primitives like `trylock`, which return
failure instead of blocking if a lock is already held, letting a thread
back off, release what it holds, and retry rather than sitting stuck
holding a resource someone else needs.

Deadlock ==avoidance== takes a different approach from prevention: rather ^card-h29s
than making deadlock structurally impossible, it uses global knowledge
of which resources each thread might ever need (as in the banker's
algorithm) to refuse any individual resource request that would move the
system into a state from which deadlock becomes possible, even if that
request would not deadlock immediately.

How does deadlock avoidance differ from deadlock prevention in what it actually guarantees? :: Prevention removes one of the four necessary conditions so deadlock cannot structurally occur, using only local rules (like a fixed lock order); avoidance instead requires advance, global knowledge of every thread's maximum resource needs and dynamically refuses requests that would enter an unsafe state, even without a specific cycle yet existing. ^card-o6hx

Detection-and-recovery, the third strategy, lets deadlock happen,
periodically checks for it (finding a cycle in a resource-allocation
graph), and recovers by forcibly terminating or rolling back one of the
deadlocked threads to break the cycle — practical when deadlock is rare
enough that occasional recovery is cheaper than constant prevention.

> [!card] mcq
> A system has mutual exclusion, hold-and-wait, and circular wait present among its threads, but resources CAN be forcibly preempted from a holding thread when needed. Does deadlock occur?
> - [x] No — breaking the no-preemption condition alone is enough to prevent deadlock, even with the other three present
> - [ ] Yes — three of the four conditions being present is sufficient
> - [ ] Yes, but only if more than two threads are involved
> - [ ] It depends on the scheduler's time-slice length ^card-b26q

> [!card] recall
> Explain why requiring every thread to acquire all its locks atomically
> up front (breaking hold-and-wait) is correct but often impractical
> compared to a total lock-ordering rule (breaking circular wait). ^card-i2jz
