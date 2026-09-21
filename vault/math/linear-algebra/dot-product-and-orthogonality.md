---
topic: math
category: math-linear-algebra
tags: [dot-product, orthogonality, norm, projection, cauchy-schwarz]
citations: ["Strang, Introduction to Linear Algebra 5e, Ch. 1"]
---

# Dot product and orthogonality

`vectors-and-vector-spaces.md` covers what a vector is and what it means
for a set of them to form a space, but a bare vector space has no notion
of length or angle — those require an extra piece of structure. The dot
product supplies it, and it does so in two forms that look unrelated
until you see they're the same number computed two different ways.

Algebraically, for `x, y` in `R^n`:

```
x·y = sum_{i=1}^n x_i*y_i
```

Geometrically, the same quantity equals:

```
x·y = ||x|| * ||y|| * cos(theta)
```

where `theta` is the angle between the two vectors. These are not two
related facts — they are one identity proved by expanding both sides in
coordinates, and treating them as interchangeable is exactly what makes
the dot product useful: you compute it algebraically (fast, no angle
needed) and reason about it geometrically (what does the number *mean*).

> [!card] mcq
> A dot product `x·y` is computed as `sum_{i=1}^n x_i*y_i` from a pair of
> coordinate vectors. Which statement correctly connects this to angle?
> - [x] It equals `||x||*||y||*cos(theta)`, so its sign tells you whether the angle between x and y is acute, obtuse, or exactly 90 degrees
> - [ ] It equals `||x||*||y||*sin(theta)`, so it measures the area between x and y
> - [ ] It is unrelated to angle; angle can only be recovered from the cross product
> - [ ] It equals `||x||+||y||*cos(theta)`, combining length and angle additively ^card-opn9

> [!card] recall
> Write both the algebraic and the geometric formula for the dot product
> of two vectors x and y in R^n, and state what quantity theta refers to
> in the geometric one.
> ---
> Algebraic: x·y = sum_{i=1}^n x_i*y_i. Geometric: x·y = ||x||*||y||*cos(theta),
> where theta is the angle between x and y. ^card-95lp

The immediate payoff of the geometric form is a sign test: since `||x||`
and `||y||` are always nonnegative, the sign of `x·y` is exactly the sign
of `cos(theta)`. A positive dot product means the vectors point broadly
in the same direction (angle under 90 degrees); negative means broadly
opposite; and `x·y = 0` means the vectors are ==orthogonal== — perpendicular, ^card-75dw
in the geometric sense, but the algebraic definition extends the idea to
any R^n, including dimensions where "perpendicular" can no longer be
pictured directly.

The dot product also induces a notion of length. The **norm** of a
vector is defined by

```
||x|| = sqrt(x·x)
```

which is consistent with the Pythagorean picture: `x·x = sum x_i^2`, so
`||x||` is the usual Euclidean length in R^2 and R^3, and the same formula
extends length to any dimension.

Given two vectors x and y, the **projection** of x onto y answers a
specific question: how much of x points along y's direction? It is
constructed to be the closest point on the line through y to the vector
x, and is given by

```
proj_y(x) = ((x·y) / (y·y)) * y
```

The scalar `(x·y)/(y·y)` scales `y` by exactly the right amount so that
`x` minus that projection is orthogonal to `y` — decomposing x into a
piece along y and a piece perpendicular to it. This decomposition is the
seed of least-squares fitting, covered later in this category once
matrices enter the picture.

Why is the projection of x onto y defined as `((x·y)/(y·y))*y` rather than just `(x·y)*y`? :: The extra division by `y·y` normalizes for the length of y — without it, scaling y by any factor would change the projection, even though "how much of x lies along y's direction" shouldn't depend on how long the vector chosen to represent that direction happens to be. Dividing by `y·y` makes the formula depend only on y's direction, not its magnitude. ^card-hzsw

The **Cauchy-Schwarz inequality** states

```
|x·y| <= ||x|| * ||y||
```

for all vectors x and y, with equality exactly when x and y are parallel.
It follows immediately from the geometric identity, since `|cos(theta)|`
is never more than 1 — but its importance is that it holds in every
inner product space, including ones (like spaces of functions) where
"angle" was never defined directly, so Cauchy-Schwarz is often the tool
that lets you *define* angle there in the first place.

What does the Cauchy-Schwarz inequality bound, and when does it hold with equality? :: It bounds the size of a dot product by the product of the two vectors' individual lengths — `|x·y|` can never exceed `||x||*||y||`. Equality holds exactly when the two vectors are parallel (one is a scalar multiple of the other), which is the case where `|cos(theta)|` reaches its maximum value of 1. ^card-qpvr

A set of vectors is **orthonormal** if every vector in it has norm 1 and
every pair is orthogonal. Orthonormal bases matter because they turn the
generally hard problem of finding coordinates into a dot product: if
`{q_1, ..., q_n}` is an orthonormal basis and `x = c_1*q_1 + ... + c_n*q_n`,
then dotting both sides with `q_i` kills every term except the `i`-th,
because the others vanish by orthogonality, leaving

```
c_i = x·q_i
```

with no system of equations to solve. This is the single biggest reason
orthonormal bases (and the matrices built from them, covered later in
this category) are worth constructing at all.

> [!card] mcq
> `{q_1, ..., q_n}` is an orthonormal basis and x = c_1*q_1 + ... + c_n*q_n.
> What is the fastest way to find c_3?
> - [x] Compute x·q_3 directly — orthogonality makes every other term vanish
> - [ ] Solve the full n-by-n linear system for all coefficients simultaneously
> - [ ] Compute ||x|| and divide by ||q_3||
> - [ ] It cannot be found without first inverting the basis matrix ^card-hrlw

What single property of an orthonormal basis is responsible for coordinates collapsing to a plain dot product, rather than requiring a system of equations? :: Every pair of distinct basis vectors is orthogonal (dot product zero) and each has norm 1, so when you dot the expansion `x = sum c_i*q_i` with one basis vector `q_j`, every term except the `j`-th vanishes and that one term simplifies to exactly `c_j` — no solving required. ^card-mxfx

This note stops at what orthogonality buys for a single pair or basis of
vectors; combining projections across many directions at once, and the
matrices that do it, is covered in `projections-and-least-squares.md`.
