---
category: os-concurrency
tags: [performance, scalability, lock-contention, amdahls-law]
citations: ["Arpaci-Dusseau, OSTEP, Ch. 29 (Lock-based Concurrent Data Structures)", "Arpaci-Dusseau, OSTEP, Ch. 28 (Locks)"]
---

# Performance: Lock Contention, Scalability, and the Limits of Concurrency

Adding threads only helps throughput if the work they do is actually
independent enough to run in parallel; the fraction of a program that
must run serially — often because it holds a shared lock — puts a hard
ceiling on the speedup more threads can ever deliver, no matter how many
CPUs are available.

Why does even a small serial (locked) fraction cap a program's speedup as cores are added? :: The serial fraction cannot be parallelized regardless of core count, so as cores increase, the parallel portion's time shrinks toward zero while the fixed serial portion's time stays constant, and total runtime approaches a floor set entirely by that serial fraction — this is the intuition behind Amdahl's Law. ^card-z1pd

==Lock contention== is what happens when multiple threads frequently try ^card-0yx4
to acquire the same lock at the same time; heavy contention means most
of the waiting threads' time goes to blocking or spinning rather than
useful work, and adding threads under high contention for one lock can
make things worse instead of better.

The main techniques covered elsewhere in this deck for reducing
contention are all forms of the same idea — shrink what a single lock
protects: per-CPU or per-bucket counters and hash tables spread work
across many locks instead of one, hand-over-hand locking on a list lets
different regions be touched independently, and a two-lock queue lets
producers and consumers proceed without contending on the same lock at
all.

Why doesn't finer-grained locking (many small locks instead of one big one) come for free? :: Each additional lock adds its own acquire/release overhead on every operation, and correctness gets harder to reason about (e.g. avoiding deadlock across multiple locks now matters), so finer-grained locking is a deliberate trade of extra per-operation cost and complexity for reduced contention — worthwhile only when contention was actually the bottleneck. ^card-qjw6

Concurrency does not help, and can actively hurt, when the work itself
is not parallelizable, when the overhead of locking or thread management
exceeds the work being protected (a lock around a single-instruction
increment can cost more than the increment), or when the bottleneck is
something concurrency cannot touch at all, such as a single shared disk
or network link that stays saturated regardless of how many threads
queue requests at it.

Why can more threads hurt throughput against one already-saturated shared resource, like a disk? :: When the resource itself, not the CPU-side critical section, is the bottleneck, extra threads just add queuing and coordination overhead in front of a resource that cannot serve requests any faster, so throughput plateaus or falls while latency for each request climbs. ^card-o2rg

> [!card] mcq
> A program spends 20% of its total work in an unavoidable serial critical section and 80% in perfectly parallelizable work. What best describes its scalability?
> - [x] Speedup is bounded well below the number of cores added, because the 20% serial portion cannot shrink
> - [ ] Speedup scales linearly with the number of cores with no ceiling
> - [ ] The program cannot run correctly with more than one thread
> - [ ] Adding cores always reduces the serial portion's absolute time as well ^card-ydip

> [!card] recall
> Explain why measuring lock contention (not just correctness) matters
> when choosing between a single coarse lock and a finer-grained
> locking scheme, and what evidence would tell you the coarse lock is
> actually the bottleneck. ^card-2rb2
