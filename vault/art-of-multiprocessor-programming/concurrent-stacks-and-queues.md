---
category: amp
tags: [treiber-stack, michael-scott-queue, aba-problem, hazard-pointers]
citations: ["Herlihy & Shavit, The Art of Multiprocessor Programming, Ch. 10-11 (Concurrent Queues and Stacks)", "Michael & Scott, \"Simple, Fast, and Practical Non-Blocking and Blocking Concurrent Queue Algorithms\" (1996)"]
---

# Concurrent Stacks and Queues: Treiber, Michael-Scott, and the ABA Problem

A ==Treiber stack== is a lock-free singly-linked stack: push reads the ^card-i4bf
current top, links the new node's next-pointer to it, then attempts a
compare-and-swap from the old top to the new node, retrying from a fresh
read whenever another thread's push or pop won the race first.

Why must a Treiber stack's push retry with a fresh top pointer after a failed CAS? :: A failed CAS only means another thread's push or pop changed the top since it was read, not that the caller's own operation was invalid; retrying with the current top keeps the operation attempting until it succeeds, which is exactly what gives the algorithm lock-free, system-wide progress instead of abandoning the caller. ^card-5sev

The Michael-Scott queue keeps separate head and tail pointers, each
updated by its own compare-and-swap; if a thread notices the tail lags
one node behind (because an earlier enqueuer was preempted between
linking its node and advancing tail), it ==helps by CAS-ing tail forward ^card-e6va
itself== before doing its own work, rather than waiting for the delayed
thread to resume.

> [!card] mcq
> What does the ABA problem describe?
> - [x] A compare-and-swap succeeds because a location holds the same value it started with, even though it changed away and back in between, invalidating the assumption that "unchanged" means "untouched"
> - [ ] A deadlock caused by two threads acquiring the same two locks in reverse order
> - [ ] A CAS that always fails whenever two threads race for the same location
> - [ ] A memory leak caused by never freeing removed nodes ^card-ffpp

Why is the ABA problem dangerous for pointers into freed memory, not plain integers? :: With a plain value, 5 really is 5 again — no hidden state was lost in between. With a pointer, the same address can now refer to an entirely different node after being freed and reallocated, so a CAS that only compares the address believes nothing changed while the object actually behind it is completely different. ^card-s8fy

==Tagging== a pointer with a monotonically increasing version counter, ^card-iifp
packed alongside the address bits and updated atomically by the same
compare-and-swap, defeats the ABA problem because two different
generations of "the same address" now compare as different values even
when the raw pointer bits match.

==Hazard pointers== take a different approach: before touching a node, a ^card-p1wf
thread publishes that node's address into a per-thread slot that other
threads must check before freeing anything, so a node can never be freed
and reallocated while any thread still holds a hazard pointer to it.

> [!card] recall
> Explain, in terms of what a Michael-Scott enqueue does when it notices
> `tail.next` is already non-null, why that helping step is necessary for
> the algorithm's progress guarantee to be lock-free rather than blocking. ^card-9nrz
