---
topic: math
category: math-probability
tags: [random-variable, pmf, cdf, pdf, support]
citations: ["Blitzstein & Hwang, Introduction to Probability 2e, Ch. 2-3"]
---

# Random Variables and Distributions

A random variable is not really "random" in the sense of being
unpredictable magic — it is just a function from the sample space to
the real numbers. Given an outcome of the underlying experiment, a
random variable X assigns it a number. Rolling two dice and asking for
their sum, or flipping a coin ten times and asking how many heads
came up, are both random variables in this sense: a deterministic rule
applied to a random outcome, which is what makes the resulting number
itself unpredictable in advance.

The ==support== of a random variable is the set of values it can ^card-7hav
actually take on — everything else has probability zero and can be
ignored when describing its distribution.

A random variable is called discrete if the set of values it can take
is finite or countably infinite (die rolls, counts, anything you could
in principle list one by one), and continuous if that set is an
interval or union of intervals of real numbers, so that no single
value has positive probability.

For a discrete random variable, the probability mass function (PMF)
f_X(x) = P(X = x) gives the probability of each individual value
directly, and summing it over the support must give 1:

```
sum_{x in support(X)} f_X(x) = 1
```

Continuous random variables need a different tool, because P(X = x) is
0 for every x — there are uncountably many possible values, so no
single one can carry positive probability without the total exceeding
1. Instead a continuous random variable has a probability density
function (PDF) f_X(x), and probability comes from area under the
curve, not from a single height:

```
P(a <= X <= b) = int_a^b f_X(x) dx
```

> [!card] mcq
> For a continuous random variable X with PDF f_X, what does f_X(x)
> itself represent?
> - [x] A density — it can exceed 1, and only becomes a probability once integrated over an interval
> - [ ] The probability that X equals exactly x
> - [ ] The probability that X is less than or equal to x
> - [ ] The fraction of all possible values of X that are less than x ^card-eout

The cumulative distribution function (CDF) F_X(x) = P(X <= x) is
defined the same way for discrete and continuous random variables
alike, which is part of why it is so useful — it works regardless of
which kind of random variable you have. F_X is nondecreasing, goes to
0 as x goes to negative infinity, and goes to 1 as x goes to positive
infinity.

> [!card] mcq
> Which of the following is NOT a property every CDF F_X must satisfy?
> - [x] F_X must be symmetric around its mean
> - [ ] F_X is nondecreasing as x increases
> - [ ] F_X(x) approaches 0 as x approaches negative infinity
> - [ ] F_X(x) approaches 1 as x approaches positive infinity ^card-af6f

For a continuous random variable, the PDF is the ==derivative== of the ^card-5umz
CDF, and going the other way, the CDF is the PDF's running integral —
the two functions determine each other completely.

> [!card] recall
> A discrete random variable X has support {1, 2, 3} with
> f_X(1) = 0.2, f_X(2) = 0.5, f_X(3) = 0.3. What is F_X(2), and why is
> F_X(2) not simply equal to f_X(2)?
> ---
> F_X(2) = P(X <= 2) = f_X(1) + f_X(2) = 0.7. The CDF accumulates all
> probability at or below the point, while the PMF gives the
> probability of that one value in isolation; they only coincide at the
> smallest point in the support, where there is nothing smaller to
> accumulate. ^card-10gi

Applying an ordinary function g to a random variable produces another
random variable, Y = g(X): for each outcome, first apply X, then apply
g to the result. If X counts heads in ten coin flips, X^2 and 3X - 1
are both perfectly good random variables built from X. This matters
because it sets up the natural next question — given the distribution
of X, what is the distribution, or at least the expectation, of a
function of X — without needing to work out that new distribution from
scratch every time.

> [!card] recall
> Y = g(X) is formed by applying a function g to a random variable X.
> In what sense is Y itself a genuine random variable, rather than
> merely a formula written in terms of X?
> ---
> X is already a function from the sample space to the reals, so
> composing it with g gives Y = g(X) as another function from that same
> sample space to the reals: for every outcome, first apply X to get a
> number, then apply g to that number. That composition is exactly what
> a random variable is, so Y inherits well-defined randomness from the
> same underlying experiment without needing a new probability model. ^card-k0ae

> [!card] mcq
> A random variable's set of possible values is countably infinite,
> with gaps between consecutive values (like the nonnegative integers).
> Which kind of random variable must it be?
> - [x] Discrete
> - [ ] Continuous
> - [ ] Neither discrete nor continuous
> - [ ] It could be either, depending only on its PDF ^card-45es

How two random variables relate to each other — their joint
distribution, independence, conditional distributions — is a separate
question from what any single random variable's own distribution looks
like, and is covered in `joint-distributions-and-conditional-expectation.md`.
