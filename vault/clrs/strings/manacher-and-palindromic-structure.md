---
topic: algorithms
category: algo-strings
tags: [manacher, palindrome, string-algorithms, amortized-analysis]
citations: ["Gusfield, Algorithms on Strings, Trees, and Sequences, Ch. 9 (exercises on palindromes); Manacher, 'A New Linear-Time On-Line Algorithm for Finding the Smallest Initial Palindrome of a String', 1975"]
---

# Manacher's Algorithm and Palindromic Structure

Finding the longest palindromic substring of a string looks like it
should need quadratic work: try every possible center, and expand
outward while the characters on both sides keep matching. That approach
is correct, and it is the whole content of this note's first half —
because seeing exactly where it wastes work is what motivates the
linear-time algorithm in the second half.

Expanding around every center costs `O(n)` centers times up to `O(n)`
expansion steps each, so naive center-expansion is ==O(n^2)==. Some ^card-iws1
strings force the worst case directly — a string of `n` identical
characters has a palindrome centered everywhere, each one expanding
almost to the full string length, so the quadratic bound is not a loose
worst-case artifact but the real cost on real input.

> [!card] mcq
> Why is expand-around-every-center for longest palindromic substring O(n^2) rather than O(n)?
> - [x] There are O(n) possible centers, and in the worst case (e.g. a string of all-identical characters) each one's expansion itself takes O(n) steps, so the total work multiplies
> - [ ] Because comparing two characters for equality is itself an O(n) operation
> - [ ] Because a palindromic substring must be checked against every other substring for uniqueness
> - [ ] It isn't — expand-around-center is already O(n) because each center is visited once ^card-zbib

A second nuisance, separate from the running time, is that palindromes
come in two shapes: odd-length ones have a single character at the
center, even-length ones have the center sitting between two characters.
Handling both shapes means writing two versions of the same expansion
logic. The standard fix is to interleave a separator character (one
that cannot occur in the input, conventionally `#`) between every pair
of characters and at both ends, so every original palindrome — odd or
even — maps to an odd-length palindrome in the transformed string, with
a single well-defined center.

```
original:    a b a
transformed: # a # b # a #

original:    a b b a
transformed: # a # b # b # a #
```

With the transform in place, one expansion routine handles every case;
the palindrome radius found in the transformed string maps back to the
original palindrome's length by a fixed arithmetic adjustment.

Manacher's algorithm's central idea is that ==palindromes are ^card-j06q
symmetric==: if the current center `i` sits inside a palindrome already
found, centered at some earlier position `c` with right edge `r`, then
`i` has a mirror image `i' = 2c - i` on the other side of `c`, and the
radius already computed at `i'` is a valid *lower bound* on the radius
at `i` — up to the point where the known palindrome around `c` runs out.
Expansion at `i` never has to redo work that symmetry already
guarantees; it only has to check characters past whatever that mirrored
radius already proves.

Why can the radius already computed at a mirrored position i' be reused as a starting point for the radius at position i, instead of expanding i from scratch? :: Because i and i' are reflections of each other across the center c of a palindrome that is already known to extend out to r, so the substring around i must mirror the substring around i' at least as far as that shared palindrome reaches — any match already confirmed on i''s side is guaranteed to hold on i's side too, and only the portion beyond the known palindrome's boundary is genuinely unverified. ^card-45cj

The running-time argument does not come from bounding any single
center's expansion — some still expand far — it comes from tracking the
==right boundary== of the furthest-reached palindrome found so far. ^card-qbrv

Every character comparison that succeeds during an expansion past the
mirrored lower bound pushes that tracked edge strictly forward, and it
never moves back once advanced. Since it can advance at most `n` times
over the whole algorithm, the total work spent on comparisons beyond the
free lower bound is bounded by `n` as well, which is the amortized
argument that makes the whole algorithm run in ==O(n)== despite ^card-ae47
individual centers still doing real expansion work.

Explain why Manacher's algorithm is O(n) overall even though some individual centers require many expansion steps beyond their mirrored lower bound. :: Because every successful comparison performed during those "extra" expansions advances the algorithm's tracked right boundary strictly forward, and the right boundary is monotonically non-decreasing and bounded above by n — so however unevenly that expansion work is distributed across centers, its total across the whole run cannot exceed O(n), which is an amortized argument rather than a per-center bound. ^card-yc02

`kmp-and-the-failure-function.md` earns the comparison here because it
solves a different problem with the identical instinct: KMP's failure
function avoids re-comparing characters the automaton has effectively
already matched, by reusing a previously computed piece of structure
instead of restarting from scratch on a mismatch. Manacher does the same
thing for palindrome radii instead of pattern-matching state — the
technique of *reusing already-computed structure instead of
recomputing it* is the transferable lesson, not the specific bookkeeping
of either algorithm.

> [!card] recall
> Manacher's algorithm is fairly narrow in what it solves — the single
> problem of longest palindromic substring. Explain why it is still
> worth knowing as a general algorithmic technique, independent of how
> often that exact problem comes up in practice. ^card-9ssp
