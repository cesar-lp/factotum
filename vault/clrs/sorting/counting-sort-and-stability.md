---
topic: algorithms
category: algo-sorting
tags: [counting-sort, stability, non-comparison-sort, linear-time]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 8 (Sorting in Linear Time)"]
---

# Counting Sort and Stability

Counting sort sidesteps the previous note's Omega(n lg n) comparison
bound entirely by never comparing two elements against each other: it
only uses each element's key as an index, which is exactly the class of
algorithm the lower bound does not constrain.

The algorithm assumes every key is an integer in a known range `0..k`.
It builds a count array `C` where `C[i]` ends up holding the number of
input elements `<= i`, then places each input element directly into its
final output position by looking up and decrementing `C` at its key.

```
COUNTING-SORT(A, B, k)
  let C[0..k] be a new array, initialized to 0
  for j = 1 to A.length: C[A[j]] += 1          // C[i] = count of key i
  for i = 1 to k: C[i] += C[i-1]               // C[i] = count of keys <= i
  for j = A.length downto 1:                   // must go right to left
      B[C[A[j]]] = A[j]
      C[A[j]] -= 1
```

Why does the final placement loop iterate over A from right to left rather than left to right? :: Processing back to front places equal keys into the output in the same relative order they had in the input, because the last-seen copy of a repeated key claims the highest remaining slot in C first and earlier copies claim progressively lower slots — reversing the scan direction would still sort correctly but would reverse the relative order of equal keys. ^card-prfu

An algorithm is ==stable== if elements with equal keys keep their ^card-jfdi
original relative order in the output. Counting sort achieves this only
because of the specific right-to-left placement above — it is not an
automatic property of "sorting by counting."

Why does stability matter for a sort used as a subroutine, even when the final keys being compared are all distinct? :: A stable sort lets you sort records by one key while preserving whatever order a previous sort established on a different key — for example sorting by last name, then stably by first name, keeps same-first-name groups sorted by last name; radix sort depends on exactly this property, since it repeatedly re-sorts the whole array by one digit at a time. ^card-3u7w

> [!card] mcq
> Counting sort's O(n + k) running time depends critically on which assumption?
> - [x] Keys are integers in a known range 0..k
> - [ ] The input is already nearly sorted
> - [ ] Keys are drawn from a continuous, uniformly distributed range
> - [ ] The array is small enough to fit in cache ^card-mtjx

If k is not O(n) — say keys range over 0..n^3 — counting sort's O(n + k)
bound degrades badly, since the count array itself costs Theta(k) just
to allocate and scan. This is precisely why counting sort is normally
used as a bounded-range building block (for example, one pass of radix
sort) rather than a general-purpose sort.

What happens to counting sort's running time guarantee when the key range k is much larger than n, and why? :: The bound O(n + k) is dominated by the k term, so it stops being linear in the input size and can become far worse than any Theta(n lg n) comparison sort — the algorithm needs the range to be O(n) (or close to it) for its linear-time advantage to actually hold. ^card-nmnn

> [!card] recall
> Explain why counting sort's O(n + k) bound is not a violation of the
> comparison-sort lower bound, connecting it back to what a decision
> tree assumes about how the algorithm accesses keys. ^card-a2q3
