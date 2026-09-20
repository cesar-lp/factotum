---
topic: math
category: math-probability
tags: [joint-distribution, independence, conditional-expectation, adams-law]
citations: ["Blitzstein & Hwang, Introduction to Probability 2e, Ch. 3, 7, 9"]
---

# Joint Distributions and Conditional Expectation

A single random variable's PMF or PDF describes its distribution in
isolation. Once a second random variable is in play, the interesting
questions are usually about how they behave *together* — a joint
distribution describes the probability of X and Y taking on particular
values simultaneously, not each on its own. For discrete X and Y, the
joint PMF is f_{X,Y}(x,y) = P(X = x, Y = y), and it must sum to 1 over
all pairs (x,y) in their joint support.

Given the joint distribution, each variable's own distribution can be
recovered by summing (or integrating) out the other variable — this is
called the marginal distribution, "marginal" because it is what
remains after accounting for every value the other variable could take:

```
f_X(x) = sum_y f_{X,Y}(x,y)
```

What is the marginal PMF f_X(x), computed from a joint PMF f_{X,Y}? :: Sum f_{X,Y}(x,y) over every value y in Y's support while holding x fixed — this "sums out" Y, leaving a function of x alone that is exactly X's own PMF. ^card-s15o

The reverse is not generally possible: knowing both marginals does not
determine the joint distribution, because the marginals say nothing
about how X and Y move together.

> [!card] mcq
> Given only the marginal distribution of X and the marginal
> distribution of Y, can you reconstruct the joint distribution
> f_{X,Y}(x,y)?
> - [x] Not in general — the marginals discard all information about how X and Y relate to each other
> - [ ] Yes, always, by multiplying f_X(x) by f_Y(y)
> - [ ] Yes, but only by adding f_X(x) and f_Y(y)
> - [ ] Yes, but only for continuous random variables ^card-iugc

Random variables X and Y are ==independent== if knowing the value of ^card-dztk
one tells you nothing about the distribution of the other — formally,
if their joint PMF (or PDF) factors as the product of the marginals for
every x and y:

```
f_{X,Y}(x,y) = f_X(x) * f_Y(y)   for all x, y
```

This factoring condition is exactly the tool for checking independence
from a table or formula: if the joint distribution can be written as
some function of x alone times some function of y alone, the variables
are independent; if it cannot be pulled apart that way, they are not.

> [!card] mcq
> A joint PMF is given by f_{X,Y}(x,y) = c * x * y^2 over some range of
> x and y. Based on the factoring condition, are X and Y independent?
> - [x] Yes — the formula factors into a function of x alone (x) times a function of y alone (y^2)
> - [ ] No — since both x and y appear in the same formula, they must be dependent
> - [ ] It cannot be determined without first computing the marginals
> - [ ] Only if the constant c happens to equal 1 ^card-odva

A conditional distribution restricts attention to outcomes where the
other variable took a specific value: f_{X|Y}(x|y) = P(X = x | Y = y),
computed as f_{X,Y}(x,y) / f_Y(y) whenever f_Y(y) > 0. It behaves like
an ordinary PMF in x, just over a narrowed-down world where Y = y is
already known to have happened.

> [!card] recall
> Two random variables X and Y are independent. What does that imply
> about the conditional distribution f_{X|Y}(x|y), and why does that
> match the informal idea of "independent"?
> ---
> f_{X|Y}(x|y) = f_X(x) for every y — conditioning on Y's value does
> not change X's distribution at all, because independence means
> f_{X,Y}(x,y) = f_X(x) f_Y(y), and dividing that by f_Y(y) leaves just
> f_X(x). This matches the informal idea directly: learning what Y did
> gives you no new information about X. ^card-b7b2

Conditional expectation E[X|Y=y] is just the ordinary expectation of X,
but computed using the conditional distribution f_{X|Y}(x|y) instead of
X's marginal PMF — it is a single number for each fixed value y. Letting
y vary turns E[X|Y=y] into a function of Y, written E[X|Y], which is
itself a random variable: its value depends on which value Y happens to
take.

The law of total expectation (Adam's law) says that averaging this
conditional expectation over Y's own distribution recovers the
unconditional E[X]:

```
E[X] = E[ E[X|Y] ]
```

> [!card] mcq
> E[X|Y] is best described as which of the following?
> - [x] A random variable — a function of Y, since its value depends on which outcome Y takes
> - [ ] A single fixed number, computed once from the joint distribution
> - [ ] Another name for E[X], unaffected by Y
> - [ ] The correlation between X and Y ^card-2td2

Suppose E[X|Y=1] = 3.5, E[X|Y=2] = 2, and P(Y=1) = P(Y=2) = 0.5. What does the law of total expectation give for E[X]? :: E[X] = E[E[X|Y]] = 3.5*0.5 + 2*0.5 = 2.75 — average the conditional expectations, each weighted by how likely its condition is. ^card-c2ir

Adam's law is useful precisely when E[X] is hard to compute directly
but becomes easy once you know Y's value — split the problem into
cases on Y, solve the easy version in each case, then average the
per-case answers weighted by how likely each case is. This "condition
on the thing that makes the problem easy, then average" pattern
recurs constantly and is often faster than computing E[X] from X's
marginal distribution directly.
