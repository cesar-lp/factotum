---
topic: algorithms
category: algo-strings
tags: [suffix-array, string-matching, lcp-array, string-algorithms]
citations: ["Gusfield, Algorithms on Strings, Trees, and Sequences, Ch. 7 (Suffix Trees) and 14 (Suffix Arrays)"]
---

# Suffix Arrays

A suffix tree (covered in the next note) indexes every suffix of a text
in a compressed trie, and gets substring search down to time proportional
to the pattern alone. A suffix array gets almost the same power out of a
structure that is nothing more than a sorted list of integers, and that
gap in implementation weight is why it, not the tree, is what production
string-search code actually builds.

A suffix array for a text of length `n` is the array of the starting
positions of all of its suffixes, listed in the order that the suffixes
themselves sort lexicographically. Nothing is stored but integers — no
pointers, no per-character tree nodes — so the whole structure is
==n integers==, against a suffix tree's per-character node overhead. That ^card-hv0y
compactness, not any extra capability, is the entire reason a suffix array
is the practical default: it does most of what a suffix tree does, in a
fraction of the memory, at the cost of the trickier substring-search logic
covered below.

```
text:  b a n a n a $
index: 0 1 2 3 4 5 6

suffixes, sorted lexicographically:
$          (starts at 6)
a $        (starts at 5)
a n a $    (starts at 3)
a n a n a $(starts at 1)
b a n a n a $ (starts at 0)
n a $      (starts at 4)
n a n a $  (starts at 2)

suffix array: [6, 5, 3, 1, 0, 4, 2]
```

Every occurrence of a pattern `P` in the text corresponds to every suffix
that starts with `P` — and because the array is sorted, all suffixes
sharing a given prefix sit next to each other, the same way every word
starting with "cat" sits together in a dictionary. So the set of suffix
array positions where `P` occurs is always a ==contiguous block==, never ^card-7p08
scattered entries.

> [!card] mcq
> Why does every occurrence of a pattern P show up as a contiguous block of positions in a suffix array, rather than scattered anywhere in the array?
> - [x] The array is sorted lexicographically by suffix, so all suffixes sharing the prefix P are adjacent, exactly like a dictionary grouping every word starting with "cat"
> - [ ] Because the text itself was constructed to place every occurrence of P next to each other
> - [ ] Because the array stores suffix lengths, and occurrences of P always have equal length
> - [ ] It doesn't — occurrences are only contiguous when P occurs at the very start or end of the text ^card-2jd0

That contiguity is what turns substring search into a search problem
over a sorted list: two binary searches for the boundary of the block
whose suffixes start with `P` locate every occurrence. Each comparison
during that binary search can cost up to `O(m)` characters (comparing
`P` against a suffix), and there are `O(log n)` comparisons, so plain
suffix-array search runs in ==O(m log n)==. ^card-7800

The companion structure that improves on that is the **LCP array**
(longest common prefix): entry `i` holds the length of the longest common
prefix shared between adjacent suffixes `i-1` and `i` in the sorted
order. Once it exists, it collapses the redundant character comparisons
across binary-search steps, taking substring search down to
`O(m + log n)`.

Why is the LCP array able to turn suffix-array search from O(m log n) into O(m + log n)? :: Because it records, for every adjacent pair of suffixes in sorted order, how much prefix they already share — the binary search can reuse that shared-prefix length across steps instead of re-comparing the same leading characters against P every time, so the O(m) character-comparison cost is paid closer to once rather than once per comparison step. ^card-v7qv

Building the array by literally sorting the `n` suffixes with a
general-purpose sort costs ==O(n^2 log n)==: there are `O(n log n)` ^card-p86k
comparisons in the sort, and comparing two suffixes directly can itself
take `O(n)` characters in the worst case. Nobody ships that. Practical
construction uses algorithms such as the ==skew (DC3)== algorithm or ^card-clri
SA-IS, both of which build the array in `O(n)` — or simpler `O(n log n)`
approaches based on doubling the compared prefix length at each round —
by exploiting structure across suffixes instead of comparing each pair
from scratch.

Two applications beyond plain pattern search follow directly from the
array's structure. The longest repeated substring in the text is the
substring corresponding to the single largest entry in the LCP array,
since the longest shared prefix between any two suffixes anywhere in the
text must appear between some pair of *adjacent* entries in sorted order.
And the Burrows-Wheeler transform used in `bzip2` and in FM-indexes is,
in one sentence, the sequence of characters immediately preceding each
suffix in suffix-array order — the transform and the array are two views
of the same sorted structure.

What text position in the suffix array holds the longest repeated substring of the text? :: The one corresponding to the largest single entry in the LCP array — the longest run of shared prefix between two lexicographically adjacent suffixes is always the longest repeat in the whole text, because any two suffixes sharing a longer prefix would have to sort adjacently too. ^card-rpwv

> [!card] recall
> A suffix array plus its LCP array is described as buying "almost the
> same power" as a suffix tree at a fraction of the memory. Explain what
> is lost, not just what is gained, by choosing the array over the tree
> for a task like substring search over a fixed text. ^card-uonc
