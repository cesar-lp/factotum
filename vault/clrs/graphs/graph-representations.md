---
topic: algorithms
category: algo-graphs
tags: [adjacency-list, adjacency-matrix, graph-representation, sparse-graphs]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 20 (Elementary Graph Algorithms)"]
---

# Graph Representations: Adjacency List vs Adjacency Matrix

Every algorithm in this category states its running time in terms of
one of two representations, and the bound silently assumes you're using
the right one — plugging an adjacency-matrix graph into an algorithm
whose stated bound assumes a list quietly changes its actual cost.

An ==adjacency list== represents a graph G = (V, E) as an array of |V| ^card-ft8g
lists, one per vertex, where each list holds that vertex's neighbors
(or, for a weighted graph, neighbor-plus-weight pairs). Its space usage
is ==Theta(V + E)==, growing with the number of edges actually present. ^card-n3mt

An ==adjacency matrix== is a |V| x |V| array where entry (u, v) records ^card-qg29
whether edge (u, v) exists (and its weight, if any). Its space usage is
==Theta(V^2)==, regardless of how many edges exist. ^card-joec

> [!card] mcq
> A graph has 10,000 vertices and 15,000 edges. Which representation uses
> asymptotically less space?
> - [x] Adjacency list — Theta(V + E) versus Theta(V^2) for the matrix
> - [ ] Adjacency matrix — Theta(V^2) versus Theta(V + E) for the list
> - [ ] Both use the same asymptotic space for any graph
> - [ ] It depends on whether the graph is directed ^card-284a

The tradeoff is symmetric with query time. Listing a vertex's neighbors
takes time proportional to its ==degree== with an adjacency list, but ^card-vtek
Theta(V) with a matrix, since you must scan an entire row regardless of
how many neighbors actually exist. Conversely, testing whether a
specific edge (u, v) exists is ==Theta(1)== with a matrix — one array ^card-rqau
lookup — but can take up to O(V) with a list, since you may have to
scan the whole neighbor list of u to find (or rule out) v.

Why can testing for a specific edge be slower with an adjacency list than with a matrix, even though listing all of a vertex's neighbors is faster? :: An adjacency list only stores edges that exist, so finding one specific edge (u, v) means scanning u's neighbor list until v turns up or the list ends — up to Theta(degree(u)) work. A matrix trades that away for Theta(1) lookup of any single edge, at the cost of Theta(V) to enumerate only the neighbors that actually exist. ^card-2ryr

This is why sparse graphs — where |E| is much smaller than |V^2| —
almost always use adjacency lists, and it is what the rest of this
category assumes by default. BFS and DFS's stated running time of
Theta(V + E) assumes an adjacency-list representation; run either
algorithm over a matrix instead and every neighbor-scan step becomes
Theta(V), degrading the actual bound to Theta(V^2).

> [!card] recall
> A graph is dense enough that |E| is close to |V^2| (e.g., a nearly
> complete graph). Explain whether the space and query-time case for
> adjacency lists still holds, and why a matrix representation becomes
> more attractive as a graph gets denser. ^card-qkey
