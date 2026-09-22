---
topic: math
category: math-linear-algebra
tags: [rank, null-space, nullity, rank-nullity-theorem, column-space]
citations: ["Strang, Introduction to Linear Algebra 5e, Ch. 3"]
---

# Rank, Null Space, and the Rank-Nullity Theorem

Composition tells you how maps combine; this note asks what a single
map, on its own, actually does to the space it acts on — what it can
reach, and what it destroys. Every m-by-n matrix A comes with two
subspaces that answer those two questions separately, and they live on
opposite sides of the map.

The **column space** of A lives in the codomain: it's the span of A's
columns, which by the column picture is exactly the set of every vector
$Ax$ can ever equal. Its dimension is the ==rank== of A — the number of ^card-xo2a
genuinely independent directions the map can reach, no matter how many
columns A has. Extra columns that are combinations of earlier ones add
no new reachable directions at all.

The **null space** lives in the domain: it's the set of every x with
$Ax = 0$, everything the map crushes to nothing. Its dimension is
called the nullity. A map with a nontrivial null space is one where
distinct inputs — x and x plus anything in the null space — produce the
identical output, since A*(x + v) = A*x + A*v = A*x + 0 = A*x for any v
in the null space.

> [!card] mcq
> A 4-by-6 matrix A has rank 3. Which statement is necessarily true?
> - [x] The column space of A is a 3-dimensional subspace of R^4
> - [ ] The null space of A is a 3-dimensional subspace of R^4
> - [ ] A is invertible
> - [ ] Every column of A is independent of every other column ^card-hkp3

These two numbers are linked by the **rank-nullity theorem**:

$$
\operatorname{rank}(A) + \operatorname{nullity}(A) = n
$$

where n is the number of columns of A — the dimension of the domain.

> [!card] recall
> State the rank-nullity theorem for an m-by-n matrix A, and explain in
> one or two sentences why it has to be true — what happens to each of
> the n domain dimensions that makes the two quantities add up to
> exactly n?
> ---
> rank(A) + nullity(A) = n. Each of the n dimensions of the domain
> either survives into the output as part of a genuinely new, reachable
> direction, or gets collapsed into the null space — those are the only
> two things that can happen to it, and they're mutually exclusive, so
> counting how many dimensions go each way has to exhaust all n and
> nothing more. ^card-dnl5

That framing is also why the theorem feels inevitable rather than
coincidental once you see it: rank counts the "survived" dimensions and
nullity counts the "collapsed" ones, and a dimension cannot do both or
neither.

The theorem's real payoff is what it says about solving $Ax = b$,
where it splits one question people conflate into two genuinely
separate ones. Existence — does a solution exist at all — depends
entirely on the column space: a solution exists exactly when b lies in
the column space of A, since $Ax$ can only ever produce vectors from
that span. Uniqueness — if a solution exists, is it the only one —
depends entirely on the null space: solutions are unique exactly when
the null space is ==trivial== (contains only the zero vector), because ^card-15c1
otherwise any solution plus a null-space vector is another solution.

> [!card] mcq
> A*x = b has at least one solution, and A's null space contains a
> nonzero vector. What can you conclude?
> - [x] If a solution exists, it is not unique — infinitely many solutions exist
> - [ ] No solution can exist
> - [ ] The solution is unique regardless of the null space
> - [ ] b must not lie in the column space of A ^card-z0cg

Why are "does A*x = b have a solution" and "is that solution unique" answered by two completely different subspaces of A, rather than one property deciding both? :: Existence is about whether b is reachable at all — a fact about the column space, which lives in the codomain and says nothing about how inputs map to outputs. Uniqueness is about whether two different inputs can produce the same output — a fact about the null space, which lives in the domain and says nothing about which outputs are reachable. A matrix can have a huge column space (everything is reachable) with a large null space too (nothing is unique), or the reverse, because the two questions are logically independent: one is about the range of the map, the other about how many-to-one it is. ^card-fnsm

A square n-by-n matrix is **full rank** when rank(A) = n, which by
rank-nullity forces nullity(A) = 0 — a trivial null space, meaning both
existence and uniqueness hold for every b, which is exactly the
condition for A to be invertible. For a rectangular m-by-n matrix,
"full rank" instead means rank(A) = min(m, n): a wide matrix (m < n)
can have full row rank without a trivial null space, so it can
guarantee existence for every b without ever guaranteeing uniqueness,
and a tall matrix (m > n) can have full column rank — trivial null
space, so uniqueness whenever a solution exists — without guaranteeing
existence for every b.

> [!card] recall
> A tall 5-by-3 matrix A has full column rank. Explain what this does
> and does not guarantee about solutions to A*x = b for an arbitrary
> b in R^5.
> ---
> Full column rank means rank(A) = 3, so by rank-nullity nullity(A) = 0
> — the null space is trivial. That guarantees uniqueness: whenever a
> solution exists, it's the only one. It guarantees nothing about
> existence, because the column space is still only a 3-dimensional
> subspace of the 5-dimensional codomain, so a "generic" b, chosen
> without regard to A, will typically lie outside it and no solution
> will exist at all. ^card-x4sf

Determinants, taken up next, give a fast test for the square,
full-rank case — whether A is invertible — without having to compute
rank or the null space directly.
