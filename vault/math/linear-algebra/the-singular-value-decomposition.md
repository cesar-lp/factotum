---
topic: math
category: math-linear-algebra
tags: [svd, singular-values, low-rank-approximation, condition-number]
citations: ["Strang, Introduction to Linear Algebra 5e, Ch. 7"]
---

# The Singular Value Decomposition

`eigenvalues-and-eigenvectors.md` diagonalized `A` as `P*D*P^-1` — but only
for square matrices with enough independent eigenvectors. The singular
value decomposition (SVD) asks the same question — is there a basis in
which this map looks simple? — and answers it for absolutely every
matrix, of any shape, diagonalizable or not.

```
A = U*S*V^T
```

Read right to left, each factor is a distinct geometric step: `V^T`
**rotates** (or reflects) the input space, `S` **scales** along the
resulting axes (a diagonal matrix, possibly rectangular, with no rotation
at all), and `U` **rotates** the result into the output space. So every
linear map whatsoever — square or rectangular, invertible or not — is
nothing more than a rotation, followed by an axis-aligned stretch,
followed by another rotation.

> [!card] recall
> Write the SVD of a matrix `A` and describe, in order, what each of the
> three factors does geometrically.
> ---
> `A = U*S*V^T`. Reading right to left: `V^T` rotates/reflects the input
> space onto a new set of axes, `S` scales along those axes with no
> rotation (it's diagonal), and `U` rotates the scaled result into the
> output space. ^card-nzt0

That universality is the headline, and it's worth stating precisely: the
SVD exists for *every* matrix — rectangular, singular, non-symmetric, any
rank — while eigendecomposition demands a square matrix and can fail even
then when eigenvectors run short. SVD never asks that question in the
first place, because `U` and `V` are built to be orthogonal by
construction rather than assembled from eigenvectors that might not span
the space.

> [!card] mcq
> Which of the following always exists, for any real matrix of any shape?
> - [x] the singular value decomposition
> - [ ] the eigendecomposition `A = P*D*P^-1`
> - [ ] both, equally generally
> - [ ] neither, without additional assumptions on `A` ^card-m0yh

The diagonal entries of `S`, the **singular values**, are conventionally
listed in decreasing order and are always non-negative — unlike
eigenvalues, which can be negative or complex. They relate directly to a
quantity from the eigenvalue picture: the singular values of `A` are the
==square roots== of the eigenvalues of `A^T*A` (which is symmetric, so ^card-27r5
those eigenvalues are real and non-negative, guaranteeing the square root
is defined).

Why are singular values always non-negative even though the eigenvalues of A itself can be negative or complex? :: Singular values are defined as the square roots of the eigenvalues of A^T*A, not of A directly. A^T*A is always symmetric and positive semidefinite regardless of what A looks like, so its eigenvalues are always real and non-negative, which makes their square roots well-defined non-negative numbers — independent of whatever A's own eigenvalues happen to be. ^card-4zr4

The **rank** of `A` is exactly the count of nonzero singular values — a
fact that gives rank a numerically robust definition, since near-zero
singular values (as opposed to exactly zero) reveal a matrix that is
close to rank-deficient even when floating-point arithmetic never
produces an exact zero.

The result that connects SVD to compression and to PCA is **low-rank
approximation**: truncating the sum after the largest `k` singular values
(zeroing the rest, keeping only the corresponding columns of `U` and `V`)
gives the best possible rank-`k` approximation to `A`, in the sense of
minimizing the approximation error over every rank-`k` matrix. That's why
SVD underlies image compression (keep the largest few singular values,
discard the rest, reconstruct an approximate image) and PCA (the largest
singular values and their directions capture the most variance in the
data).

> [!card] recall
> Explain what "truncating the SVD after the largest k singular values"
> means, and why that specific truncation gives the best rank-k
> approximation rather than merely a plausible one.
> ---
> It means keeping only the k largest singular values (and the
> corresponding columns of U and V) and zeroing the rest, then
> reconstructing A from that reduced sum. This isn't merely convenient —
> it is provably the rank-k matrix that minimizes the approximation error
> to A over all possible rank-k matrices, which is what makes it the
> principled choice for compression and for PCA rather than an ad hoc
> shortcut. ^card-hg66

The **condition number** of `A` is the ratio of its largest to smallest
singular value. A large condition number means the map stretches some
directions far more than others, which makes the corresponding linear
system ==ill-conditioned==: small errors or noise in the input get ^card-8fb3
amplified enormously in the smallest-singular-value direction before
coming out the other side, so a well-conditioned-looking problem on paper
can still produce numerically unreliable answers in practice.

What does a large condition number (ratio of largest to smallest singular value) imply about how a linear system responds to small input errors, and why? :: It implies the system is close to singular in at least one direction, so small errors or noise in the input can be amplified into disproportionately large errors in the output. This happens because the smallest singular value corresponds to a direction the map compresses severely, so inverting the map along that direction divides by a very small number, magnifying whatever error was present there. ^card-8rvz

> [!card] mcq
> A matrix has singular values `10, 4, 0.001`. What does this tell you?
> - [x] the matrix is nearly rank-deficient and has a large condition number, so it is numerically ill-conditioned
> - [ ] the matrix is exactly rank 2 and perfectly well-conditioned
> - [ ] the matrix is not diagonalizable
> - [ ] the matrix must be symmetric, since singular values are non-negative ^card-u7cu

`matrices-as-linear-maps.md` and `rank-nullspace-and-the-rank-nullity-theorem.md`
give the map and rank vocabulary this note assumes throughout.
