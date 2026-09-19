---
topic: algorithms
category: algo-graphs
tags: [minimum-spanning-tree, cut-property, greedy-algorithms, safe-edge]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 21 (Minimum Spanning Trees)"]
---

# Minimum Spanning Trees: The Cut Property and Generic Algorithm

A minimum spanning tree (MST) is a tree — |V| - 1 edges, no cycle,
connecting all vertices — whose total edge weight is as small as
possible among all spanning trees of a connected, undirected, weighted
graph. Both algorithms in the next note (Kruskal's and Prim's) are
special cases of one generic greedy scheme, and that scheme's
correctness rests entirely on one theorem.

A ==cut== of a graph is any partition of V into two disjoint sets S and ^card-p5zz
V - S. An edge crosses the cut if it has one endpoint in each set.
The ==cut property== states: for any cut (S, V - S), if an edge (u, v) ^card-rqvv
is a minimum-weight edge crossing that cut, then (u, v) is a safe edge
for some MST — i.e., there exists an MST that contains it.

```
GENERIC-MST(G, w):
  A = {}
  while A does not form a spanning tree:
    find an edge (u, v) that is safe for A
    A = A union {(u, v)}
  return A
```

An edge is ==safe== for a set A of edges (already known to be a subset ^card-wo8u
of some MST) if A union {(u, v)} is also a subset of some MST. The
generic algorithm just repeatedly adds safe edges until it has a
spanning tree — the whole design problem is finding safe edges cheaply.

Why does the cut property guarantee that a minimum-weight edge crossing a cut is safe, given some edge set A already known to lie in an MST? :: Take any MST T that contains A but not this minimum-weight crossing edge (u, v); T must contain some other edge crossing the same cut to stay connected. Swapping that other edge out for (u, v) cannot increase the total weight, since (u, v) is minimum-weight across the cut, and the result is still a spanning tree containing A union {(u, v)} — so an MST containing A union {(u, v)} exists. ^card-4ln1

> [!card] mcq
> Which cut should you choose for a given set A of edges known to be
> safe, when applying the cut property to find the next safe edge?
> - [x] Any cut that respects A — one where no edge of A crosses it
> - [ ] The cut with the fewest crossing edges
> - [ ] The cut separating the highest-weight vertex from the rest
> - [ ] There is no restriction; any cut works for any A ^card-2m8n

A cut ==respects== A if no edge in A crosses it. The theorem's guarantee ^card-2rf5
only holds for a light edge across a cut that respects the current A —
choosing a cut that some edge of A crosses would let the property
recommend an edge that creates a cycle with A.

What condition must a cut satisfy for the cut property to correctly identify a safe edge to add to the current edge set A? :: The cut must respect A — no edge already in A may cross it — and the edge chosen must be a minimum-weight edge crossing that cut. ^card-nhjr

> [!card] recall
> Explain why the generic MST algorithm's correctness proof, built on
> the cut property, works regardless of which specific safe edge is
> chosen at each step — what does that imply about the two concrete
> algorithms (Kruskal's and Prim's) that instantiate this generic
> scheme with different edge-choice strategies? ^card-i4dl

The MST problem also relies on the graph being ==connected==; if it is ^card-h5cd
not, no spanning tree exists at all, and the generic algorithm's loop
condition (adding edges until a spanning tree forms) never terminates.
