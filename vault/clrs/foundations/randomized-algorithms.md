---
topic: algorithms
category: algo-foundations
tags: [randomized-algorithms, las-vegas, monte-carlo, expected-running-time]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 5 (Probabilistic Analysis and Randomized Algorithms)"]
---

# Randomized Algorithms

The hiring-problem note ended on a seam: its Theta(lg n) result was an
expectation over an *assumed* random ordering of candidates, which says
nothing about what happens if the real input isn't random. This note
is about closing that seam — making the algorithm itself the source of
randomness — and about the vocabulary for what "random" then buys you.

HIRE-ASSISTANT as written is deterministic; its Theta(lg n)-hires
result held only under the assumption that the input arrives in random
order, an assumption about the *world*, not something the algorithm
enforces. Prepending a step that randomly permutes the candidate list
in place, using calls to an actual random-number generator, before
running the same deterministic hiring logic, changes what kind of claim
the Theta(lg n) bound is: it now holds for ==every input order==, ^card-kcut
adversary-chosen or not, because the randomness the analysis relies on
is supplied by the algorithm's own coin flips rather than assumed about
the input it happens to receive.

This is the core distinction to keep straight. ==Average-case== running ^card-g4wo
time is a property of a fixed (deterministic) algorithm, computed by
assuming some probability distribution over the inputs it might be
given — it can be wrong for a real workload whose inputs don't match
that assumption. ==Expected== running time, for a randomized algorithm, ^card-pa1t
is computed by taking expectation over the algorithm's own internal
random choices, for a *specific*, even worst-case, fixed input — there
is no assumption to be wrong about, because nothing is assumed about
which input arrives.

Why can a randomized algorithm's expected-running-time bound be quoted "for every input," while an average-case bound cannot? :: Because the expectation in the randomized case is taken over the algorithm's own random number generator's choices, holding the input fixed — that holds no matter which input is fixed, including an adversarially chosen one. The average-case expectation is taken over a distribution of inputs for a fixed, non-random algorithm; if the real inputs don't follow that distribution, the bound simply doesn't describe them. ^card-desb

Randomized algorithms split into two families depending on what the
randomness is allowed to affect.

> [!card] mcq
> A Las Vegas algorithm's randomness affects which of the following?
> - [x] Its running time only — it always returns a correct answer
> - [ ] Its correctness only — its running time is fixed
> - [ ] Neither — "Las Vegas" just means it uses a random-number generator for logging
> - [ ] Both correctness and running time, with no guarantee on either ^card-40vg

Randomized quicksort is the standard Las Vegas example: it always
produces a correctly sorted array, but its running time is a random
variable, with Theta(n lg n) expected and Theta(n^2) worst case (an
unlucky sequence of pivot choices, however unlikely).

A ==Monte Carlo== algorithm makes the opposite trade: its running time ^card-x29f
is fixed (or at least not the thing being randomized away), but it can
return an incorrect answer, with some bounded probability of error —
often driven down by repeating the algorithm and combining results,
trading more running time for a smaller error probability.

Which property does a Monte Carlo algorithm keep fixed, and which does it put at risk? :: Its running time is fixed (deterministic, or at least not the source of randomness); what's at risk is correctness — the answer it returns can be wrong, with some bounded probability. ^card-udxm

> [!card] recall
> Randomized quicksort's worst-case running time is still Theta(n^2),
> unimproved by randomization. Explain what randomization actually
> changes about that worst case, given that the bound itself is
> unchanged. ^card-5xe9
