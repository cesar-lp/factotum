---
topic: algorithms
category: algo-graphs
tags: [maximum-flow, residual-network, ford-fulkerson, min-cut]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 24 (Maximum Flow)"]
---

# Maximum Flow: Residual Networks and Augmenting Paths

Maximum flow asks how much "stuff" can move from a source s to a sink
t through a network of capacitated edges, and every algorithm here
answers it the same way: find a path that can carry more flow, push
flow along it, and repeat until no such path exists.

Given a flow network G with capacities c(u, v), the ==residual ^card-see8
network== Gf has, for each edge (u, v), a residual capacity
cf(u, v) = c(u, v) - f(u, v) in the forward direction, and a residual
capacity cf(v, u) = f(u, v) in the reverse direction — representing the
option to "undo" flow already sent along (u, v).

An ==augmenting path== is a simple path from s to t in the residual ^card-gg4h
network; the maximum amount of additional flow it can carry is the
minimum residual capacity of any edge along it, called its residual
capacity.

Why does the residual network need a reverse edge with capacity f(u, v), given that the original graph may not have had an edge (v, u) at all? :: An augmenting path is allowed to route flow backward across an edge that already carries flow, effectively canceling some of it, which lets a later augmenting step correct an earlier suboptimal choice of path. Without that reverse residual capacity, flow sent along (u, v) could never be reduced, and the algorithm could get stuck short of the true maximum. ^card-lq7e

==Ford-Fulkerson== repeatedly finds an augmenting path, pushes flow ^card-q592
equal to its residual capacity along it, and repeats until none
remains. It leaves the choice of *which* augmenting path unspecified,
and that choice matters: with a poor choice, its running time can be as
bad as O(E * |f*|), where |f*| is the value of the maximum flow, since
integer capacities can force one unit of flow to be added per
iteration in the worst case.

> [!card] mcq
> What specifically makes generic Ford-Fulkerson's running time
> pseudo-polynomial (depending on the numeric value of the max flow,
> not just V and E)?
> - [x] An arbitrary choice of augmenting path can force each iteration to increase the flow by as little as one unit, so the number of iterations can equal the max flow's numeric value
> - [ ] It always uses a depth-first search, which is asymptotically slow
> - [ ] The residual network can have more edges than the original graph
> - [ ] It cannot handle networks with integer capacities ^card-uep2

==Edmonds-Karp== is Ford-Fulkerson with one specific choice: always pick ^card-talf
the shortest augmenting path in the residual network, measured by
number of edges, found by running BFS from s. That choice alone bounds
the number of iterations by O(VE), giving a total running time of
O(V E^2).

What specific rule does Edmonds-Karp add to generic Ford-Fulkerson, and what running time does that rule guarantee? :: It always chooses the shortest augmenting path (fewest edges) via BFS on the residual network, which bounds the algorithm to O(VE) iterations and O(VE^2) total running time — independent of the numeric flow value. ^card-wogg

> [!card] recall
> Explain what a cut of a flow network is, and why the value of any
> flow is bounded above by the capacity of every cut — the fact that
> underlies the max-flow min-cut theorem. ^card-qxj6

The ==max-flow min-cut theorem== ties the whole algorithm to a duality ^card-31y5
result: the value of a maximum flow equals the capacity of a minimum
cut, and Ford-Fulkerson terminates exactly when no augmenting path
exists — which happens precisely when the current flow saturates some
cut, certifying that flow as maximum.
