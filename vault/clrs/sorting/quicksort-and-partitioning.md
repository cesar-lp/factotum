---
topic: algorithms
category: algo-sorting
tags: [quicksort, partitioning, lomuto, divide-and-conquer]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 7 (Quicksort)"]
---

# Quicksort and Lomuto Partitioning

Quicksort is another divide-and-conquer sort, but unlike merge sort it
does all its work *before* recursing rather than after: it partitions the
array around a pivot so everything smaller sits to the pivot's left and
everything larger sits to its right, then recurses on the two sides with
no merge step needed at the end.

`LOMUTO-PARTITION(A, p, r)` fixes `A[r]` as the ==pivot== and walks an ^card-a5he
index `i` through `A[p..r-1]`, tracking the boundary of elements known to
be no greater than it.

Whenever the current element is `<= pivot`, it advances that boundary and
swaps the element into it; at the end it swaps the pivot itself into
place just past the boundary.

```
LOMUTO-PARTITION(A, p, r)
  x = A[r]        // pivot
  i = p - 1
  for j = p to r - 1:
      if A[j] <= x:
          i = i + 1
          swap A[i] and A[j]
  swap A[i+1] and A[r]
  return i + 1
```

The call returns the pivot's final index `q`, and `QUICKSORT` recurses on
`A[p..q-1]` and `A[q+1..r]`. Every element the pivot is compared against
ends up strictly on one side of it, so the pivot itself never needs to be
touched again by either recursive call.

Why does Lomuto partitioning make only one pass over the subarray? :: It maintains a single invariant as it scans left to right — everything at or before index `i` is `<= pivot` and everything between `i+1` and the scan pointer `j` is `> pivot` — so one swap per "small" element found is enough to keep both regions correct without a second pass. ^card-zrjj

What is the asymptotic running time of a single call to LOMUTO-PARTITION on a subarray of length n? :: Theta(n), since it does exactly one constant-time comparison (and at most one swap) per element in a single left-to-right scan. ^card-cfeg

Quicksort's recursion structure means its running time depends entirely
on how evenly each partition splits the subarray. A split into two equal
halves recurses like merge sort's, giving a recursion tree of depth
==lg n==. ^card-2z8y

That balanced case therefore does O(n lg n) work in total.

Which specific input triggers Lomuto quicksort's worst case, and what recursion does it produce? :: An already-sorted (or reverse-sorted) array, when the pivot is always chosen as the last element: the partition then puts every other element on one side and none on the other, so each call recurses on a subarray of length n-1, producing a completely unbalanced recursion of depth n and Theta(n^2) total work. ^card-x3bp

> [!card] mcq
> Deterministically picking the last element as pivot, what is quicksort's worst-case running time on an input that is already sorted?
> - [x] Theta(n^2)
> - [ ] Theta(n lg n)
> - [ ] Theta(n)
> - [ ] Theta(lg n) ^card-16ok

> [!card] recall
> Explain why an unbalanced 1-to-(n-1) split at every level of the
> recursion, rather than an unbalanced-but-still-fractional split like
> 1-to-9, is what actually produces the Theta(n^2) worst case — what
> changes about the recursion tree's depth and per-level work. ^card-dctv

This worst case is a property of the *fixed* pivot rule, not of quicksort
in general — an adversary who knows the algorithm always picks the last
element can construct a sorted or reverse-sorted array to defeat it every
time, which is exactly the motivation for randomizing pivot selection,
covered in this category's note on randomized quicksort.
