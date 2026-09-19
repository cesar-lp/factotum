---
topic: concurrency
category: amp
tags: [mutual-exclusion, peterson-lock, bakery-algorithm, progress-conditions]
citations: ["Herlihy & Shavit, The Art of Multiprocessor Programming, Ch. 2 (Mutual Exclusion)", "Lamport, \"A New Solution of Dijkstra's Concurrent Programming Problem\" (1974)", "Peterson, \"Myths About the Mutual Exclusion Problem\" (1981)"]
---

# Mutual Exclusion: Correctness Conditions and Read/Write-Only Locks

OSTEP's locks note shows how to build a lock out of test-and-set and ticket
counters, and judges it on correctness, fairness, and performance. This note
asks a sharper question: what do those terms mean as precise, distinct
conditions, and can mutual exclusion be built from nothing but ordinary
loads and stores — no hardware read-modify-write instruction at all?

A lock's progress guarantee splits into two properties that are easy to
conflate. ==Deadlock-freedom== only promises that, among threads currently ^card-10hs
competing for the lock, at least one eventually enters the critical
section — some thread makes progress, but a specific unlucky thread can be
passed over forever. ==Starvation-freedom== is strictly stronger: it ^card-mxuv
promises every thread that calls acquire eventually enters, so no
individual thread can be starved even while the system as a whole keeps
making progress.

Why is starvation-freedom strictly stronger than deadlock-freedom, not just a different property? :: Deadlock-freedom only guarantees *some* thread eventually enters, which permits one unlucky thread to be perpetually passed over forever; starvation-freedom additionally guarantees *every* thread that tries eventually enters, ruling that out — every starvation-free algorithm is deadlock-free, but not the reverse. ^card-yk7k

Peterson's two-thread algorithm is the classic existence proof that a
correct lock does not require a special hardware instruction: it achieves
==mutual exclusion and starvation-freedom== using nothing but ordinary ^card-ztgh
atomic loads and stores to a two-element flag array and a shared turn
variable.

> [!card] mcq
> In Peterson's two-thread lock, when both threads set their flag and want to enter at the same time, what actually decides who waits?
> - [x] Whichever thread wrote the shared `turn` variable last ends up yielding to the other
> - [ ] A hardware test-and-set instruction on the flag array
> - [ ] The thread with the lower thread ID always wins
> - [ ] Whichever thread's flag write happened to execute first in real time ^card-u9dt

The ==filter lock== generalizes Peterson's two-thread trick to n threads by ^card-8ehs
having each thread climb through n − 1 levels, where each level admits all
but one contender using a per-level victim variable, exactly like a chain
of Peterson tournaments stacked on top of each other.

Why does Lamport's bakery algorithm guarantee FCFS fairness that the filter lock does not? :: The bakery algorithm has every waiting thread draw a strictly increasing ticket number and then enter in ticket order, so a thread that arrived earlier is always served first (bounded waiting); the filter lock only guarantees every thread eventually gets through, with no bound on how many times a given thread can be overtaken by later arrivals first. ^card-yj3r

```
// Peterson's lock (thread i, other thread is j)
flag[i] = true;
turn = j;
while (flag[j] && turn == j)
    ; // spin
// critical section
flag[i] = false; // release
```

> [!card] recall
> Explain why proving mutual exclusion buildable from nothing but atomic
> read/write registers does not contradict the fact that read/write
> registers cannot solve consensus for more than one thread wait-free.
> What is different about the two problems being solved? ^card-wn01

Why doesn't composing two separately-atomic register accesses give an atomic pair? :: A thread can be swapped out between the two accesses, so another thread's operations can slip into that gap even though each individual access is indivisible on its own; algorithms like Peterson's have to be built specifically to tolerate that gap, not just assume it away. ^card-z353
