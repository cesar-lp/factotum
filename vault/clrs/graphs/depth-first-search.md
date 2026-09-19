---
topic: algorithms
category: algo-graphs
tags: [depth-first-search, parenthesis-theorem, white-path-theorem, edge-classification]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 20 (Elementary Graph Algorithms)"]
---

# Depth-First Search: Timestamps, Theorems, and Edge Classification

Where BFS explores level by level, DFS explores as far as possible
along each branch before backtracking, and it is the structural theorems
that fall out of that exploration order — not shortest distances — that
make DFS the workhorse behind topological sort and strongly connected
components later in this category.

Each vertex gets a ==discovery time== d[v], set when it is first colored ^card-7p0g
gray. It also gets a finish time f[v], set when its adjacency list is
fully explored and it is colored black — DFS-VISIT recurses into every
white neighbor before returning, so d[u] < f[u] always, and because DFS
is recursive these timestamps nest.

The ==parenthesis theorem== states that for any two vertices u and v, ^card-b5g7
exactly one of three relationships holds between their intervals
[d[u], f[u]] and [d[v], f[v]]: the intervals are entirely disjoint, or
one is entirely contained within the other — nested, like well-formed
parentheses — but they can never partially overlap.

> [!card] mcq
> According to the parenthesis theorem, if [d[u], f[u]] and [d[v], f[v]]
> overlap at all, what must be true?
> - [x] One interval is entirely nested inside the other
> - [ ] Exactly one of d[v] or f[v] falls inside [d[u], f[u]]
> - [ ] u and v must be adjacent in G
> - [ ] The two intervals must be identical ^card-6aai

Why can two vertices' discovery/finish intervals never partially overlap in a DFS? :: DFS-VISIT(v) only ever runs entirely inside the call to DFS-VISIT(u) that discovered it, or entirely after u has already finished — a recursive call cannot start inside u's interval and finish after it, since u's own call cannot return until every recursive call it made has returned. That call-stack structure forces disjoint-or-nested, never partial overlap. ^card-e3sj

The ==white-path theorem== says v is a descendant of u in the depth-first ^card-ofn2
forest if and only if, at the time u is discovered, there is a path from
u to v consisting entirely of white vertices.

DFS classifies every edge (u, v) into one of four kinds relative to the
depth-first forest it produces. A *tree edge* is one by which v was
discovered. A ==back edge== connects u to an ancestor v, pointing "up" ^card-6aft
the tree — and it is exactly this kind of edge whose presence signals a
cycle in a directed graph. A *forward edge* connects u to a descendant v
that is not a tree edge. A *cross edge* is everything else: no
ancestor/descendant relationship holds between u and v in either
direction. All four kinds arise only in a directed graph: a DFS of an
undirected graph produces tree and back edges only, since an undirected
edge is explored from whichever endpoint DFS reaches first and so can
never point forward to an already-finished descendant or sideways to an
unrelated vertex.

What does the white-path theorem say about vertex v being a descendant of u in the depth-first forest? :: v is a descendant of u if and only if, at the moment u is discovered, v is reachable from u along a path made entirely of vertices that are still white at that instant. ^card-jtrz

> [!card] recall
> Explain why a directed graph contains a cycle if and only if a DFS of
> it produces at least one back edge — what does a back edge (u, v)
> mean about the relationship between u and v, and how does that force
> a cycle? ^card-vdhf

Running time is ==Theta(V + E)==, the same bound as BFS: Theta(V) to ^card-939b
initialize and visit every vertex once, plus Theta(E) to scan every
adjacency list exactly once across all recursive calls combined.
