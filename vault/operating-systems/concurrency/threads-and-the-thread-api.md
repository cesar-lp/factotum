---
category: os-concurrency
tags: [threads, thread-api, race-conditions, critical-section]
citations: ["Arpaci-Dusseau, OSTEP, Ch. 26 (Concurrency and Threads)", "Arpaci-Dusseau, OSTEP, Ch. 27 (Thread API)"]
---

# Threads, the Thread API, and Why Shared State Breaks

A process has one address space by default. A multi-threaded process
still has a single address space, but several threads of control run
within it, each with its own stack, registers, and program counter, so
each thread can be at a different point in the program at once.

Because threads within a process share the heap and global variables,
one thread can read or write data another thread is touching at the
same moment, with no automatic protection keeping the two apart.

The `pthread_create()` call starts a new thread running a given function
with a given argument, and `pthread_join()` blocks the caller until that
thread finishes, optionally handing back its return value.

Why is the order in which a preemptive scheduler runs two threads unpredictable? :: The scheduler (or a second CPU core) can switch between threads at almost any instruction boundary, so nothing guarantees that a thread's next line of code runs before another thread gets a turn once more than one thread is active. ^card-h2gk

Code like `counter++` looks like a single step in C but compiles to three
machine instructions: load `counter` into a register, increment the
register, store it back. If two threads run this sequence and their
instructions interleave, one thread's update can silently overwrite the
other's.

```
// thread A                  // thread B
mov counter, %eax            mov counter, %eax
add $1, %eax                 add $1, %eax
mov %eax, counter            mov %eax, counter
```

A ==race condition== exists whenever a program's result depends on the ^card-7r4a
timing or interleaving of multiple threads, rather than on the program's
logic alone.

The instructions that touch the shared resource — here, the three
instructions around `counter` — form a ==critical section==: code that ^card-994h
must not run in more than one thread at a time if the result is to stay
correct.

What single property must a critical section guarantee to be safe under concurrent execution? :: Mutual exclusion — at most one thread executes the section at a time, so its reads and writes to the shared resource can never interleave with another thread's. ^card-69sk

Besides waiting for a thread to finish, what else can `pthread_join()` give the caller? :: The finished thread's return value, passed back through an output parameter the caller supplies. ^card-kd1f

> [!card] mcq
> Two threads each run unsynchronized `counter++` once on a shared counter starting at 0. What are the possible final values?
> - [x] 1 or 2, depending on how the three underlying instructions interleave
> - [ ] Always 2, because both increments are eventually applied in full
> - [ ] Always 1, because the second thread's write is always discarded
> - [ ] 0, because the compiler serializes access to shared globals automatically ^card-ty1u

> [!card] recall
> Explain why running the exact same multi-threaded program twice can
> produce two different, each individually plausible, outputs, and why
> that makes concurrency bugs hard to reproduce and debug. ^card-7b5g
