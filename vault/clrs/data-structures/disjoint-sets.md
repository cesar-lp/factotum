---
topic: algorithms
category: algo-data-structures
tags: [disjoint-sets, union-find, path-compression, amortized-analysis]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 19 (Data Structures for Disjoint Sets)"]
---

# Disjoint Sets (Union-Find)

A disjoint-set forest represents a collection of dynamic sets with three
operations — MAKE-SET, UNION, and FIND-SET — using a tree per set, where
each node points to its parent and a set's representative is its tree's
root. FIND-SET just walks parent pointers to the root; UNION links one
set's root under the other's.

Linking roots arbitrarily can build a tree that is really a chain, making
FIND-SET Θ(n). ==Union by rank== avoids this: each root tracks a `rank`, ^card-2pwv
an upper bound on its subtree's height, and UNION always attaches the
root with smaller rank under the root with larger rank (breaking ties
arbitrarily and incrementing the surviving root's rank by one), so the
resulting tree's height grows only when two equal-rank trees merge.

Why does union by rank attach the smaller-rank tree under the larger-rank tree, rather than the reverse? :: Attaching the shorter tree under the taller one leaves the combined tree's height equal to the taller tree's height (unchanged), whereas attaching the taller tree under the shorter one would make the new height one more than the taller tree's height already was — so always hanging short-under-tall is what keeps height from growing on every union. ^card-wtxc

A root's rank is a genuine bound on that tree's height, not the height
itself, because path compression (below) can shrink a tree's actual
height while ranks are only ever assigned at union time and never
decrease.

==Path compression== is applied inside FIND-SET: after walking up to the ^card-c8do
root, every node visited on that walk is re-pointed to point directly at
the root, flattening that path for every future FIND-SET on any of those
nodes.

```
FIND-SET(x):
  if x != x.parent:
    x.parent = FIND-SET(x.parent)   // path compression: repoint on the way back up
  return x.parent
```

> [!card] mcq
> What does path compression change during a FIND-SET call?
> - [x] Every node on the path from x to the root is re-pointed to point directly at the root
> - [ ] The rank of the root is recomputed from scratch
> - [ ] Two separate sets are merged into one
> - [ ] The tree is rebuilt as a perfectly balanced binary tree ^card-8q8k

Used together, union by rank and path compression give a worst-case
running time of ==O(m α(n))== for a sequence of m MAKE-SET, UNION, and ^card-1u1i
FIND-SET operations on n elements, where α is the inverse Ackermann
function — a function that grows so slowly it is effectively at most 4
for any n that could ever be represented in practice, but this bound is
still an amortized one over the whole sequence, not a per-operation
guarantee, and α(n) is not a constant in the mathematical sense even
though it behaves like one numerically.

Why is it inaccurate to describe disjoint-set operations under union by rank and path compression as "O(1) per operation"? :: The proven bound, O(m α(n)) for a sequence of m operations, is amortized — it bounds the total cost of the whole sequence divided across its operations, not any single operation in isolation, and α(n) is a genuine (if extremely slowly growing) function of n rather than a true constant, so no fixed per-operation constant-time guarantee follows from it. ^card-utix

Using union by rank alone, without path compression, already limits any
tree's height: a tree rooted at a node of rank r contains at least 2^r
nodes, so a tree over n elements has rank — and hence height — at most
lg n, giving O(lg n) worst-case time per FIND-SET even before path
compression is added.

> [!card] recall
> Explain why union by rank's guarantee that "a rank-r root has at least
> 2^r descendants" is exactly what bounds a disjoint-set forest's height
> by lg n, and why that bound alone (without path compression) is weaker
> than the combined O(m α(n)) result. ^card-ehtn
