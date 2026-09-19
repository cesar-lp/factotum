---
topic: algorithms
category: algo-graphs
tags: [breadth-first-search, shortest-paths, bfs-tree, queue]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 20 (Elementary Graph Algorithms)"]
---

# Breadth-First Search

BFS explores a graph outward in waves from a source vertex s, and its
defining property is that those waves arrive in order of distance from
s — which is exactly what makes it the right tool for shortest paths
when every edge has the same cost.

BFS colors vertices white (undiscovered), gray (discovered, frontier),
and black (finished), and maintains a distance d[v] and a predecessor
pi[v] for each vertex. It processes gray vertices in the order they
were discovered, using a ==FIFO queue==. On each step it dequeues a ^card-l82l
vertex u, and for each white neighbor v, sets d[v] = d[u] + 1,
pi[v] = u, colors v gray, and enqueues it; once u's whole adjacency
list has been scanned this way, u is colored black.

Why must BFS use a FIFO queue rather than, say, a stack, for the distances it computes to be correct? :: A FIFO queue guarantees vertices are dequeued in the same order they were enqueued — non-decreasing order of discovery, hence non-decreasing distance from s — so every vertex at distance k is fully processed (and every distance-(k+1) neighbor discovered) before any distance-(k+1) vertex is dequeued. A stack would process the most recently discovered vertex next, exploring depth-first instead of by distance, and d[v] would no longer equal the true shortest-path distance. ^card-vwmx

The predecessor pointers pi[v] set during the search form the ==BFS ^card-49gh
tree==, rooted at s: it contains exactly one path from s to each
reachable vertex, and that path is a shortest path in the original
graph.

> [!card] mcq
> In an unweighted graph, what does d[v] equal after running BFS from s?
> - [x] The number of edges on a shortest path from s to v
> - [ ] The number of edges on some path from s to v, not necessarily shortest
> - [ ] The total number of vertices visited before v
> - [ ] The depth of v in a depth-first search tree rooted at s ^card-y50r

This shortest-path guarantee is specific to ==unweighted== graphs, where ^card-7fv4
every edge contributes the same cost of 1 to a path's length; BFS's
distances have no meaning as shortest-path lengths once edges carry
different weights, which is why weighted shortest paths need Dijkstra's
algorithm or Bellman-Ford instead.

What does the BFS tree rooted at s represent, and what specific property does its s-to-v path have in the original graph? :: It is the tree formed by the predecessor pointers pi[v] set during the search; the tree's s-to-v path is a shortest path from s to v in the original graph, measured in number of edges. ^card-6kxp

> [!card] recall
> BFS discovers vertices in "waves" ordered by distance from the source.
> Explain why this wave structure is precisely what guarantees each
> vertex's first-discovered distance is its true shortest-path distance,
> and would break if a vertex could be discovered a second time at a
> smaller distance. ^card-dx8p

Running time is ==Theta(V + E)==: each vertex is enqueued and dequeued ^card-mfgo
at most once (Theta(V)), and each vertex's adjacency list is scanned
exactly once across the whole run (Theta(E)).
