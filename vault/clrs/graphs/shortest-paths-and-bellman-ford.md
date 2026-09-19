---
topic: algorithms
category: algo-graphs
tags: [shortest-paths, relaxation, bellman-ford, negative-weight-cycle]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 22 (Single-Source Shortest Paths)"]
---

# Shortest Paths and the Bellman-Ford Algorithm

Single-source shortest-path algorithms all maintain the same two
pieces of state per vertex — a distance estimate d[v] and predecessor
pi[v] — and converge on the true shortest-path distance through the
same single operation, repeated in different orders by different
algorithms.

==Relaxation== of edge (u, v) tests whether going through u improves ^card-hwv3
the current best known distance to v — if d[u] + w(u, v) < d[v], it
sets d[v] = d[u] + w(u, v) and pi[v] = u. No shortest-path algorithm in
this category does anything structurally different from repeated
relaxation — they differ only in which edges they relax, and in what
order.

Correctness rests on the ==optimal-substructure== property of shortest ^card-7833
paths: any subpath of a shortest path is itself a shortest path between
its own endpoints. This is what lets relaxation build a shortest path
incrementally from shortest sub-paths, rather than needing to consider
whole paths at once.

Why does the optimal-substructure property justify building a shortest path via repeated relaxation of individual edges, rather than examining whole candidate paths? :: Because every subpath of a shortest path is itself shortest between its endpoints, a shortest path to v that passes through u must have, as its prefix, a shortest path to u — so once d[u] holds the true shortest distance, testing the single edge (u, v) via relaxation is enough to correctly extend that optimal prefix, with no need to reconsider the path built so far. ^card-g62o

==Bellman-Ford== handles graphs with negative-weight edges — something ^card-xvkm
Dijkstra's algorithm cannot do correctly. It works by relaxing every
edge in the graph, in an arbitrary fixed order, for ==|V| - 1== rounds, ^card-f2ng
then checking every edge once more for a possible further improvement.

> [!card] mcq
> Why does Bellman-Ford relax every edge exactly |V| - 1 times?
> - [x] Any shortest path visits at most |V| - 1 edges, so |V| - 1 rounds of relaxing every edge suffice to propagate the correct distance along the longest possible shortest path
> - [ ] It matches the number of edges in a sparse graph
> - [ ] It is the number of rounds needed for a priority queue to empty
> - [ ] It bounds the number of negative edges the graph can contain ^card-a21t

Bellman-Ford detects a ==negative-weight cycle== reachable from the ^card-cbt4
source with one extra pass after the main loop: if any edge can still
be relaxed — its endpoints' distances would still strictly improve —
some cycle on that edge's path must have negative total weight, since
otherwise |V| - 1 rounds would already have converged.

What does it mean, and what does it imply, if some edge (u, v) can still be relaxed after Bellman-Ford's |V| - 1 main rounds have completed? :: It means d[v] > d[u] + w(u, v) still holds; since |V| - 1 rounds already suffice to find every true shortest-path distance in a graph with no negative-weight cycle reachable from s, this can only happen if a negative-weight cycle reachable from s exists, in which case shortest-path distances are undefined (unbounded below). ^card-1imh

> [!card] recall
> Explain why a negative-weight cycle makes "shortest path" an
> undefined concept for any vertex reachable from it, rather than merely
> a very small number. ^card-9aar

Running time is Theta(VE): |V| - 1 rounds, each relaxing all E edges.
