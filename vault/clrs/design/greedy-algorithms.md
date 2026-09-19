---
topic: algorithms
category: algo-design
tags: [greedy-algorithms, activity-selection, optimal-substructure, exchange-argument]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 15 (Greedy Algorithms)"]
---

# Greedy Algorithms and the Activity-Selection Problem

The DP foundations note in this category leans on optimal substructure to
justify searching *all* subproblem choices and taking the best. Greedy
algorithms rely on optimal substructure too, but add a much stronger claim:
that a single locally-best choice, made once and never revisited, still
leads to a globally optimal solution.

A problem is a candidate for a greedy algorithm only if it has the
==greedy-choice property==: a globally optimal solution can be reached by ^card-sui1
making whichever choice looks best *at the moment*, without ever
reconsidering it in light of later choices. It must also have optimal
substructure — an optimal solution to the whole problem contains optimal
solutions to the subproblem left after that first greedy choice is fixed.

Activity selection is the canonical worked example: given activities each
with a start and finish time, and only one resource, choose the largest
possible set of non-overlapping activities. The greedy rule is to sort by
finish time and repeatedly pick the not-yet-excluded activity with the
==earliest finish time== among those compatible with what's already ^card-hinr
chosen.

Why does picking the earliest-finish-time compatible activity never cost anything, compared to any other optimal first choice? :: An exchange argument: for any optimal solution, if its first activity finishes later than the earliest-finish activity `a_1`, swapping `a_1` in for it leaves at least as much room for everything after — `a_1` frees the resource no later than the activity it replaced — so an optimal solution containing `a_1` always exists, meaning the greedy choice loses nothing. ^card-vpa9

```
// activities sorted by finish time
GREEDY-ACTIVITY-SELECTOR(s, f)
  A = {activity 1}
  k = 1
  for m = 2 to n:
    if s[m] >= f[k]:      // starts after the last chosen one finishes
      A = A union {activity m}
      k = m
  return A
```

This runs in ==O(n lg n)== once the activities are sorted by finish time ^card-8kut
(O(n) for the single pass after that).

> [!card] mcq
> Which property, if a problem lacks it, is enough by itself to rule out a correct greedy algorithm — even if the problem has optimal substructure?
> - [x] The greedy-choice property (a locally best choice is never wrong to commit to)
> - [ ] The problem must be expressible as a graph
> - [ ] The input must already be sorted
> - [ ] The problem must have a unique optimal solution ^card-30gp

Not every optimization problem with optimal substructure has the
greedy-choice property — 0-1 knapsack, covered elsewhere in this category,
has optimal substructure but greedy-by-ratio is provably not optimal for
it, which is exactly why it needs the full DP search instead of a single
greedy pass.

What must be true of a problem, beyond having optimal substructure, before a greedy strategy can be trusted to find the actual optimum? :: It must have the greedy-choice property for that specific choice rule — an exchange or "greedy stays ahead" argument must show that committing to the locally best choice cannot make the eventual global solution worse than not committing to it; optimal substructure alone only says an optimum is built from optimal subproblem solutions, not that greedily fixing one choice preserves reachability to that optimum. ^card-p9st

> [!card] recall
> Explain how you would go about checking, for a new optimization problem,
> whether a proposed greedy rule is actually correct rather than just
> plausible — what does the exchange-argument style of proof require you
> to show? ^card-xaj4
