---
topic: algorithms
category: algo-strings
tags: [strings, string-matching, kmp, failure-function, amortized-analysis]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 32 (String Matching)"]
---

# KMP and the failure function

Naive search discards a matched prefix the moment a mismatch happens and
restarts one position over. Knuth-Morris-Pratt's whole trick is refusing
to discard it: before scanning the text at all, it precomputes, for every
prefix length of the pattern, exactly how far a mismatch there lets it
jump ahead — without ever rechecking a text character it has already
seen.

That precomputed table is the **failure function**, sometimes called the
==prefix function== because each entry is defined in terms of the ^card-c8jj
pattern's own prefixes and suffixes rather than anything to do with the
text. Its definition answers one very specific question:
given that the pattern has just matched its first k characters against
the text and then failed on character k+1, what is the longest proper
prefix of the pattern that is also a suffix of those k matched
characters? That length is exactly how much of the pattern is still
known to be aligned correctly, so matching can resume there instead of
from scratch.

```
pi[q] = max { k : k < q and P[1..k] is a suffix of P[1..q] }
```

For `P = ababaca`, the table reads:

```
q     : 1  2  3  4  5  6  7
P[q]  : a  b  a  b  a  c  a
pi[q] : 0  0  1  2  3  0  1
```

`pi[5] = 3` means: if the pattern has matched `ababa` against the text
and then mismatches, the algorithm doesn't restart — it resumes as if
the first 3 characters (`aba`) were already matched, because that prefix
of the pattern is also a suffix of what was just matched.

> [!card] mcq
> pi[5] = 3 for P = ababaca means what, precisely?
> - [x] The longest proper prefix of P that is also a suffix of P[1..5] has length 3
> - [ ] Character 5 of the pattern repeats 3 times earlier in the pattern
> - [ ] The first 3 characters of the pattern are also a prefix of the text
> - [ ] There are 3 total repeated substrings within P[1..5] ^card-ciwo

> [!card] mcq
> After matching P[1..q] against the text and then failing at P[q+1], KMP resumes matching from pattern position pi[q]. What does pi[q] represent?
> - [x] The length of the longest proper prefix of the pattern that is also a suffix of the q characters just matched
> - [ ] The length of the longest substring that occurs more than once anywhere in the pattern
> - [ ] The length of the longest prefix the pattern shares with the text starting at the current position
> - [ ] The number of characters that must be skipped before restarting the search ^card-uqf3

Once pi is built, the matching phase never re-examines a text character
it has already consumed and never moves the text pointer backwards — a
mismatch only ever adjusts *how much of the pattern* is considered
matched, via pi, and then keeps advancing through the text.

The text pointer in KMP's matching phase ==never moves backwards==, ^card-rysm
which is the property that makes the algorithm usable on a stream that
cannot be rewound — unlike naive search, which conceptually restarts its
view of the text at a new position after every failed alignment.

That single-pass property, together with pi being computed once up
front, is what gives KMP its combined running time:

```
preprocessing: Theta(m)   -- build pi by matching P against itself
matching:      Theta(n)   -- text pointer advances monotonically
total:         Theta(n + m)
```

> [!card] recall
> The matching phase of KMP has an inner while-loop that can run several
> times at a single text position (following pi backwards after a
> mismatch). Explain why the total number of iterations of that inner
> loop, summed over the whole matching phase, is still bounded by O(n)
> rather than by O(n*m).
> ---
> Charge each inner-loop iteration to a decrease in the "characters of
> the pattern currently considered matched" counter — following pi
> strictly decreases that value. Across the whole scan, that counter is
> incremented at most once per text character (an outer-loop step), so
> it can be incremented at most n times total, which bounds the number
> of times it can be decremented — and therefore the number of inner-loop
> iterations — to O(n) as well, giving O(n) total for the matching phase
> despite the nested loop. ^card-c57j

Building pi itself is a smaller instance of the exact same problem:
matching the pattern against itself, one character ahead at a time, and
reusing pi's own already-computed values to skip redundant comparisons —
which is why its cost is ==O(m)== rather than the naive O(m^2) of ^card-db1u
checking every prefix/suffix pair directly.

Why is KMP's preprocessing step run "the pattern against itself" rather than against the text? :: Because the failure function is a property of the pattern alone — it records, for every prefix of the pattern, how that prefix's own internal repetition would let matching resume after a failure — so it can be fully computed before the text is even read, using the same matching logic recursively on P. ^card-78ye

Combined, preprocessing and matching give KMP its headline bound of
O(n + m), a strict improvement over naive search's O(n*m) worst case
covered in `naive-substring-search-and-its-cost.md`; Boyer-Moore, covered
in `boyer-moore-and-the-bad-character-rule.md`, gets its speed from a
different precomputed table and a right-to-left scan instead.
