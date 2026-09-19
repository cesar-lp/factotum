---
topic: algorithms
category: algo-sorting
tags: [radix-sort, bucket-sort, stable-sort, digit-by-digit]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 8 (Sorting in Linear Time)"]
---

# Radix Sort and Bucket Sort

Both algorithms here extend the previous note's idea — sort by key value,
not by comparison — to keys that don't fit neatly into a small range on
their own, either by attacking one digit at a time or by exploiting a
known distribution over the keys.

LSD radix sort sorts multi-digit keys by repeatedly sorting on a single
digit, starting from the ==least significant== digit and working toward ^card-m1kx
the most significant, using a stable sort as the subroutine at each
pass.

```
RADIX-SORT(A, d)
  for i = 1 to d:                    // start at least significant digit
      use a stable sort to sort A on digit i
```

Why must the per-digit subroutine be stable for radix sort to work at all? :: Each pass only distinguishes elements by one digit, so elements that tie on that digit must keep the relative order established by all the previous (less significant) passes; an unstable subroutine would scramble that accumulated ordering, and the final result would not be correctly sorted on the digits already processed. ^card-putc

Counting sort is the natural subroutine for each digit pass, since a
digit's range is small and fixed (0-9 for base 10, or 0 to `2^r - 1` for
an r-bit digit), and — as the previous note covered — counting sort is
already stable when implemented with its standard right-to-left
placement.

With `d` digits, each in the range `0` to `k`, and each counting-sort
pass costing `Theta(n + k)`, radix sort's total running time is
`Theta(d(n + k))`. Choosing a digit size so `k = Theta(n)` makes each
pass ==Theta(n)==, so the whole sort is `Theta(d*n)` — linear in `n` for ^card-qtxs
any fixed number of digits `d`.

> [!card] mcq
> Why does radix sort require a stable sort as its per-digit subroutine, specifically?
> - [x] So ties on the current digit preserve the ordering already established by less-significant digits processed in earlier passes
> - [ ] So the algorithm can run in-place without extra memory
> - [ ] So the algorithm works correctly on keys of unequal length
> - [ ] So each pass can run in parallel with the others ^card-56wi

Bucket sort takes a different assumption: it works well when input keys
are ==uniformly distributed== over a known range, typically real numbers ^card-a29p
in `[0, 1)`. It divides the range into `n` equal-sized buckets, scatters
each input element into its bucket in O(1), sorts each bucket (commonly
with insertion sort, since buckets are expected to be small), then
concatenates the buckets in order.

What specific assumption about the input does bucket sort's expected O(n) analysis rely on, and what happens to that bound if the assumption fails? :: It relies on keys being drawn independently from a uniform distribution over the range, so that each bucket receives O(1) elements on average; if the input is skewed so most keys land in one bucket, that bucket's insertion sort degrades toward its own worst case, and the overall running time can rise toward Theta(n^2) even though the algorithm never compares keys across buckets. ^card-zqye

> [!card] recall
> Contrast what "linear time" costs each of counting sort, radix sort,
> and bucket sort in terms of the assumption it makes about the input —
> radix sort's assumption is about key structure, and bucket sort's is
> about a probability distribution, not a fixed range. Explain why
> neither assumption is needed by a comparison sort, and why that is
> exactly the tradeoff for beating Omega(n lg n). ^card-2mta
