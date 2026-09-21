---
topic: math
category: math-calculus
tags: [mean-value-theorem, rolles-theorem, monotonicity, antiderivatives]
citations: ["Stewart, Calculus: Early Transcendentals 8e, Ch. 4"]
---

# The mean value theorem

`extrema-and-the-first-derivative-test.md` and the previous note both use
`f'` and `f''` to read local shape at a point. The Mean Value Theorem
(MVT) is the tool that turns those local, pointwise facts into global
conclusions about a function across an entire interval — which is why it
sits underneath results that look nothing like it on the surface,
including the `+ C` at the end of every antiderivative you've computed.

```
Mean Value Theorem
Hypotheses: f is continuous on [a, b] and differentiable on (a, b)
Conclusion: there exists some c in (a, b) such that
            f'(c) = (f(b) - f(a)) / (b - a)
```

In words: somewhere in the interval, the instantaneous rate of change
equals the average rate of change over the whole interval. Geometrically,
some tangent line is parallel to the secant line joining the endpoints.

The special case where `f(a) = f(b)` is **Rolle's theorem**: under the
same hypotheses, if the endpoint values are equal, there is some c in
(a, b) with `f'(c) = 0`.

How does Rolle's theorem relate to the Mean Value Theorem, and how is it typically used to prove the MVT? :: Rolle's theorem is the special case of the MVT where the endpoint values are equal, f(a) = f(b), which makes the secant slope zero and the conclusion simplify to the existence of some c with f'(c) = 0. It is also the usual route to proving the general MVT: tilt the secant line into the horizontal case by subtracting off the line joining the endpoints, then apply Rolle's theorem to that tilted function. ^card-4vkw

> [!card] recall
> State the Mean Value Theorem in full, including both hypotheses.
> ---
> If f is continuous on the closed interval [a, b] and differentiable on the open interval (a, b), then there exists at least one point c in (a, b) such that f'(c) = (f(b) - f(a)) / (b - a) — the instantaneous rate at c equals the average rate over [a, b]. ^card-p36v

The hypotheses are not bureaucratic fine print; drop differentiability at
even one interior point and the conclusion can fail outright. Take
`f(x) = |x|` on `[-1, 1]`: it's continuous everywhere, and differentiable
everywhere except at `x = 0`. The secant slope from `-1` to `1` is `(1 -
1)/(1 - (-1)) = 0`, but `f'(x)` is `-1` for every x left of 0 and `+1` for
every x to its right — it's never 0 anywhere on `(-1, 1)`. No c exists, and
the single point where differentiability fails is exactly what breaks it.

> [!card] mcq
> Which of these correctly states the hypotheses required by the Mean Value Theorem?
> - [x] f continuous on the closed interval [a, b] and differentiable on the open interval (a, b)
> - [ ] f differentiable on the closed interval [a, b]; continuity is not required
> - [ ] f continuous on the open interval (a, b) only
> - [ ] f continuous and differentiable on [a, b], including both endpoints ^card-zbnb

Why does `f(x) = |x|` on `[-1, 1]` fail to satisfy the Mean Value Theorem's conclusion, despite being continuous on the whole interval? :: Because f is not differentiable at the interior point x = 0 (the corner), which violates the theorem's second hypothesis; without differentiability everywhere on the open interval, no point with f'(c) equal to the secant slope is guaranteed to exist, and here none does. ^card-5f66

The MVT looks like a curiosity about tangent and secant lines until you
see what it licenses. Because it guarantees an *interior* point matching
the *average* behavior, it converts a pointwise derivative condition,
which only describes an instant, into a statement about the function's
behavior across a whole interval.

Take the simplest case: if a function's derivative is zero at every
point of an interval, the function is ==constant== there. Any two points ^card-mq03
of it would otherwise have a nonzero average rate between them, and the
theorem insists some interior point matches that rate — contradicting a
derivative that vanishes everywhere.

The same argument run twice more gives the other two consequences:

```
f'(x) = 0 on an interval        =>  f is constant there
f'(x) > 0 on an interval        =>  f is increasing there
f'(x) = g'(x) on an interval    =>  f(x) - g(x) = C
```

That third consequence is precisely what justifies writing "+ C" every
time you find an antiderivative: it says two functions with the same
derivative can only ever differ by a constant, so once you've found *one*
antiderivative, every other one is that antiderivative plus some C, and
nothing else.

> [!card] mcq
> Two functions f and g satisfy f'(x) = g'(x) for every x on an interval. What does the Mean Value Theorem let you conclude about f and g?
> - [x] f and g differ by a constant: f(x) - g(x) = C for some constant C
> - [ ] f and g must be equal on the whole interval
> - [ ] f and g must both be constant
> - [ ] Nothing can be concluded without knowing f(a) and g(a) explicitly ^card-wqrq

Why does "two functions with equal derivatives differ by a constant" specifically require the Mean Value Theorem rather than following directly from the derivatives being equal? :: Equal derivatives at every point only describe instantaneous rates; nothing about a pointwise comparison alone rules out the two functions drifting apart between points. The MVT is what bridges that gap: applied to h = f - g, it guarantees h'(c) = 0 forces h to be constant across the whole interval, which is a genuinely global conclusion the pointwise fact does not hand you for free. ^card-0h05
