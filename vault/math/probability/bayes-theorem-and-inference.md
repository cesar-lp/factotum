---
topic: math
category: math-probability
tags: [bayes-theorem, posterior, base-rate-fallacy, false-positive-paradox]
citations: ["Blitzstein & Hwang, Introduction to Probability 2e, Ch. 2"]
---

# Bayes' Theorem and Inference

The previous note flagged that P(A|B) and P(B|A) are generally
different quantities. Bayes' theorem is the exact formula for
converting one into the other, and it does so using nothing beyond
the definition of conditional probability applied twice: P(A ∩ B) =
P(A|B)P(B) and also P(A ∩ B) = P(B|A)P(A), so those two right-hand
sides must be equal to each other.

```
P(A|B) = P(B|A) P(A) / P(B)
```

In inference problems, A is usually a hypothesis and B is observed
evidence, and the three pieces of the formula get names: P(A) is the
==prior== — what you believed about the hypothesis before seeing the ^card-dmx5
evidence — P(B|A) is the likelihood — how probable the evidence is
under that hypothesis — and P(A|B) is the posterior, your belief
after updating on the evidence. P(B), the overall probability of the
evidence regardless of hypothesis, acts as a normalizing constant and
is often expanded with the law of total probability, conditioning on
whether A holds or not:

```
P(B) = P(B|A) P(A) + P(B|not A) P(not A)
```

Why does the denominator P(B) in Bayes' theorem need to be expanded using the law of total probability rather than measured directly, in a typical inference problem? :: Because the evidence's overall probability P(B) depends on how likely it is under every hypothesis, weighted by how likely each hypothesis is, and that is exactly what the law of total probability computes; conditioning on whether the hypothesis A holds or not (or on a full partition of hypotheses) turns an otherwise unknown quantity into one built from pieces the problem already supplies — the likelihood and the prior. ^card-3ep6

> [!card] recall
> Write Bayes' theorem, and name which of its four quantities is the
> prior, which is the likelihood, and which is the posterior.
> ---
> P(A|B) = P(B|A) P(A) / P(B). P(A) is the prior (belief in the
> hypothesis before seeing evidence), P(B|A) is the likelihood (how
> probable the evidence is if the hypothesis is true), P(A|B) is the
> posterior (updated belief after seeing the evidence), and P(B) is
> the normalizing constant — the overall probability of the evidence
> across every hypothesis. ^card-87fy

Bayes' theorem also has an odds form, which is often cleaner to work
with because the awkward normalizing constant P(B) cancels out. The
odds of A versus its complement are P(A)/P(not A), and Bayes' rule
says the posterior odds equal the prior odds times the likelihood
ratio:

```
P(A|B) / P(not A|B)  =  [P(A) / P(not A)]  x  [P(B|A) / P(B|not A)]
```

Since P(B) appears in both P(A|B) and P(not A|B), it divides out of
the ratio entirely — the odds form only ever needs the two
likelihoods, never the marginal probability of the evidence, which is
why it's often the more practical form to compute by hand.

The most common real-world Bayes mistake is the ==base rate== fallacy: ^card-fjp0
judging P(hypothesis|evidence) by the likelihood P(evidence|hypothesis)
alone, while ignoring how rare the hypothesis was to begin with. A
highly specific piece of evidence can still leave the posterior low if
the prior was low enough — the likelihood being large does not
override a prior being small, since the posterior is a *product* of
both.

The classic illustration is the false-positive paradox in medical
testing. Suppose a disease has prevalence 1 in 1,000 (the prior), and
a test is 99% accurate in both directions: P(positive|disease) = 0.99
and P(positive|no disease) = 0.01 (a 1% false-positive rate). Given a
positive result, the posterior probability of actually having the
disease is:

```
P(disease|positive)
  = P(positive|disease) P(disease)
    / [ P(positive|disease) P(disease) + P(positive|no disease) P(no disease) ]
  = (0.99)(0.001) / [ (0.99)(0.001) + (0.01)(0.999) ]
  ≈ 0.09
```

Despite a "99% accurate" test, a positive result means roughly a 9%
chance of actually having the disease — because the pool of healthy
people is so much larger than the pool of sick people that even a
small false-positive rate among the healthy majority produces more
false positives in absolute terms than true positives from the tiny
sick minority.

Why can a "99% accurate" test still leave most positive results false, when the disease is rare? :: Because the healthy population vastly outnumbers the sick population, so a small false-positive rate applied to that much larger group produces more false positives in raw count than the true positives coming from the small sick group, even though each individual accuracy number looks high. ^card-m1hq

> [!card] mcq
> A test with the same 99%/99% accuracy is run for a disease with
> prevalence 1 in 10 instead of 1 in 1,000. What happens to the
> posterior P(disease|positive), and why?
> - [x] It rises substantially, because a much higher prior means the sick group is no longer swamped by false positives from the much larger healthy group
> - [ ] It stays at roughly 9%, since the test's accuracy numbers haven't changed
> - [ ] It falls, since a more common disease is intuitively harder to diagnose
> - [ ] It becomes exactly 99%, matching the test's stated accuracy ^card-skkj

> [!card] recall
> A friend says "the test is 99% accurate, so a positive result means
> I'm 99% likely to have the disease." Using the base-rate idea from
> this note, explain what's wrong with that reasoning without
> recomputing the exact number.
> ---
> They are treating the likelihood P(positive|disease) as if it were
> the posterior P(disease|positive), skipping the prior entirely. The
> disease's rarity (a low prior) matters just as much as the test's
> accuracy: Bayes' theorem multiplies the likelihood by the prior and
> renormalizes, so a low enough prior can pull the posterior far below
> the likelihood's own value, however accurate the test looks in
> isolation. ^card-75d7
