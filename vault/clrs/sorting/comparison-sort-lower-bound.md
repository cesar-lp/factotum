---
topic: algorithms
category: algo-sorting
tags: [decision-tree, lower-bound, comparison-sort, omega-notation]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 8 (Sorting in Linear Time)"]
---

# The Comparison-Sort Lower Bound

Heapsort, quicksort, and merge sort all reach Theta(n lg n) worst-case
or expected time, and none of them beats it. This note explains why: any
algorithm that decides the output order only by comparing pairs of
elements — a ==comparison sort== — cannot do better than that bound, no ^card-ncp8
matter how cleverly it chooses which pairs to compare.

The argument models any comparison sort as a ==decision tree==: an ^card-ua0n
internal node is one comparison, its two children are the two possible
outcomes, and a leaf is a fully determined output permutation. A path
from root to leaf is one execution of the algorithm on some input.

Why must a correct comparison-sort decision tree have at least n! leaves? :: Every one of the n! possible orderings of n distinct elements is a permutation the algorithm must be able to output on some input, and each leaf can correspond to at most one output permutation, so a tree with fewer than n! leaves would leave some permutation unreachable — meaning the algorithm would sort at least one input wrong. ^card-97ks

A binary tree of height `h` has at most `2^h` leaves, so a tree with at
least n! leaves must have height h with `2^h >= n!`, giving
`h >= lg(n!)`.

What does Stirling's approximation let us conclude about lg(n!), and what bound on comparisons does that give? :: lg(n!) is Omega(n lg n), so any comparison-sort decision tree has height Omega(n lg n) — and since the tree's height is exactly the worst-case number of comparisons on some input, every comparison sort makes Omega(n lg n) comparisons in the worst case. ^card-rfgv

> [!card] mcq
> The decision-tree argument bounds which quantity?
> - [x] The worst-case number of element-to-element comparisons any comparison sort must make
> - [ ] The average-case running time of quicksort specifically
> - [ ] The best-case running time of insertion sort
> - [ ] The number of swaps any in-place sort must make ^card-bqb1

Because heapsort and merge sort both achieve O(n lg n) worst case, and
the lower bound says Omega(n lg n) is unavoidable for this whole class,
they are asymptotically optimal comparison sorts: ==Theta(n lg n)== is ^card-z0a4
the best any comparison sort can guarantee.

Precisely what class of algorithms does this bound constrain? :: Only algorithms that determine relative order exclusively through pairwise comparisons of elements — it says nothing about algorithms that instead use elements' actual values, such as counting sort or radix sort, which sidestep the bound entirely by never building a comparison-based decision tree. ^card-lkri

> [!card] recall
> Explain why counting sort running in O(n + k) time does not contradict
> the Omega(n lg n) comparison-sort lower bound — what assumption of the
> decision-tree argument does it violate? ^card-q5a7

The bound is about the *comparison model*, not about sorting in general:
this category's notes on counting sort, radix sort, and bucket sort all
achieve linear time precisely by exploiting information about key
values that a pure comparison sort is not allowed to use.
