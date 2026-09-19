---
category: os-virtualization
tags: [address-translation, segmentation, base-and-bounds, fragmentation]
citations: ["Arpaci-Dusseau, OSTEP, Ch. 15 (Address Translation)", "Arpaci-Dusseau, OSTEP, Ch. 16 (Segmentation)"]
---

# Address Translation and Segmentation

Hardware-based address translation turns every address a process
generates (a virtual address, always relative to that process's own
address space starting at zero) into a physical address in real RAM,
on every single memory reference — so it has to be fast, which is why
it is done in hardware, not software, on the common path.

The simplest scheme is base-and-bounds (dynamic relocation): the CPU has
a ==base== register holding where this process's memory starts in ^card-l5f7
physical RAM, and a ==bounds== register holding the size of that ^card-nkcw
region. A virtual address is translated by adding the base, and the
hardware checks the address against the bounds first to catch
out-of-range accesses.

Why is a bounds check needed even though the base register already relocates addresses? :: Without a bounds check, a process could generate a virtual address larger than its own address space and, after the base is added, land inside another process's memory or unallocated physical memory — the bounds check is what turns relocation into isolation. ^card-1msk

Base-and-bounds is simple and fast but wasteful: a process's single
region must hold code, heap, and stack contiguously, so any space left
between a small heap and a far-away stack is allocated but unused —
this is internal fragmentation, memory reserved for a process but not
actually holding useful data.

Segmentation generalizes base-and-bounds by giving a process several
base/bounds pairs — one per logical segment (typically code, heap,
stack) — instead of one for the whole address space. Each segment can
grow and be relocated independently, so the OS no longer has to reserve
one contiguous block sized for the worst case between heap and stack.

How does segmentation avoid wasting the gap between a small heap and the stack? :: Because the stack is its own segment with its own base and bounds, the OS only needs to allocate physical memory for the segments actually in use and their current sizes, not for a single contiguous span that has to cover the gap between an unrelated heap and stack. ^card-9r1a

Segmentation introduces its own problem, though: because segments have
different, changing sizes, physical memory ends up broken into a
patchwork of free chunks that individually may be too small to satisfy a
new segment's request, even though the total free memory is enough —
this is external fragmentation.

```
// Conceptually only: two segment registers, not a code listing to recall
// segment 0 (code):  base=0,    bounds=2KB
// segment 1 (heap):  base=4KB,  bounds=1KB, grows upward
// segment 2 (stack):  base=14KB, bounds=1KB, grows downward
```

> [!card] mcq
> A system uses segmentation with separate code, heap, and stack segments. What new fragmentation problem does this introduce that plain base-and-bounds did not have?
> - [ ] Internal fragmentation within a single segment
> - [x] External fragmentation across free chunks of physical memory
> - [ ] Fragmentation of the CPU's register file
> - [ ] Fragmentation only affects the code segment ^card-zdkf

> [!card] recall
> Explain why a bounds violation should trap into the OS rather than the
> hardware simply refusing the access silently — what does the OS need to
> do with that information? ^card-aif1
