---
topic: algorithms
category: algo-foundations
tags: [divide-and-conquer, merge-sort, recursion]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 2 (Getting Started)"]
---

# Divide-and-Conquer

Many of the algorithms elsewhere in this vault (quicksort, the maximum
subarray algorithm and Strassen's method in the next note, the FFT) are
instances of one recursive strategy. This note isolates that strategy
itself, worked through on merge sort.

Divide-and-conquer breaks into three steps at each level of recursion.

==Divide== the problem into a number of smaller subproblems that are ^card-4oxh
smaller instances of the same problem. ==Conquer== the subproblems by ^card-v6lb
solving them recursively. If a subproblem is small enough, solve it
directly instead of recursing further; this stopping point is the
==base case==, and it is what keeps the recursion finite. ==Combine== ^card-468u
^card-r1m0
the subproblems' solutions into the solution for the original problem.

Merge sort maps onto the three steps directly: divide the n-element
array into two halves; conquer by recursively sorting each half; combine
by merging the two sorted halves into one sorted output.

```
MERGE-SORT(A, p, r)
if p < r
    q = floor((p + r) / 2)
    MERGE-SORT(A, p, q)
    MERGE-SORT(A, q + 1, r)
MERGE(A, p, q, r)
```

The base case is `p >= r`, a subarray of zero or one elements, which is
already sorted by definition and needs no work — no separate branch is
even needed for it in the pseudocode above, since the condition on `p`
and `r` simply stops issuing recursive calls once the range can't be
split further.

The combine step is where merge sort's real work happens: `MERGE` takes
two adjacent sorted subarrays and produces one sorted subarray in
Theta(n) time, where n is the combined size of the two — by repeatedly
comparing the two subarrays' front elements and taking the smaller.

Why does the base case matter to more than just efficiency, i.e. what happens to a divide-and-conquer algorithm without one? :: Without a base case the recursion never stops issuing smaller subproblems, so the algorithm doesn't terminate at all; the base case is what turns an infinite regress of "solve a smaller version of this" into a finite computation with an actual answer at the bottom. ^card-1dxj

> [!card] mcq
> In merge sort's divide-and-conquer breakdown, which step does the actual Theta(n) linear-time work per level of recursion?
> - [x] Combine (the merge step)
> - [ ] Divide (splitting the array in half)
> - [ ] The base case
> - [ ] None of the steps do linear work; all the cost is in the recursive calls ^card-ib2y

Divide and combine are not always this lopsided. Some divide-and-conquer
algorithms do their real work in the divide step and have a trivial
combine (nothing to merge); others, like merge sort, divide for free and
pay for it entirely on the way back up.

> [!card] recall
> Quicksort is also divide-and-conquer, but its cost is concentrated in
> a different step than merge sort's. Explain which step does quicksort's
> real work, and contrast that with where merge sort spends its time. ^card-z4xb
