---
topic: math
category: math-probability
tags: [conditional-probability, independence, total-probability, multiplication-rule]
citations: ["Blitzstein & Hwang, Introduction to Probability 2e, Ch. 2"]
---

# Conditional Probability and Independence

Learning that an event B occurred can change how likely another event
A is — that updated likelihood is conditional probability, written
P(A|B) and defined as P(A ∩ B) / P(B), for any B with P(B) > 0.
Read it as "restrict the sample space down to B, then ask what
fraction of that restricted space is also in A." Everything about
conditional probability is ordinary probability applied to a smaller
universe.

That restriction is exactly why P(A|B) and P(B|A) are, in general,
different numbers — they restrict to different universes. "The
probability it's raining given the ground is wet" and "the probability
the ground is wet given it's raining" answer different questions:
almost all rain wets the ground, but plenty of wet ground has nothing
to do with rain (sprinklers, hoses), so P(wet|rain) can be high while
P(rain|wet) stays low.

> [!card] mcq
> A rare disease test is 99% accurate. A patient tests positive. Which
> quantity does "99% accurate" most directly describe, and which
> quantity does the patient actually want to know?
> - [x] It describes something like P(positive|disease) or P(negative|no disease); the patient wants P(disease|positive)
> - [ ] It describes P(disease|positive) directly, which is also what the patient wants
> - [ ] It describes P(disease), the overall prevalence, which is what the patient wants
> - [ ] The two quantities are interchangeable here since the test is highly accurate ^card-i5rs

Multiplying both sides of the definition by P(B) gives the
multiplication rule, P(A ∩ B) = P(A|B) P(B) — useful whenever a joint
probability is easier to build up from a sequence of conditional steps
than to compute directly, such as drawing cards one at a time without
replacement.

```
P(A1 ∩ A2 ∩ ... ∩ An)
  = P(A1) P(A2|A1) P(A3|A1 ∩ A2) ... P(An|A1 ∩ ... ∩ A(n-1))
```

If B1, ..., Bn partition the sample space — disjoint and covering
everything — then P(A) can be reconstructed from how A intersects each
piece of the partition:

```
P(A) = sum_{i=1}^n P(A|Bi) P(Bi)
```

This is the ==law of total probability==, and it is the standard move ^card-wnhl
whenever an event's overall probability is hard to see directly but
becomes easy once you condition on which "case" occurred.

What does the law of total probability let you compute, and what must be true of the Bi for it to apply? :: It lets you compute the overall probability P(A) by weighting each conditional probability P(A|Bi) by how likely that case is, P(Bi), and summing over all cases; the Bi must partition the sample space — pairwise disjoint and collectively exhaustive — so every outcome falls into exactly one Bi. ^card-t5t7

Independence is a separate idea from conditioning, and it is easy to
blur the two. Events A and B are ==independent== when P(A ∩ B) = ^card-h5il
P(A)P(B) — equivalently, when P(A|B) = P(A): learning B occurred
doesn't move A's probability at all. Mutual exclusivity is nearly the
opposite: if A and B are mutually exclusive with both having positive
probability, then learning B occurred tells you A definitely did not —
maximally informative, not uninformative. Confusing "the events can't
both happen" with "the events don't affect each other" is one of the
most common early mistakes in probability.

> [!card] mcq
> Which best describes the relationship between "independent" and
> "mutually exclusive," for two events A and B that each have positive
> probability?
> - [x] They are close to opposites: independence means learning about one tells you nothing about the other, while mutual exclusivity means learning one occurred tells you the other definitely did not
> - [ ] They are the same property described in two different ways
> - [ ] Independent events are always mutually exclusive
> - [ ] Mutually exclusive events are always independent ^card-pexs

Independence generalizes to three or more events, but there is a trap:
pairwise independence (every pair independent) does not imply mutual
independence (the full product rule holding for all subsets at once).
A related trap is conditional independence — A and B being independent
*given* some event C, meaning P(A ∩ B|C) = P(A|C)P(B|C) — which
neither implies nor is implied by A and B being independent
unconditionally. Two events can be dependent overall but become
independent once you condition on the right C, or the reverse: two
events that look independent can turn dependent once a third variable
is conditioned on. The confusion between plain and conditional
independence is usually a confusion about which sample space is in
play — the full one, or the one already restricted by C.

> [!card] recall
> Explain, using the restricted-sample-space view of conditioning, why
> two events being independent in the full sample space gives no
> guarantee that they stay independent once you condition on some
> event C.
> ---
> Conditioning on C means the "universe" being reasoned about shrinks
> from the whole sample space down to just the outcomes in C, and the
> relative sizes (probabilities) of A and B's overlap can look
> completely different inside that smaller universe than they did in
> the full one. Independence in the full space is a statement about
> proportions in S; restricting to C can distort those proportions
> arbitrarily, so nothing about the unconditional relationship
> constrains the conditional one. ^card-4osk
