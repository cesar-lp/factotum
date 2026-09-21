---
topic: math
category: math-linear-algebra
tags: [eigenvalues, eigenvectors, diagonalization, characteristic-polynomial]
citations: ["Strang, Introduction to Linear Algebra 5e, Ch. 6"]
---

# Eigenvalues and Eigenvectors

`matrices-as-linear-maps.md` treats a matrix as something that rotates,
scales, and shears space. This note asks a narrower question about that
same map: are there directions it does not rotate at all — directions it
only stretches?

A nonzero vector `v` is an **eigenvector** of `A`, with **eigenvalue**
`lambda`, if:

```
A*v = lambda*v,  v != 0
```

Geometrically, `A*v` lands on the same line through the origin as `v`
itself — the map scales that direction by `lambda` (possibly flipping it
if `lambda` is negative) without rotating it off its own line. Every other
direction gets bent somewhere else; eigenvectors are the exceptions.

> [!card] mcq
> `A*v = lambda*v` holds for a nonzero `v`. Which of the following is true?
> - [x] `v` is the eigenvector and `lambda` is the eigenvalue
> - [ ] `v` is the eigenvalue and `lambda` is the eigenvector
> - [ ] both `v` and `lambda` are called eigenvalues
> - [ ] `lambda` is only meaningful if `v` is a unit vector ^card-lvm5

Why does the definition of an eigenvector explicitly require `v != 0`? :: Because `v = 0` satisfies `A*v = lambda*v` for every matrix `A` and every scalar `lambda` — it's a trivial solution that carries no information about the map. Excluding it is what makes "eigenvalue" a meaningful, matrix-specific quantity rather than a tautology. ^card-ofyo

The reason eigenvectors are worth finding isn't the single-application
picture — it's what happens under repetition. If `A` has a full set of
eigenvectors, they form an **eigenbasis**: expressed in that basis, `A`
acts as a diagonal matrix, and applying `A` repeatedly becomes multiplying
each eigenvector's coefficient by `lambda` repeatedly. `A^k*v = lambda^k*v`
for an eigenvector `v` — repeated matrix multiplication collapses to
repeated scalar multiplication. That's why eigenvalues govern the
long-run behavior of any iterated linear process: population models,
Markov chains, power iteration, the stability of a discretized
differential equation. Whichever `|lambda|` is largest eventually
dominates everything else in the sum.

Finding the eigenvalues means finding the `lambda` for which
`A*v = lambda*v` has a nonzero solution `v`, which is the same as asking
when `(A - lambda*I)*v = 0` has a nonzero solution — that is, when
`A - lambda*I` has a nontrivial null space, which happens exactly when it
is singular:

```
det(A - lambda*I) = 0
```

This is the **characteristic polynomial** (in `lambda`, degree `n` for an
`n x n` matrix); its roots are the eigenvalues.

> [!card] recall
> Write the characteristic equation used to find the eigenvalues of a
> square matrix `A`, and explain in one sentence why requiring a nonzero
> `v` forces that particular determinant condition.
> ---
> `det(A - lambda*I) = 0`. A nonzero `v` solving `(A - lambda*I)*v = 0`
> means `A - lambda*I` has a nontrivial null space, and a square matrix
> has a nontrivial null space exactly when it is singular — i.e. its
> determinant is zero. ^card-57a1

Each eigenvalue has two multiplicities that most introductions blur
together. The **algebraic multiplicity** is how many times `lambda`
appears as a root of the characteristic polynomial. The **geometric
multiplicity** is the dimension of its eigenspace — how many linearly
independent eigenvectors actually go with it. Geometric multiplicity is
always at most algebraic multiplicity, but it can be strictly less.

That gap is exactly when a matrix fails to be **diagonalizable**: if some
eigenvalue's geometric multiplicity falls short of its algebraic
multiplicity, there aren't enough independent eigenvectors to build a
basis for the whole space, no matter how many eigenvalues you have. A
matrix with `n` distinct eigenvalues is automatically diagonalizable, but
repeated eigenvalues are where you have to check.

Why can a matrix fail to be diagonalizable even though its characteristic polynomial has n roots counted with multiplicity? :: Having n roots only guarantees enough eigenvalues counted algebraically; it says nothing about whether each repeated eigenvalue has enough independent eigenvectors. If some eigenvalue's geometric multiplicity is less than its algebraic multiplicity, the eigenvectors found across all eigenvalues fail to span the whole space, and no basis of eigenvectors exists. ^card-9qpv

When a matrix does have a full eigenbasis, it factors as:

```
A = P*D*P^-1
```

where the columns of `P` are the eigenvectors and `D` is diagonal with the
corresponding eigenvalues on the diagonal, in the same order as `P`'s
columns.

> [!card] recall
> A matrix `A` is diagonalizable as `A = P*D*P^-1`. Describe what `P` and
> `D` are built from, and why the columns of `P` must be linearly
> independent for this factorization to exist.
> ---
> `P`'s columns are the eigenvectors of `A`; `D` is diagonal, holding the
> corresponding eigenvalues in the same order as `P`'s columns. `P` must
> be invertible for `P^-1` to exist, and a square matrix is invertible
> only if its columns are linearly independent — so this factorization
> requires enough independent eigenvectors to form a full basis, which is
> exactly the diagonalizability condition. ^card-nf9h

Symmetric matrices (`A^T = A`) are the well-behaved special case: they are
always diagonalizable, their eigenvalues are always real (even though the
matrix could in principle have complex ones), and their eigenvectors can
always be chosen mutually orthogonal. This is the case that shows up
constantly in practice — covariance matrices, Hessians of smooth
functions, graph Laplacians — precisely because symmetry is what rules
out the defective, non-diagonalizable case entirely.

> [!card] mcq
> Which property is guaranteed for a real symmetric matrix but not for a
> general real square matrix?
> - [x] its eigenvalues are real and its eigenvectors can be chosen mutually orthogonal
> - [ ] its determinant is always positive
> - [ ] it always has a repeated eigenvalue
> - [ ] its eigenvectors always have unit norm without needing to normalize ^card-4dpu

Two cheap sanity checks come straight from the eigenvalues without ever
factoring anything: the ==trace== of `A` (the sum of its diagonal entries) ^card-hogh
equals the sum of its eigenvalues, and `det(A)` equals their product.

If you compute eigenvalues by hand and their sum doesn't match that
diagonal sum, you made an arithmetic error before you even get to
checking eigenvectors.

What do the trace and determinant of a matrix equal in terms of its eigenvalues, and why is this useful even before you've found any eigenvectors? :: The trace equals the sum of the eigenvalues and the determinant equals their product. Because both trace and determinant are read directly off the original matrix, computing them first gives a cheap check on eigenvalues found later — if the eigenvalues you solved for don't sum to the trace or multiply to the determinant, an error was made. ^card-rq3p

`the-singular-value-decomposition.md` covers the generalization that drops
the requirement of a square, diagonalizable matrix entirely.
