---
topic: math
category: math-multivariable
tags: [directional-derivative, gradient, unit-vector, level-sets]
citations: ["Stewart, Calculus: Early Transcendentals 8e, Ch. 14.6"]
---

# Directional derivatives

`partial-derivatives.md` computes the rate of change along the
coordinate axes only. The **directional derivative** answers the more
general question those axes can't: the rate of change of `f` along an
*arbitrary* direction, specified by a vector u.

```
D_u f(x, y) = lim_{h->0} [f(x + h*u1, y + h*u2) - f(x, y)] / h
```

In practice this limit is never computed directly — it reduces to a
single dot product with the gradient:

```
D_u f = ∇f·u
```

That formula carries a requirement that is easy to forget and produces
a wrong answer, not an error: `u` must be a ==unit vector==, `||u|| = 1`. ^card-e9ot
The dot product `∇f·u` scales linearly with `||u||`, so plugging in an
unnormalized direction — say, (3, 4) instead of (3/5, 4/5) — silently
returns a number five times too large, with no warning that anything
went wrong. Normalizing u before taking the dot product is the single
most common step skipped in this topic.

> [!card] mcq
> To compute the directional derivative of f at a point in the direction
> of the vector v = (6, 8), which is the correct first step?
> - [x] Normalize v to the unit vector (0.6, 0.8) by dividing by ||v|| = 10, then dot it with ∇f
> - [ ] Dot ∇f directly with (6, 8), since direction is all that matters
> - [ ] Divide ∇f by ||v|| after taking the dot product with (6, 8)
> - [ ] Use (6, 8) directly, since the directional derivative formula normalizes automatically ^card-3ofo

Why does using an unnormalized direction vector in D_u f = ∇f·u give a numerically wrong answer rather than triggering an obvious error? :: The dot product ∇f·u scales linearly with ||u||, so an unnormalized vector just rescales the result by its own magnitude — the computation still runs and produces a plausible-looking number, it's simply the rate of change along that vector's actual length rather than per unit distance, with nothing to flag the mistake. ^card-dr4x

The coordinate partials are not a separate idea from the directional
derivative — they are its special case. `∂f/∂x` is exactly `D_u f` when
`u` is the unit basis vector `(1, 0)`, and `∂f/∂y` is `D_u f` for
`u = (0, 1)`. Every partial derivative is a directional derivative in
one of finitely many special directions; the directional derivative
generalizes to all the rest.

> [!card] recall
> Explain why ∂f/∂x is a special case of the directional derivative
> D_u f, and identify which unit vector u makes them equal.
> ---
> D_u f = ∇f·u = (∂f/∂x)*u1 + (∂f/∂y)*u2. Choosing u = (1, 0) makes
> u1 = 1 and u2 = 0, which collapses the dot product to exactly
> ∂f/∂x. So the ordinary partial with respect to x is D_u f evaluated
> along the x-axis basis direction, not a different kind of object. ^card-cnjg

Because `D_u f = ∇f·u = ||∇f|| cos(theta)` for a unit vector u (with
theta the angle between u and the gradient), the directional derivative
is bounded: it ranges from `-||∇f||`, when u points directly opposite
the gradient, up to `+||∇f||`, when u points along it. It is exactly
zero whenever u is tangent to the level set through the point — the
same orthogonality fact from `the-gradient-and-steepest-ascent.md`,
now stated as a property of D_u f rather than of ∇f.

> [!card] mcq
> At a point where ||∇f|| = 5, what is the range of possible values for D_u f as u ranges over all unit vectors?
> - [x] From -5 to 5
> - [ ] From 0 to 5
> - [ ] From -5 to 0
> - [ ] Unbounded, since direction can be chosen freely ^card-dna1

What does it mean, in terms of the angle between u and the gradient, for the directional derivative D_u f to equal zero? :: It means u is perpendicular to ∇f, since D_u f = ||∇f|| cos(theta) and cos(theta) = 0 exactly when theta = 90 degrees. Geometrically, u is then tangent to the level set through that point, matching the gradient's orthogonality to level sets. ^card-om0k

There is a subtlety worth flagging honestly rather than glossing over:
a function can have a directional derivative along *every* unit vector
at a point, computed by that same limit definition, and still fail to
be differentiable there in the fuller sense.

The existence of all directional derivatives at a point is a weaker
condition than differentiability, precisely because computing each one
separately never checks that they vary continuously or consistently
with direction — a single formula like `D_u f = ∇f·u` might not even
hold for such a function. Making that fuller notion precise is exactly
the job of a sibling note later in this category.

Why is it possible for every directional derivative to exist at a point while the function still fails to be differentiable there? :: Existence of directional derivatives only checks each direction in isolation, one limit at a time; it never verifies that those rates of change fit together into a single consistent linear approximation of f near the point. A function can pass every individual directional check yet still fail to have that stronger, direction-independent linear structure, which is what differentiability actually requires. ^card-z0wc

> [!card] mcq
> A student wants D_u f at a point where ∇f = (3, 4) in the direction v = (1, 1). What must they do before applying D_u f = ∇f·u?
> - [x] Normalize v to u = (1/sqrt(2), 1/sqrt(2)) since ||v|| = sqrt(2), not 1
> - [ ] Nothing — v can be used directly since it already has both components equal
> - [ ] Normalize ∇f instead of v
> - [ ] Multiply v by ||∇f|| before dotting ^card-h5hz
