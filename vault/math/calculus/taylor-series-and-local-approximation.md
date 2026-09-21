---
topic: math
category: math-calculus
tags: [taylor-series, maclaurin-series, remainder-term, convergence, approximation]
citations: ["Stewart, Calculus: Early Transcendentals 8e, Ch. 11"]
---

# Taylor series and local approximation

`the-mean-value-theorem.md` and `differentiation-rules.md` establish the
tangent line at a point: a linear function matching f's value and slope
there. A Taylor polynomial is the same idea pushed further — instead of
matching one derivative, match n of them, and each extra term buys one
more order of agreement with f near that point.

The **linear approximation** `L(x) = f(a) + f'(a)*(x-a)` matches f and f'
at `x = a` but generally nothing higher, so it drifts from f as soon as
curvature matters. The **degree-n Taylor polynomial** fixes that by
construction:

```
P_n(x) = sum_{k=0}^n  f^(k)(a)/k!  *  (x-a)^k
```

Each coefficient is chosen so that `P_n` and f agree not just in value but
in every derivative up to that degree at `x = a`. Adding a higher-degree
term buys exactly ==one== extra order of local agreement — the whole ^card-tdnf
scheme trades derivatives matched for accuracy close to the center.

> [!card] recall
> Write the general Taylor polynomial of f centered at a, degree n.
> ---
> P_n(x) = sum_{k=0}^n f^(k)(a)/k! * (x-a)^k — the k-th term uses the
> k-th derivative at a divided by k-factorial, times (x-a) to the k. ^card-qluz

Centering at `a = 0` gives the **Maclaurin series**, and three of these
recur constantly enough to be worth fixing in memory rather than
re-deriving:

```
exp(x) = sum_{k=0}^inf  x^k / k!

sin(x) = sum_{k=0}^inf  (-1)^k * x^(2k+1) / (2k+1)!

cos(x) = sum_{k=0}^inf  (-1)^k * x^(2k)   / (2k)!
```

> [!card] recall
> Write the Maclaurin series for exp(x).
> ---
> exp(x) = sum_{k=0}^inf x^k / k! — 1 + x + x^2/2! + x^3/3! + ... ^card-tmxa

> [!card] mcq
> Which is the correct general term of the Maclaurin series for cos(x)?
> - [x] (-1)^k * x^(2k) / (2k)!
> - [ ] (-1)^k * x^(2k+1) / (2k+1)!
> - [ ] (-1)^k * x^(2k) / (2k+1)!
> - [ ] x^(2k) / k! ^card-l7e8

A degree-n Taylor polynomial by itself is only half a claim. Stopping at n
terms leaves a **remainder** `R_n(x) = f(x) - P_n(x)`, and without a bound
on that remainder, "P_n approximates f" is a guess, not a result. The
remainder is exactly what turns Taylor's construction into **Taylor's
theorem**: the theorem's content is a bound of the form

```
R_n(x) = f^(n+1)(c) / (n+1)!  *  (x-a)^(n+1)      for some c between a and x
```

Why does a Taylor polynomial without a remainder bound tell you nothing about how good the approximation actually is? :: Matching n derivatives at the center only guarantees the two functions look alike infinitesimally close to a; it says nothing about how fast they diverge as x moves away. Two functions can share the same degree-n Taylor polynomial and still differ by an arbitrarily large amount a short distance from the center. The remainder term is the only part of the statement that quantifies that gap, which is why it is what makes the claim a theorem rather than a formal rearrangement of derivatives. ^card-aaad

A Taylor series does not converge to f everywhere it is defined — it
converges only within a **radius of convergence** around the center, and
outside that radius the partial sums diverge instead of approaching f. The
sharpest illustration is a series whose own function has a nearby
singularity:

```
1/(1-x) = sum_{k=0}^inf x^k          converges only for |x| < 1
```

Even though `1/(1-x)` is perfectly smooth at `x = 0`, its series fails to
represent it for any `x` with `|x| >= 1` — the singularity at `x = 1`
caps how far the approximation can reach, even along the real line where
nothing visibly goes wrong at `x = -1` or beyond.

> [!card] mcq
> The Maclaurin series for 1/(1-x) is sum x^k. For which x does it converge to 1/(1-x)?
> - [x] |x| < 1 only
> - [ ] All real x
> - [ ] |x| <= 1
> - [ ] All x except x = 0 ^card-rlgi

A sharper caveat than "converges only nearby": a function can be
infinitely differentiable everywhere and still fail to equal its own
Taylor series at every point but the center, because the remainder simply
never shrinks to zero. Smoothness alone does not guarantee convergence to
the right answer — the remainder bound has to actually vanish, which is a
strictly stronger condition.

Can a function be infinitely differentiable at a and still not equal its own Taylor series centered at a, anywhere except at a itself? :: Yes. Having derivatives of every order only guarantees the Taylor polynomials can be formed; it says nothing about whether the remainder R_n(x) shrinks to zero as n grows. The classic example is a function built to be flat (all derivatives zero) at a single point while remaining nonzero nearby — its Taylor series at that point is identically zero, yet the function itself is not. ^card-x0m4

This isn't a purely theoretical wrinkle. The **second-order** Taylor
expansion — matching value, slope, and curvature — is the model behind
Newton's method's quadratic step and behind every "quadratic
approximation" used in optimization to decide a descent direction near a
point; truncating at second order is precisely what makes those methods
fast when the local approximation is good and unreliable when it isn't.

`expectation-and-linearity.md` in `math-probability` uses a first-order
Taylor expansion for the delta method, which is the same linear
approximation used here applied to a random variable instead of a plain
function.
