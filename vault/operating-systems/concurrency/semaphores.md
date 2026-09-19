---
topic: concurrency
category: os-concurrency
tags: [semaphores, synchronization, producer-consumer, locks]
citations: ["Arpaci-Dusseau, OSTEP, Ch. 31 (Semaphores)"]
---

# Semaphores

A semaphore is an integer with two atomic operations: `sem_wait()`
decrements the value and, if the result is negative, blocks the calling
thread; `sem_post()` increments the value and, if any thread is blocked,
wakes one of them. Unlike a condition variable, a semaphore's value is
itself the memory of "how many things happened," so a post issued before
anyone waits is not lost — the next wait simply succeeds immediately.

Used as a ==lock==, a semaphore is initialized to 1: the first ^card-d8gj
`sem_wait()` decrements it to 0 and proceeds, a second thread's
`sem_wait()` decrements it to -1 and blocks, and `sem_post()` on release
brings it back to 0, waking the waiter. This is exactly binary
mutual-exclusion behavior, just expressed as a counting primitive.

Why does starting a semaphore at 1 make wait/post behave like a lock's acquire/release? :: With an initial value of 1, exactly one thread's wait() can decrement it to 0 and proceed; any other thread's wait() drives the value negative and blocks, so only one thread is ever "inside," which is precisely mutual exclusion. ^card-j2oa

Used as an ==ordering primitive==, a semaphore is ^card-nv37
initialized to 0: a thread that must wait for some event calls
`sem_wait()` and blocks immediately (since the value starts at 0 or
below), while the thread that produces the event calls `sem_post()` when
it happens. Whichever order the two threads actually run in, the
semaphore itself records whether the event has already occurred.

Why start an ordering semaphore at 0 rather than 1, when signaling one event? :: Starting at 0 means a waiter that arrives before the event blocks immediately, and a poster that arrives first leaves the semaphore at a positive count so a later waiter proceeds without blocking — either arrival order is handled correctly, which is what "ordering" rather than "exclusion" requires. ^card-g1z3

The classic bounded-buffer producer/consumer uses three semaphores
together: a binary `mutex` (initialized to 1) protecting the buffer
itself, `empty` (initialized to the buffer's capacity) counting free
slots, and `full` (initialized to 0) counting filled slots. A producer
waits on `empty`, then `mutex`, inserts, then posts `mutex` and `full`;
a consumer does the mirror image.

```
// producer                          // consumer
sem_wait(&empty);                    sem_wait(&full);
sem_wait(&mutex);                    sem_wait(&mutex);
insert(item);                        item = remove();
sem_post(&mutex);                    sem_post(&mutex);
sem_post(&full);                     sem_post(&empty);
```

Why must a producer wait on the empty-slots semaphore before waiting on the mutex, not after? :: Waiting on mutex first while empty is 0 would hold the buffer's lock while blocked, so a consumer could never acquire mutex to remove an item and free a slot — the two threads would deadlock waiting on each other. ^card-hoa4

The key difference between a semaphore used as a lock and one used as a
condition variable is not the API — both are `wait`/`post` — but the
initial value and who is expected to call which operation: a lock's
wait and post are typically called by the same thread (acquire, then
later release), while an ordering semaphore's wait and post are called
by two different threads (one waits for something only the other
produces).

> [!card] mcq
> A semaphore used purely as a mutual-exclusion lock is initialized to what value?
> - [x] 1
> - [ ] 0
> - [ ] The number of threads that will contend for it
> - [ ] -1 ^card-vduf

> [!card] recall
> Explain why a semaphore, unlike a condition variable, does not lose a
> signal that happens before anyone is waiting — and why that matters
> for the producer/consumer pattern specifically. ^card-6pr4
