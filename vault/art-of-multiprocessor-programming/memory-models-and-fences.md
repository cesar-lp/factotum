---
category: amp
tags: [memory-models, reordering, fences, atomics, volatile]
citations: ["Herlihy & Shavit, The Art of Multiprocessor Programming, Appendix A (Software Basics, Java Memory Model); Appendix B (Hardware Basics, Relaxed Memory Consistency)", "Adve & Gharachorloo, \"Shared Memory Consistency Models: A Tutorial\" (1996)"]
---

# Memory Models, Reordering, and Fences

Every algorithm in this category — Peterson's lock, Treiber's stack, the
Michael-Scott queue — is written as pseudocode that implicitly assumes
memory behaves in program order. Real compilers and real hardware do not
give you that for free, and this note covers what actually stands between
the pseudocode and a correct implementation.

A compiler is free to reorder, merge, or eliminate memory accesses so long
as the ==single-threaded, as-if-serial== behavior of the code it is ^card-qfvk
compiling is preserved — it has no way to know that a reordering invisible
within one thread might break an invariant a second thread depends on,
because it reasons about one thread's code at a time.

Modern CPUs use per-core store buffers and out-of-order execution, so a
core's own writes can become ==visible to other cores in an order ^card-6aje
different from the program order== that issued them, unless something
explicitly constrains that visibility.

Why can x86-64 still reorder a store followed by a load to a different address? :: Each core can satisfy its own later load from its local store buffer immediately, before an earlier store has actually become visible to other cores; x86-64 preserves store-store and load-load order but not a store followed by a load to a different address, which is exactly the reordering a store buffer produces. ^card-qivj

> [!card] mcq
> What does a memory fence (barrier) instruction actually do?
> - [x] Forbids the CPU or compiler from reordering memory operations across it, in the direction(s) it specifies
> - [ ] Makes a single read or write of a variable atomic
> - [ ] Acquires a lock automatically on the instruction's target address
> - [ ] Flushes the entire CPU cache to main memory ^card-rd9p

In C or C++, ==`volatile`== only forces the compiler to actually perform ^card-tavd
every read and write to that variable rather than caching or eliminating
it; it inserts no hardware fence, provides no atomicity, and does nothing
to stop another core from observing the access reordered relative to
other memory operations.

Why doesn't C/C++ `volatile` alone make a shared counter safe to increment from two threads? :: It only stops the compiler from optimizing away or reordering accesses to that one variable at the source level; it neither makes a read-modify-write sequence atomic, so two threads can still interleave a read and a write, nor emits the hardware fences needed to keep the increment ordered relative to other memory. ^card-cllz

> [!card] recall
> Explain why Java's `volatile` and C/C++'s `volatile` are not
> interchangeable concepts, even though they share the same keyword. ^card-kqed

Why do lock-free algorithms need real atomics, not a plain-looking CAS call? :: Their correctness assumes every CAS acts as a full ordering barrier — nothing before it is reordered past it, and its effect becomes immediately visible to other cores; a naive implementation gives no such guarantee under compiler optimization or real hardware reordering, so the pseudocode can be correct on paper yet silently broken once compiled, unless it uses primitives that genuinely provide that ordering. ^card-z6jo
