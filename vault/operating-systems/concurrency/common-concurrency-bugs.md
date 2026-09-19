---
category: os-concurrency
tags: [concurrency-bugs, atomicity-violation, order-violation, debugging]
citations: ["Arpaci-Dusseau, OSTEP, Ch. 32 (Concurrency Bugs)"]
---

# Common Concurrency Bugs

Studies of real-world concurrency bugs in widely used software found
that most non-deadlock bugs fall into two recurring shapes: atomicity
violations and order violations. Both stem from an implicit assumption
about timing that the programmer never actually enforced.

An ==atomicity violation== happens when a sequence of memory accesses ^card-94ci
that was intended to be treated as one indivisible unit is instead
interrupted by another thread partway through, because no lock (or the
wrong lock) protects the whole sequence.

```
// thread 1                       // thread 2
if (thd->proc_info) {             thd->proc_info = NULL;
    fputs(thd->proc_info, ...);
}
```

Why does checking a pointer for NULL, then using it separately, risk an atomicity violation? :: Another thread can run between the check and the use and change or clear the pointer, so the use no longer sees the value the check verified — the check and use needed to be one atomic, lock-protected unit but were not. ^card-gsy8

An ==order violation== happens when code assumes a particular happens ^card-dkba
before relationship between two pieces of code in different threads —
for example, that some setup thread always initializes a value before a
second thread reads it — but nothing actually enforces that ordering, so
the second thread can run first.

Why can't an unsynchronized boolean flag reliably make thread B wait for thread A to finish? :: An unsynchronized flag read/write is itself subject to reordering and to the reader simply checking before the writer runs, so nothing guarantees B observes the flag's final value at the right time; a condition variable or similarly synchronized primitive is needed to make the ordering itself an enforced fact, not an assumption. ^card-nllm

The fix for an order violation is not a plain lock (locks protect
exclusion, not ordering) but a primitive that lets one thread actually
wait for the other's event — a condition variable or semaphore used as
an ordering signal, as covered elsewhere in this deck.

Which fix distinguishes an order violation from an atomicity violation? :: An atomicity violation is fixed by making a sequence of accesses exclusive (a lock); an order violation is fixed by making one thread's action wait for another thread's prior action (a condition variable or ordering semaphore) — exclusion alone does not force a particular order between two threads. ^card-f10t

Both bug classes are hard to reproduce because they depend on a specific
unlucky interleaving that may occur on one machine's scheduler and load
but essentially never on another, which is part of why concurrency bugs
survive testing and appear in production.

> [!card] mcq
> A thread checks `if (ptr != NULL)` and then dereferences `ptr` two lines later, with no lock held across both steps, while another thread can set `ptr = NULL`. What category of bug is this?
> - [x] Atomicity violation
> - [ ] Order violation
> - [ ] Deadlock
> - [ ] Starvation ^card-p6pj

> [!card] recall
> Explain why simply adding one lock around each individual access (the
> check, and separately the use) does NOT fix the atomicity-violation
> example above, even though each access is now individually protected. ^card-zuuj
