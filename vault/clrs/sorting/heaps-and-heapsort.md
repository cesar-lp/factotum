---
topic: algorithms
category: algo-sorting
tags: [heap, heapsort, priority-queue, build-max-heap]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 6 (Heapsort)"]
---

# Heaps and Heapsort

A binary heap is an implicit tree stored flat in an array: index `i`'s
children live at `2i+1` and `2i+2` (0-indexed), so no pointers are needed
and the structure is dense and cache-friendly, unlike the pointer-heavy
trees this category's balanced-search-tree notes cover.

A max-heap satisfies the ==heap property==: every node's key is greater ^card-yojw
than or equal to both of its children's keys. This says nothing about
left-versus-right ordering, only parent-versus-child, so a heap is much
weaker — and cheaper to maintain — than a fully sorted array.

`MAX-HEAPIFY(A, i)` restores the heap property at a single node `i` whose
children already root valid max-heaps but whose own key may be too
small. It compares `A[i]` against its two children, swaps with the
larger child if that child is bigger, and recurses down into the subtree
it swapped into — never up.

```
MAX-HEAPIFY(A, i)
  l = LEFT(i); r = RIGHT(i)
  largest = i
  if l <= A.heap-size and A[l] > A[largest]: largest = l
  if r <= A.heap-size and A[r] > A[largest]: largest = r
  if largest != i:
      swap A[i] and A[largest]
      MAX-HEAPIFY(A, largest)
```

On a subtree of height `h`, one call does O(1) work plus a recursive call
into a subtree of height `h-1`, giving MAX-HEAPIFY a worst-case running
time of ==O(lg n)==, proportional to the heap's height. ^card-5mhc

`BUILD-MAX-HEAP` calls MAX-HEAPIFY on every node from the last internal
node up to the root, turning an arbitrary array into a max-heap
bottom-up. Naively bounding each of the n/2 calls by its O(lg n) worst
case gives O(n lg n), but that bound is loose: it ignores that most
nodes are near the bottom, where MAX-HEAPIFY has almost no distance left
to sift down.

Why is BUILD-MAX-HEAP's running time O(n) rather than the O(n lg n) suggested by the per-call bound? :: Summing each node's actual work by height rather than using a uniform O(lg n) bound gives n * sum over h of h / 2^(h+1), and that series converges to a constant, so the total is O(n) — the O(n lg n) figure only holds if every node were charged for a full sift down to the leaves, which almost none of them do. ^card-m6a9

Given BUILD-MAX-HEAP is O(n), what does heapsort's overall running time work out to? :: Building the heap is O(n), and then n-1 iterations each swap the max to the end and call MAX-HEAPIFY (O(lg n)) on the shrunken heap, giving O(n) + O(n lg n), which is O(n lg n) overall. ^card-w42b

> [!card] mcq
> Which statement about BUILD-MAX-HEAP's asymptotic running time is correct?
> - [x] It is Theta(n), tighter than the O(n lg n) bound a naive per-call analysis suggests
> - [ ] It is Theta(n lg n), matching heapsort's overall bound
> - [ ] It is Theta(n^2) because every node may sift all the way to a leaf
> - [ ] It depends on whether the input is already sorted ^card-qznq

Heapsort itself repeats two steps n-1 times: swap the root (the maximum,
by the heap property) with the last element of the heap, shrink the
heap's logical size by one, and call MAX-HEAPIFY on the new root. It runs
in-place and needs no extra array, but it is ==not stable==, since swaps ^card-uwrv
can reorder equal keys arbitrarily.

> [!card] recall
> Explain why a heap makes a good priority queue but a poor structure for
> finding an arbitrary element quickly — connect this to what the heap
> property does and does not constrain. ^card-p7yv

Beyond sorting, a binary heap directly implements a priority queue:
`MAXIMUM` is O(1) (it's the root), `EXTRACT-MAX` removes the root and
restores the property in O(lg n), and `INCREASE-KEY` raises a node's key
and bubbles it up in O(lg n). This is the structure behind algorithms
like Dijkstra's shortest paths and Prim's MST, which repeatedly need "give
me the smallest/largest remaining element" rather than a total order.
