---
topic: algorithms
category: algo-strings
tags: [edit-distance, levenshtein, sequence-alignment, dynamic-programming]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 14 (Dynamic Programming)"]
---

# Edit Distance and Sequence Alignment

`dynamic-programming-foundations.md` covers the technique this note
leans on — filling a table of subproblem answers so overlapping
recursive calls are solved once — so this note spends its words on what
is specific to strings: the space/traceback trade-off, the family of
variants that share the recurrence, and where the quadratic cost stops
being acceptable.

Levenshtein distance between two strings is the minimum number of
insertions, deletions, and substitutions needed to turn one into the
other. Its recurrence compares the last characters of each prefix:

```
d[i][0] = i                    // delete all i characters of X's prefix
d[0][j] = j                    // insert all j characters of Y's prefix
d[i][j] = d[i-1][j-1]                              if x_i == y_j
d[i][j] = 1 + min(d[i-1][j],    // delete x_i
                   d[i][j-1],    // insert y_j
                   d[i-1][j-1])  // substitute x_i for y_j
                                 otherwise
```

Filling the full table costs `O(n*m)` time and, if every cell is kept,
the same order of space — one cell per pair of prefix lengths. That
bound is already carded by `../design/longest-common-subsequence-and-edit-distance.md`,
so this note starts from it and spends its attention on what the table
costs you in space and what you give up to avoid paying it.

Most of that space is wasted if all that's wanted is the distance
itself: since `d[i][j]` only ever depends on row `i-1` and the current
row `i`, keeping just two rows (or one, updated in place with a saved
corner value) is enough, cutting space to ==O(min(n,m))== by always ^card-tnr6
making the shorter string the one that indexes the kept dimension.

That optimization is not free, and treating it as one is the mistake
this note wants to head off. Recovering the actual sequence of edits —
the alignment itself, not just its length — requires walking backward
through the table from `d[n][m]`, at each step re-deriving which of the
three predecessor cells produced the current value. That backward walk
needs the *whole* table still in memory, every row, not just the last
two. So the space optimization and alignment recovery are mutually
exclusive: choosing `O(min(n,m))` space means giving up the ability to
answer "what are the edits", and getting that answer back means paying
the full `O(n*m)` space again.

> [!card] mcq
> In the edit-distance table, a mismatch means d[i][j] is computed as 1 + min(d[i-1][j], d[i][j-1], d[i-1][j-1]). Which predecessor cell corresponds to a substitution of x_i for y_j?
> - [x] d[i-1][j-1] — both prefixes shorten by one character, since one character from each string is consumed and swapped for the other
> - [ ] d[i-1][j] — X's prefix shortens by one while Y's stays the same length
> - [ ] d[i][j-1] — Y's prefix shortens by one while X's stays the same length
> - [ ] None of the three; substitution is only possible when x_i already equals y_j ^card-gk3x

Why does recovering the actual sequence of edits require the full O(n*m) table, even though computing just the final distance only ever needs two rows at a time? :: Because the traceback walks backward from d[n][m], and at every step it needs to look up which specific predecessor cell (from a row far above the current one, in general) produced the current value — once older rows are discarded to save space, that information needed to reconstruct the path is gone even though the numeric answer at d[n][m] is still correct. ^card-hf9c

The recurrence's three-operation cost model is one choice among several,
and each variant changes what the table means without changing how it's
filled. Charging different costs to insertion, deletion, and
substitution (say, a costly substitution to discourage aligning
unrelated characters) still fills the same table shape with a different
`min` expression. Dropping substitution entirely and only allowing
insertion and deletion is exactly the recurrence for the
==longest common subsequence== of the two strings — LCS is the special ^card-kdhz
case of edit distance with no substitution operation available.

`longest-common-subsequence-and-edit-distance.md` in `algo-design`
already works through the LCS recurrence and its own reconstruction walk
in full; this note treats LCS only as the special case that clarifies
what substitution costs edit distance are actually buying.

A further variant changes what question is asked, not just what edits
cost. Global alignment, the Needleman-Wunsch algorithm, forces the whole
first string to align against the whole second string end to end, which
is exactly what the table above computes. The local-alignment algorithm
==Smith-Waterman== instead finds the best-scoring pair of substrings, ^card-2edg
allowing the alignment to start and end anywhere. It does so by adding a
floor of zero to each cell, never letting a running score go negative,
and reading the answer from the maximum cell anywhere in the table
rather than forcing it to be the bottom-right corner.

What problem does local alignment solve that global alignment cannot, and how does the recurrence change to solve it? :: Local alignment finds the best-matching region between two sequences even when the sequences as a whole are mostly dissimilar — useful when only a shared motif or domain matters, not the full-length similarity. The recurrence changes by flooring every cell at zero (a bad-enough alignment simply restarts from an empty prefix rather than carrying a negative score forward) and reporting the maximum value anywhere in the table, instead of reading off the fixed bottom-right corner. ^card-7vow

These variants underpin ordinary tools: spell correctors rank
suggestions by edit distance to a dictionary word, `diff` is a
longest-common-subsequence computation over lines, and bioinformatics
alignment tools are this same table with biologically motivated cost
variants layered on.

Why does a `diff` tool between two file revisions correspond to a longest-common-subsequence computation rather than a plain edit-distance one? :: `diff` wants to show which lines were kept unchanged and which were added or removed, not a minimum edit count with substitutions — treating a changed line as a paired delete-then-insert rather than a single substitution is exactly what LCS's insertion/deletion-only model produces, and it is what lets diff output read as "these lines stayed, these were added, these were removed." ^card-9mlk

> [!card] recall
> Real DNA and protein aligners (like BLAST) do not run Needleman-Wunsch
> or Smith-Waterman directly against a full genome. Explain what makes
> the plain O(n*m) table impractical at that scale, and what "seed and
> extend" does instead. ^card-pqbd
