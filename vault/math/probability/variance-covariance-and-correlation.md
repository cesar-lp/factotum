---
topic: math
category: math-probability
tags: [variance, covariance, correlation, uncorrelated, independence]
citations: ["Blitzstein & Hwang, Introduction to Probability 2e, Ch. 4, 6"]
---

# Variance, Covariance, and Correlation

Expectation summarizes where a distribution is centered, but says
nothing about how spread out it is — two random variables can share
the same E[X] while one clusters tightly around it and the other
swings wildly. Variance measures that spread: it is the expected
squared deviation from the mean.

```
Var(X) = E[ (X - E[X])^2 ]
```

Squaring is what keeps deviations above and below the mean from
canceling out, but it also changes units — variance of a length comes
out in squared length. The standard deviation, sqrt(Var(X)), undoes
that squaring and is reported in the original units, which is why it
is usually the more interpretable number even though variance is the
one that appears in formulas.

Shifting a random variable by a constant does not change how spread
out it is, but scaling it does — and scaling affects a squared quantity
quadratically:

```
Var(aX + b) = a^2 * Var(X)
```

> [!card] mcq
> If Y = 3X - 7, how does Var(Y) relate to Var(X)?
> - [x] Var(Y) = 9 * Var(X) — the shift by -7 does not matter, and the scale factor is squared
> - [ ] Var(Y) = 3 * Var(X) - 7
> - [ ] Var(Y) = 3 * Var(X)
> - [ ] Var(Y) = Var(X) - 7 ^card-wwx1

Variance of a sum is where things get more interesting than
expectation of a sum. Expanding the square in the definition shows that
Var(X + Y) picks up a cross term beyond the two individual variances:

```
Var(X + Y) = Var(X) + Var(Y) + 2*Cov(X,Y)
```

That cross term is the covariance, Cov(X,Y) = E[(X - E[X])(Y - E[Y])],
a number measuring whether X and Y tend to deviate from their means in
the same direction (positive covariance), opposite directions
(negative), or with no consistent relationship (covariance near zero).

What is Cov(X,X), and how does it relate to Var(X)? :: Cov(X,X) = E[(X - E[X])(X - E[X])] = E[(X - E[X])^2] = Var(X) — covariance of a random variable with itself is exactly its own variance, since the two factors in the definition become identical. ^card-5tjy

> [!card] recall
> Under what condition on X and Y does Var(X + Y) reduce to just
> Var(X) + Var(Y), with no extra term, and why does that condition
> make the cross term disappear?
> ---
> When X and Y are independent (or, more precisely, whenever
> Cov(X,Y) = 0). Independence forces E[XY] = E[X]E[Y], which makes
> Cov(X,Y) = E[XY] - E[X]E[Y] equal to zero, so the 2*Cov(X,Y) term in
> Var(X+Y) = Var(X) + Var(Y) + 2*Cov(X,Y) vanishes and the sum's
> variance is just the sum of the individual variances. ^card-5z78

> [!card] mcq
> Two random variables X and Y are independent. Which of the following
> is guaranteed to hold?
> - [x] Both E[X+Y] = E[X]+E[Y] and Var(X+Y) = Var(X)+Var(Y)
> - [ ] Only Var(X+Y) = Var(X)+Var(Y); expectation of a sum needs independence too
> - [ ] Only E[X+Y] = E[X]+E[Y]; variance of a sum always needs a cross term
> - [ ] Neither — independence only guarantees Cov(X,Y) is small, not zero ^card-d0vg

Covariance's scale depends on the units of X and Y, which makes its
raw magnitude hard to interpret — doubling X quadruples Var(X) and
doubles Cov(X,Y). Correlation fixes this by dividing covariance by
both standard deviations, producing a unitless quantity always between
-1 and 1:

```
Corr(X,Y) = Cov(X,Y) / (sqrt(Var(X)) * sqrt(Var(Y)))
```

> [!card] mcq
> Which property does correlation Corr(X,Y) have that covariance
> Cov(X,Y) does not?
> - [x] It is unitless and always falls between -1 and 1, no matter the units of X and Y
> - [ ] It can only be zero when X and Y are independent
> - [ ] It ignores the sign of the relationship between X and Y
> - [ ] It is undefined whenever Var(X) is different from Var(Y) ^card-rlgk

X and Y are called ==uncorrelated== when Cov(X,Y) = 0, equivalently ^card-w7b8
Corr(X,Y) = 0.

It is tempting to treat a covariance of zero and true independence as
the same idea, but independence is strictly stronger: independence
rules out *any* relationship between X and Y, while zero covariance
only rules out a specifically linear one. Two variables can be
strongly, deterministically related in a nonlinear way and still have
zero covariance.

> [!card] mcq
> X is uniform on {-1, 0, 1} and Y = X^2. X and Y are perfectly
> dependent (Y is a deterministic function of X), yet Cov(X,Y) turns
> out to be exactly 0. What does this example demonstrate?
> - [x] Uncorrelated does not imply independent — zero covariance only rules out a linear relationship
> - [ ] Independent does not imply uncorrelated
> - [ ] The formula for covariance is wrong for deterministic functions
> - [ ] X and Y must actually be independent, since Cov(X,Y) = 0 ^card-2v2g
