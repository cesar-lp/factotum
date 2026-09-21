---
topic: algorithms
category: algo-intractability
tags: [np-completeness, reductions, proof-technique, gadgets]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 34 (NP-Completeness)"]
---

# Proving a problem NP-complete

`polynomial-time-reductions.md` defines what a reduction is and what it
preserves; `np-completeness-and-cook-levin.md` shows why SAT can serve as a
universal starting point. This note is the recipe that combines both into a
proof you can actually write down for a new problem, and the places that
recipe most commonly breaks.

A membership proof has exactly two obligations, and they come in a fixed
order: establish that the problem sits inside NP at all, then establish that
it is at least as hard as every other problem in NP.

```
NP-completeness proof skeleton for problem X:
1. X is in NP:
   - propose a certificate (a candidate solution)
   - show it can be verified in polynomial time
2. X is NP-hard:
   - pick a known NP-complete problem Y
   - construct a polynomial-time transformation f mapping
     instances of Y to instances of X
   - prove: y is a yes-instance of Y  <=>  f(y) is a yes-instance of X
3. Conclude: X is NP-complete
```

The first obligation is usually the easy half. For vertex cover, the
certificate is just the proposed set of vertices; checking it touches every
edge takes time linear in the graph size, which is polynomial, so vertex
cover is ==in NP==. ^card-cu88

The second half is where the direction of the reduction has to be exactly
right, and getting it backwards is the single most common way a student
proof fails.

Why does proving only NP-hardness, without also proving NP membership, fail ^card-w872
to establish NP-completeness? :: NP-hardness alone says a problem is at
least as hard as everything in NP, but that leaves it open whether the
problem is even *harder* than NP — outside the class entirely, possibly not
even decidable. NP-completeness is the intersection of the two properties,
so skipping the membership half leaves the classification incomplete even
when the hardness proof is airtight.

> [!card] mcq
> You want to prove problem X is NP-hard. You already have 3-SAT, which is
> known to be NP-complete. Which direction must the polynomial-time
> transformation go?
> - [x] From 3-SAT instances to X instances (3-SAT <=p X)
> - [ ] From X instances to 3-SAT instances (X <=p 3-SAT)
> - [ ] Either direction works, since reduction is symmetric
> - [ ] From X instances to 3-SAT instances, then back again ^card-vc1h

Once the direction is fixed, the transformation itself must establish three
separate things, and it is easy to prove only two of them and believe you
are done.

The transformation must run in time polynomial in the input size, and the
equivalence between instances must hold in **both directions** — a
yes-instance of the known problem must map to a yes-instance of the new one,
and (this is the part that gets skipped) a yes-instance of the new problem
must arise *only* from a yes-instance of the known one.

The forgotten converse is the most common flaw in a student NP-hardness ^card-xwu5
proof. :: Showing "yes maps to yes" only proves the transformation never
turns a solvable instance into an unsolvable-looking one; it does not rule
out the transformation accidentally creating *new* yes-instances of X out of
no-instances of Y. Without the converse direction, a solver for X couldn't
be trusted to correctly decide Y, so the reduction fails to transfer
hardness at all — it only shows a coincidence, not an equivalence.

> [!card] recall
> A student reduces 3-SAT to a new problem X, proves the transformation runs
> in polynomial time, and proves every satisfiable 3-SAT formula maps to a
> yes-instance of X. They conclude X is NP-hard. What is missing from the
> proof, and what could go wrong if it is skipped?
> ---
> The proof only shows one direction of the equivalence — that satisfiable
> formulas map to yes-instances of X. It never shows the converse: that
> every yes-instance of X, run backward, corresponds to a satisfiable
> formula. Without that, an unsatisfiable formula might *also* map to a
> yes-instance of X (for example, if the gadget construction has a "cheat"
> solution not tied to any real assignment). If so, a hypothetical
> polynomial algorithm for X would not actually let you decide 3-SAT, so the
> reduction proves nothing about X's hardness. ^card-v13n

Choosing which known problem to reduce *from* is mostly a matter of
matching structure rather than raw search: 3-SAT is the default choice for
problems built from logical constraints, since its clauses translate
directly into small independent pieces. Vertex cover or independent set fits
problems that are fundamentally about selecting a subset of elements under
pairwise conflicts. Subset sum fits numeric problems where instances involve
combining values toward a target. Hamiltonian cycle fits problems that ask
for an ordering or sequencing of discrete steps.

The usual construction technique is a **gadget**: a small, purpose-built
piece of the target instance that simulates one component of the source
instance, wired together so the whole transformation falls out of composing
gadgets mechanically.

```
Sketch: 3-SAT <=p vertex cover
For each clause (a OR b OR c), build a triangle gadget of 3 vertices,
one per literal, connected to each other. For each variable x, build
a 2-vertex edge gadget for x and ~x. Connect each literal vertex in a
clause triangle to its matching variable-gadget vertex. Choosing a
cover then forces: at least 2 of 3 vertices per triangle (mirroring
"at least one literal true"), plus exactly one vertex per variable
edge (mirroring "each variable is true or false, not both").
```

The entire point of doing this work is not academic bookkeeping — a
completed hardness proof is the signal to stop looking for an exact
polynomial algorithm and redirect effort toward approximation algorithms or
heuristics instead, both covered in their own notes in this category, since
no such algorithm is believed to exist for any NP-complete problem.

What practical decision does a completed NP-hardness proof justify making? ^card-my4i
:: It justifies giving up the search for an exact polynomial-time algorithm
and moving effort instead toward approximation algorithms (with a proven
guarantee on solution quality) or heuristics (with no guarantee but good
practical behavior), since no polynomial exact algorithm is believed to
exist for the problem.
