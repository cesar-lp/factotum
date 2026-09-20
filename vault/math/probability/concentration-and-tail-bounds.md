---
topic: math
category: math-probability
tags: [tail-bounds, markov-chebyshev-chernoff, concentration, union-bound]
citations: ["Blitzstein & Hwang, Introduction to Probability 2e, Ch. 6, 10"]
---

# Concentration and Tail Bounds

Knowing E[X] tells you where a random variable is centered, but it says
nothing about how far X can wander from that center, or how likely a
large deviation is. A tail bound answers exactly that: it caps the
probability that X lands far from where you'd expect it to. The four
tools below are not interchangeable — each buys a sharper guarantee by
demanding more information about X as its price of admission, and
picking the cheapest one that still applies is most of the skill.

The weakest and most universally applicable is Markov's inequality. It
needs only two facts: that X is ==nonnegative==, and that you know (or ^card-fzs3
can bound) E[X]. Given just that, it says the probability X exceeds any
threshold a is capped by the ratio of the mean to the threshold.

```
Markov:  P(X >= a) <= E[X] / a       (X >= 0, a > 0)
```

Which two facts does Markov's inequality require about a random variable X before it can be applied? :: That X takes only nonnegative values, and that you know (or have an upper bound on) E[X]; given those two facts alone, no distributional shape or independence assumption is needed. ^card-i7rc

That bound can be tight — some distribution really does put probability
1/a right at the threshold a — but as a general-purpose tool it is
crude: it ignores everything about X except its mean, so for a
well-behaved variable the real tail probability can sit orders of
magnitude below what it predicts.

Chebyshev's inequality tightens this by spending a second piece of
information: a finite ==variance==. Applying Markov to the nonnegative ^card-gx64
random variable (X - E[X])^2 with threshold a^2 gives a bound on how far
X deviates from its own mean in *either* direction, not just above a
fixed threshold — Chebyshev is inherently a two-sided, symmetric-deviation
statement.

```
Chebyshev:  P(|X - E[X]| >= a) <= Var(X) / a^2
```

How is Chebyshev's inequality derived from Markov's inequality? :: By applying Markov's inequality to the nonnegative random variable (X - E[X])^2 with threshold a^2, since P(|X - E[X]| >= a) equals P((X - E[X])^2 >= a^2); the mean of that squared quantity is by definition Var(X), so Markov's E[Y]/a form becomes Var(X)/a^2. ^card-bju7

Chebyshev is sharper than Markov whenever a variance is available, but
it still only decays polynomially (as 1/a^2) as the threshold grows.
For sums of many independent pieces — the setting where concentration
matters most in practice, such as bounding how far an average of trials
strays from its expectation — a much faster, exponential decay is often
achievable.

That is what Chernoff bounds (and the closely related Hoeffding bound
for bounded variables) deliver, at a steeper price: they require the
variable of interest to be a sum of ==independent== random variables, and ^card-q493
typically that each summand is bounded (or, for the classic Chernoff
form, that each is an indicator or otherwise has a controllable moment
generating function). Given those, the probability of deviating from
the sum's mean by even a small fraction of its size falls off
exponentially in the number of terms, not polynomially.

```
Chernoff/Hoeffding (schematic):
P(|sum of n independent bounded X_i - mean| >= a) <= exp(-c * a^2 / n)
```

> [!card] mcq
> You are told only that a random variable X is nonnegative and you know E[X] — nothing about its variance or independence structure. Which bound can you legally apply?
> - [x] Markov's inequality
> - [ ] Chebyshev's inequality
> - [ ] A Chernoff bound
> - [ ] None of these apply without more assumptions ^card-pego

> [!card] mcq
> You have a sum of n independent, bounded random variables and want a bound that decays exponentially in n rather than polynomially in the deviation. Which tool fits?
> - [x] A Chernoff or Hoeffding bound
> - [ ] Markov's inequality alone
> - [ ] Chebyshev's inequality alone
> - [ ] The union bound alone ^card-l5wg

The fourth tool, the ==union bound==, is not a concentration ^card-t25m
inequality at all — it makes no use of means, variances, or
independence. It simply says the probability that *any* of several
events occurs is at most the sum of their individual probabilities,
and it holds unconditionally, even when the events are heavily
dependent or negatively correlated.

```
Union bound:  P(A_1 union A_2 union ... union A_n) <= P(A_1) + P(A_2) + ... + P(A_n)
```

Why does the union bound require no assumption about independence between the events A_1, ..., A_n, unlike a Chernoff bound? :: Because it is proved purely from the axiom that probability is countably subadditive over a union of sets, which holds for any events regardless of how they are correlated; a Chernoff bound instead needs independence to control the joint moment generating function of a sum, so it fails outright if that assumption is dropped. ^card-iirk

The union bound's weakness mirrors Markov's: it throws away all
structure, so summing many overlapping or likely events produces a
bound that can exceed 1 and become useless. Its value is scope, not
sharpness — it is often the only tool that applies at all when the
events in question are dependent in ways too complicated to model, for
example bounding the chance that *some* pair among many collides
without analyzing every pair's joint distribution.

> [!card] recall
> Rank Markov, Chebyshev, and a Chernoff/Hoeffding bound from loosest
> to sharpest for bounding the tail of a sum of independent bounded
> variables, and explain what extra piece of information each step up
> the ranking requires you to already know about the variable.
> ---
> Markov is loosest (needs only nonnegativity and a mean); Chebyshev is
> tighter for large deviations because it additionally uses the
> variance; Chernoff/Hoeffding is tightest for sums because it
> additionally uses independence and boundedness of the summands,
> converting polynomial decay into exponential decay in the number of
> terms. ^card-kc75
