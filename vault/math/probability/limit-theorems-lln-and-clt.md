---
topic: math
category: math-probability
tags: [law-of-large-numbers, central-limit-theorem, sampling-distribution, standard-error]
citations: ["Blitzstein & Hwang, Introduction to Probability 2e, Ch. 10"]
---

# Limit Theorems: LLN and the CLT

Take n independent draws from the same distribution and average them.
Two questions matter for that average: does it settle down to a fixed
number as n grows, and if so, what does its own distribution look like
for large but finite n? The law of large numbers answers the first
question; the central limit theorem answers the second. They are often
taught together, which invites a mix-up worth heading off early: both
statements are about the sample mean, a single number computed from all
n draws, not about what happens to any individual draw.

The law of large numbers comes in two strengths. The weak law says that
for any tolerance, the probability that the sample mean differs from
the true mean by more than that tolerance goes to zero as n grows — a
statement about a sequence of probabilities shrinking. Chebyshev's
inequality is the standard route to proving it: the sample mean's
variance is Var(X)/n, which shrinks toward zero, so the sample mean
concentrates around the true mean.

```
Weak LLN:  for any e > 0,  P(|Xbar_n - mu| > e) -> 0  as n -> infinity
```

The strong law is a sharper claim: it says that the sample mean
converges to the true mean with probability 1 — the sequence of sample
means, as an entire trajectory, almost surely settles on the true value
rather than merely having a shrinking chance of straying at any single
n. Proving this stronger version needs more machinery than a Chebyshev
argument; the practical difference rarely matters for applying the
result, but the logical distinction between a per-n probability
statement and an almost-sure statement about the whole sequence is real.

What is the key logical difference between the weak and the strong law of large numbers? :: The weak law only says that at each fixed large n, the probability the sample mean deviates from the true mean by more than any fixed tolerance shrinks to zero; the strong law says the entire sequence of sample means converges to the true mean with probability 1, a statement about the whole infinite trajectory, not just about each n considered separately. ^card-ug32

Both laws describe where the sample mean ends up in the limit, but say
nothing about its shape along the way. That is the central limit
theorem's job: for large but finite n, the (properly rescaled) sample
mean looks approximately normal, regardless of the shape of the
distribution being sampled from. Rescaling is essential — the sample
mean itself has shrinking variance Var(X)/n, so it collapses toward a
point; what converges to a fixed normal shape is the sample mean minus
mu, divided by its own standard deviation.

```
CLT:  (Xbar_n - mu) / (sigma / sqrt(n))  ->  Normal(0, 1)   as n -> infinity
```

The quantity sigma / sqrt(n) — the standard deviation of the sampling
distribution of the sample mean itself, not of a single observation —
is called the ==standard error==. It shrinks as sqrt(n) grows, which is ^card-65ms
why averaging more data narrows a confidence interval, but only at the
square-root rate: quadrupling n only halves it.

> [!card] mcq
> The "sampling distribution of the sample mean" refers to which of these?
> - [x] The distribution of Xbar_n itself, viewed as a random variable that varies from one sample of size n to the next
> - [ ] The distribution of a single observation X_i drawn from the population
> - [ ] The empirical histogram of one particular observed sample's values
> - [ ] The population's true underlying distribution ^card-4rqc

Why does the standard error shrink at rate sqrt(n) rather than at rate n? :: Because Var(Xbar_n) = Var(X)/n, so the standard deviation of the sample mean is sigma/sqrt(n); halving the standard error therefore requires quadrupling the sample size, not just doubling it. ^card-jo7n

Now the part worth stating explicitly, because the CLT is one of the
most casually over-claimed results in probability. It does *not* say
that individual data points become normally distributed as you collect
more of them — a single new draw X_{n+1} still comes from whatever
distribution you started with, however skewed or heavy-tailed, no
matter how large n has already gotten. The theorem is entirely about
the distribution of the *aggregate*, the sample mean (or an
appropriately scaled sum), not about any one sample.

> [!card] mcq
> Which of these is a correct statement of what the central limit theorem claims?
> - [x] The distribution of the (rescaled) sample mean approaches a normal distribution as n grows, regardless of the shape of the original population distribution
> - [ ] Individual observations from a non-normal population become approximately normal once enough of them have been collected
> - [ ] Any distribution converges to the normal distribution as its parameters grow
> - [ ] The sample mean converges to a normal distribution only if the population distribution is already close to normal ^card-gxra

The other silent gap is convergence rate. The CLT is an asymptotic
statement — it promises normality "as n goes to infinity" but makes no
guarantee about how large n must be before the approximation is any
good, and that required n depends heavily on the shape of the
underlying distribution. For a distribution with heavy tails (one
whose variance is very large, or, in extreme cases, infinite), the
normal approximation to the sample mean's distribution can remain poor
even at sample sizes where a well-behaved, light-tailed distribution
would already look convincingly bell-shaped — and if the variance is
infinite, the classical CLT does not apply to that distribution at all.

> [!card] recall
> A colleague says "n = 30 is always enough for the CLT to kick in."
> Explain what is missing from that claim, using the idea of heavy
> tails.
> ---
> The CLT guarantees normality only in the limit as n goes to infinity
> and says nothing about the rate of convergence for any finite n; how
> large n needs to be depends on the shape of the underlying
> distribution. A distribution with heavy tails (large or infinite
> variance) can need a far larger sample size before the sample mean's
> distribution looks approximately normal, and if the variance is
> infinite the classical theorem does not apply at all — so a fixed
> rule like "n = 30" is not a universal guarantee, only a common
> rule of thumb for reasonably light-tailed populations. ^card-c3oe

The two results are complementary rather than redundant: the law of
large numbers tells you where the sample mean is headed, while the
central limit theorem tells you the shape of the noise around that
destination for finite n — which is exactly the information needed to
build a confidence interval or a hypothesis test around an estimated
mean.
