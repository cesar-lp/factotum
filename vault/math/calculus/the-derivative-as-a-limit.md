---
topic: math
category: math-calculus
tags: [derivative, difference-quotient, differentiability, tangent-line]
citations: ["Stewart, Calculus: Early Transcendentals 8e, Ch. 2"]
---

# The derivative as a limit

`limits-and-continuity.md` builds the machinery; this note spends it on
the first real payoff — turning "the value a function approaches" into
"the rate at which a function changes." The derivative is nothing more
than a specific limit, but the two readings of that limit are what make
the rest of calculus work.

Start with the difference quotient, which measures average change over an
interval of width `h`, and take its limit as that interval shrinks to
nothing:

```
f'(a) = lim_{h->0} (f(a + h) - f(a)) / h
```

The first reading is physical: if `f(t)` is position at time `t`, the
difference quotient is average velocity over `[a, a+h]`, and its limit as
`h -> 0` is ==instantaneous== velocity — the rate of change at a single ^card-5ty2
instant, with no interval left to average over.

The second reading is geometric: the difference quotient is the slope of
the secant line through `(a, f(a))` and `(a+h, f(a+h))`.

As `h -> 0`, that secant line rotates toward the tangent line at `a`, so
`f'(a)` is exactly the tangent's slope. A tangent, on this view, isn't a
separate geometric idea — it's *defined* as the limit of secants.

> [!card] recall
> Write the limit definition of f'(a) in terms of a difference quotient.
> ---
> f'(a) = lim_{h->0} (f(a + h) - f(a)) / h ^card-el2j

Differentiability is a strictly stronger condition than continuity.
Every differentiable function is continuous — you can't have a
well-defined tangent slope at a point where the function jumps or blows
up — but the converse fails, and the standard counterexample is `|x|` at
`x = 0`. It's continuous there; the two pieces meet with no gap. But it
isn't differentiable there, because the left-hand difference quotient
limits to -1 and the right-hand one limits to +1 — they disagree, so no
single tangent slope exists. Graphically this is the **corner**: a sharp
bend has no well-defined direction to be tangent to, even though the
graph never breaks.

> [!card] mcq
> Which statement about continuity and differentiability at a point is correct?
> - [x] Differentiable implies continuous, but continuous does not imply differentiable
> - [ ] Continuous implies differentiable, but differentiable does not imply continuous
> - [ ] The two conditions are equivalent
> - [ ] Neither implies the other ^card-53im

Why is |x| continuous at x = 0 but not differentiable there? :: It's continuous because the left and right pieces meet at the same value, 0, with no jump or hole. It's not differentiable because the left-hand and right-hand difference-quotient limits disagree — one gives slope -1, the other +1 — so there's no single limiting slope, which shows up as the corner in the graph. ^card-wlbm

Differentiability is a stronger, more local condition than continuity: it
doesn't just ask that a function have no gaps nearby, it asks that the
function look, up close, like a specific straight line. That's a much
sharper demand, which is why so many continuous functions used in practice
still fail it at isolated points.

The derivative itself is a function, not a single number — `f'(x)` is
defined at every point where the limit above exists, mapping each `x` to
the slope of `f` at that point. `f'(x)` and `d/dx f(x)` name the same
object; the first emphasizes the derivative as a new function built from
`f`, the second emphasizes it as an operation applied to `f`.

Why are f'(x) and d/dx f(x) considered the same mathematical object rather than two different things? :: Both denote the function that maps each x to the slope of f at x, obtained from the same limit of a difference quotient. f'(x) emphasizes the derivative as a new function derived from f; d/dx f(x) emphasizes it as an operator applied to f. The notation differs, but neither construction nor value does. ^card-k43u

The practical payoff of all of this is the linear approximation it hands
you for free:

```
f(a + h) ~ f(a) + f'(a) * h
```

This says the tangent line is a good stand-in for `f` itself, as long as
you stay close to `a`. Almost everything differentiation is used *for* —
estimating a small change, linearizing a hard equation, running one step
of Newton's method — is this formula in disguise: replace a curve, locally,
by the line that best matches its instantaneous behavior.

What is the linear approximation f(a + h) ~ f(a) + f'(a)*h actually saying about the relationship between a function and its derivative? :: It says the tangent line to f at a is a good local stand-in for f itself — for h close to 0, f's actual change is well approximated by the tangent's predicted change, f'(a)*h. This is the practical reason to compute a derivative at all: it turns a hard nonlinear function into an easy linear one, valid near the point where you took it. ^card-ek2k

> [!card] mcq
> A student concludes "f is continuous at x = 2, so f must be differentiable at x = 2." What is wrong with this reasoning?
> - [x] Continuity is necessary but not sufficient for differentiability — |x| at 0 is continuous but not differentiable
> - [ ] Nothing — continuity always implies differentiability
> - [ ] The reasoning is backwards; differentiability at a point never requires continuity there
> - [ ] The reasoning only fails for piecewise-defined functions ^card-kdsc
