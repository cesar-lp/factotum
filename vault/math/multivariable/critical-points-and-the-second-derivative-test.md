---
topic: math
category: math-multivariable
tags: [critical-points, hessian, second-derivative-test, saddle-point, optimization]
citations: ["Stewart, Calculus: Early Transcendentals 8e, Ch. 14"]
---

# Critical points and the second-derivative test

`the-gradient-and-steepest-ascent.md` establishes `∇f` as the direction of
fastest increase. A critical point is where that direction stops being
well defined in the way that matters for optimization: `∇f = 0`, so there
is no direction of steepest increase left to point in. This note asks what
a critical point can actually *be* once you find one — and the answer has
one more case than the single-variable story does.

A critical point of `f` is a point where `∇f = 0`, or where `∇f` fails to
exist at all. In one variable, a critical point of a smooth function is a
minimum, a maximum, or an inflection point along the only direction there
is. In several variables the same zero gradient can sit underneath a
genuinely new shape:

What is a critical point of a multivariable function? :: A point where the gradient is zero (or undefined) — every partial derivative vanishes, so there is no direction in which the function is locally increasing or decreasing to first order. ^card-29oe

A ==saddle== point is a critical point that is a local minimum along one ^card-l5hb
direction through it and a local maximum along another.

Picture the center of a mountain pass: walk along the ridge and you're
at a low point between two peaks; walk across the ridge and you're at
the high point of the valley floor on either side. No single-variable
function has anything like this, because one variable offers only one
direction to walk in — you can't be increasing and decreasing "at the
same point" without more room to move in.

> [!card] mcq
> Why does a saddle point have no analogue in single-variable calculus?
> - [x] A saddle requires at least two independent directions through the point, one along which it's a min and one along which it's a max — one variable only ever offers a single direction
> - [ ] Single-variable functions never have zero derivative except at endpoints
> - [ ] Saddle points only occur for discontinuous functions
> - [ ] A saddle is just a single-variable inflection point renamed ^card-pb91

Distinguishing a min, a max, and a saddle by hand — checking the behavior
along every direction through the point — is impractical. The fix is to
package all the second-order information into one object and read its
sign: the **Hessian** matrix of second partials, whose definiteness (built
and classified in `the-hessian-and-second-order-behaviour.md`) is exactly
what decides the case. This note only *uses* that classification.

Positive definite, negative definite, and indefinite Hessians give the
three sharp outcomes:

Given a critical point where the Hessian is negative definite, what kind of point is it? :: A local maximum — the function curves downward in every direction through the point. ^card-lx0p

An indefinite Hessian (positive along some directions, negative along
others) is precisely the saddle case: the function's second-order
behavior really does flip sign depending on which way you look, matching
the geometric picture above exactly.

For two variables the full definiteness test collapses to a single
number, cheap enough to compute by hand, using the second partials
`f_xx`, `f_yy`, `f_xy` at the critical point:

```
D = f_xx*f_yy - f_xy^2

D > 0 and f_xx > 0  ->  local minimum
D > 0 and f_xx < 0  ->  local maximum
D < 0               ->  saddle point
D = 0               ->  test is inconclusive
```

> [!card] mcq
> At a critical point, D = f_xx*f_yy - f_xy^2 comes out negative. What does that tell you?
> - [x] The point is a saddle — the Hessian is indefinite, so the function increases along some direction and decreases along another
> - [ ] The test is inconclusive and higher-order terms are needed
> - [ ] The point is a local minimum
> - [ ] The point is a local maximum ^card-lb5v

> [!card] mcq
> At a critical point, D = f_xx*f_yy - f_xy^2 comes out exactly zero. What does that tell you?
> - [x] Nothing — the test is inconclusive, and the point could be a min, a max, or a saddle
> - [ ] The point is definitely a saddle, since the Hessian is singular
> - [ ] The point is definitely a degenerate minimum
> - [ ] D = 0 is impossible at a genuine critical point ^card-raua

`D = 0` means the Hessian is only semidefinite: the quadratic
approximation is flat along some direction, and the sign of `f` along
that direction is decided by third- or higher-order terms the Hessian
doesn't see at all. The two-variable discriminant simply has no
information left to give at that point.

When D = 0 at a critical point and the discriminant is silent, how do you actually determine the point's type? :: Fall back to direct analysis along the flat direction — check the sign of f - f(critical point) explicitly, using higher-order Taylor terms or the specific algebraic form of f, since the second-order test alone cannot distinguish min, max, or saddle when the Hessian is only semidefinite. ^card-owxe

Both the discriminant test and the full definiteness test are inherently
**local**: they describe the shape of `f` in a neighborhood of one
critical point and say nothing about how `f` compares to its values
elsewhere. Finding the true global maximum or minimum of `f` over a
closed, bounded region requires also checking the region's boundary,
since the global extremum can sit there instead of at any interior
critical point. That boundary search, with a constraint equation
describing the region's edge, is exactly the problem
`lagrange-multipliers-and-constrained-optimization.md` solves.

> [!card] recall
> A smooth function f has a single interior critical point on a closed, bounded region, and the second-derivative test classifies it as a local minimum. Explain why this is not enough, by itself, to conclude that point is the global minimum of f over the region.
> ---
> The test only characterizes f's behavior in a small neighborhood of that one critical point — it says nothing about values of f elsewhere, including on the region's boundary. The global minimum over a closed bounded region could occur on the boundary instead, where the unconstrained critical-point conditions (∇f = 0) don't even apply. A full global search requires checking interior critical points AND the boundary separately, then comparing all the candidate values. ^card-nkr7
