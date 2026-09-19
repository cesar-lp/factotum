---
topic: algorithms
category: algo-design
tags: [dynamic-programming, lcs, edit-distance, string-algorithms]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 14 (Dynamic Programming)"]
---

# Longest Common Subsequence and Edit Distance

Building on the DP foundations note in this category, LCS and edit
distance are the two classic string DPs — both fill a 2-D table indexed by
prefixes of two sequences, and both need the same table-walk technique to
recover the actual alignment, not just its score.

Given sequences `X` (length `m`) and `Y` (length `n`), let `c[i][j]` be the
length of the longest common subsequence of the length-`i` prefix of `X`
and the length-`j` prefix of `Y`. The recurrence compares the *last*
characters of the two prefixes: if `x_i` and `y_j` are the same character,
that character can always be included, so `c[i][j] = c[i-1][j-1] + 1`;
otherwise the best is the better of dropping the last character of either
prefix, so `c[i][j] = max(c[i-1][j], c[i][j-1])`.

```
// LCS length table, filled row by row
for i = 1 to m:
  for j = 1 to n:
    if X[i] == Y[j]:
      c[i][j] = c[i-1][j-1] + 1
    else:
      c[i][j] = max(c[i-1][j], c[i][j-1])
```

Filling this table takes ==Θ(mn)== time and space, one entry per pair of ^card-428l
prefix lengths, each computed in O(1) from already-filled neighbors.

Why must `c[i-1][j-1]`, `c[i-1][j]`, and `c[i][j-1]` all already be computed by the time the loop reaches `c[i][j]`? :: Because the recurrence for `c[i][j]` only ever refers to entries with a strictly smaller `i`, a strictly smaller `j`, or both — filling the table in increasing order of `i` and, within each row, increasing `j` guarantees every dependency of a cell is already in the table before that cell is computed. ^card-r3bs

The table only holds lengths; recovering the actual common subsequence
means starting at `c[m][n]` and tracing choices backward: whenever `x_i`
and `y_j` match, that character is part of the LCS and the trace moves to
`c[i-1][j-1]`; otherwise it moves to whichever of `c[i-1][j]` or
`c[i][j-1]` was larger. This reconstruction pass is ==O(m + n)==, since ^card-h5fk
each step decreases `i`, `j`, or both by one.

Edit distance (Levenshtein distance) asks the reverse-flavored question:
the minimum number of insertions, deletions, and substitutions to turn `X`
into `Y`. Its table `d[i][j]` holds the edit distance between the two
prefixes, with the recurrence `d[i][j] = d[i-1][j-1]` when `x_i` and `y_j`
match, and otherwise `d[i][j] = 1 + min(d[i-1][j], d[i][j-1], d[i-1][j-1])` for a
deletion, insertion, or substitution respectively.

What are the base cases `d[i][0]` and `d[0][j]`, and why? :: `d[i][0] = i` and `d[0][j] = j`: turning a length-`i` prefix into the empty string takes exactly `i` deletions, and turning the empty string into a length-`j` prefix takes exactly `j` insertions — there is no cheaper way to change a string's length by `i` or `j` characters than one edit per character. ^card-un07

> [!card] mcq
> LCS and edit distance both fill an `(m+1) x (n+1)` table, but why can they not share the exact same recurrence?
> - [x] LCS only ever extends a match or drops a character (no cost model), while edit distance charges a cost for insertion, deletion, and substitution and must minimize it
> - [ ] LCS runs in O(mn) while edit distance runs in O(mn log(mn))
> - [ ] Edit distance requires the two strings to have equal length
> - [ ] LCS is defined only for sequences of numbers, not characters ^card-ojps

> [!card] recall
> Explain, without looking at the table, how you would read the actual
> sequence of edit operations (not just the count) back out of a filled
> edit-distance table `d`. ^card-pwea
