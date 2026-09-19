---
topic: operating-systems
category: os-virtualization
tags: [multi-level-page-tables, swapping, page-replacement, thrashing]
citations: ["Arpaci-Dusseau, OSTEP, Ch. 20 (Paging: Smaller Tables)", "Arpaci-Dusseau, OSTEP, Ch. 21 (Beyond Physical Memory: Mechanisms)", "Arpaci-Dusseau, OSTEP, Ch. 22 (Beyond Physical Memory: Policies)"]
---

# Multi-Level Page Tables and Swapping

A single linear page table sized for a large virtual address space is
itself enormous, and most of it maps unused, invalid pages — wasteful
even before any code runs. Multi-level page tables fix this by adding a
layer of indirection: a page directory whose entries either point to a
second-level page table (a chunk of PTEs) or are themselves marked
invalid.

Why do multi-level page tables use less memory than a single-level table? :: An entire region of the address space that is unused doesn't need its second-level page table allocated at all — the page directory entry for that region can simply be marked invalid, so memory is only spent on page-table chunks that actually cover pages the process is using. ^card-eiiq

The tradeoff is an extra memory access on a TLB miss: the hardware (or
OS, on a software-managed TLB) must first read the page directory entry,
then the second-level PTE, before it even gets to the data itself —
more levels means more sequential lookups per miss, though a TLB hit
still skips all of it.

Swapping extends virtual memory beyond what physical RAM can hold, by
using disk (or, in modern systems, flash) as a backing store for pages
that don't currently fit in RAM. The OS designates a region of the disk
as ==swap space==, and a page not currently resident in physical memory ^card-oisa
is instead written out there.

A PTE for a page that has been swapped out is marked invalid (so any
access traps), but the OS repurposes the rest of that invalid PTE to
record where on disk the page's contents currently live, so the trap
handler knows where to fetch it from.

What happens on a page fault for a valid page currently swapped out to disk? :: The OS's page-fault handler reads the page's location from the PTE, finds (or evicts something to make) a free physical frame, reads the page's contents in from disk into that frame, updates the PTE to point at the new frame and mark it present, and then retries the faulting instruction. ^card-oy1r

When physical memory is full and a new page must be brought in, the OS
must choose an existing resident page to evict — this is a page
replacement policy question, separate from the mechanism of swapping
itself. The theoretical optimal policy evicts whichever page will be
used furthest in the future, which is unimplementable in general because
the OS cannot see the future; it exists as a yardstick to measure
realistic policies against.

LRU (least recently used) approximates optimal by evicting the page that
hasn't been accessed for the longest time, on the assumption that recent
access predicts near-future access. Exact LRU needs a timestamp update
on every single memory reference, which is too expensive in practice, so
real systems approximate it — the clock (second-chance) algorithm sweeps
resident pages, giving each a "second chance" if a hardware-maintained
use bit shows it was referenced recently, and only evicts pages whose
use bit is clear.

Why do real systems use the clock algorithm instead of exact LRU? :: Exact LRU would require updating bookkeeping on every memory reference, which is far too costly to do at hardware speed; the clock algorithm instead relies on a cheap hardware-set "use" bit per page and periodic sweeps, trading precision for something actually affordable to run. ^card-116z

If the working set of active pages across all running processes exceeds
physical memory, the system spends most of its time evicting and
re-fetching pages rather than doing useful work — a collapse known as
thrashing, where throughput drops sharply even though the CPU and disk
both appear busy.

```
// illustration only: naive LRU bookkeeping cost per access
// on every load/store: timestamp[page] = now()   -- too expensive in HW
```

> [!card] mcq
> Physical memory is nearly full and every running process's active pages together exceed it. What is this condition called?
> - [ ] Internal fragmentation
> - [ ] A TLB miss storm
> - [x] Thrashing
> - [ ] Priority inversion ^card-bxwb

> [!card] recall
> Explain why the optimal page-replacement policy (evict what's used
> furthest in the future) is useful even though no real OS can implement
> it directly. ^card-r4yi
