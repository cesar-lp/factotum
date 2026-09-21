---
topic: algorithms
category: algo-strings
tags: [strings, string-matching, rabin-karp, rolling-hash, randomization]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 32 (String Matching)"]
---

# Rabin-Karp and rolling hashes

The two prior notes in this category speed up matching by preprocessing
the *pattern*. Rabin-Karp takes an entirely different route: it never
looks character-by-character at most windows of the text at all — it
compares a numeric hash of each window against the hash of the pattern,
and only falls back to characters when the hashes agree.

The move that makes this cheap is computing the next window's hash in
constant time from the current one, instead of re-hashing m characters
from scratch at every shift. Treating each window as an m-digit number
in some base, sliding by one means removing the leading digit's
contribution, shifting everything up by one digit, and adding the new
trailing digit:

```
h(s+1) = ( (h(s) - T[s+1]*base^(m-1)) * base + T[s+m+1] ) mod q
```

That update touches a constant number of arithmetic operations
regardless of m, which is what makes computing every window's hash cost
==O(1)== amortized per shift rather than O(m). ^card-alqo

> [!card] recall
> Write out, in your own words, why the rolling-hash update above needs
> to both subtract off T[s+1]'s contribution and multiply by the base,
> rather than just adding the new trailing character's contribution.
> ---
> Sliding the window by one doesn't just add a new character — it also
> drops the oldest one and shifts every remaining digit's place value up
> by one position (since the window is being read as a base-`base`
> number). Subtracting T[s+1]*base^(m-1) removes the dropped digit's
> weighted contribution, multiplying by base re-aligns every remaining
> digit to its new place value, and only then does adding T[s+m+1]
> correctly install the new trailing digit at place value 0. ^card-m09v

A matching hash is not proof of a matching substring — two different
windows can collide to the same hash value under any fixed modulus. So a
hash match is only ever a **candidate**, and Rabin-Karp must still
compare the candidate window against the pattern character by character
before reporting a match.

Skipping that character-by-character verification after a hash match is not a valid optimization — why not? :: Because hash collisions are possible for any fixed hash function, so a matching hash only proves the windows are equal with high probability, not certainly; reporting a match without verifying it can produce false positives, turning the algorithm from correct-but-probabilistic-in-cost into simply incorrect. ^card-lyi1

> [!card] mcq
> Two different text windows hash to the same value as the pattern under Rabin-Karp's modulus. What must the algorithm do before reporting a match at that position?
> - [x] Compare the window against the pattern character by character to confirm it isn't a hash collision
> - [ ] Report the match immediately, since equal hashes imply equal strings for a well-chosen modulus
> - [ ] Recompute the hash with a different base and compare again
> - [ ] Skip that position, since a collision means the strings must differ ^card-uihn

Because of collisions, Rabin-Karp's complexity has two very different
faces. With a well-chosen modulus, expected running time is
==O(n + m)== — one O(1) hash comparison per shift, plus the rare ^card-3w8q
verification. But an adversary who knows the modulus can construct a
text where every window collides with the pattern's hash, forcing full
verification at every shift and driving the algorithm back to
`O(n*m)`, exactly the naive bound this category's baseline note
describes.

```
expected: O(n + m)   -- collisions rare, verification rare
worst case: O(n * m) -- adversarial collisions at every shift
```

What defeats an adversary who is trying to construct text that collides with the pattern's hash at every window? :: Choosing the modulus q as a large prime, ideally chosen at random after the input is fixed (or otherwise unknown to whoever constructs the text), so the adversary cannot pick text tailored to force collisions against a modulus they don't know in advance. ^card-u7iv

Rabin-Karp's hashing approach pays off in exactly the cases where
comparing strings directly, or precomputing one pattern's internal
structure, doesn't generalize well. Searching for many patterns at once
is one: hash every pattern into a set first, then a single scan over the
text need only compute one rolling hash per window and do a set lookup,
rather than running a separate single-pattern algorithm once per
pattern. Two-dimensional pattern matching is the other: rolling a hash
across rows and then across columns of an image or grid extends
naturally, in a way that a purely sequential automaton like KMP's does
not.

> [!card] mcq
> For which of these is Rabin-Karp's hashing approach a genuinely better fit than KMP's precomputed-automaton approach?
> - [x] Searching a text for any of a large set of patterns simultaneously
> - [ ] Searching a stream that can never be rewound
> - [ ] Searching for a single short pattern in a single short text
> - [ ] Guaranteeing worst-case linear time on adversarial input ^card-ulul
