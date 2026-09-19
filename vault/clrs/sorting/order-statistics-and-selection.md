---
topic: algorithms
category: algo-sorting
tags: [order-statistics, selection, median-of-medians, expected-time]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 9 (Medians and Order Statistics)"]
---

# Order Statistics and Selection

Finding the i-th smallest element of a set — its i-th order statistic —
looks like it should need a full sort, but both algorithms in this note
find it without ever fully ordering the array, reusing quicksort's
partition step from earlier in this category.

`RANDOMIZED-SELECT` partitions the array exactly like randomized
quicksort — picking a uniformly random pivot and calling
`RANDOMIZED-PARTITION` — but then recurses into only *one* side, the
side that still contains the i-th order statistic, instead of both.

```
RANDOMIZED-SELECT(A, p, r, i)
  if p == r: return A[p]
  q = RANDOMIZED-PARTITION(A, p, r)
  k = q - p + 1                        // rank of pivot within A[p..r]
  if i == k: return A[q]
  elseif i < k: return RANDOMIZED-SELECT(A, p, q-1, i)
  else:         return RANDOMIZED-SELECT(A, q+1, r, i-k)
```

Why does recursing into only one side, rather than both, change the running time compared to randomized quicksort? :: Quicksort's Theta(n lg n) comes from work being repeated at every level across both halves; select only ever recurses into one subarray per call, so the geometric shrinkage of typical partition sizes makes the total work across all levels sum to a constant factor of the first level's n, rather than growing with recursion depth. ^card-k3v2

RANDOMIZED-SELECT runs in ==expected== O(n) time, over the algorithm's ^card-3uv1
own random pivot choices — exactly like randomized quicksort, its worst
case is still Theta(n^2), reached when every random pivot happens to
produce a maximally unbalanced split.

> [!card] mcq
> RANDOMIZED-SELECT's O(n) running time bound is best described as which of these?
> - [x] Expected time, averaged over the algorithm's random pivot choices; a Theta(n^2) worst case still exists
> - [ ] Worst-case time, guaranteed on every input and every run
> - [ ] Amortized time over a sequence of calls
> - [ ] Best-case time only, degrading to Theta(n lg n) on average ^card-w0ih

CLRS's other selection algorithm, often called `SELECT` or the
"median-of-medians" algorithm, replaces the random pivot with a
deliberately constructed good one: it divides the array into groups of
5, finds each group's median (by brute-force sorting of just 5
elements), recursively finds the ==median of those group medians==, and ^card-d9op
uses that as the pivot.

Why does using the median of medians as the pivot guarantee a good split, unlike an arbitrary deterministic choice such as "always the last element"? :: The median of medians is provably greater than at least half of the group medians and less than the other half, and each of those group medians is itself the middle of 5 elements, which forces the chosen pivot to be larger than roughly 3/10 of all elements and smaller than roughly 3/10 of all elements regardless of the input's arrangement — guaranteeing a split that is bounded away from 0-to-(n-1) no matter what the adversary supplies. ^card-103m

Median-of-medians SELECT achieves ==worst-case== O(n) time — this is the ^card-b3ih
key contrast with RANDOMIZED-SELECT: no input and no adversary can push
it past linear time, at the cost of a larger constant factor and a more
involved recursive structure (it recurses both to find the median of
medians and to search the correctly-sized remaining side).

> [!card] recall
> State precisely which of RANDOMIZED-SELECT and median-of-medians
> SELECT gives an expected linear-time guarantee and which gives a
> worst-case linear-time guarantee, and explain in one sentence each why
> that specific guarantee holds. ^card-8a1y

In practice, RANDOMIZED-SELECT is almost always preferred: its expected
constant factor is much smaller, and the Theta(n^2) worst case it still
carries is vanishingly unlikely rather than adversarially reachable —
the same tradeoff this category's randomized-quicksort note makes.
