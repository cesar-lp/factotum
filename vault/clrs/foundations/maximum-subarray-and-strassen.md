---
topic: algorithms
category: algo-foundations
tags: [maximum-subarray, strassen, divide-and-conquer, matrix-multiplication]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 4 (Divide-and-Conquer) — the maximum-subarray problem moved to the 4e online supplement for this chapter"]
---

# Maximum Subarray and Strassen's Algorithm

The divide-and-conquer note showed the shape of the strategy on merge
sort, where the obvious brute-force alternative isn't really
competitive. These two problems are more interesting cases: each has an
obvious, easy-to-write algorithm, and divide-and-conquer beats it by
doing something non-obvious at the combine step.

The maximum-subarray problem asks for the contiguous subarray of a
given array (containing at least one number, and possibly negative
numbers) with the largest sum. The brute-force algorithm checks every
pair of start and end indices, an inherently ==Theta(n^2)== approach. ^card-3bfa

The divide-and-conquer alternative splits the array at its midpoint and
recurses on each half — but the best subarray doesn't have to live
entirely in either half; it can straddle the midpoint. The combine step
handles exactly that case: find the best subarray ending exactly at the
midpoint by scanning left from it, find the best subarray starting
exactly at the midpoint by scanning right from it, and add the two —
this crossing case takes ==Theta(n)== time, since each scan is linear. ^card-bsge

Comparing the best of the left half's answer, the right half's answer,
and the crossing answer gives the maximum subarray overall. With the
combine step at Theta(n), the recurrence is T(n) = 2T(n/2) + Theta(n),
which the master theorem's case 2 resolves to Theta(n lg n) — an
asymptotic win over the brute-force Theta(n^2).

Why must the crossing case specifically look for subarrays that end at the midpoint (from the left) and start at the midpoint (from the right), rather than any subarray that merely overlaps it? :: Restricting to subarrays anchored exactly at the midpoint is what makes each scan linear and, critically, what makes the two halves of the scan independently optimal — the best left part ending at the midpoint and the best right part starting at the midpoint can be found separately and just added, because a contiguous subarray crossing the midpoint is exactly the concatenation of some suffix of the left half and some prefix of the right half. ^card-i9s4

Matrix multiplication faces the same shape of problem. Multiplying two
n x n matrices by the standard triple-nested-loop definition costs
==Theta(n^3)== scalar multiplications. A naive recursive divide-and- ^card-gif0
conquer version — split each matrix into four (n/2) x (n/2) blocks and
apply the standard 2x2 block-multiplication formula — still needs 8
recursive multiplications of half-size matrices plus Theta(n^2) work to
add the results, giving T(n) = 8T(n/2) + Theta(n^2), which is *also*
Theta(n^3): no improvement at all.

> [!card] mcq
> What is the actual improvement Strassen's algorithm makes over the naive recursive block-multiplication scheme?
> - [x] It restructures the arithmetic to need only 7 recursive multiplications of half-size matrices instead of 8, at the cost of more Theta(n^2) additions/subtractions
> - [ ] It avoids recursion entirely by unrolling the multiplication into a single pass
> - [ ] It reduces the number of additions from 4 to 1, leaving the 8 multiplications unchanged
> - [ ] It only works for matrices whose entries are all non-negative ^card-yhe7

Strassen's algorithm computes seven cleverly combined products of sums
and differences of submatrices (instead of the eight straightforward
block products), each still Theta(n^2) work to set up, and then
recovers all four output blocks from those seven products. The
recurrence becomes T(n) = 7T(n/2) + Theta(n^2).

What does the master theorem give for T(n) = 7T(n/2) + Theta(n^2), and which case applies? :: T(n) = Theta(n^(log_2 7)), approximately Theta(n^2.807); case 1 applies because f(n) = n^2 is polynomially smaller than n^(log_2 7) (log_2 7 is about 2.807, safely more than 2 plus some constant eps). ^card-dk29

> [!card] recall
> Both algorithms in this note get their speedup from the combine step,
> not the divide step. Explain, for each algorithm, what specifically
> in the combine step is doing the work that beats the obvious approach. ^card-ys5i
