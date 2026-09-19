---
topic: algorithms
category: algo-graphs
tags: [floyd-warshall, johnsons-algorithm, all-pairs-shortest-paths, reweighting]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 23 (All-Pairs Shortest Paths)"]
---

# All-Pairs Shortest Paths: Floyd-Warshall and Johnson's Algorithm

Running Dijkstra or Bellman-Ford once from every vertex already solves
all-pairs shortest paths, but this category's two dedicated algorithms
either simplify the computation dramatically (Floyd-Warshall) or make
that repeated-single-source approach viable on sparse graphs with
negative edges (Johnson's).

==Floyd-Warshall== is a dynamic-programming algorithm built on a single ^card-vmcb
recurrence: define d(k)[i][j] as the weight of a shortest path from i
to j using only intermediate vertices from {1, ..., k}, so
d(k)[i][j] = min(d(k-1)[i][j], d(k-1)[i][k] + d(k-1)[k][j]). The
recurrence asks, for each k, whether routing through vertex k improves
the best path found using only vertices before it.

The key insight is that a shortest path from i to j either avoids
vertex k entirely (in which case d(k)[i][j] = d(k-1)[i][j]), or it
passes through k exactly once (in which case, by optimal substructure,
its two halves i-to-k and k-to-j are themselves shortest paths using
only intermediate vertices from {1, ..., ==k - 1==}). ^card-4c82

Why is it correct for Floyd-Warshall's recurrence to consider a path through k as just d(k-1)[i][k] + d(k-1)[k][j], rather than a shortest path through k using intermediate vertices up to k itself? :: A shortest path visits no vertex twice (assuming no negative-weight cycles), so if it passes through k, neither its i-to-k half nor its k-to-j half can use k again as an intermediate vertex — both halves are shortest paths restricted to intermediate vertices from {1, ..., k-1}, which is exactly what d(k-1) already gives. ^card-j73u

By iterating k from 1 to |V|, Floyd-Warshall computes all-pairs shortest
distances in ==Theta(V^3)== time and Theta(V^2) space, working directly ^card-0rhi
on the weighted adjacency matrix.

> [!card] mcq
> Floyd-Warshall's Theta(V^3) running time makes it competitive with
> running Dijkstra from every vertex mainly in which situation?
> - [x] Dense graphs, or graphs with negative edges where Dijkstra cannot be used directly
> - [ ] Graphs with no negative edges and very few edges relative to vertices
> - [ ] Graphs that are already trees
> - [ ] Graphs where only one pair's shortest path is needed ^card-vc5m

Johnson's algorithm targets exactly the case Floyd-Warshall is
wasteful on: sparse graphs, where running Dijkstra from every vertex
would be faster — except that Dijkstra requires non-negative weights,
which the input graph might not have.

Johnson's ==reweights== every edge using vertex potentials h(v) computed ^card-bhdy
by one Bellman-Ford run from an added source vertex connected to all
others with zero-weight edges: the new weight is w'(u, v) = w(u, v) +
h(u) - h(v), where h(v) is the shortest distance from that added source
to v.

What must be true of h(v) for Johnson's reweighting formula w'(u, v) = w(u, v) + h(u) - h(v) to guarantee every reweighted edge is non-negative? :: h(v) must satisfy the triangle inequality h(v) <= h(u) + w(u, v) for every edge (u, v) — which is exactly the property Bellman-Ford's shortest-distance values from the added source guarantee, since a shortest distance to v can never exceed a shortest distance to u plus the direct edge weight from u to v. ^card-efyd

> [!card] recall
> Explain why Johnson's reweighting preserves *which* path is shortest
> between any two vertices, even though it changes every individual
> edge's weight — what does the h(u) - h(v) telescoping do to a path's
> total reweighted length compared to its original length? ^card-c16s

Once reweighted, Johnson's runs Dijkstra from every vertex on the
non-negative graph and converts distances back by reversing the
potential shift, for a total running time of ==O(V^2 lg V + VE)== with ^card-mrqs
a Fibonacci-heap Dijkstra — asymptotically better than Floyd-Warshall's
Theta(V^3) when E is small relative to V^2.
