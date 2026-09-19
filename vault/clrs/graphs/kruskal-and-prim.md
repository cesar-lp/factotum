---
topic: algorithms
category: algo-graphs
tags: [kruskal, prim, disjoint-set, priority-queue, mst]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 21 (Minimum Spanning Trees)"]
---

# Kruskal's and Prim's Algorithms

Both algorithms instantiate the generic safe-edge scheme from the
previous note; they differ only in which cut they check and which data
structure makes that check cheap.

==Kruskal's algorithm== sorts all edges by weight and considers them ^card-6saz
one at a time, adding an edge if its two endpoints are in different
components of the forest built so far, and skipping it otherwise since
adding it would form a cycle.

It uses a disjoint-set data structure to test "are u and v already
connected?" and to merge components. With union by rank and path
compression, a sequence of m operations on n elements takes
==O(m alpha(n))== total, essentially constant time per operation. ^card-l5yp

Why is testing "are u and v in the same component?" via disjoint sets the right operation to avoid creating a cycle, rather than, say, checking whether v is already in the tree? :: Kruskal's builds a forest, not a single growing tree, so "already connected" is the relevant notion of cycle risk, not "already visited" — two vertices can each be in the tree without being connected to each other yet, and adding an edge between two already-connected vertices is exactly what closes a cycle, regardless of whether both endpoints have been seen before. ^card-c8uk

Kruskal's overall running time is O(E lg V): sorting the edges is
O(E lg E), which is O(E lg V) since E is O(V^2), and dominates the
lower-order O(E alpha(V)) contributed by the disjoint-set operations.

==Prim's algorithm== instead grows a single tree from an arbitrary root, ^card-79cp
repeatedly adding the minimum-weight edge connecting the current tree to
a vertex outside it — exactly the cut property applied to the cut
between the tree so far and everything else.

It uses a min-priority queue keyed on each non-tree vertex's minimum
connection weight to the tree, repeatedly extracting the minimum and
relaxing its neighbors' keys — the same relaxation idea shortest-path
algorithms use, applied to edge weight instead of distance.

> [!card] mcq
> Prim's algorithm's running time depends on which choice?
> - [x] The priority-queue implementation used for EXTRACT-MIN and DECREASE-KEY
> - [ ] Whether the graph is sorted by weight beforehand
> - [ ] Whether a disjoint-set structure is used instead of a queue
> - [ ] The order in which the root vertex's neighbors are listed ^card-3hap

With a ==binary heap==, each EXTRACT-MIN and DECREASE-KEY costs O(lg V), ^card-xaer
giving Prim's a total running time of O(E lg V).

With a Fibonacci heap, DECREASE-KEY drops to O(1) amortized, giving a
total of ==O(E + V lg V)== — asymptotically better on dense graphs, ^card-nsyv
where E dominates the E lg V term of the binary-heap version.

What two priority-queue implementations give Prim's algorithm its two standard running times, and what are those running times? :: A binary heap gives O(E lg V); a Fibonacci heap gives O(E + V lg V). ^card-8crz

> [!card] recall
> Explain why Prim's, unlike Kruskal's, needs the graph to be connected
> as an explicit precondition for the single-tree-growth strategy to
> visit every vertex, and what result you get from Prim's if you run it
> on a disconnected graph. ^card-60dz
