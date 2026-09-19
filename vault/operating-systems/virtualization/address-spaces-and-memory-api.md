---
category: os-virtualization
tags: [address-space, memory-api, malloc, memory-bugs]
citations: ["Arpaci-Dusseau, OSTEP, Ch. 13 (Address Spaces)", "Arpaci-Dusseau, OSTEP, Ch. 14 (Interlude: Memory API)"]
---

# Address Spaces and the Memory API

Memory virtualization gives every process the illusion that it owns all
of physical memory, starting at address zero, with nothing else running.
The OS's abstraction for this illusion is the address space: a process's
private view of memory, containing its code, its heap (for dynamically
allocated data), and its stack (for local variables and call frames).
The OS and hardware translate every address a process uses (a virtual
address) into a real location in physical memory, transparently.

Why can't the OS fix a process's address space at one physical location forever? :: Multiple processes are being run and swapped in and out of physical memory over time, and each one thinks it owns address zero, so the OS needs the freedom to place (and later move) a process's data anywhere in physical RAM without the process's own code having to change. ^card-qnak

Conventionally, the heap is drawn growing ==downward== from just above ^card-5adu
the code and static data, while the stack grows ==upward== from the top ^card-4voc
of the address space — leaving unused space between them that either
region can claim as it grows, without a fixed boundary between them.

On top of this abstraction, C programs manage heap memory explicitly
through the memory API: `malloc()` requests a block of a given size and
returns a pointer to it (or NULL on failure), and `free()` releases a
previously-allocated block back to the allocator, taking only the
pointer (the allocator itself must track the block's size).

Why does free() need no size argument even though malloc() does? :: The allocator stores each block's size as metadata alongside the block itself (commonly just before the returned pointer), so free() can look up how much to reclaim from that bookkeeping rather than requiring the caller to remember and pass it back. ^card-9u13

Two chronic memory bugs come directly from this manual model. A memory
leak happens when allocated memory is never freed and becomes
unreachable, slowly starving the process (and, for long-running
programs, the whole system) of usable heap space. A dangling pointer
bug happens when memory is freed but a pointer to it is kept and later
dereferenced — the memory may since have been reused for something else
entirely, so the read or write touches unrelated data.

```
// illustration only
char *p = malloc(16);
free(p);
strcpy(p, "oops");   // dangling-pointer bug: p's memory was already freed
```

> [!card] mcq
> A program calls `free(p)` and then, later in the same function, reads through `p` again without reallocating it. What kind of bug is this?
> - [ ] A memory leak
> - [x] A dangling pointer (use-after-free)
> - [ ] A double allocation
> - [ ] A stack overflow ^card-r8jn

> [!card] recall
> Explain why a long-running server process is far more vulnerable to slow
> memory leaks than a short command-line utility that runs once and exits,
> even though both have the same kind of bug in their code. ^card-pvlh
