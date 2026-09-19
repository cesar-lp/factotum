---
topic: concurrency
category: amp
tags: [work-stealing, load-balancing, deques, scheduling]
citations: ["Herlihy & Shavit, The Art of Multiprocessor Programming, Ch. 16 (Futures, Scheduling, and Work Distribution)", "Blumofe & Leiserson, \"Scheduling Multithreaded Computations by Work Stealing\" (1999)"]
---

# Work Distribution: Work Stealing as a Concurrency Problem

Load balancing sounds like a scheduling question, but the moment it is
implemented with per-worker task queues touched by both their owner and
other threads, it becomes exactly the same kind of concurrency problem the
rest of this category studies: contention, atomicity, and progress
guarantees on a shared data structure.

In work stealing, each worker owns a ==double-ended queue== of tasks: the ^card-gtzo
owner pushes and pops its own new work from one end, while idle workers
("thieves") steal from the opposite end of a randomly chosen victim's
deque, which keeps the owner's fast-path access and a thief's rare steal
from contending on the same end of the structure.

Why do thieves steal from the deque end opposite the owner's push/pop end? :: Splitting the two ends apart keeps the owner's frequent fast-path operations from colliding with a thief's rare steal, minimizing contention; it also means a steal takes the oldest, typically largest and coarsest-grained task, amortizing the steal's relatively expensive synchronization over more work. ^card-7y7y

A ==bounded== work-stealing deque uses a fixed-size array whose maximum ^card-d612
capacity must be chosen in advance, while an unbounded deque (such as the
Chase-Lev design) grows its backing array dynamically, which is
substantially harder to implement correctly because a resize can race
with a concurrent steal.

> [!card] mcq
> Why is the owner's end of a work-stealing deque cheap to operate on while stealing from the other end is comparatively expensive?
> - [x] The owner's end sees almost all operations and rarely coordinates with more than an occasional thief, while a steal must synchronize correctly against both the owner and other competing thieves
> - [ ] The owner's end uses a completely different, non-concurrent data structure
> - [ ] Stealing is expensive only because it requires acquiring a single global lock on the whole scheduler
> - [ ] There is no real performance difference; it is purely a naming convention ^card-7vjx

==Blumofe and Leiserson's== analysis shows randomized work stealing ^card-76qo
achieves expected running time close to `T1/P + O(T∞)` on P processors,
where T1 is the total sequential work and T∞ is the computation's
critical path — a provable guarantee that this decentralized, per-worker
scheme balances load about as well as an omniscient central scheduler
could.

Why is work stealing fundamentally a concurrency problem rather than purely a scheduling one? :: Each worker's deque is itself accessed concurrently by its owner and by thieves at the same time, so the scheme's correctness and performance depend on the same synchronization and progress-condition concerns — contention, atomicity of a steal versus a pop, avoiding lost or duplicated tasks — as any other concurrent data structure in this vault. ^card-40lf

> [!card] recall
> Explain why popping the owner's own most-recently-created task (LIFO on
> the owner's end) tends to preserve better cache locality than taking
> the oldest task would, for typical divide-and-conquer recursion. ^card-d6za
