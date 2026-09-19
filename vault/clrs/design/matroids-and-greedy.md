---
topic: algorithms
category: algo-design
tags: [matroids, greedy-algorithms, exchange-property, minimum-spanning-tree]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 15 (Greedy Algorithms)"]
---

# Matroids: Why Greedy Works, and Where That Explanation Runs Out

The greedy-algorithms note in this category proves activity selection's
greedy rule correct with a one-off exchange argument. Matroid theory
generalizes that style of argument into a single theorem covering a whole
class of problems at once — but it explains only some of the greedy
algorithms in this category, not all of them.

A ==matroid== is a pair `(S, I)` where `S` is a finite ground set and `I` ^card-7oia
is a nonempty family of "independent" subsets of `S` satisfying two
axioms: the ==hereditary property== (every subset of an independent set is ^card-3v3n
itself independent) and the exchange property (if `A` and `B` are
independent and `|A| < |B|`, some element of `B \ A` can be added to `A`
while keeping it independent).

Why does the exchange property matter specifically for a *greedy* algorithm, beyond just the hereditary property? :: The hereditary property alone only guarantees that shrinking an independent set keeps it independent — it says nothing about whether a smaller independent set can always be *grown* toward a larger one. The exchange property is what guarantees a smaller independent set is never "stuck": it can always be extended by some element from any larger independent set, which is exactly what lets a greedy algorithm keep adding elements one at a time without ever needing to backtrack. ^card-vwoc

The payoff is the weighted-matroid greedy theorem: given a matroid `(S, I)`
and a weight on each element of `S`, sorting elements by weight and adding
each one greedily whenever it keeps the running set independent produces a
maximum-weight independent set — for *any* matroid, with no problem-specific
proof required.

```
// generic weighted-matroid greedy
sort S by weight, descending
A = {}
for x in S, in sorted order:
  if A union {x} is independent in M:
    A = A union {x}
return A
```

Minimum spanning tree is the standard instance: `S` is the set of edges,
and a subset is independent if it forms a forest (contains no cycle) —
the ==graphic matroid==. Kruskal's algorithm is exactly the generic greedy ^card-7hzl
procedure above, run over ascending edge weight instead of descending, on
this matroid.

> [!card] mcq
> What does the weighted-matroid greedy theorem let you skip, once a problem's independence structure is shown to be a matroid?
> - [x] A problem-specific exchange-argument proof that the greedy rule is optimal
> - [ ] The need to sort elements by weight before running greedy
> - [ ] Checking the hereditary property
> - [ ] Verifying the ground set is finite ^card-eo14

Matroid theory does not explain every correct greedy algorithm in this
category, though. Huffman coding's optimality proof is a direct
induction on tree structure, not a corollary of the matroid theorem — no
matroid is ever exhibited. Activity selection is a second case: the family
of pairwise-compatible activity sets is hereditary, but it does not
satisfy the exchange property in general, so it is not a matroid, even
though the earliest-finish-time greedy rule is still optimal for it.

Why is it wrong to conclude "greedy is optimal for this problem" implies "this problem's independence structure is a matroid"? :: The matroid theorem is a sufficient condition for greedy optimality, not a necessary one — it identifies one broad class of problems where a single proof works for every instance, but greedy can be independently proven optimal for a specific problem (via its own exchange or induction argument, as with Huffman coding or activity selection) without that problem's structure satisfying the matroid axioms at all. ^card-rd8p

> [!card] recall
> Explain, in your own words, why proving a problem's independence
> structure satisfies the matroid axioms is strictly more work up front
> than a one-off exchange argument, but pays for itself when the same
> structure recurs across multiple problems (e.g. forests, for both MST
> and other spanning-structure problems). ^card-hhej
