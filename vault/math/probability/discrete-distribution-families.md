---
topic: math
category: math-probability
tags: [discrete-distributions, binomial, poisson, geometric, hypergeometric]
citations: ["Blitzstein & Hwang, Introduction to Probability 2e, Ch. 3-4"]
---

# Discrete Distribution Families

A handful of named discrete distributions cover most of what shows up in
practice, and the thing worth memorizing about each is not its PMF but
its *story* — the concrete random process that produces it. Recognize
the story in a word problem and the parameters follow almost for free;
trying to match formulas without the story is what makes these families
feel like an undifferentiated lookup table.

The simplest story is a single trial with two outcomes, success or
failure, where success happens with probability p. Repeat that trial n
times independently and count the successes — that count is what turns
a single yes/no trial into a family with its own name.

A single yes/no trial with success probability p, where you care about the 0/1 outcome itself — which family, and what are E[X] and Var(X)? :: Bernoulli(p); E[X] = p, Var(X) = p(1 - p). ^card-tzrp

You repeat that trial n independent times and count the total successes — which family, and what are E[X] and Var(X)? :: Binomial(n, p); E[X] = np, Var(X) = np(1 - p). It is literally a sum of n iid Bernoulli(p) trials, which is also the fastest way to derive its mean by linearity. ^card-zmdo

```
P(X = k) = C(n, k) p^k (1-p)^(n-k),  k = 0, 1, ..., n
```

Now change the stopping rule instead of the trial count: flip a p-coin
repeatedly until the first success appears, and count only the
failures that came before it.

You flip a p-coin until the first success and count the failures that preceded it — which family, and what are E[X] and Var(X)? :: Geometric(p); E[X] = (1-p)/p, Var(X) = (1-p)/p^2. ^card-qys7

```
P(X = k) = (1-p)^k * p,  k = 0, 1, 2, ...
```

Generalize once more: wait not for the first success but for the rth
one, still counting only the failures accumulated along the way. Setting
r = 1 collapses this back to the geometric story exactly.

Generalize by waiting for the rth success instead of the first, still counting failures along the way — which family, and what are E[X] and Var(X)? :: Negative Binomial(r, p); E[X] = r(1-p)/p, Var(X) = r(1-p)/p^2. ^card-7ggm

```
P(X = k) = C(k+r-1, k) p^r (1-p)^k,  k = 0, 1, 2, ...
```

> [!card] mcq
> A goalkeeper faces penalty kicks and saves each independently with probability p. Which family models the number of goals scored before her 4th save?
> - [x] Negative binomial with r = 4 — counting failures (goals) before the 4th success (save)
> - [ ] Binomial(4, p) — that would fix the number of kicks, not the number of saves
> - [ ] Geometric(p) — that only counts failures before the *first* save
> - [ ] Poisson(4p) — there is no continuous rate here, just discrete trials ^card-g68g

Leave the world of discrete trials entirely for a different story: count
events that occur at a constant average rate over a continuous interval
of time or space — arrivals per hour, typos per page, decays per
second. There is no natural "n" or "p" here at all, only a rate.

You count events occurring at a constant average rate over a fixed interval, with no natural trial count — which family, and what are E[X] and Var(X)? :: Poisson(lambda); E[X] = lambda, Var(X) = lambda — the only common family whose mean and variance coincide. ^card-4gp5

```
P(X = k) = e^(-lambda) * lambda^k / k!,  k = 0, 1, 2, ...
```

This same family also arises as a *limit* of the trial-based one above:
hold the product n*p fixed at lambda while n grows large and p shrinks
toward zero, and the binomial PMF converges term by term to the
Poisson PMF. This is the ==law of rare events==, and it is the standard ^card-5mgt
justification for using Poisson to model counts like typos or accident
claims, where many opportunities exist but each is individually
unlikely.

State the regime under which Binomial(n, p) is well approximated by Poisson(lambda). :: n large, p small, with the product n*p held roughly fixed at lambda — many trials, each individually rare. ^card-6m2u

> [!card] mcq
> A website gets 10,000 visitors a day, each independently completing a purchase with probability 0.0003. Which distribution is the standard approximation for the day's total purchases, and why?
> - [x] Poisson(3) — n is large and p is tiny with n*p = 3 held moderate, the classic rare-events regime
> - [ ] Normal(3, 3) — a normal approximation is a separate large-sample tool, not this family's namesake limit
> - [ ] Geometric(0.0003) — that models waiting for one success, not counting successes in a day
> - [ ] Binomial(10000, 0.0003) exactly — correct in principle but exactly the thing the approximation exists to avoid computing ^card-71o2

Every family above assumes independent trials, equivalent to drawing
with replacement from a population or flipping a fresh coin each time.
One more story drops that assumption: draw n objects without
replacement from a finite population of w desired and b undesired
items, and count how many desired ones you get. Because each draw
changes what remains, the draws are dependent, and the resulting
distribution encodes exactly the shrinking-population correction that
the trial-based families above ignore.

You draw n objects without replacement from a finite population of w desired and b undesired items, and count the desired ones — which family, and how does it differ mechanically from binomial? :: Hypergeometric(w, b, n); it counts successes in n draws like binomial does, but the draws are dependent since sampling is without replacement, so each draw's odds shift based on what was already removed from the population. ^card-3lc0

```
P(X = k) = C(w, k) * C(b, n-k) / C(w+b, n)
```

> [!card] recall
> State the mean of Hypergeometric(w, b, n), and compare it to Binomial(n, p) with p = w/(w+b).
> ---
> E[X] = n * w/(w+b) — identical in form to the binomial mean np with p = w/(w+b). The variance carries an extra finite-population correction factor (w+b-n)/(w+b-1), which shrinks toward 0 as n approaches the full population and equals 1 in the with-replacement limit, recovering the binomial variance exactly. ^card-btep
