---
topic: math
category: math-probability
tags: [sample-space, probability-axioms, inclusion-exclusion, combinatorics, binomial-coefficient]
citations: ["Blitzstein & Hwang, Introduction to Probability 2e, Ch. 1"]
---

# Probability Axioms and Counting

Probability starts by naming the possibilities before saying anything
about how likely they are. The sample space S is the set of every
possible outcome of an experiment, and an event is not some separate
kind of object — it is just a subset of S, the set of outcomes for
which the event is said to occur. Treating events as sets is what lets
ordinary set operations carry probabilistic meaning: A ∩ B is "A and B
both happen," A ∪ B is "A or B (or both) happens," and the complement
of A is "A does not happen."

A function P from events to numbers is a legitimate probability only
if it obeys three axioms: P(S) = 1 (something in the sample space
happens), P(A) ≥ 0 for every event, and for any countable collection
of ==pairwise disjoint== events, the probability of their union is the ^card-olw7
sum of their individual probabilities. Two events are called mutually
exclusive precisely when they cannot both occur — their intersection
is empty — which is the set-theoretic reading of "disjoint."

Everything else about probability follows from these three axioms as
theorems, not extra assumptions. For instance, P(A) + P(complement of
A) = 1 falls straight out of the axioms, since A and its complement
are disjoint and union to S.

> [!card] mcq
> Which pair of events are mutually exclusive, given a single roll of
> a six-sided die?
> - [x] "the roll is 2" and "the roll is 5"
> - [ ] "the roll is even" and "the roll is at least 4"
> - [ ] "the roll is prime" and "the roll is odd"
> - [ ] "the roll is at most 3" and "the roll is odd" ^card-5z8x

When two events can overlap, adding their probabilities double-counts
the overlap, so P(A ∪ B) = P(A) + P(B) - P(A ∩ B). Extending this
pattern to three or more events — add the singles, subtract the
pairwise overlaps, add back the triple overlap, and so on with
alternating sign — is the ==inclusion-exclusion== formula. ^card-eftf

```
P(A1 ∪ A2 ∪ ... ∪ An)
  = sum_i P(Ai)
  - sum_{i<j} P(Ai ∩ Aj)
  + sum_{i<j<k} P(Ai ∩ Aj ∩ Ak)
  - ... ± P(A1 ∩ A2 ∩ ... ∩ An)
```

Why is subtracting pairwise intersections not already the final answer once you go past two events? :: Subtracting every pairwise overlap removes the triple overlaps three times (once per pair that contains them) after having added them in three times (once per single event), so a region covered by three events ends up net-zero and has to be added back in; the alternating sum continues so that every region of the union is counted exactly once regardless of how many of the events contain it. ^card-ddc2

Many problems are easiest when every outcome in S is equally likely —
rolling a fair die, dealing from a shuffled deck. In that case P(A)
reduces to pure counting: the number of outcomes in A divided by the
number of outcomes in S. This is why probability leans so heavily on
combinatorics — computing P(A) becomes "count |A|, count |S|, divide,"
and the actual work is the counting.

The two counting tools that come up constantly: a ==permutation== ^card-hb24
counts arrangements where order matters, and a combination counts
selections where it doesn't. The number of ways to arrange all n
distinct objects in a row is n!, and the number of ways to arrange k
of them in order is n!/(n-k)!. Dropping the order — asking only which
k objects are chosen, not in what sequence — divides that by k!,
giving the binomial coefficient:

```
C(n,k) = n! / (k! (n-k)!)
```

Why does dividing the ordered-selection count by k! convert it into an unordered count? :: Every unordered selection of k objects corresponds to exactly k! different ordered selections (the k! ways to arrange those same k objects), so the ordered count treats each unordered outcome as k! duplicates; dividing by k! collapses each group of duplicates back down to the single unordered outcome it represents. ^card-yywu

> [!card] mcq
> A committee of 3 is chosen from 10 people, with no distinction
> between roles (no chair, secretary, etc.). Which expression counts
> the number of possible committees?
> - [x] C(10,3)
> - [ ] 10!/(10-3)! — the ordered-selection count
> - [ ] 10^3 — choices made independently with repetition allowed
> - [ ] 3! × C(10,3) — committees times an ordering of the members ^card-s88j

> [!card] recall
> A byte is a string of 8 bits, each 0 or 1. Using the sample-space and
> equally-likely-outcomes framework of this note, explain how to
> compute the probability that a uniformly random byte has exactly 3
> ones, without listing outcomes by hand.
> ---
> S is the set of all 2^8 bit strings of length 8, all equally likely,
> so |S| = 2^8. The event "exactly 3 ones" is the set of strings with
> exactly three 1-positions among the eight slots; choosing which 3 of
> the 8 positions hold a 1 is a combination, so |A| = C(8,3). The
> probability is C(8,3) / 2^8 — count the favorable outcomes, count the
> total, divide. ^card-kdme
