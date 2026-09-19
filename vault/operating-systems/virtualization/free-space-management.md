---
category: os-virtualization
tags: [free-space-management, malloc-internals, fragmentation, allocation-strategies]
citations: ["Arpaci-Dusseau, OSTEP, Ch. 17 (Free-Space Management)"]
---

# Free-Space Management

Whenever an allocator (whether a user-level `malloc` library, or the OS
managing segments) hands out variably-sized chunks of memory and takes
them back, it faces the same underlying problem: the free space left
behind is not one contiguous region but a scattered set of chunks of
different sizes, and a new request has to be satisfied from what's
available without wasting more than necessary.

Free-space allocators commonly track free chunks with a ==free list==, a ^card-zpzd
linked structure threaded through the free chunks themselves — each
free chunk's header doubles as a list node, which is why free chunks
need to be at least large enough to hold that header.

Several strategies decide which free chunk satisfies a request. Best fit
scans the whole free list and picks the smallest chunk that is still big
enough for the request, aiming to minimize wasted space per allocation.
Worst fit does the opposite, picking the largest available chunk, on the
theory that the leftover fragment will be large enough to be useful
later. First fit picks the first chunk encountered that is big enough,
trading search quality for speed.

Why does best fit, despite its name, often perform worse in practice than it sounds like it should? :: Best fit tends to leave behind many tiny, barely-usable leftover slivers (the chunk chosen is only just big enough, so the remainder after splitting is often too small to satisfy future requests), and a full linear scan of the free list to find the best chunk is also slow. ^card-nnoj

When an allocator hands out only part of a free chunk (because the
request was smaller than the chunk), it splits the chunk in two: one
part is returned to the caller, and the remainder is put back on the
free list as a new, smaller free chunk.

What operation reverses splitting, and why does an allocator need to perform it? :: Coalescing merges two adjacent free chunks back into one larger free chunk when a block is freed and it happens to sit next to another already-free block; without coalescing, a system could accumulate many small, adjacent free fragments that could have combined into a block big enough for a large future request. ^card-nbxt

A more structural approach avoids scattered fragment sizes altogether:
buddy allocation only ever splits a free block into two equal halves
("buddies"), recursively, and only ever coalesces a freed block with its
specific buddy if that buddy is also free. This keeps every block size a
power of two, which makes finding a buddy to coalesce with a simple
address computation rather than a list search — at the cost of internal
fragmentation, since a request gets rounded up to the next power of two.

```
// illustration only
// 64KB free block, request for 12KB:
// split 64 -> 32+32, split 32 -> 16+16, keep one 16KB block (4KB wasted)
```

Fragmentation itself comes in two distinct flavors worth keeping apart.
==Internal== fragmentation is space wasted inside an allocated chunk ^card-klpp
because it is bigger than what was requested (as buddy allocation's
rounding causes), while external fragmentation is space wasted between
allocated chunks, scattered across many free fragments none of which
individually fits the next request.

> [!card] mcq
> An allocator uses buddy allocation. A caller requests 12KB from a system where blocks are always powers of two. What is the main cost of this scheme?
> - [ ] External fragmentation from scattered chunk sizes
> - [x] Internal fragmentation from rounding requests up to the next power of two
> - [ ] O(n) search time through the whole free list
> - [ ] Inability to ever coalesce freed memory ^card-bw5h

> [!card] recall
> Explain why external fragmentation cannot be fully solved just by
> choosing a cleverer placement strategy (best fit, worst fit, first fit)
> among fixed free chunks, and what compaction would have to do instead. ^card-mgdb
