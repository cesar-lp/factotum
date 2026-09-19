---
topic: algorithms
category: algo-foundations
tags: [probabilistic-analysis, indicator-random-variables, hiring-problem, expectation]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 5 (Probabilistic Analysis and Randomized Algorithms)"]
---

# Probabilistic Analysis and Indicator Random Variables

The RAM-model note distinguished worst-, average-, and best-case
running time, and flagged that average-case analysis needs an explicit
assumption about how inputs are distributed. Probabilistic analysis is
that idea made rigorous: given such an assumption, use probability
theory to compute a running time — usually an expectation — rather than
just asserting one. The hiring problem is CLRS's running example, and
the tool that makes it tractable is the indicator random variable.

For an event A over some sample space, the ==indicator random ^card-5zps
variable== I{A} is defined to equal 1 if A occurs and 0 if it does not.
Its expectation is exactly the probability of the event it indicates:
E[I{A}] = Pr{A}. That equality is the whole trick — it converts
"probability that something happens" into a quantity you can sum.

Summing indicators works because of ==linearity of expectation==: ^card-mozo
E[X1 + ... + Xn] = E[X1] + ... + E[Xn], regardless of whether the Xi
are independent. That independence-free part matters: variance does
not decompose this cleanly across dependent variables, but expectation
always does — the reason indicator variables plus linearity work even
when the events being counted are correlated.

The hiring problem: you interview n candidates in sequence, at a small
cost c_i per interview, and each time you meet someone better than the
best you've hired so far, you fire the current hire and hire the new
one, at a larger cost c_h. In the worst case every candidate is
successively better than the last, and you hire all n — a cost driven
by n hires. Assuming instead that candidates arrive in a random order
(each of the n! orderings equally likely), how many hires should you
*expect*?

```
HIRE-ASSISTANT(n)
best = candidate 0 (a dummy, always "worse" than any real one)
for i = 1 to n
    interview candidate i
    if candidate i is better than best
        best = candidate i
        hire candidate i
```

Define X_i = I{candidate i is hired}. Candidate i is hired exactly when
candidate i is the best of the first i candidates seen — and under the
random-order assumption, each of the first i candidates is equally
likely to be the best among them, so ==Pr{X_i = 1} = 1/i==.

Why is E[I{A}] = Pr{A} useful for counting how many times some event happens across n trials, even when the trials are not independent? :: It lets you rewrite "expected count of an event" as a sum of expectations of 0/1 indicator variables, one per trial, and linearity of expectation turns that sum of expectations into a sum of probabilities — Pr{A_1} + Pr{A_2} + ... — which is often far easier to compute than reasoning about the joint distribution of how many events occur together. ^card-cg4f

What is E[number of candidates hired] over a random ordering of n candidates, and how is it derived from the X_i? :: By linearity of expectation, E[sum of X_i] = sum of E[X_i] = sum_{i=1}^{n} 1/i, which is the nth harmonic number H_n, and H_n = Theta(lg n). So the expected number of hires is Theta(lg n), even though the worst case is n. ^card-h0b8

> [!card] mcq
> The hiring problem's Theta(lg n) expected-hires result is an expectation over what, precisely?
> - [x] The random ordering in which candidates are assumed to arrive — a distribution the analysis assumes about the input
> - [ ] Random coin flips made by the hiring algorithm itself while it runs
> - [ ] The average over all possible values of c_h and c_i
> - [ ] Repeated runs of the algorithm on the same fixed input order ^card-05rq

This is the seam the next note picks up: Theta(lg n) here is an
expectation taken *assuming* the input arrives in random order — it
says nothing about candidates presented in increasing quality (the
actual worst case), unless something *makes* the order random rather
than merely assuming it already is.

> [!card] recall
> The dummy candidate 0 in HIRE-ASSISTANT is defined to be worse than
> every real candidate. Explain why this makes candidate 1 always get
> hired, and why that is consistent with Pr{X_1 = 1} = 1/1. ^card-piqj
