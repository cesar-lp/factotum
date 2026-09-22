---
topic: math
category: math-calculus
tags: [second-derivative, convexity, concavity, inflection-points, optimization]
citations: ["Stewart, Calculus: Early Transcendentals 8e, Ch. 4"]
---

# The second derivative, convexity, and inflection

`extrema-and-the-first-derivative-test.md` reads the sign of $f'$ to find
where f is increasing or decreasing. This note takes the same idea up one
derivative: reading the sign of $f''$ to find where the *slope itself* is
increasing or decreasing, and what that shape tells you that the first
derivative alone cannot.

$f''(x)$ is the rate of change of $f'(x)$ — literally the derivative of the
derivative. Where $f''(x) > 0$, the slope is increasing as x increases,
which bends the curve so that it lies above each of its own tangent
lines; this shape is called **convex** (or concave up). Where
$f''(x) < 0$, the slope is decreasing, the curve bends the other way, and it lies
below its tangents — **concave** (concave down).

The **second derivative test** uses this to classify a critical point c
where $f'(c) = 0$: if $f''(c) > 0$, c is a local minimum (the curve
scoops upward around it); if $f''(c) < 0$, c is a local maximum.

> [!card] mcq
> At a critical point c with $f'(c) = 0$ and $f''(c) < 0$, what does the second derivative test conclude?
> - [x] c is a local maximum
> - [ ] c is a local minimum
> - [ ] c is an inflection point
> - [ ] The test is inconclusive ^card-o421

> [!card] mcq
> A function f is convex (f'' > 0) on an interval. How does its graph relate to its tangent lines on that interval?
> - [x] The graph lies on or above every one of its tangent lines
> - [ ] The graph lies on or below every one of its tangent lines
> - [ ] The graph crosses each tangent line at exactly one other point
> - [ ] Tangent lines are undefined wherever a function is convex ^card-yrl4

The case the test does not cover is the one worth dwelling on: when
$f''(c) = 0$, the test gives no answer at all, and this is not a gap to be
patched with a cleverer rule — it reflects a genuine absence of
information at that order. Three functions make the point at $x = 0$,
where all three have $f' = f'' = 0$: $f(x) = x^4$ has a local minimum
there, $f(x) = -x^4$ has a local maximum, and $f(x) = x^3$ has neither.
Identical second-derivative data, three different outcomes.

Why is $f''(c) = 0$ correctly described as inconclusive rather than as evidence that c is not an extremum? :: Because functions sharing the value f''(c) = 0 at a critical point can behave in genuinely different ways — x^4, -x^4, and x^3 all have f'=f''=0 at the origin, yet the origin is a minimum, a maximum, and neither, respectively — so f''=0 simply carries no information about which case holds, rather than pointing toward any one of them. ^card-7cfo

An **inflection point** is a point where concavity changes — where f goes
from convex to concave or back. Exactly as with critical points and
extrema, $f''(x) = 0$ is necessary for an inflection point but not
sufficient: $f(x) = x^4$ has $f''(0) = 0$ but no inflection at the origin,
because the curve is convex on both sides.

> [!card] recall
> Give an example of a function where f''(0) = 0 but x = 0 is not an inflection point, and explain why not.
> ---
> f(x) = x^4. Its second derivative is 12x^2, which is zero at x = 0, but f is convex (f'' > 0) on both sides of 0 — concavity never actually changes there, so there is no inflection despite f'' vanishing. ^card-ph3e

Convexity earns its own name rather than being a footnote to curve
sketching because of a single structural fact: for a convex function, any
local minimum is automatically a ==global== minimum. There's no other ^card-6efl
valley hiding somewhere else on the domain that undercuts it, because the
curve can never dip back below a tangent it has already risen above. That
single guarantee is why convexity is the dividing line in optimization —
it's the property that turns "search for a good enough point" into
"any local search that stops is done."

What structural guarantee does convexity give an optimizer that a merely well-behaved (but non-convex) function does not? :: In a convex function, every local minimum is guaranteed to be the global minimum, so a local search procedure that finds any point with zero gradient (or that simply stops improving) has found the actual global optimum — no separate search over other regions of the domain is needed to rule out a better minimum elsewhere. ^card-ngkb

> [!card] mcq
> A critical point c satisfies f'(c) = 0 and f''(c) = 0. What can be concluded from the second derivative test alone?
> - [x] Nothing — the test is inconclusive and a different method (such as the first derivative test) is needed
> - [ ] c is definitely an inflection point
> - [ ] c is definitely neither a maximum nor a minimum
> - [ ] c is a local minimum, since f'' is at least not negative ^card-6lry
