---
topic: algorithms
category: algo-graphs
tags: [topological-sort, dag, dfs, cycle-detection]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 20 (Elementary Graph Algorithms)"]
---

# Topological Sort and DAGs

A topological sort answers a scheduling question: given a set of tasks
with precedence constraints (edge u -> v means "u must happen before
v"), in what order can all tasks run without violating any constraint?
That question only has an answer at all when the graph has no cycle.

A ==DAG== (directed acyclic graph) is exactly a directed graph with no ^card-dj66
cycle, and topological sort is defined only for DAGs — a cyclic
dependency graph has no valid ordering, since some task would need to
precede itself.

TOPOLOGICAL-SORT runs DFS on the graph and, as each vertex finishes,
inserts it onto the front of a linked list; the final list, read front
to back, is the topological order. Equivalently: sort vertices by
==decreasing finish time==. ^card-doo6

```
TOPOLOGICAL-SORT(G):
  run DFS(G) to compute finish times f[v] for each vertex
  return vertices in order of decreasing f[v]
```

Why does ordering vertices by decreasing DFS finish time produce a valid topological order? :: For any edge (u, v) in a DAG, u must finish after v — if DFS discovers u first, v cannot be a white-path ancestor of u without creating a cycle, and if v is discovered first it must finish before u's DFS-VISIT returns (since a DAG has no back edge from u to an already-gray v). Either way f[u] > f[v], so decreasing-finish-time order always lists u before v. ^card-wyse

> [!card] mcq
> Why must the graph be acyclic for a topological sort to exist at all?
> - [x] A cycle forces some vertex to both precede and follow another, which no linear order can satisfy
> - [ ] DFS cannot compute finish times on a cyclic graph
> - [ ] Cyclic graphs are always disconnected
> - [ ] A cycle makes the graph's adjacency list infinite ^card-stoa

The correctness argument rests on one fact about DFS on a DAG: it never
produces a ==back edge==. ^card-0620

Such an edge (u, v) means v is an ancestor of u still on the recursion
stack when u is discovered — but that implies a path v -> ... -> u plus
the edge u -> v, which is a cycle. So a DAG's absence of cycles is
equivalent to its DFS producing no back edges.

What kind of edge does a DFS of a directed graph produce if and only if the graph contains a cycle? :: A back edge — an edge from a vertex to one of its own ancestors in the depth-first forest, still gray (on the stack) at the time it's encountered. ^card-zjmn

> [!card] recall
> Explain how you would use a single DFS traversal to detect whether a
> directed graph is a DAG, without running a separate topological sort
> afterward — what exact condition, checked during the traversal, tells
> you a cycle exists? ^card-rw29

Because it is built on DFS, topological sort runs in ==Theta(V + E)==: ^card-r4s8
Theta(V + E) for the DFS itself, plus Theta(V) to prepend each finished
vertex, which does not change the asymptotic total.
