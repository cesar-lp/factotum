---
topic: algorithms
category: algo-intractability
tags: [reductions, polynomial-time, np-hardness, complexity-theory]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 34 (NP-Completeness)"]
---

# Polynomial-Time Reductions

The previous two notes established what P and NP mean and why the
question between them stays open. Neither note explained how anyone
actually shows a *new* problem belongs to the hard end of NP — that tool
is the polynomial-time reduction, and this note is entirely about it,
because every later note in this category (NP-completeness, Cook-Levin,
the classic catalogue) is built on nothing but repeated use of it.

A polynomial-time reduction from problem A to problem B is a function
that transforms any instance of A into an instance of B, computable in
polynomial time, such that the transformed instance is a yes-instance of
B exactly when the original was a yes-instance of A. It is written
`A <=p B`, read "A reduces to B" or, more usefully, "B is at least as
hard as A."

```
A <=p B  means:
  there exists a polynomial-time function f such that, for every
  instance x of A:
    x is a yes-instance of A
      if and only if
    f(x) is a yes-instance of B
```

The direction of that notation is the single most common source of
confusion in this subject, so it is worth stating the implication twice,
in both the direction that helps and the direction that's a trap.

```
A <=p B implies:
  1. (hardness flows from A to B)
     if A is hard to solve, B is at least as hard — a fast algorithm
     for B, run after the reduction, would solve A fast too.
  2. (tractability flows from B to A)
     if B has a polynomial algorithm, A does too — reduce, then solve B.
```

The reduction runs *from* the problem you already believe is hard *to*
the problem whose difficulty you're trying to establish — solving B
would let you solve A by first transforming, then invoking B's solver.
Reversing this — reducing the new problem to a known-hard one and
concluding the new problem is hard — proves nothing at all about the new
problem's difficulty; it only shows the *known-hard* problem is easy if
the new one is.

Because f itself runs in polynomial time, it cannot output an
arbitrarily huge instance either: the instance of B it produces is
bounded ==polynomially== in the size of the original instance of A. A ^card-y211
transformation that quietly blew the instance up by an exponential
factor would make B's polynomial-time algorithm (if B even had one) take
exponential time measured against A's original size, silently smuggling
the hardness back in.

In the notation A <=p B, which problem does the relation claim is "at least as hard"? :: B is claimed to be at least as hard as A — the arrow of difficulty points from the reduced-to problem (B) back to the reduced-from problem (A), since a solver for B can be turned into a solver for A via the reduction, but not automatically the other way around. ^card-dnl9

> [!card] mcq
> If A <=p B and A is known to be NP-hard, what can you conclude about B?
> - [x] B is at least as hard as A, so B is NP-hard too — a fast algorithm for B would give a fast algorithm for A
> - [ ] B is at most as hard as A, so B might be solvable in polynomial time
> - [ ] Nothing, since the reduction direction doesn't establish a hardness relationship
> - [ ] A must also reduce to B in the reverse direction for any conclusion to follow ^card-mv45

Why is "I reduced my new problem X to a known NP-hard problem Y, therefore X is NP-hard" backwards reasoning? :: Reducing X to Y (X <=p Y) shows that Y is at least as hard as X — that a solver for Y could solve X — which says nothing about X being hard; it could mean X is easy and just happens to embed into Y. To show X is NP-hard, the reduction must run the other way: from a known NP-hard problem into X, showing X is at least as hard as something already known to be hard. ^card-wbyj

Reductions compose: if `A <=p B` and `B <=p C`, then `A <=p C`, because
chaining two polynomial-time transformations is still a polynomial-time
transformation, and preserving yes/no answers through each step
preserves it through both. ==Transitivity== is what turns one proven-hard ^card-70qa
seed problem into an entire catalogue: once a single problem is nailed
down as NP-complete (the next note's subject), every subsequent problem
needs only one reduction from *any* problem already in the catalogue,
not a fresh argument from scratch.

Two conditions are non-negotiable for a reduction to do any work at all.
First, it must exactly preserve the answer — every yes-instance of A
must map to a yes-instance of B, and every no-instance of A to a
no-instance of B; a transformation that only handles the yes direction
correctly proves nothing, since a wrong answer on a no-instance breaks
the "if and only if." Second, the transformation itself must run in
polynomial time — an exponential-time transformation could turn any
problem into any other by just brute-force solving A first and hard-
coding the answer into a trivial instance of B, which would make every
problem "reduce to" every other and the whole framework would be vacuous.

What two properties must a transformation have to count as a valid polynomial-time reduction, and what goes wrong if either is dropped? :: It must run in polynomial time, and it must preserve answers exactly (yes-instances map to yes-instances, no-instances to no-instances) in both directions. Drop the time bound and any problem could "reduce" to any other by solving the first problem outright inside the transformation, making the notion vacuous. Drop exact answer preservation and the reduction no longer proves the two instances are equivalent, so no hardness or tractability conclusion follows. ^card-lk2r

A small concrete example makes the machinery tangible. Reducing
Hamiltonian-cycle to travelling-salesman-decision:

```
Instance of Hamiltonian-cycle: a graph G = (V, E).

Transform into an instance of TSP-decision:
  build a complete graph G' on the same vertices,
  weight(u, v) = 1 if (u, v) is an edge in G, else 2,
  set the budget k = |V|.

G has a Hamiltonian cycle
  if and only if
G' has a tour of total weight <= k
  (a tour of weight |V| uses only weight-1 edges, i.e. only edges of G).
```

The transformation is clearly computable in polynomial time (it just
inspects every pair of vertices once), and it preserves yes/no answers
exactly in both directions — which is all a reduction is ever required
to do.

> [!card] recall
> In the Hamiltonian-cycle to TSP-decision reduction above, explain why
> setting non-edges to weight 2 rather than, say, weight 1000, is
> already enough to make the reduction correct — what property of the
> budget k = |V| is doing the real work?
> ---
> The budget k = |V| equals the number of edges in any Hamiltonian
> cycle (a cycle through all |V| vertices uses exactly |V| edges). A
> tour using only weight-1 edges therefore costs exactly |V|, hitting
> the budget, while using even one non-edge (weight 2 instead of 1)
> pushes the total above |V|. Any weight for non-edges strictly greater
> than 1 would work the same way — the exact value 2 isn't special,
> only that it's more than 1 so a single substitution is detectable
> against the tight budget. ^card-on46
