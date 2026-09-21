---
topic: math
category: math-calculus
tags: [substitution, integration-by-parts, partial-fractions, improper-integrals]
citations: ["Stewart, Calculus: Early Transcendentals 8e, Ch. 7"]
---

# Integration techniques

`differentiation-rules.md` and `the-chain-rule.md` are mechanical: given
any elementary function, a fixed set of rules produces its derivative,
always, in finitely many steps. Integration has no such algorithm.
Reversing a derivative rule only works when you first recognize *which*
rule produced the expression in front of you, and worse, many perfectly
ordinary elementary functions — `exp(-x^2)`, `sin(x)/x` — provably have no
antiderivative expressible in elementary terms at all. "Technique" here
means a catalogue of patterns to recognize, not a procedure to run.

**Substitution** is the chain rule read backward. If an integrand
contains some inner function `g(x)` together with a factor equal to its
derivative `g'(x)`, that factor is exactly what the chain rule would have
produced when differentiating a composition, and substituting `u = g(x)`
undoes it:

```
int f(g(x)) * g'(x) dx  =  int f(u) du     where u = g(x)
```

The real skill is not the mechanics of the substitution itself but
**spotting the inner function whose derivative is already sitting in the
integrand as a factor** — everything after that is just relabeling.

Why is "the chain rule run backward" a better mental model for substitution than "a change of variables"? :: Because it tells you what to look for: an inner function paired with its own derivative as a multiplicative factor, which is the exact fingerprint the chain rule leaves behind when it produced the original expression. Treating it as an abstract change of variables gives no guidance about which substitution to try; treating it as chain-rule reversal turns the search into pattern matching against a rule you already know. ^card-egxa

**Integration by parts** is the product rule read backward. Differentiating
a product `u*v` gives `u'*v + u*v'`; integrating that identity and
rearranging produces the parts formula:

```
int u dv  =  u*v  -  int v du
```

> [!card] recall
> Write the integration-by-parts formula.
> ---
> int u dv = u*v - int v du, derived by integrating the product rule
> d/dx(u*v) = u'*v + u*v' and solving for int u * v' dx. ^card-3abz

Parts trades the integral you have for a different one, `int v du`, and
whether that trade helps depends entirely on which factor you call `u`
and which you call `dv`. The practical criterion: **pick u to be the
factor that gets simpler when you differentiate it** — a polynomial
eventually becomes a constant, a logarithm becomes a power of x — and let
`dv` be whatever is left, chosen so it's still something you can
integrate. Choosing it backward produces a `v du` that is no easier than
where you started, or genuinely harder.

> [!card] mcq
> For int x * exp(x) dx, which choice of u and dv applies parts correctly, so that int v du is simpler than the original integral?
> - [x] u = x, dv = exp(x) dx — differentiating u gives 1 (simpler), and v du = exp(x) dx is directly integrable
> - [ ] u = exp(x), dv = x dx — differentiating u still gives exp(x) (no simpler), and v du now has an x^2 factor
> - [ ] u = x * exp(x), dv = dx — this just restates the original integral with an extra factor of x
> - [ ] u = 1, dv = x * exp(x) dx — this requires already knowing the antiderivative being sought ^card-e3ir

What goes wrong if you choose u and dv for integration by parts so that u gets more complicated after differentiating, rather than simpler? :: The resulting integral int v du replaces the original integrand with one that is at least as hard, and often strictly harder — differentiating u should reduce it toward something trivial (a polynomial toward a constant), and choosing the opposite way turns one difficult integral into a different, equally or more difficult one instead of making progress. ^card-mskd

**Partial fractions** handles rational functions — one polynomial divided
by another — by first doing algebra, not integration: factor the
denominator and rewrite the fraction as a sum of simpler fractions, each
with a single linear or irreducible quadratic factor in its denominator,
before integrating each piece separately. The technique itself is purely
algebraic preprocessing; every piece it produces integrates by rules
already covered elsewhere in this category.

**Trigonometric substitution** is the pattern-matching case: an
integrand containing `sqrt(a^2 - x^2)`, `sqrt(a^2 + x^2)`, or
`sqrt(x^2 - a^2)` is tamed by substituting x as a sine, tangent, or
secant respectively, turning the square root into a single trig factor
via the Pythagorean identity.

An ==improper== integral — one with an infinite limit of integration, or ^card-th4a
an integrand that blows up somewhere in the interval — is defined as a
limit of ordinary (proper) definite integrals, and that limit is not
guaranteed to exist. Whether it does is a genuine question with a real
answer, not a formality to wave through: `int_1^inf 1/x^2 dx` converges
to a finite value, while `int_1^inf 1/x dx` diverges to infinity, even
though the two integrands look superficially similar and both shrink
toward zero.

> [!card] mcq
> Which of these improper integrals converges to a finite value?
> - [x] int_1^inf 1/x^2 dx
> - [ ] int_1^inf 1/x dx
> - [ ] int_1^inf 1 dx
> - [ ] int_1^inf x dx ^card-nom0

Is checking convergence before evaluating an improper integral optional, or required? :: Required. An improper integral is defined as a limit of proper integrals over a growing or shrinking interval, and that limit can fail to exist. Writing down a numeric antiderivative evaluated at infinity without confirming the limit converges can produce a false finite answer for a genuinely divergent integral. ^card-2eu3

`limit-theorems-lln-and-clt.md` and other notes in `math-probability` rely
on improper integrals converging in order for continuous expectations to
be well-defined at all — a distribution's mean is only meaningful because
the relevant improper integral is checked, not assumed, to converge.
