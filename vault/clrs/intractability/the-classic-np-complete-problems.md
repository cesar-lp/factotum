---
topic: algorithms
category: algo-intractability
tags: [np-completeness, sat, vertex-cover, clique, hamiltonian-cycle, graph-coloring]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 34 (NP-Completeness)"]
---

# The classic NP-complete problems

`np-completeness-and-cook-levin.md` establishes that Cook-Levin gives SAT its
NP-completeness from first principles, and every other problem here inherits
its hardness from a reduction chain that ultimately traces back to SAT. This
note is the catalogue those reductions produced — organized by what each
problem is *about*, so it reads as a small taxonomy rather than a list to
memorize.

**Satisfiability is the root.** SAT asks whether a Boolean formula in
conjunctive normal form has a variable assignment making it true. Cook-Levin
proves it NP-complete directly; 3-SAT, where every clause has exactly three
literals, is the restricted form nearly every other reduction starts from,
because its clause structure is easy to encode as a gadget.

```
3-SAT instance: (x1 OR x2 OR ~x3) AND (~x1 OR x3 OR x4) AND ...
Question: does some assignment of true/false to each variable
satisfy every clause simultaneously?
```

From there the catalogue splits into families by what kind of structure
they ask you to find.

**Covering** problems ask for a small set that touches everything. Vertex
cover wants a minimum set of vertices such that every edge has at least one
endpoint in the set. Set cover generalizes this to arbitrary sets over a
universe: pick the fewest subsets whose union is the whole universe. Vertex
cover is the special case where the subsets are "the two endpoints of each
edge."

**Packing and independence** ask for a large set that avoids conflict. An
==independent set== is a set of vertices with no edge between any two of ^card-8wnl
them — the opposite goal from covering. A clique is a set of vertices that
are all pairwise connected — the densest possible subgraph.

These two families are not just similar in flavor — they are the same
problem viewed through a complement.

A set of vertices is independent in a graph exactly when its complement (the ^card-br7f
vertices left out) is a vertex cover of that graph :: Because every edge must
have an endpoint outside an independent set (or the set wouldn't be
independent), every edge has an endpoint in the complement — which is
precisely what makes the complement a vertex cover.

> [!card] mcq
> A graph has a clique of size k. What does that clique correspond to in the
> *complement* graph (same vertices, edges flipped)?
> - [x] An independent set of size k
> - [ ] A vertex cover of size k
> - [ ] A clique of size k as well
> - [ ] Nothing guaranteed — the relationship only holds for bipartite graphs ^card-lyre

**Partitioning** problems split a collection into pieces meeting a
numeric or count constraint. Subset sum asks whether some subset of given
numbers sums to a target value. Partition is the special case where the
target is exactly half the total, splitting the set into two equal-sum
halves. Bin packing asks for the fewest fixed-capacity bins that hold every
item — partition is bin packing with exactly two bins.

**Sequencing** problems ask for an ordering. A Hamiltonian cycle visits
every vertex exactly once and returns to the start; the travelling salesman
problem asks for the minimum-weight Hamiltonian cycle in a weighted graph,
so TSP is Hamiltonian cycle with an added optimization objective layered on
top.

**Coloring** asks for an assignment: can the vertices of a graph be labeled
with k colors so that no edge joins two vertices of the same color? Graph
coloring generalizes register allocation and scheduling problems where
"colors" are registers or time slots and edges are conflicts.

What is the practical difference between what "covering" problems and ^card-8q2g
"packing" problems ask you to find, even though both operate on the same
kind of graph structure? :: A covering problem asks for the smallest set
that touches every edge (or every set in a collection); a packing problem
asks for the largest set with no internal conflict at all — one minimizes
overlap with the whole structure, the other maximizes size while avoiding
any overlap between chosen elements.

The most useful facts in this subject are the sharp boundaries sitting right
next to these hard problems, because they show intractability is not a
vague fog over "graph problems" — it is a precise line, and small changes
in the problem statement cross it.

```
2-SAT: every clause has exactly 2 literals   -> in P (solvable in linear time)
3-SAT: every clause has exactly 3 literals   -> NP-complete
```

Why does a 2-literal clause reduce to a polynomial-time problem while a ^card-2329
3-literal clause does not? :: Each 2-SAT clause (a OR b) is equivalent to two
implications, ~a -> b and ~b -> a, so the whole formula becomes a graph of
implications; the formula is satisfiable exactly when no variable and its
negation land in the same strongly connected component, which is checkable
in linear time. A 3-literal clause can't be rewritten as a single
implication, so this structure — and the polynomial algorithm it enables —
disappears entirely.

An Euler cycle — a closed walk using every *edge* exactly once — is checkable
and constructible in ==linear== time (a graph has one exactly when every ^card-98fu
vertex has even degree and the graph is connected).

A Hamiltonian cycle — a closed walk using every *vertex* exactly once — has
no known efficient characterization and is NP-complete. The two look
symmetric (edges vs. vertices) but sit on opposite sides of the P/NP-complete
line.

Shortest path in a graph with no negative cycles is solvable in polynomial
time by Dijkstra's or Bellman-Ford's algorithm, both covered in
`vault/clrs/graphs/`. Longest simple path in the same graph is NP-hard,
because a Hamiltonian path is a longest simple path in a graph where one
exists visiting every vertex — the "simple" restriction (no repeated
vertices) is exactly what breaks the dynamic-programming structure shortest
path relies on.

> [!card] mcq
> Which pairing correctly matches a tractable problem with its
> superficially similar but NP-complete relative?
> - [x] Euler cycle is in P; Hamiltonian cycle is NP-complete
> - [ ] Both Euler cycle and Hamiltonian cycle are in P
> - [ ] Both Euler cycle and Hamiltonian cycle are NP-complete
> - [ ] Hamiltonian cycle is in P; Euler cycle is NP-complete ^card-3odb

> [!card] recall
> Explain why the "simple path" restriction is exactly what makes longest
> path NP-hard while shortest path stays polynomial, even though both ask
> for an extremal path in the same graph.
> ---
> Shortest path's optimal-substructure property holds regardless of
> repeated vertices — relaxing an edge never needs to check the rest of the
> path — so Dijkstra/Bellman-Ford can build the answer incrementally.
> Longest simple path loses that property: whether extending a path through
> a vertex is legal depends on the entire set of vertices already used, so
> the subproblem isn't independent of the larger path, and no polynomial
> recurrence is known. Allowing repeated vertices (longest walk) would
> trivially be unbounded in a cycle, so "simple" is unavoidable, and it is
> exactly this global constraint that reductions from Hamiltonian path
> exploit. ^card-lteq

`proving-a-problem-np-complete.md` covers how several of these problems —
vertex cover, subset sum, Hamiltonian cycle — serve as the "known hard"
starting point for reducing into a new problem, which is why recognizing
which family a new problem resembles is the first step in a hardness proof.
