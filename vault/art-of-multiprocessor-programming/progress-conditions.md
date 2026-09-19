---
category: amp
tags: [progress-conditions, lock-free, wait-free, obstruction-free]
citations: ["Herlihy & Shavit, The Art of Multiprocessor Programming, Ch. 3 (Concurrent Objects)", "Herlihy, \"Wait-Free Synchronization\" (1991)"]
---

# Progress Conditions: Blocking, Obstruction-Free, Lock-Free, Wait-Free

OSTEP's locks and CV notes describe blocking synchronization and stop
there: a thread that cannot proceed sleeps or spins until another thread
lets it continue. AoMP treats "how does a thread's progress depend on
other threads' behavior" as a formal, ranked hierarchy of guarantees, and
the algorithms in the rest of this category are each pinned to one level.

A ==blocking== implementation can be delayed indefinitely if a thread ^card-pyae
holding a lock is preempted, delayed, or crashes, because every other
thread waiting on that lock must wait for it to release, no matter how
long that takes.

An ==obstruction-free== implementation guarantees a thread completes its ^card-33z6
operation in a bounded number of steps only if it eventually runs with no
other thread interfering for long enough; under real contention, two
threads can in principle keep interrupting each other forever, livelocking
with no thread ever blocked but also none ever finishing.

A ==lock-free== implementation guarantees system-wide progress: infinitely ^card-arxs
often, some thread's operation completes in a finite number of steps,
even if other threads are delayed, preempted, or crash — but a specific
thread can still be repeatedly passed over by luckier competitors.

A ==wait-free== implementation is the strongest guarantee: every thread ^card-epcj
completes its own operation in a bounded number of its own steps,
regardless of what any other thread does, so no thread can starve even in
the worst case.

> [!card] mcq
> A lock-free queue's progress guarantee is best described as which of these?
> - [x] At least one thread's operation completes within a bounded number of steps infinitely often, even if some threads are delayed or crash
> - [ ] Every thread's operation completes within a bounded number of its own steps
> - [ ] No thread ever needs to retry its operation
> - [ ] The data structure never uses a compare-and-swap instruction ^card-8fma

Why can a lock-free algorithm let one thread starve, even as the system progresses? :: The guarantee is only that *some* thread's operation succeeds on each contended step, not any particular one; an unlucky thread's compare-and-swap can keep losing the race to other threads that repeatedly win it, so throughput never stalls even while that one thread's own call never returns. ^card-apj6

What must obstruction-freedom guarantee, and what may it do under contention? :: It guarantees that a thread running in isolation, with no interference, finishes in a bounded number of steps; under contention it is explicitly allowed to livelock, with every thread repeatedly interrupting another's isolated run so that none of them ever finishes. ^card-7yd3

> [!card] recall
> Explain why wait-free implies lock-free, and lock-free implies
> obstruction-free, but neither implication reverses — what specific
> guarantee is lost at each step down the hierarchy? ^card-5blv
