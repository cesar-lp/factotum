---
topic: concurrency
category: os-concurrency
tags: [condition-variables, synchronization, producer-consumer, locks]
citations: ["Arpaci-Dusseau, OSTEP, Ch. 30 (Condition Variables)"]
---

# Condition Variables

A lock alone only protects a critical section; it cannot make a thread
wait for some *state* to become true (a queue to become non-empty, a
thread to finish) without wasting CPU on a spin loop that repeatedly
locks, checks, and unlocks. A condition variable gives threads an
explicit way to sleep until another thread signals that the state they
care about has changed.

`pthread_cond_wait(cond, mutex)` requires the caller to already hold
`mutex`. Its critical behavior: it ==atomically== releases the mutex and ^card-bjep
puts the calling thread to sleep, so no other thread can slip in and
change the shared state in the gap between "release the lock" and
"start sleeping." When the thread is later woken, `wait` re-acquires
the mutex before returning, so the caller resumes still holding the
lock it started with.

Why must wait() release the mutex and sleep as one atomic step, not two separate calls? :: If a thread unlocked and then slept as two separate steps, another thread could run in the gap between them, change the shared state, and call signal before the first thread was actually asleep to receive it — the wakeup would be lost and the sleeping thread could wait forever. ^card-48we

`pthread_cond_signal(cond)` wakes (at most) one thread waiting on that
condition variable; `pthread_cond_broadcast(cond)` wakes all of them.
Signaling a condition variable with no thread currently waiting on it is
simply a no-op — the signal is not remembered for a future waiter.

Every wait must be guarded by a ==while== loop re-checking the condition, ^card-10rs
never a bare `if`, because a thread that wakes from wait is not
guaranteed the condition it cared about still holds: another thread may
have run first (Mesa-style semantics let that happen) and already
consumed whatever changed, or the platform may deliver spurious
wakeups.

```
Pthread_mutex_lock(&mutex);
while (buffer_empty)
    Pthread_cond_wait(&empty_cond, &mutex);
// safe to consume now — condition rechecked after waking
Pthread_mutex_unlock(&mutex);
```

Why guard every condition-variable wait with `while`, never a bare `if`? :: Because between a thread being woken and actually running, some other thread can grab the lock first and re-invalidate the condition (or the wakeup can be spurious), so the condition must be re-tested after wait returns, not just once before sleeping. ^card-orsq

In a bounded-buffer producer/consumer, producers wait on a "not full"
condition and consumers wait on a "not empty" condition; using a single
combined condition variable for both, or signaling instead of
broadcasting when multiple waiters could be satisfied, is a classic
source of the lost-wakeup and missed-signal bugs this pattern is used to
teach.

What real problem does a condition variable solve that a lock by itself cannot? :: A lock only guarantees exclusive access to a critical section; a condition variable additionally lets a thread sleep, without wasting CPU, until some other thread's action makes a specific state true, then be woken to recheck it. ^card-23ws

> [!card] mcq
> Thread A calls `pthread_cond_wait(&cv, &m)` while holding `m`. What happens to `m` for the duration that A is actually asleep?
> - [x] `m` is unlocked, so other threads may acquire it and change shared state
> - [ ] `m` stays locked by A until A is woken and wait() returns
> - [ ] `m` is destroyed and must be re-initialized before use
> - [ ] `m` is transferred to whichever thread calls signal() next ^card-ts29

> [!card] recall
> Explain, in terms of the mutex, exactly what makes `pthread_cond_wait`
> different from simply calling `pthread_mutex_unlock` followed by some
> separate sleep call — why does the atomicity of "release and sleep"
> matter for correctness? ^card-zlrj
