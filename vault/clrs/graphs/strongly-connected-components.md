---
topic: algorithms
category: algo-graphs
tags: [strongly-connected-components, transpose-graph, dfs, finish-time]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 20 (Elementary Graph Algorithms)"]
---

# Strongly Connected Components

A strongly connected component (SCC) is a maximal set of vertices where
every vertex can reach every other vertex along directed edges, in both
directions. STRONGLY-CONNECTED-COMPONENTS finds all of them with just
two DFS passes, no fancier machinery.

```
STRONGLY-CONNECTED-COMPONENTS(G):
  run DFS(G) to compute finish times f[u] for each vertex u
  compute G^T (the transpose of G)
  run DFS(G^T), considering vertices in decreasing order of f[u]
  output the vertices of each tree in the resulting forest as one SCC
```

The first pass runs plain DFS on G and records each vertex's finish
time. The second pass runs DFS again, but on the ==transpose graph== ^card-kone
(every edge direction reversed) — and critically, it considers vertices
as roots in decreasing order of the finish times from the first pass.
Each resulting depth-first tree is exactly one SCC.

Reversing every edge for the second pass is deliberate: G and G^T have
identical SCCs (reversing every edge in a cycle keeps it a cycle), but
reversing edges also reverses which vertices are reachable from which —
which is exactly the leverage the algorithm needs to stop a DFS tree
from spilling across an SCC boundary.

Why does running the second DFS on the transpose graph, rather than on G again, matter for the correctness of this algorithm? :: Running DFS again on G would let a tree grow across SCC boundaries whenever one SCC has an edge into another, since that edge is still followable forward. Reversing to G^T removes exactly the edges that would let a tree escape "downstream" into a different SCC that the current one can reach but that cannot reach back, while preserving reachability within each SCC (since SCC membership itself is symmetric). ^card-psn3

> [!card] mcq
> In the second DFS pass (on G^T), why must vertices be tried as roots
> in decreasing order of first-pass finish time?
> - [x] It guarantees each new root starts a component whose SCC has no as-yet-unvisited SCC reachable from it in G^T, so the resulting tree cannot spill past its own SCC's boundary
> - [ ] It makes the second DFS run faster asymptotically
> - [ ] It ensures the transpose graph is explored in the same order as G
> - [ ] It guarantees every resulting tree is a single vertex ^card-av54

What does each tree in the depth-first forest produced by the second DFS pass (on G^T, in decreasing finish-time order) correspond to? :: Exactly one strongly connected component of the original graph G. ^card-nkfy

The key structural fact that makes the whole scheme work is about the
component graph: contracting each SCC of G to a single vertex always
yields a ==DAG== — there can be no cycle among SCCs, since any cycle ^card-lo8s
spanning multiple SCCs would merge them into one larger SCC by
definition. Decreasing finish-time order effectively processes SCCs in
a topological order of that component DAG, source SCCs first.

> [!card] recall
> Explain, in terms of the component graph being a DAG, why picking the
> next DFS root in G^T by decreasing first-pass finish time always picks
> a vertex from an SCC that has no edge, in G^T, leading out to an
> as-yet-unvisited SCC — and why that is exactly what keeps each
> second-pass tree confined to one SCC. ^card-60yb

Because it is two DFS passes plus building the transpose, the total
running time is ==Theta(V + E)==, the same asymptotic bound as a single ^card-6pq5
DFS.
