---
topic: algorithms
category: algo-intractability
tags: [approximation-algorithms, approximation-ratio, vertex-cover, set-cover, ptas, inapproximability]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 35 (Approximation Algorithms)"]
---

# Approximation Algorithms and Ratios

The exact-methods note in this category covers instances that happen to be
easy despite worst-case hardness. This note covers the opposite posture:
accept that you will not find the optimum, and instead demand a **proven,
worst-case guarantee** on how far from it you can be. That word —
guarantee — is what separates an approximation algorithm from the
heuristics covered next: an approximation algorithm with ratio `rho`
provably returns a solution within a factor of `rho` of optimal on
*every* instance, stated and proved in advance, without ever computing or
even knowing what the optimum actually is.

```
Minimization: ALG(x) / OPT(x) <= rho   for every instance x  (rho >= 1)
Maximization: OPT(x) / ALG(x) <= rho   for every instance x  (rho >= 1)
```

That last clause — without knowing the optimum — is the part worth
sitting with, because it raises an obvious question: how can you prove a
bound against a quantity you never compute? The answer is the one
technique that makes this whole subject possible: you don't bound the
algorithm's output against `OPT` directly, you bound it against a
computable ==lower== bound on `OPT` (for a minimization problem), and ^card-49od
show the algorithm's output is close to that instead.

Since a bound of that kind never exceeds the true optimum by
construction, closeness to it is automatically closeness to the optimum
itself — the proof goes through a stand-in, not the real quantity.

What is the core proof technique that lets an approximation algorithm carry a worst-case guarantee without the algorithm ever computing the true optimum? :: You construct a quantity that is provably a lower bound on the optimum (for a minimization problem) — something easy to compute, like the size of a matching or a fractional relaxation's value — and then show the algorithm's output is within the target ratio of that lower bound. Because the lower bound never exceeds the real optimum, closeness to the lower bound implies closeness to the optimum, even though the optimum itself was never computed. ^card-e75f

Vertex cover is the standard worked example. Take any **maximal**
matching in the graph — a set of edges with no two sharing an endpoint,
extended until no edge can be added — and put both endpoints of every
matched edge into the cover. This is a vertex cover (every edge must
touch a matched edge, or the matching wasn't maximal), and its size is at
most twice the size of any vertex cover, because no optimal cover can
contain fewer than one endpoint per matched edge, and the matched edges
are disjoint. That gives a ==2==-approximation, reached by an algorithm ^card-cw9m
simpler than most exact heuristics for the same problem.

Greedy set cover gets a weaker guarantee for a structural reason, not a
weaker algorithm: repeatedly picking the set that covers the most
still-uncovered elements achieves a ratio of ==ln n== (n being the number ^card-6qmg
of elements), and this is essentially tight — no efficient algorithm does
asymptotically better unless P = NP.

> [!card] mcq
> A greedy algorithm for a minimization problem is run on many benchmark
> instances and its output averages 5% above the known optimum across
> them. What, if anything, does this establish about the algorithm's
> approximation ratio?
> - [x] Nothing on its own — an approximation ratio is a worst-case guarantee proved for every instance, not a number read off observed average performance
> - [ ] It establishes a ratio of 1.05
> - [ ] It establishes an upper bound of 1.05 on the ratio
> - [ ] It proves the algorithm is a PTAS ^card-242a

Some problems support something stronger than a single fixed ratio. A
**PTAS** (polynomial-time approximation scheme) is a family of
algorithms, one for each desired accuracy `epsilon`, each achieving ratio
`(1 + epsilon)` in time polynomial in the input size for that fixed
`epsilon` — but the exponent or constant in the running time is allowed
to depend on `epsilon`, often badly (`O(n^(1/epsilon))` is typical). An
**FPTAS** (fully polynomial-time approximation scheme) removes that
escape hatch: its running time must be polynomial in both the input size
*and* `1/epsilon`. Knapsack has a known FPTAS; that stronger guarantee is
rare, and most PTAS results are not FPTAS results.

Why does a PTAS's existence not automatically mean you can demand arbitrarily high accuracy cheaply, the way an FPTAS's existence does? :: Because a PTAS is only required to run in polynomial time for each fixed epsilon — the dependence of that running time on epsilon itself is unconstrained and often exponential (e.g. n^(1/epsilon)), so tightening the accuracy can make the algorithm explode in cost. An FPTAS additionally bounds the running time polynomially in 1/epsilon, so accuracy can be dialed up at a cost that grows only polynomially, which is the guarantee that makes FPTAS strictly stronger. ^card-4ial

None of this is available uniformly, and which guarantees exist depends
sharply on the exact problem statement rather than the general subject
area. The travelling salesman problem in general — arbitrary edge weights,
no triangle inequality — cannot be approximated within *any* constant
factor in polynomial time unless P = NP, because an approximation
algorithm for it could be turned into an exact algorithm for the
NP-complete Hamiltonian cycle problem. Restrict to **metric TSP**, where
edge weights obey the triangle inequality, and the picture changes
completely: Christofides' algorithm guarantees a ==3/2== approximation. ^card-ihq4
The variant, not the subject, decides what is achievable.

> [!card] recall
> Explain why general TSP admitting no constant-factor approximation and
> metric TSP admitting a 3/2-approximation are not in tension with each
> other, even though both are called "the travelling salesman problem."
> ---
> They are different problems with different hardness. General TSP allows
> arbitrary weights, and a constant-factor approximation for it would let
> you decide Hamiltonian cycle exactly (by checking whether the
> approximate tour's length matches a threshold derived from n edges of
> weight 1), which is impossible in polynomial time unless P = NP. Metric
> TSP restricts weights to satisfy the triangle inequality, which is
> exactly the structural assumption Christofides' algorithm exploits to
> build its 3/2 guarantee — removing that assumption removes the
> guarantee entirely, it doesn't just weaken it. ^card-02sd
