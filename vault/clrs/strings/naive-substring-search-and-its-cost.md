---
topic: algorithms
category: algo-strings
tags: [strings, string-matching, naive-search, complexity]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 32 (String Matching)"]
---

# Naive substring search and its cost

Every algorithm in this category is a different answer to one question:
what should you do when a comparison fails? This note covers the answer
that does nothing clever at all — the baseline the rest of the category
exists to improve on.

The naive method tries every possible alignment of the pattern against
the text, left to right, and at each alignment compares characters left
to right until either the whole pattern matches or one character
disagrees:

```
NAIVE-STRING-MATCHER(T, P)
n = T.length
m = P.length
for s = 0 to n - m
    if P[1..m] == T[s+1..s+m]
        print "pattern occurs with shift" s
```

For text length `n` and pattern length `m`, there are `n - m + 1`
candidate shifts, and each one can cost up to `m` comparisons before a
mismatch (or a full match) is found.

What text forces every single one of those comparisons to run to ^card-0djw
completion at every shift? :: A text of one repeated character (e.g. `aaaa...a`) searched for a pattern like `aaab` — every alignment matches all but the last character before failing, so no shift is rejected early.

That family is what drives the algorithm's worst case to
==O(n*m)==: `n` alignments, each doing up to `m` work, with no shift ^card-vfo7
ever cut short.

```
worst case: T = a^n, P = a^(m-1)b
each of the (n - m + 1) shifts compares all m characters before failing
total work = Theta((n - m + 1) * m) = O(n*m)
```

Despite that, naive search is the substring routine most languages ship
as their default, because ordinary text does not look like `aaaa...a`.

Why does naive substring search run close to O(n) on typical English text despite an O(n*m) worst case? :: Because a mismatch on ordinary text almost always happens at the very first character compared — the alphabet is large enough, and adjacent characters uncorrelated enough, that a wrong alignment is rejected in O(1) expected comparisons rather than running through most of the pattern, so the total work over all n alignments stays close to linear in n. ^card-oa33

> [!card] mcq
> Why does the naive substring-matching algorithm remain common in real-world libraries despite its O(n*m) worst case?
> - [x] On typical text its average-case behavior is close to O(n), since mismatches usually occur at the first compared character
> - [ ] Because O(n*m) is actually the best possible bound for string matching
> - [ ] Because it uses less memory than any preprocessing-based algorithm, which matters more than speed
> - [ ] Because real text never contains repeated characters ^card-ovex

The reason the worst case is so bad is also the reason smarter
algorithms exist: after a mismatch at some offset into the pattern, the
naive method **throws away everything it just learned** and restarts the
next alignment one position to the right, recomparing characters it has
already looked at.

> [!card] recall
> Suppose the naive matcher has just matched the first k characters of
> the pattern against the text and then failed on character k+1. Explain
> what information about the text the algorithm is discarding by simply
> sliding the pattern one position right and starting over, and why that
> information could in principle rule out some of the next few shifts
> without rechecking them.
> ---
> The k characters that matched are now known text content — the
> algorithm has effectively read T[s+1..s+k] and confirmed it equals
> P[1..k]. Sliding by exactly one and comparing from scratch ignores
> that fact entirely: any of the next shifts whose required prefix
> overlap is inconsistent with the text just read could be skipped, and
> any shift consistent with it could resume comparison partway into the
> pattern rather than at character 1. Naive search re-derives all of
> this from the raw text every time instead of reusing it. ^card-x2wq

The rest of this category exploits that discarded information in one of
two ways: precompute facts about the pattern so a mismatch tells you how
far it is safe to slide, or stop comparing characters altogether and
compare a cheap summary of each window instead.

What are the two general strategies later string-matching algorithms use to avoid the naive method's wasted re-comparison? :: Preprocessing the pattern itself, so that a mismatch reveals how far the pattern can safely slide without rechecking already-matched characters; or hashing each text window so that windows can be compared in constant time instead of character by character. ^card-tbo7

> [!card] mcq
> Preprocessing-based algorithms that fix naive search's wasted re-comparison achieve what worst-case bound, down from O(n*m)?
> - [x] O(n + m)
> - [ ] O(n * m) too, just with a smaller constant factor
> - [ ] O(m^2)
> - [ ] O(log n) ^card-2qq8

One family preprocesses the pattern itself, so a mismatch reveals exactly
how far the pattern can safely slide without rechecking — that is what
`kmp-and-the-failure-function.md` and
`boyer-moore-and-the-bad-character-rule.md` cover. The other family gives
up on character-by-character comparison altogether and compares a hash
of each window instead, which `rabin-karp-and-rolling-hashes.md` covers.
