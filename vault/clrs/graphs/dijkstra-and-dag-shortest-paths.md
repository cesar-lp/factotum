---
topic: algorithms
category: algo-graphs
tags: [dijkstra, greedy-algorithms, dag-shortest-paths, negative-weights]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 22 (Single-Source Shortest Paths)"]
---

# Dijkstra's Algorithm and Shortest Paths in a DAG

Both algorithms here beat Bellman-Ford's Theta(VE) by exploiting extra
structure — Dijkstra's assumes non-negative weights, and the DAG
algorithm assumes the graph has no cycles at all — and it's worth
understanding exactly why relaxing that assumption breaks each one.

Dijkstra's algorithm maintains a set S of vertices whose final shortest
distance is already known, and repeatedly moves the ==minimum-distance== ^card-7piz
vertex u outside S into S, relaxing all of u's outgoing edges.

That choice is a greedy one: once a vertex is moved into S, Dijkstra
never revisits or reconsiders that decision for the rest of the run.
It is correct only because, with all edge weights
non-negative, once u has the smallest d-value among vertices outside S,
no future relaxation through some other vertex can ever produce a
shorter path to u — every alternative path to u must pass through
another vertex outside S first, and any such path's length is already
at least that vertex's own d-value, which is >= d[u] by u's minimality.

Why does Dijkstra's algorithm fail if the graph contains a negative-weight edge, specifically in terms of what "finalizing" a vertex means? :: Dijkstra permanently fixes d[u] the moment u is extracted from the queue and never relaxes into u again afterward. With a negative edge, a vertex v added to S later — with a larger d[v] at the time it was extracted — can have an outgoing negative edge to u that would lower d[u] below its already-finalized value. Because u is never revisited, that improvement is silently missed, and Dijkstra's finalized d[u] is not just imprecise but can be wrong. ^card-s0b7

> [!card] mcq
> Which best describes the actual mechanism by which a negative edge
> breaks Dijkstra's correctness?
> - [x] A vertex is finalized (permanently removed from consideration) based on distances that a later, negative-weight relaxation could still have improved, and Dijkstra never revisits finalized vertices
> - [ ] Negative weights make the priority queue's comparisons undefined
> - [ ] Dijkstra's algorithm cannot represent negative numbers in its distance array
> - [ ] Negative weights cause the algorithm to loop forever ^card-zl27

Dijkstra's running time depends on the priority queue exactly as Prim's
does: ==O(E lg V)== with a binary heap, or O(E + V lg V) with a ^card-wqya
Fibonacci heap.

A ==DAG== admits a much simpler and faster algorithm precisely because ^card-8t7b
it has a topological order: sort the vertices topologically, then relax
every vertex's outgoing edges exactly once, in that order — every d[v]
is final the first time v is reached, because no edge ever points
backward in a topological order.

Why does processing vertices in topological order make one relaxation pass over each vertex's edges sufficient, even with negative edges present? :: In topological order, by the time vertex u is processed, every edge into u has already been relaxed (all of u's predecessors come earlier in the order), so d[u] is already final; relaxing u's own outgoing edges then can only need to happen once, since no later vertex can have an edge back into u to improve it further. ^card-qt81

This algorithm tolerates negative weights (unlike Dijkstra's) because
it never "finalizes" a vertex based on a greedy minimality argument — it
runs in ==Theta(V + E)==, the topological sort's cost plus one pass of ^card-uhqk
relaxation.

> [!card] recall
> Explain why the DAG shortest-paths algorithm's tolerance for negative
> weights does not contradict Bellman-Ford's need for |V| - 1 rounds to
> handle negative weights correctly — what extra structural guarantee
> does a DAG's topological order supply that a general graph lacks? ^card-j5iw
