---
category: os-concurrency
tags: [locks, mutexes, spin-locks, test-and-set, ticket-locks]
citations: ["Arpaci-Dusseau, OSTEP, Ch. 28 (Locks)"]
---

# Locks and How They Are Built

A lock is a variable with two operations, acquire and release, wrapped
around a critical section. A thread that calls acquire either gets the
lock and proceeds, or blocks until the thread holding it calls release.
A good lock is judged on three things: correctness (mutual exclusion
actually holds), fairness (no thread starves while others repeatedly cut
in line), and performance (the overhead it adds, both when contended and
uncontended).

One early approach disables interrupts for the critical section's
duration, preventing the scheduler from ever switching threads mid
section. This only works on a single CPU, is unsafe to expose to
ordinary user code (a thread that disables interrupts and never
re-enables them can hang the machine), and does nothing to stop a second
core from running the critical section at the same time.

Why does disabling interrupts fail as a general lock on a multicore machine? :: Disabling interrupts only stops the scheduler on the one CPU that executed the instruction; it has no effect on other cores, which can still enter the same critical section concurrently. ^card-n6y5

A hardware ==test-and-set== instruction reads a memory location's old ^card-e46q
value and unconditionally writes a new value into it, both as one
indivisible step the CPU guarantees cannot be interrupted or split
between threads.

Why must test-and-set be one hardware-atomic instruction, not a separate load then store? :: A plain load-then-store has a gap between reading the flag and writing it, during which another thread can also read the still-unset flag, so both threads believe they got the lock; hardware performs the check-and-set as one step precisely to close that gap. ^card-ag76

A spin lock built on test-and-set has a thread loop — "spin" — calling
the instruction until it observes the lock was free and it won the swap.
This gives correctness, but wastes CPU: on a single processor, a thread
spinning for a lock held by a preempted thread burns its entire
scheduling quantum accomplishing nothing, since the holder cannot run
again (and release the lock) until it is rescheduled.

```
while (TestAndSet(&flag, 1) == 1)
    ; // spin: someone else holds the lock
// critical section
flag = 0; // release
```

Compare-and-swap generalizes test-and-set: it writes a new value only if
the location still holds an expected old value, and reports whether the
swap happened. A lock can be built from it the same way as test-and-set,
but CAS is also the building block for lock-free data structures that
never block a thread at all.

A ==ticket lock== hands out an ever-increasing ticket number via ^card-li16
fetch-and-add on arrival, and a separate "now serving" counter advances
by one on every release; a thread spins until its own ticket matches the
counter.

Why does a ticket lock guarantee no starvation, unlike a plain test-and-set spin lock? :: Because tickets are handed out in arrival order and the lock is granted strictly in that order, every waiting thread is guaranteed to be served eventually; a test-and-set lock lets any spinning thread win the race on release, so an unlucky thread can in principle be skipped indefinitely. ^card-1oce

> [!card] mcq
> A test-and-set spin lock and a ticket lock both provide mutual exclusion correctly. What does the ticket lock add that the plain test-and-set lock does not guarantee?
> - [x] FIFO fairness: threads acquire the lock in the order they arrived
> - [ ] Atomicity of the critical section's own instructions
> - [ ] The ability to work correctly on a single CPU
> - [ ] Zero CPU cost while a thread waits for the lock ^card-tutg

> [!card] recall
> Explain what "spinning" costs on a single-CPU system specifically, and
> why an OS that puts a waiting thread to sleep instead (rather than
> spinning) can do better once more than a couple of threads contend for
> the same lock. ^card-v7ve
