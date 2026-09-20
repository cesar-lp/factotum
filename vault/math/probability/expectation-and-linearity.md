---
topic: math
category: math-probability
tags: [expectation, lotus, linearity, discrete-vs-continuous]
citations: ["Blitzstein & Hwang, Introduction to Probability 2e, Ch. 4-5"]
---

# Expectation and Linearity

The expectation E[X] of a random variable is a single number
summarizing where its distribution is centered — a weighted average of
every value X can take, weighted by how likely that value is. For a
discrete random variable with PMF f_X, that weighting is a sum over
the support:

```
E[X] = sum_{x in support(X)} x * f_X(x)
```

For a continuous random variable with PDF f_X, the sum becomes an
integral, replacing "probability of exactly x" with "density at x":

```
E[X] = int_{-infinity}^{infinity} x * f_X(x) dx
```

> [!card] mcq
> A fair six-sided die is rolled. Which computation gives E[X] for the
> result X?
> - [x] (1+2+3+4+5+6) * (1/6)
> - [ ] The most likely single outcome, since all six are equally likely
> - [ ] max(support(X)) - min(support(X)), divided by 2
> - [ ] P(X = 1) + P(X = 2) + ... + P(X = 6) ^card-809a

That die example also makes a subtle point on its own: E[X] = 3.5 for
a standard six-sided die, but 3.5 is not one of the six faces the die
can ever actually show.

> [!card] recall
> A fair six-sided die has E[X] = 3.5, a value the die can never
> actually land on. What does this reveal about E[X] in general, for
> any random variable?
> ---
> E[X] is a probability-weighted average over the support, not a
> prediction of a single trial's outcome, so there is no requirement
> that E[X] itself be one of the values the random variable can take.
> An expectation can fall anywhere between the extremes of the support,
> including at points the random variable never visits. ^card-k1q8

Often what you actually want is not E[X] but E[g(X)] for some function
g — the expected squared value, the expected payoff of a bet that
depends on X, and so on. The naive approach is to first work out the
distribution of Y = g(X) and then apply the definition of expectation
to Y. The law of the unconscious statistician (LOTUS) says that step is
unnecessary: you can compute E[g(X)] directly from the distribution of
X, without ever finding Y's distribution.

```
E[g(X)] = sum_{x in support(X)} g(x) * f_X(x)          (discrete)
E[g(X)] = int_{-infinity}^{infinity} g(x) * f_X(x) dx  (continuous)
```

> [!card] recall
> Explain what LOTUS lets you skip when you want E[X^2] for a random
> variable X whose PMF you already know.
> ---
> Without LOTUS you would need to derive the PMF of the new random
> variable Y = X^2 — figuring out, for each possible value y, which
> x's square to it and summing their probabilities — and only then
> apply the definition of expectation to Y. LOTUS says you can instead
> plug g(x) = x^2 straight into sum_x g(x) f_X(x) using X's own PMF,
> skipping the intermediate distribution of Y entirely. ^card-d4eu

> [!card] mcq
> A continuous random variable X has PDF f_X(x) = 2x on the interval
> [0,1]. Which expression, by LOTUS, computes E[X^2]?
> - [x] int_0^1 x^2 * 2x dx
> - [ ] int_0^1 2x dx
> - [ ] sum_{x in [0,1]} x^2 * 2x
> - [ ] (int_0^1 x * 2x dx)^2 ^card-y18n

> [!card] recall
> What is E[c] when c is a constant — a "random variable" that always
> takes the same value with probability 1 — and why does the
> definition of expectation force that answer?
> ---
> E[c] = c. The definition of expectation is a probability-weighted
> average over the support, and a constant's support is the single
> point c with probability 1, so the weighted average collapses to
> exactly that one value with no averaging left to do. ^card-c49t

Expectation also has an algebraic property that makes it far more
usable than it might first appear: it distributes over sums and scalar
multiples of random variables. For random variables X and Y and
constants a and b,

```
E[aX + bY] = a * E[X] + b * E[Y]
```

The non-obvious part — and the reason this property is so powerful in
practice — is what it does *not* require. It holds no matter how X and
Y depend on each other: they can be wildly correlated, one can be a
deterministic function of the other, they can come from entirely
different distributions, and the identity still holds exactly.

> [!card] mcq
> X and Y are two random variables with a complicated joint
> dependence — knowing X tells you a great deal about Y. What
> additional assumption is needed to conclude E[X + Y] = E[X] + E[Y]?
> - [x] None — the identity holds regardless of any dependence between X and Y
> - [ ] X and Y must be independent
> - [ ] X and Y must have the same distribution
> - [ ] Cov(X, Y) must be computed and shown to be zero first ^card-c1wg

> [!card] mcq
> Which statement correctly contrasts the LOTUS approach to computing
> E[g(X)] with the naive approach?
> - [x] LOTUS weights g(x) by X's own PMF or PDF directly; the naive approach first derives the distribution of Y = g(X) and then averages that
> - [ ] LOTUS first derives the distribution of Y = g(X); the naive approach skips straight to weighting g(x) by X's distribution
> - [ ] LOTUS only applies when g is linear; the naive approach is needed for any nonlinear g
> - [ ] The two approaches only differ for discrete random variables ^card-8qea

This is worth contrasting with variance, where the corresponding
statement for a sum picks up an extra cross term that only vanishes
under an independence-like condition — see
`variance-covariance-and-correlation.md`. Expectation's version of
this property (and the general n-variable form, not just the
two-variable case above) is developed from indicator random variables
in `probabilistic-analysis-and-indicator-variables.md`; this note has
instead built it up directly from the definition of E[X] and from
LOTUS, which is the more general route to the same fact.
