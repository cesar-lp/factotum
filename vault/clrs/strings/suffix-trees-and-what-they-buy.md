---
topic: algorithms
category: algo-strings
tags: [suffix-tree, ukkonen, string-matching, string-algorithms]
citations: ["Gusfield, Algorithms on Strings, Trees, and Sequences, Ch. 6 (Suffix Trees)"]
---

# Suffix Trees and What They Buy

A suffix tree is a compressed trie holding every suffix of a text at
once — the structure that a suffix array approximates far more cheaply.
This note is about why the tree is still worth knowing despite that:
what it buys once built, and the honest reasons it loses to the array in
almost every real system.

Building the tree naively, by inserting each of a text's `n` suffixes
into a trie one at a time and compressing chains of single-child nodes,
costs `O(n^2)`. ==Ukkonen's algorithm== builds the same tree online, one ^card-3exb
character of the text at a time, in `O(n)` overall — the specific result
that makes the structure usable rather than a theoretical curiosity.

The payoff for that `O(n)` build shows up entirely at query time. Once
the tree exists, searching for whether a pattern `P` occurs anywhere in
the text is a simple walk from the root, one character of `P` per edge,
taking ==O(m)== — proportional only to the *pattern's* length, with the ^card-20sx
text's length nowhere in the cost. A suffix array pays `O(m log n)` (or
`O(m + log n)` with an LCP array) for the same search, because it has to
narrow down a range with comparisons or binary search; the tree instead
lands on the exact matching subtree directly, at whatever depth that
subtree happens to sit.

> [!card] mcq
> A text is queried with many different short patterns. Both a suffix tree and a suffix-array-plus-LCP index have already been built for it. What is the search-time cost difference for one pattern of length m?
> - [x] The suffix tree answers in O(m), independent of text length n; the suffix array needs O(m + log n) because it must first binary-search for the matching range
> - [ ] Both cost O(m) once built, since both structures index every suffix
> - [ ] The suffix array is faster per query, O(m), while the tree costs O(m log n)
> - [ ] Neither depends on m; both depend only on n, the text length ^card-s1t1

That `O(m)` figure is why a suffix tree is the right structure
specifically when *one* text is fixed and queried over and over —
genome search against a fixed reference, or a static document index —
since the cost of building it once is amortized across an unbounded
number of cheap queries afterward.

Why does a suffix tree's O(m) search cost depend only on the pattern and not on the size of the text it was built over? :: Because the tree has already organized every suffix of the text into a trie keyed by starting character; matching P is just following the unique root-to-somewhere path spelled out by P's characters, one edge per character of P, so the number of steps is bounded by |P| regardless of how large the underlying text was. ^card-faco

Three problems fall out of the tree's shape almost for free once it is
built. The **longest repeated substring** in a text corresponds to the
==deepest internal node== in the tree — an internal node is shared by at ^card-lzge
least two suffixes, so the string spelled out on the path to it is a
repeat, and the one furthest from the root is the longest repeat.

The **longest common substring** of two different strings is found by
building one *generalized* suffix tree over the pair (each leaf tagged
with which string it came from) and finding the internal node, furthest
from the root, whose subtree contains leaves from ==both strings==. And ^card-f4z5
counting how many times a pattern occurs is just counting the leaves in
the subtree below the node where the pattern's path ends, since each
leaf corresponds to exactly one suffix, and hence one occurrence.

`compressed-tries-and-radix-trees.md` covers the general compression
trick — collapsing chains of single-child nodes into one edge labeled
with a substring — that a suffix tree relies on; without it, a suffix
tree would just be an ordinary uncompressed trie over `n` suffixes,
costing `O(n^2)` space instead of `O(n)`.

Despite all of that, suffix trees show up far more often in courses than
in production string-search code, for two honest reasons rather than
any flaw in the `O(n)`/`O(m)` bounds above. The constant factor in space
is large — ==10 to 20 bytes== per character of text is typical for a ^card-u8ff
realistic implementation with edge labels, suffix links, and child
pointers, against the small integer array a suffix array needs. And
Ukkonen's algorithm, while linear, is genuinely difficult to implement
correctly: the online extension rules, active-point bookkeeping, and
suffix-link maintenance have enough edge cases that a naive
implementation is more likely to be wrong than a naive suffix-array sort
is merely slow.

`suffix-arrays.md` is the structure that wins that trade-off in
practice — accepting the array's more awkward `O(m log n)` (or
`O(m + log n)` with LCP) search in exchange for an order of magnitude
less memory and a construction algorithm that is actually tractable to
implement.

> [!card] recall
> Given that a suffix tree strictly dominates a suffix array in
> asymptotic query time, explain why suffix arrays are still the
> structure of choice in most real string-processing systems. ^card-fx1c
