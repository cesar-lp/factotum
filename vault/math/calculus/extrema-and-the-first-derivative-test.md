---
topic: math
category: math-calculus
tags: [critical-points, extrema, first-derivative-test, extreme-value-theorem]
citations: ["Stewart, Calculus: Early Transcendentals 8e, Ch. 4"]
---

# Extrema and the first derivative test

`differentiation-rules.md` and `the-chain-rule.md` build the machinery for
computing `f'`. This note is about what that machinery is *for* in
optimization: finding where a function is largest or smallest, and being
precise about what the derivative can and can't tell you about that.

A **critical point** of f is a point in its domain where either `f'(x) =
0` or `f'(x)` fails to exist. **Fermat's theorem** says that if f has a
local extremum at an interior point c, and f is differentiable there, then
c is a critical point.

That is the entire content of Fermat's theorem, and it is worth stating
which direction it runs, because the note's main job is to keep that
direction straight: the theorem gives a *necessary* condition for an
interior extremum, not a sufficient one. It says extrema are found among
critical points; it does not say every critical point is an extremum.

The standard counterexample is `f(x) = x^3` at `x = 0`. Its derivative
`f'(x) = 3x^2` is zero at the origin, so 0 is a critical point — but f is
increasing on both sides of 0, so there's no local max or min there at
all, just a flattened inflection in the climb.

> [!card] mcq
> `f(x) = x^3` has `f'(0) = 0`. What does this imply about `x = 0`?
> - [x] It is a critical point, but not necessarily a local extremum — and in fact it isn't one here
> - [ ] It must be a local minimum, since the derivative vanishes
> - [ ] It must be a local maximum, since the derivative vanishes
> - [ ] It cannot be a critical point, since f has no extremum there ^card-elyr

Why does `f'(c) = 0` fail to guarantee that f has a local extremum at c? :: Fermat's theorem only asserts that a local extremum forces the derivative to vanish (or fail to exist) there — it says nothing about the converse. A vanishing derivative just as easily marks a point where the function keeps increasing or decreasing through a momentary flattening, as `x^3` does at the origin, which is a critical point with no extremum at all. ^card-bl9j

Since critical points are only candidates, you need something else to
decide which ones are extrema: the **first derivative test** reads the
sign of `f'` on either side of a critical point c. If `f'` changes from
positive to negative at c, f has a local maximum there; negative to
positive gives a local minimum; no sign change means no extremum, exactly
the `x^3` case.

A **local** extremum only has to beat its immediate neighbors; a
**global** (absolute) extremum has to beat every point in the domain
under consideration. A function can have several local maxima with only
one of them global.

What distinguishes a local extremum from a global extremum? :: A local extremum only needs to be larger (or smaller) than points in some neighborhood immediately around it; a global extremum has to be larger (or smaller) than every point in the entire domain under consideration. A function can have multiple local maxima while only one of them is the global maximum. ^card-r2sx

Whether a global extremum is even guaranteed to exist is a separate
question, answered by the **Extreme Value Theorem**: a function continuous
on a closed, bounded interval `[a, b]` attains both an absolute maximum
and an absolute minimum on that interval.

```
Extreme Value Theorem
f continuous on [a, b]  =>  f attains an absolute max and an absolute min
                             somewhere in [a, b]
```

This is exactly why finding a global extremum on `[a, b]` requires
checking endpoints, not just critical points: a global maximum can sit at
an endpoint, where the derivative test says nothing at all, because
endpoints of a closed interval aren't interior points and Fermat's theorem
never applies to them.

> [!card] recall
> State the closed-interval method for finding the absolute maximum and minimum of a continuous function f on [a, b].
> ---
> Find all critical points of f in the open interval (a, b). Evaluate f at each critical point and at both endpoints a and b. The largest of these values is the absolute maximum on [a, b]; the smallest is the absolute minimum. ^card-9gol

Both hypotheses of the Extreme Value Theorem are load-bearing. Drop
==closed== and `f(x) = x` on `(0, 1)` has no maximum — it keeps climbing ^card-yzon
toward a value it never reaches at the excluded endpoint. Drop continuity
and a function can jump upward right before the interval ends, again with
no attained maximum, only a supremum it never touches.

What goes wrong for the Extreme Value Theorem's guarantee if the interval is open rather than closed, using f(x) = x on (0, 1) as the example? :: There is no largest value: for any point in (0, 1) there is always a larger one closer to 1, since 1 itself is excluded from the interval, so the supremum of 1 is never actually attained as a maximum. ^card-t6zb

> [!card] mcq
> A function g is continuous on the open interval (0, 5) but not defined at the endpoints. Which statement is correct?
> - [x] The Extreme Value Theorem does not apply, so g is not guaranteed to attain an absolute max or min on (0, 5)
> - [ ] The Extreme Value Theorem still guarantees an absolute max and min, since g is continuous
> - [ ] g cannot have any local extrema on (0, 5)
> - [ ] g automatically attains its extrema at the open interval's excluded endpoints ^card-hjaq
