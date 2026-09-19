---
topic: algorithms
category: algo-design
tags: [dynamic-programming, memoization, tabulation, rod-cutting]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 14 (Dynamic Programming)"]
---

# Dynamic Programming: Optimal Substructure and Overlapping Subproblems

Divide-and-conquer notes elsewhere in this vault split a problem into
independent subproblems and combine their answers. Dynamic programming (DP)
looks similar but applies when the subproblems are *not* independent — the
same subproblem recurs many times inside the naive recursion tree, so
solving it once and reusing the answer turns an exponential search into a
polynomial one.

DP applies to a problem only when it has ==optimal substructure==: an ^card-5kg7
optimal solution to the whole problem can be built from optimal solutions
to its subproblems. This is what makes a recurrence over subproblem optima
correct at all — without it, combining the best sub-answers would not
necessarily produce the best overall answer.

DP is only worth using when the problem also has ==overlapping ^card-gzfj
subproblems==: the recursion revisits the same subproblem many times rather
than each one exactly once. Optimal substructure alone justifies the
recurrence; that repetition is what justifies caching it.

Why does dynamic programming need both optimal substructure and overlapping subproblems, rather than either one alone? :: Optimal substructure alone guarantees the recursive formula is *correct* — merge sort has it too, but its subproblems never recur, so memoizing would waste memory for no speedup. Overlapping subproblems alone is not enough either: caching only pays off, and only computes a meaningful "best" answer, if the recurrence being cached is provably built from subproblem optima. DP earns its speedup only when both hold together. ^card-uge2

Rod cutting fixes this in a concrete example: given a rod of length `n` and
prices `p_i` for each length `i`, choose where to cut to maximize revenue.
The recurrence is `r_n = max(1 <= i <= n) [p_i + r_(n-i)]`, with `r_0 = 0`.
The naive recursive implementation of this recurrence runs in
==Θ(2^n)== time, because it recomputes `r_k` for the same `k` exponentially ^card-wnxd
many times as `n` grows.

```
// naive recursive rod cutting — exponential, recomputes r_k repeatedly
CUT-ROD(p, n)
  if n == 0: return 0
  q = -infinity
  for i = 1 to n:
    q = max(q, p[i] + CUT-ROD(p, n - i))
  return q
```

Two ways to exploit the overlap. ==Top-down== memoization keeps the ^card-z8oe
recursive structure but checks a table before recomputing: on a call for
size `k`, return the cached value if present, otherwise compute it once and
store it before returning.

What does bottom-up tabulation do differently from top-down memoization, given that both use the same table? :: Tabulation drops the recursion entirely and fills the table iteratively in order of increasing subproblem size — solving `r_1`, then `r_2`, and so on up to `r_n` — so that every smaller subproblem a step depends on is already filled in by the time that step runs; there is no call stack and no need to check whether an entry exists. ^card-mkux

> [!card] mcq
> Memoized (or tabulated) rod cutting, computing `r_1` through `r_n` each in O(n) work, runs in what time?
> - [x] Θ(n^2)
> - [ ] Θ(n)
> - [ ] Θ(2^n)
> - [ ] Θ(n lg n) ^card-ox4b

A table of optimal *values* alone cannot answer "what does the optimal
solution actually look like." Reconstructing it requires a second, parallel
table: alongside `r_k`, store `s_k`, the choice (here, the first-piece
length `i`) that achieved the max at size `k`. The solution is then
recovered by starting at `s_n` and repeatedly jumping to `s_(n - i)` until
the remaining length reaches 0.

> [!card] recall
> Explain why storing only the optimal value at each subproblem is
> insufficient for reconstructing the optimal solution, and what a DP
> implementation must additionally track to recover it. ^card-1s2l
