---
topic: algorithms
category: algo-intractability
tags: [branch-and-bound, integer-programming, sat-solvers, held-karp, fixed-parameter-tractability]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 34 (NP-Completeness)"]
---

# Exact Methods for Intractable Problems

Everything upstream in this category proves that NP-hard problems have no
known polynomial-time algorithm. That is a statement about the ==worst-case== over all instances of a problem, not about any instance you actually ^card-lybe
face — a scheduling problem with 500 jobs is NP-hard in general, but the
500 jobs on your desk this week may be far more cooperative than the
worst case the hardness proof was built from.

The engineering question this note takes up is not "is this problem hard"
but whether this particular instance carries exploitable regularity — a
small critical path, few conflicting constraints, a bounded number of
distinct values — and what to do when the answer is yes.

**Branch and bound** is the main tool. It searches the space of solutions
as a tree: each node represents a partial solution, and branching extends
it by fixing one more decision. At every node, the algorithm computes a
**bound** — a value that no completion of this partial solution can beat,
even in the best case — and compares it against the best complete solution
found so far. If the bound already loses, the entire subtree rooted there
is discarded without ever being explored.

```
BRANCH-AND-BOUND(node):
  if node is a complete solution:
    update best-known solution if node is better
    return
  bound = compute_bound(node)          // best conceivable outcome below node
  if bound cannot beat best-known solution:
    return                              // prune: skip this whole subtree
  for each way to extend node:
    BRANCH-AND-BOUND(extended node)
```

> [!card] mcq
> A branch-and-bound implementation explores every node of the search
> tree and never terminates early. What does that behavior most directly
> indicate?
> - [x] The bound is too weak to rule out any subtree, so the method has degenerated into exhaustive search
> - [ ] The branching order was chosen poorly
> - [ ] The problem is not actually NP-hard
> - [ ] The implementation has a bug in how it updates the best-known solution ^card-55wz

That failure mode is why bound quality, not the branching scheme, decides
whether branch and bound is worth running at all: a tight bound prunes
early and often, while a loose one prunes nothing and leaves you paying
tree-search overhead on top of full enumeration. Tightening the bound —
often by solving a relaxed version of the subproblem, such as dropping an
integrality constraint — is usually the highest-leverage change you can
make to a branch-and-bound solver.

Why does a branch-and-bound search never need to visit every leaf of the solution tree, unlike brute-force enumeration over the same space? :: Because at each internal node it computes a bound on the best outcome any completion of that partial solution could achieve, and if that bound cannot beat the best complete solution already found, the entire subtree is discarded unexplored. Brute force visits every leaf because it has no way to rule a subtree out before finishing it. ^card-391s

In practice, writing a bespoke branch-and-bound search is rarely the first
move. **Integer programming (IP)** solvers and **SAT solvers** are mature,
heavily engineered pieces of software — built on decades of branch-and-
bound and branch-and-cut refinements — that routinely handle instances
with ==millions== of variables. Formulating your NP-hard problem as a set ^card-jplp
of linear constraints over integer variables, or as a Boolean
satisfiability instance, and handing it to one of these solvers is
usually more effective than writing your own search from scratch.

Which is the more common effective response to an NP-hard problem showing up in a real system: writing a custom branch-and-bound search, or reaching for an existing solver? :: Reaching for an existing solver. Encoding the problem as an integer program or a SAT instance and handing it to a mature IP or SAT solver is usually the practical move, since those solvers embody years of engineering refinement on branch-and-bound and related techniques and scale to sizes far beyond what a hand-rolled search would manage. ^card-3lts

Some NP-hard problems also admit exponential algorithms that beat naive
brute force by an enormous margin, even without any instance-specific
structure. Traveling salesman is the standard example: enumerating all
tours directly costs `O(n!)`, but the **Held-Karp** dynamic-programming
algorithm — tracking, for each subset of visited cities and each possible
last city, the shortest path covering exactly that subset — solves it in:

```
Brute-force enumeration of tours:  O(n!)
Held-Karp dynamic programming:     O(2^n * n^2)
```

`O(2^n * n^2)` is still exponential and still useless past roughly 20-25
cities, but it is astronomically smaller than `n!` for any n worth
computing — a difference that decides whether an exact TSP solver reaches
n=25 or stalls at n=12.

The dynamic-programming technique Held-Karp is built from — subproblems, a recurrence, and memoized reuse of overlapping subproblem results — is covered as a general design technique in `vault/clrs/design/`, not repeated here.

A third route narrows exactly where the hardness lives. **Parameterized
complexity** asks whether an NP-hard problem becomes tractable once you
isolate one parameter `k` of the instance and confine the exponential cost
to it alone. A problem is **fixed-parameter tractable (FPT)** if it admits
an algorithm running in time:

```
O(f(k) * n^c)
```

for some function `f` depending only on `k` and some constant `c`
independent of `k`. Vertex cover is the standard example: deciding whether
a graph has a vertex cover of size at most `k` is NP-hard in general, but
solvable in time exponential in `k` alone (and polynomial in the graph
size `n`) — so instances with a small target cover size stay fast
regardless of how large the graph gets.

> [!card] recall
> A problem is fixed-parameter tractable with running time O(2^k * n).
> Explain what happens to that algorithm's practicality as the graph size
> n grows into the millions, versus as the parameter k grows from 5 to 50,
> and why those two directions behave so differently.
> ---
> Growing n only multiplies the running time linearly, so an FPT
> algorithm scales to huge graphs as long as k stays small — the
> exponential cost never touches n at all. Growing k, by contrast, is
> exactly where the hardness was confined: 2^50 is already far beyond
> feasible, so the algorithm degrades exactly the way a plain exponential
> algorithm would, just measured against k instead of n. FPT tractability
> is a promise about small k, not a promise about the problem in general. ^card-8d85

What does it mean for an NP-hard problem to be "fixed-parameter tractable" with respect to some parameter k of the instance? :: It means there is an algorithm solving the problem in time O(f(k) * n^c), where f is any function of k alone and c is a constant independent of k — so all the exponential cost is confined to the parameter k, and the algorithm scales polynomially in the input size n for any fixed k. Vertex cover is the standard example: hard in general, but tractable when the target cover size k is small. ^card-v782
