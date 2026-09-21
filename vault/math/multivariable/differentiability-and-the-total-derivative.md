---
topic: math
category: math-multivariable
tags: [differentiability, total-derivative, tangent-plane, linear-approximation]
citations: ["Stewart, Calculus: Early Transcendentals 8e, Ch. 14.4"]
---

# Differentiability and the total derivative

`partial-derivatives.md` and `directional-derivatives.md` both measure
change along a single direction at a time. Neither one, even taken
together over every direction, is what "differentiable" means for a
scalar field — and the gap between "has all these directional rates"
and "is differentiable" is the subtlety this note exists to cover.

A function of several variables is differentiable at a point when it can
be approximated *near that point* by a single linear map, with an error
that shrinks faster than the step you took to get there:

```
f is differentiable at a  iff  there exists a linear map L such that
  f(a + h) = f(a) + L(h) + e(h),   where e(h) / ||h|| -> 0 as h -> 0
```

That vanishing-faster-than-linear error is the entire content of the
definition. It says the linear map isn't just some tangent-ish
approximation — it's the *best possible* one, in the precise sense that
no other linear map does better as you zoom in.

> [!card] recall
> State the definition of differentiability of a scalar field f at a
> point a, including the precise condition the error term e(h) must
> satisfy.
> ---
> f is differentiable at a if there is a linear map L with f(a + h) =
> f(a) + L(h) + e(h), where e(h)/||h|| -> 0 as h -> 0. The error must
> vanish faster than the size of the step itself, not merely go to zero. ^card-aamu

This is strictly stronger than having all the partial derivatives, or
even all the directional derivatives, exist at a point. The standard
counterexample has a function built from ratios of coordinates — for
instance one that equals `x*y^2/(x^2+y^4)` away from the origin and 0 at
it — where every directional derivative at the origin exists and is
finite, yet the function isn't even ==continuous== there: approaching ^card-sjxe
along the curve `x = y^2` gives a different limit than approaching along
any straight line. No single linear map can match a function that
behaves inconsistently depending on which curve you ride in on, so
differentiability fails even though every straight-line probe through
the point succeeds.

Why can a scalar field have every directional derivative exist and be finite at a point, and still fail to be differentiable there? :: Directional derivatives only probe straight-line approach to the point, one line at a time, and a finite value along every line says nothing about approach along curves. The standard counterexamples are functions that are inconsistent along a parabolic path relative to their behavior along lines through the origin, so no single linear map can approximate the function uniformly near that point, even though each individual line-probe succeeds. ^card-r73o

In practice this rarely has to be checked from the definition, because a
sufficient condition covers almost every function encountered in
applications: if all the partial derivatives exist and are ==continuous== ^card-7vrd
in a neighborhood of the point, the function is guaranteed differentiable
there. This is why the pathology above almost never bites — it takes a
function deliberately built to have discontinuous partials at a single
point to produce it, and no polynomial, exponential, or composition of
smooth elementary functions does that. The subtlety still matters for
understanding *why* differentiability is a real condition and not a
formality automatically granted by "the partials exist."

> [!card] mcq
> Which condition is sufficient to guarantee that a scalar field is
> differentiable at a point?
> - [x] All partial derivatives exist and are continuous in a neighborhood of the point
> - [ ] All partial derivatives exist at the point itself
> - [ ] All directional derivatives exist at the point
> - [ ] The function is continuous at the point ^card-57we

When f is differentiable at a, the linear map L in the definition is
called the **total derivative**, and it's given by the gradient acting
as a dot product: `L(h) = ∇f(a)·h`. Its graph, shifted to pass through
the point, is the **tangent plane** — the flat surface that best hugs
the surface `z = f(x, y)` at that point:

```
tangent plane at (a, b):
z = f(a, b) + ∂f/∂x(a, b)*(x - a) + ∂f/∂y(a, b)*(y - b)
```

The **total differential** `df = ∂f/∂x*dx + ∂f/∂y*dy + ...` is the same
linear map written in the notation used for estimating how much the
output changes for a small, named change in each input — the
multivariable replacement for `dy = f'(x)*dx`.

Why is the total derivative, restricted to two variables, called a "tangent plane" rather than just a linear approximation? :: Because the graph of the linear map L, shifted to sit at the point (a, f(a)), is literally a plane in R^3 that touches the surface z = f(x, y) at that point and matches its instantaneous rate of change in every direction — geometrically it plays exactly the role a tangent line plays for a single-variable curve. ^card-56wr

Differentiability sits at the top of a one-way chain of implications:
differentiable implies continuous, and differentiable implies every
directional derivative exists (with each one recoverable as `∇f·u` for
unit vector `u`). Neither converse holds — continuity doesn't force
differentiability, and having every directional derivative doesn't
either, as the counterexample above shows.

> [!card] mcq
> Which of these implications is valid for a scalar field at a point?
> - [x] Differentiable implies continuous
> - [ ] Continuous implies differentiable
> - [ ] All directional derivatives exist implies differentiable
> - [ ] All partial derivatives exist implies differentiable ^card-fyq2

Why does the standard counterexample used to separate "all directional derivatives exist" from "differentiable" typically fail to be continuous at the point in question? :: Because it's built so that approach along a well-chosen curve (often a parabola matched to the function's own algebraic structure) yields a different limiting value than approach along any straight line. Since differentiability implies continuity, exhibiting discontinuity there is enough by itself to rule out differentiability, even though the straight-line probes behind directional derivatives all agree. ^card-h2jy
