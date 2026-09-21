---
topic: algorithms
category: algo-strings
tags: [strings, string-matching, boyer-moore, bad-character-rule, sublinear]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 32 (String Matching)"]
---

# Boyer-Moore and the bad-character rule

Every algorithm so far in this category scans each alignment left to
right. Boyer-Moore's central move is to scan **right to left** instead —
comparing the pattern's last character against the text first — and that
single reversal is what lets a single mismatch rule out more than one
future alignment at once.

The payoff of scanning backwards is that a mismatch on the pattern's
last character, against a text character that doesn't appear anywhere
in the pattern at all, proves that *no* alignment overlapping that text
position can ever match — so the pattern can jump forward past it
entirely, rather than sliding by one and rechecking.

That is enough, in the best case, for Boyer-Moore to examine ==fewer ^card-hfif
than n== text characters in total — genuinely skipping over stretches of
text it never looks at, which is impossible for any left-to-right method
that must at least glance at every text character to rule it out.

> [!card] recall
> Explain why a left-to-right scanner like the naive method or KMP can
> never skip a text character entirely — it must at least examine every
> character once — while Boyer-Moore sometimes can. What does scanning
> right-to-left have to do with that difference?
> ---
> A left-to-right method only learns that a mismatch happened after
> comparing a text character, so by the time it knows a position doesn't
> match, it has already looked at it. Boyer-Moore compares the pattern's
> *last* character against the text first; if that text character
> doesn't occur in the pattern at all, every text position between the
> current one and the mismatch can be skipped without ever comparing
> them, because none of those alignments could possibly succeed either.
> The right-to-left order is what lets the algorithm rule out a block of
> future positions using a single comparison made now, instead of only
> ever ruling out the one position it just checked. ^card-p1i4

The **bad-character rule** formalizes that jump: when the text character
at the mismatch doesn't match the pattern character aligned with it,
shift the pattern so that text character lines up with its ==last== ^card-n4yg
occurrence in the pattern (searching from the mismatch point backward
through the pattern), or past the whole pattern entirely if that
character never occurs in it at all.

```
bad-character shift example:
text:     ... T R U S T ...
pattern:      T R I C K
mismatch at pattern[3] ('I') vs text 'U'
'U' does not occur anywhere in "TRICK"
-> shift the pattern entirely past this 'U'
```

A second, subtler rule — the **good-suffix rule** — covers the case
where several trailing characters matched before the mismatch: it shifts
the pattern to realign that already-matched suffix with another
occurrence of it elsewhere in the pattern, or with a matching prefix if
no other full occurrence exists. It is fiddlier to implement correctly
than the bad-character rule and matters most on patterns with internal
repetition, so most practical treatments give it less weight than the
comparison-count wins that the bad-character rule alone already
delivers.

Given both rules can apply at a single mismatch, what shift does Boyer-Moore actually take? :: The larger of the two candidate shifts — whichever of the bad-character rule and the good-suffix rule proposes moving the pattern further forward — since either shift is independently safe to take and taking the larger one never skips past a valid match. ^card-tlq7

> [!card] mcq
> At a Boyer-Moore mismatch, the bad-character rule proposes shifting by 2 and the good-suffix rule proposes shifting by 5. What shift does the algorithm use?
> - [x] 5 — the larger of the two, since both are independently safe lower bounds on how far the pattern can move
> - [ ] 2 — the bad-character rule always takes priority
> - [ ] 3.5 — the average of the two
> - [ ] Whichever rule was checked first in the implementation ^card-nvrz

Longer patterns give Boyer-Moore *more* to work with, not less: a bad
character absent from a long pattern rules out a longer stretch of
alignments in one shift than the same character absent from a short
one, so the pattern's own length increases the average skip distance
rather than the work per comparison.

> [!card] mcq
> Why does Boyer-Moore tend to get faster, not slower, as the pattern being searched for gets longer?
> - [x] A bad-character shift can move the pattern past more text at once, since a longer pattern gives more room for a mismatched text character to be absent or occur only early in it
> - [ ] Longer patterns require fewer preprocessing steps
> - [ ] The good-suffix rule stops applying once patterns exceed a certain length
> - [ ] Longer patterns are hashed instead of compared directly ^card-ojep

This is the property that makes Boyer-Moore, and its simpler Horspool
variant (which uses only the bad-character rule, keyed on the last
character of the current window rather than the specific mismatch
position), the basis of real `grep`-like text search tools — unlike
naive search or KMP, whose per-character cost cannot go below one
comparison per text character examined.

The plain algorithm's worst case is still ==O(n*m)==, the same bound as ^card-vfjp
naive search: an adversarial pattern and text (heavy internal repetition
combined with a pathological alphabet) can force it back to comparing
almost every character at almost every alignment, even though that
outcome is rare on ordinary text and patterns.

What guarantee does Boyer-Moore's average-case sublinear behavior *not* provide, unlike KMP's O(n + m)? :: A worst-case linear bound — the plain bad-character/good-suffix algorithm can still degrade to O(n*m) on adversarially constructed input, whereas KMP's O(n + m) bound holds unconditionally regardless of the input. ^card-svjc
