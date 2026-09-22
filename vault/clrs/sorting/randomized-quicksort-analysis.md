---
topic: algorithms
category: algo-sorting
tags: [randomized-quicksort, expected-running-time, indicator-random-variables]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 7 (Quicksort)"]
---

# Randomized Quicksort and Its Expected Running Time

The previous note showed deterministic Lomuto quicksort has a
Theta(n^2) worst case on inputs an adversary can construct in advance,
such as an already-sorted array. `RANDOMIZED-PARTITION` fixes the
*attacker's* leverage, not the worst case itself, by swapping `A[r]` with
a ==uniformly random== element of `A[p..r]` before calling ordinary ^card-cpk1
Lomuto partitioning on it.

Because the pivot is now a random choice independent of the input's
order, no fixed input can force a bad split every time — the bad split
becomes a low-probability *event* for any given input, rather than a
certainty for some input.

CLRS bounds the expected running time using indicator random variables
`X_k` for each pair of elements, tracking whether the k-th and l-th
smallest elements are ever compared during the whole run. Summing
$E[X_k]$ over all pairs gives the expected number of comparisons.

What is the key property CLRS exploits about when two elements get compared in quicksort? :: Two elements are compared at most once in the entire run, and only if one of them is chosen as a pivot before any element with a rank strictly between them is — so the total comparison count over the run is exactly the sum of these Theta(n^2) pairwise indicator variables. ^card-rtrh

Randomized quicksort's expected running time on any input, worst case included, is ==O(n lg n)==. This holds for every input array, including the ones that force Theta(n^2) on the deterministic version, because the expectation is taken over the algorithm's own random pivot choices, not over some assumed distribution of inputs. ^card-l38r

> [!card] mcq
> Which best describes the source of the randomness in randomized quicksort's O(n lg n) expected-time bound?
> - [x] The algorithm's own random pivot choices, averaged over all its possible runs on one fixed input
> - [ ] An assumption that the input array itself is drawn uniformly at random
> - [ ] The random assignment of elements to processors
> - [ ] Randomized rounding of the comparison results ^card-553m

Is there still an input, or a sequence of coin flips, that makes randomized quicksort take Theta(n^2) time? :: Yes — for any fixed sequence of random choices there exists some input that produces an unbalanced Theta(n^2) split at every level, so the Theta(n^2) worst case still exists in the sample space; what changes is that no adversary who only sees the input in advance (and not the random bits) can *force* that run, because the same input yields a fast run under almost all other random choices. ^card-mctr

> [!card] recall
> Explain precisely why "expected O(n lg n) running time" and "worst-case
> O(n lg n) running time" are different claims, and which one randomized
> quicksort actually achieves. ^card-u9fj

The lesson generalizes beyond quicksort: randomization does not
eliminate an algorithm's bad case, it removes an adversary's ability to
predict and trigger that case from the input alone.
