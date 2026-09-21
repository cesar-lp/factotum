---
topic: math
category: math-linear-algebra
tags: [projection, least-squares, normal-equations, orthogonality]
citations: ["Strang, Introduction to Linear Algebra 5e, Ch. 4"]
---

# Projections and Least Squares

`dot-product-and-orthogonality.md` defines what it means for two vectors
to be perpendicular. This note uses that single idea to answer a question
that shows up constantly in practice: what do you do when a system of
equations has no exact solution?

The **projection** of a vector `b` onto a subspace is the closest point in
that subspace to `b` — the point that minimizes the distance `||b - p||`
over every `p` in the subspace. The condition that pins down that closest
point is orthogonality: the **error** `b - p` must be perpendicular to the
entire subspace being projected onto. If the error had any component
lying in the subspace, you could move `p` slightly along that component
and get closer to `b`, so the error can't have one — it must be
==orthogonal== to the subspace itself, not just to one vector in it. ^card-caen

Why must the error vector b - p be orthogonal to the whole subspace, rather than merely nonzero, for p to be the closest point in that subspace to b? :: If the error had any nonzero component lying inside the subspace, that component could be subtracted from p (moving p further into the subspace along that direction) to strictly reduce the distance to b. Only when the error has zero component in every direction of the subspace — i.e. is orthogonal to all of it — is there no such improving move left, which is what makes p the closest point. ^card-oxl9

That single orthogonality condition is exactly what produces least
squares. Suppose `A*x = b` has no solution because `b` doesn't lie in
`A`'s column space — more equations than unknowns, inconsistent data, noisy
measurements. The best achievable `x` isn't one that solves the system
exactly; it's the one whose `A*x` is the projection of `b` onto the column
space, since that's the closest any `A*x` can get to `b`. Writing out the
orthogonality condition — the residual `b - A*x` must be perpendicular to
*every column* of `A`, i.e. `A^T*(b - A*x) = 0` — and rearranging gives the
**normal equations**:

```
A^T*A*x = A^T*b
```

Solving them for `x` gives the least-squares solution directly; no
projection has to be constructed by hand.

> [!card] recall
> Starting from the requirement that the residual `b - A*x` be orthogonal
> to every column of `A`, derive the normal equations.
> ---
> Orthogonality to every column of `A` means `A^T*(b - A*x) = 0`.
> Distributing gives `A^T*b - A^T*A*x = 0`, i.e. `A^T*A*x = A^T*b` — the
> normal equations. ^card-02pw

The same projection can be written as a matrix that acts directly on `b`:

```
P = A*(A^T*A)^-1*A^T
```

`P*b` gives the projected point in the column space without solving for
`x` first. > [!card] recall
> Write the projection matrix `P` that maps `b` directly onto the column
> space of `A`, in terms of `A` alone.
> ---
> `P = A*(A^T*A)^-1*A^T`

Every projection matrix is **idempotent**, `P^2 = P`, and
**symmetric**, `P^T = P`. Idempotence is the geometric fact in disguise:
once `b` has been projected onto the subspace, it's already the closest
point in that subspace to itself, so projecting it a second time changes
nothing — `P*(P*b) = P*b` for every `b`.

> [!card] mcq
> Why is a projection matrix `P` necessarily idempotent (`P^2 = P`)?
> - [x] a point already inside the subspace is its own closest point in that subspace, so a second projection leaves it fixed
> - [ ] because `A^T*A` is always the identity matrix
> - [ ] because projection matrices are always diagonal
> - [ ] it isn't generally true; it only holds when `A` is square ^card-afzf

For `A^T*A` to be invertible — which the normal equations require — `A`'s
columns must be linearly independent. If they aren't, `A^T*A` is singular:
some direction in the column space is described by more than one
combination of columns, and `x` is no longer unique even though the
projection `A*x` still is. The projection of `b` still exists and is still
unique; only the coefficient vector `x` that produces it stops being
pinned down.

What goes wrong with the normal equations A^T*A*x = A^T*b when A's columns are linearly dependent, and what still remains well-defined despite this? :: A^T*A becomes singular and can no longer be inverted, so there is no longer a unique x solving the normal equations — infinitely many x vectors produce the same projection. The projection of b onto the column space itself, and the value A*x at any solution, remain unique regardless; it's only the coordinate vector x that becomes ambiguous. ^card-7tpq

> [!card] mcq
> `A` has linearly dependent columns. What is still guaranteed to be
> unique?
> - [x] the projection of `b` onto `A`'s column space
> - [ ] the least-squares coefficient vector `x`
> - [ ] the inverse of `A^T*A`
> - [ ] nothing; the whole problem becomes ill-posed ^card-t92t

Least squares minimizes the ==sum of squared== residuals specifically, ^card-420g
not the sum of absolute residuals or any other measure of error — and
that's a choice, not a law of nature. It's the choice that makes the
geometry work out to orthogonal projection: squared error is what turns
"closest point" into a quadratic that's minimized exactly where the
gradient (equivalently, the orthogonality condition) vanishes. The
consequence is that a single large residual contributes its *square* to
the objective, so outliers dominate the fit far more than they would
under an absolute-error criterion — least squares buys clean geometry at
the cost of sensitivity to outliers.

Why does minimizing squared residuals, rather than absolute residuals, make the least-squares problem reduce to an orthogonality condition? :: The sum of squared residuals is a smooth quadratic function of x, so its minimum occurs exactly where its gradient is zero; working that condition out algebraically is equivalent to requiring the residual vector to be orthogonal to the column space. Absolute-error objectives aren't smooth in the same way and don't reduce to a clean orthogonality condition, which is why least squares specifically (not least-absolute-deviations) has this geometric interpretation. ^card-nt4j

`the-singular-value-decomposition.md` uses this same column-space picture
when it discusses low-rank approximation as another kind of projection.
