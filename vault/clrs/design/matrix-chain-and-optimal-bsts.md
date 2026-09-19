---
topic: algorithms
category: algo-design
tags: [dynamic-programming, matrix-chain, binary-search-trees, interval-dp]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 14 (Dynamic Programming)"]
---

# Interval DP: Matrix-Chain Multiplication and Optimal BSTs

The LCS and edit-distance note in this category indexes subproblems by
*prefixes* of the input. Matrix-chain multiplication and optimal binary
search trees are both DPs whose subproblem is instead an *interval* —
a contiguous run `[i, j]` of the input — which changes both what the table
means and the order in which it must be filled.

Matrix-chain multiplication asks: given matrices `A_1, ..., A_n` with
compatible dimensions, in what order should the multiplications be
parenthesized to minimize the total number of scalar multiplications?
Let `m[i][j]` be the minimum cost of multiplying the chain `A_i..A_j`. The
recurrence splits the chain at every possible point `k`:
`m[i][j] = min(i <= k < j) [m[i][k] + m[k+1][j] + p_(i-1) * p_k * p_j]`,
where `p_0..p_n` are the chain's dimensions.

Why can matrix-chain multiplication's recurrence not be filled in a single pass over increasing `i` (or increasing `j`) the way prefix DPs like LCS are? :: `m[i][j]` depends on `m[i][k]` and `m[k+1][j]` for every split point `k` strictly between `i` and `j` — both endpoints move inward, so a cell's dependencies are shorter *sub-intervals*, not shorter prefixes; the table must instead be filled in order of increasing interval length `l = j - i`, so every shorter interval a cell needs is already done. ^card-kzsh

```
// filled by increasing chain length, not row-by-row
for l = 2 to n:            // length of the subchain
  for i = 1 to n - l + 1:
    j = i + l - 1
    m[i][j] = min over k in [i, j) of m[i][k] + m[k+1][j] + p[i-1]*p[k]*p[j]
```

Computing every `m[i][j]` this way takes ==Θ(n^3)== time. There are Θ(n^2) ^card-umhn
intervals to fill, and each one considers O(n) possible split points.

Optimal binary search trees pose a structurally identical problem: given
keys `k_1 < ... < k_n` with known search probabilities, choose a BST shape
that minimizes ==expected search cost==. Let `e[i][j]` be the minimum ^card-z8zw
expected cost of a BST built over keys `k_i..k_j`; the recurrence again
splits the interval, this time by choosing which key `k_r` (for
`i <= r <= j`) becomes the ==root==, so the left and right sub-intervals ^card-wxc0
`[i, r-1]` and `[r+1, j]` become independent subproblems whose costs are
added along with the probability mass of the whole interval.

> [!card] mcq
> What do matrix-chain multiplication and optimal BST construction have in common that neither shares with LCS or edit distance?
> - [x] Their subproblems are contiguous intervals of the input, split at an interior point, rather than prefixes extended one element at a time
> - [ ] Both run in Θ(n) time
> - [ ] Both require the input to already be sorted
> - [ ] Neither one has an optimal substructure property ^card-8dxv

Reconstructing the actual parenthesization or tree shape works the same way
it does for rod cutting or LCS: alongside `m[i][j]`, store the split point
`s[i][j]` (or, for BSTs, the chosen root `root[i][j]`) that achieved the
minimum, then recursively re-split `[i, j]` into `[i, s[i][j]]` and
`[s[i][j]+1, j]` to rebuild the structure from the top down.

What table-filling order do both matrix-chain multiplication and optimal BST construction require, and why? :: Increasing interval length: every cell `[i, j]` depends only on strictly shorter sub-intervals nested inside it, so all length-1 intervals must be filled first, then length-2, and so on up to the full interval `[1, n]` — filling by row or by prefix, as in LCS, would reach a cell before one of its dependencies existed. ^card-pxjv

> [!card] recall
> Explain why the "choose a split point" recurrence for both problems
> necessarily costs a sum over all `n` interval lengths and, for each
> length, all its starting positions and split points — and connect that
> to the Θ(n^3) bound. ^card-7vfo
