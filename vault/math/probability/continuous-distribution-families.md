---
topic: math
category: math-probability
tags: [continuous-distributions, exponential, normal, memorylessness, poisson-process]
citations: ["Blitzstein & Hwang, Introduction to Probability 2e, Ch. 5, 7"]
---

# Continuous Distribution Families

The discrete families each came from a distinct generating story —
counting trials, counting failures, counting rare events. The
continuous families below follow the same pattern: the shape of the
density is a consequence of the process, not an arbitrary formula to
memorize.

The plainest story is total ignorance over a range: a quantity known
only to fall somewhere between a and b, with no sub-interval of a given
width more likely than any other of the same width. That is
Uniform(a, b).

A quantity is equally likely to fall anywhere in an interval [a, b], with no sub-region favored — which family, and what are E[X] and Var(X)? :: Uniform(a, b); E[X] = (a+b)/2, Var(X) = (b-a)^2 / 12. ^card-ucfo

```
f(x) = 1 / (b - a),  a <= x <= b
```

A more interesting story: events occur continuously at a constant rate
lambda, and X is the waiting time until the very next one. That waiting
time is Exponential(lambda) — the continuous counterpart of the
geometric distribution's "trials until first success," except time now
runs continuously instead of in discrete steps.

The waiting time until the next event of a process running at constant rate lambda — which family, and what are E[X] and Var(X)? :: Exponential(lambda); E[X] = 1/lambda, Var(X) = 1/lambda^2. ^card-n6s6

```
f(x) = lambda * e^(-lambda x),  x >= 0
```

Exponential has a defining, unusual property: however long you have
already waited, the remaining wait looks exactly like a fresh draw from
the same distribution — past waiting time carries no information about
what's left. This is the ==memoryless== property, and among continuous ^card-358u
distributions on [0, infinity), exponential is the *only* one that has
it.

```
P(X > s + t | X > s) = P(X > t)   for all s, t >= 0
```

> [!card] mcq
> A lightbulb's remaining lifetime, given it has already survived 500 hours, has the exact same distribution as a brand-new bulb's lifetime. Which family must the lifetime follow?
> - [x] Exponential — the only continuous family on [0, infinity) with this no-aging property
> - [ ] Normal — normal lifetimes would imply the bulb gets predictably more or less likely to fail as it ages
> - [ ] Uniform — a uniform lifetime is bounded above, so remaining life shrinks deterministically as time passes
> - [ ] Gamma with shape > 1 — gamma lifetimes model wear that accumulates, the opposite of memorylessness ^card-7hdf

Exponential and Poisson are two views of the same underlying process,
one continuous and one discrete. If events arrive according to a
Poisson process at rate lambda — so the *count* of events in a fixed
interval is Poisson(lambda * t) — then the *gaps* between consecutive
arrivals are independent draws from Exponential(lambda). Counting
events over a fixed window gives you Poisson; timing the wait between
them gives you exponential, both driven by the same rate parameter.

> [!card] recall
> A server receives requests as a Poisson process at rate lambda per second. What distribution describes the time gap between one request and the next, and why does that follow from the Poisson-process assumption rather than needing a separate derivation?
> ---
> Exponential(lambda). The Poisson process assumption already says arrivals in disjoint time windows are independent and occur at a constant rate, and "no arrival yet in the next t seconds" is exactly the memoryless waiting-time question — so the inter-arrival gap inherits the exponential distribution directly from how the process was defined, rather than as a new fact needing its own proof. ^card-ro5k

The last major continuous family has a different story: rather than
counting or timing discrete events, it describes quantities that are
the sum of many small, roughly independent influences — measurement
noise, heights, aggregated errors. That bell-shaped family is
Normal(mu, sigma^2), fixed by just a mean and a variance.

```
f(x) = (1 / (sigma * sqrt(2*pi))) * e^(-(x - mu)^2 / (2*sigma^2))
```

Every Normal(mu, sigma^2) can be rescaled into the single reference
copy of the family, N(0, 1), by subtracting the mean and dividing by
the standard deviation: Z = (X - mu) / sigma. This ==standardization== ^card-l3j2
is why one table of Z-values covers every normal distribution at once,
regardless of its own particular mu and sigma.

Given X ~ Normal(mu, sigma^2), what transformation produces a standard normal Z, and why is that transformation useful in practice? :: Z = (X - mu) / sigma; it recenters X to mean 0 and rescales it to variance 1, so a single N(0, 1) table (or software routine) can answer probability questions for any normal distribution instead of needing one table per (mu, sigma) pair. ^card-9abv

Two more continuous families are worth being able to name, without
going deep on either. Gamma(r, lambda) generalizes exponential the same
way negative binomial generalized geometric: it is the waiting time
until the rth arrival of a rate-lambda Poisson process, not just the
first. Beta(a, b) is a family on [0, 1] rather than [0, infinity),
typically used to describe uncertainty about a probability itself
(the parameter p, not an outcome of it) — it shows up as the natural
partner to binomial data in Bayesian updating, a topic this vault does
not develop further here.
