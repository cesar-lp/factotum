---
topic: algorithms
category: algo-foundations
tags: [recurrences, master-theorem, recursion-tree, substitution-method]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 4 (Divide-and-Conquer)"]
---

# Solving Recurrences

Divide-and-conquer's running time falls out of a recurrence — a
function defined in terms of itself on smaller inputs, plus the cost of
dividing and combining. This note covers the three standard ways to
turn that recurrence into a closed-form bound, and where the fastest of
the three, the master theorem, cannot be used at all.

The ==substitution method== guesses a bound, then substitutes the guess ^card-n9vj
into the recurrence and proves by induction that it holds — the
guessing is the hard part, and a guess that is asymptotically right but
off by a lower-order term (e.g. guessing O(n) for a bound that needs
O(n) - b to make the induction go through) can still fail the proof
until adjusted.

A ==recursion tree== makes the guess concrete by drawing out each level ^card-f27x
of recursive calls, summing the non-recursive cost at each level, and
adding those level sums across the tree's depth — it is slower to do
rigorously but far more mechanical, and is often used just to produce a
guess to hand to the substitution method.

The master theorem is a shortcut for a specific shape of recurrence:
T(n) = aT(n/b) + f(n), with a >= 1 and b > 1 both constants, and f(n)
asymptotically positive. It compares f(n) against n^(log_b a) and picks
one of three cases.

What does the master theorem conclude when f(n) = O(n^(log_b a - eps)) for some constant eps > 0 (case 1)? :: T(n) = Theta(n^(log_b a)) — the cost is dominated by the leaves of the recursion tree, since the divide/combine work shrinks fast enough relative to the branching that it becomes asymptotically irrelevant. ^card-9y8u

What does the master theorem conclude when f(n) = Theta(n^(log_b a)) (case 2)? :: T(n) = Theta(n^(log_b a) * lg n) — the divide/combine work and the recursive branching are asymptotically balanced, and the extra lg n factor comes from that cost being paid at every one of the Theta(lg n) levels of the tree. ^card-ynbw

> [!card] mcq
> Master theorem case 3 (f(n) = Omega(n^(log_b a + eps)) for some eps > 0) concludes T(n) = Theta(f(n)) — but only under one extra condition CLRS requires. What is it?
> - [x] The regularity condition a*f(n/b) <= c*f(n) for some constant c < 1 and all sufficiently large n
> - [ ] That a and b are both prime numbers
> - [ ] That f(n) is itself a polynomial
> - [ ] That the recursion has exactly two subproblems ^card-pvw6

Case 3's regularity condition is easy to forget and is not automatic:
without it, a case-3-shaped f(n) does not guarantee T(n) = Theta(f(n)).
It holds for essentially every polynomial f(n) you'll encounter, which
is part of why it's easy to forget it's even a requirement.

The master theorem simply does not apply outside this exact shape. Two
concrete failure modes are worth knowing by name. First, unequal
subproblem sizes: T(n) = T(n/3) + T(2n/3) + n is a valid, common
recurrence (it shows up in a randomized quicksort analysis), but it is
not of the form aT(n/b) + f(n) for a single b, so the master theorem
cannot be applied to it at all — a recursion tree (with uneven depth
along different paths) is the right tool instead.

Why does the master theorem not apply to T(n) = 2T(n/2) + n/lg n? :: n/lg n is asymptotically smaller than n^(log_2 2) = n, but not by a polynomial factor n^eps for any eps > 0 (their ratio n^eps / lg n still diverges), so it satisfies none of the three cases: it is smaller than n but not polynomially smaller (rules out case 1), not equal to Theta(n) (rules out case 2), and not larger at all (rules out case 3). The recurrence falls in the gap between cases 1 and 2 that the theorem simply leaves unresolved. ^card-fi64

> [!card] recall
> A recursion tree can still solve T(n) = 2T(n/2) + n/lg n even though
> the master theorem cannot. Sketch how you would sum the per-level
> costs to see why the answer comes out below Theta(n lg n). ^card-8a9s
