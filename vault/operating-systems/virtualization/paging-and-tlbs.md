---
topic: operating-systems
category: os-virtualization
tags: [paging, page-tables, tlb, address-translation]
citations: ["Arpaci-Dusseau, OSTEP, Ch. 18 (Paging: Introduction)", "Arpaci-Dusseau, OSTEP, Ch. 19 (Paging: Faster Translations (TLBs))"]
---

# Paging, Page Tables, and TLBs

Segmentation solves internal fragmentation across an address space's
regions but still leaves external fragmentation, because segments are
variable-sized. Paging sidesteps both by chopping the address space (and
physical memory) into small, fixed-size units — pages, on the virtual
side, and page frames, on the physical side — so any free frame can hold
any page, with no external fragmentation to speak of.

A virtual address is split into a ==virtual page number== (VPN), which ^card-zac3
selects an entry in the process's page table, and a page offset, which
is left unchanged by translation because it just locates a byte within
the page — only the page number needs to be translated, not the offset.

Each page table entry (PTE) holds the physical frame number the page
maps to, plus metadata bits: a valid bit marking whether the page is
actually part of the process's address space (catching illegal
accesses), and protection bits controlling whether the page may be
read, written, or executed.

Why does a page table need a valid bit, given sparse address spaces? :: Most address spaces are sparse (a small amount of used memory in a huge virtual range), so allocating a PTE only marks pages actually in use as valid; an access to an unmapped page's still-present-but-invalid PTE traps to the OS instead of silently succeeding against garbage. ^card-01nc

The cost of paging is that translation now requires an extra memory
access per reference: the CPU must first read the page table (itself
stored in memory) to find the frame number, then access the actual data
— doubling memory traffic in the naive case.

What hardware structure avoids a full page-table walk on every memory access? :: The TLB (translation lookaside buffer), a small hardware cache of recently used virtual-to-physical page translations sitting inside (or next to) the CPU; a TLB hit supplies the frame number in one cycle, skipping the memory access to the page table entirely. ^card-f9rs

Who refills the TLB on a miss depends on the design. A hardware-managed
TLB has the CPU's own memory-management unit walk the page table and
install the new entry itself, entirely without OS involvement — fast,
but only workable if the hardware is built to understand the page
table's exact format. A software-managed TLB instead traps to the OS on
a miss; the OS walks whatever page-table structure it chooses and
installs the entry with privileged instructions before retrying. This
is slower per miss, but frees the OS to use any page-table layout it
likes, since the hardware never has to parse it.

Who refills a TLB entry after a miss on a software-managed TLB, and how? :: The OS does: the hardware traps into a miss handler, which walks the OS's own page-table structure and installs the new translation using privileged instructions, then the faulting instruction is retried. ^card-2h1g

TLB performance depends heavily on locality: programs that repeatedly
touch a small set of pages (temporal locality) or access nearby
addresses in sequence (spatial locality) get high TLB hit rates, while
workloads that jump around a large working set thrash the TLB, forcing
frequent, expensive page-table walks.

Why does switching between processes risk invalidating the TLB's cached entries? :: TLB entries map virtual addresses to physical frames for one specific address space, so after a context switch the previous process's cached translations are meaningless (or, worse, wrong) for the new process's virtual addresses, unless the TLB tags entries with a process/address-space id to keep multiple processes' translations valid at once. ^card-ttzh

```
// illustration only: naive per-access cost without a TLB
// 1. read page table entry from memory  (extra memory access)
// 2. compute physical address
// 3. read/write actual data              (the "real" access)
```

> [!card] mcq
> A process has excellent temporal locality but the TLB is very small relative to its working set. What is the most likely consequence?
> - [x] Frequent TLB misses forcing repeated page-table walks
> - [ ] The page table itself becomes unnecessary
> - [ ] Internal fragmentation increases sharply
> - [ ] The valid bit is checked less often ^card-33qt

> [!card] recall
> Explain why fixed-size pages eliminate external fragmentation compared
> to segmentation, and what kind of fragmentation paging can still leave
> behind. ^card-udid
