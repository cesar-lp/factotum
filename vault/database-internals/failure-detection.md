---
category: database-internals
tags: [failure-detection, heartbeats, phi-accrual, gossip]
citations: ["Petrov, Database Internals, Ch. 9"]
---

# Failure Detection

Distributed systems cannot directly observe whether a remote node has
crashed; they can only infer it from the absence of expected messages
over a network that might itself be slow or lossy, so every failure
detector is really guessing, and can be wrong in both directions (calling
a live node dead, or a dead node still alive).

A simple **heartbeat** detector has each node periodically send "I'm
alive" messages, and a peer that hasn't heard one within some fixed
timeout declares the sender ==dead==. This is easy to implement but ^card-uoqr
forces an awkward tradeoff between a short timeout (fast detection, more
false positives on temporary slowness) and a long timeout (fewer false
positives, slower detection of real failures).

> [!card] mcq
> What is the core weakness of a fixed-timeout heartbeat failure
> detector?
> - [x] One fixed timeout must trade off detection speed against false-positive rate, and cannot adapt to a network whose latency varies over time
> - [ ] It requires every node to run the same clock, synchronized to the microsecond
> - [ ] It can only be used in networks with fewer than three nodes
> - [ ] It never produces false positives, only false negatives ^card-ttsw

A **phi-accrual** failure detector improves on the fixed-timeout
heartbeat by tracking the recent history of heartbeat inter-arrival
times and using that history to compute a continuous suspicion
==level== (phi) for a node, rather than emitting a binary alive/dead ^card-uffu
verdict; the application then picks its own phi threshold at which to
treat a node as failed, and can even use a rising phi to react (e.g.
shed traffic) before formally declaring the node down.

> [!card] mcq
> What does a phi-accrual failure detector output for a monitored node?
> - [x] A continuously-valued suspicion level, computed from the recent distribution of heartbeat arrival times, that the application thresholds itself
> - [ ] A simple boolean: alive or dead
> - [ ] A fixed timeout value in milliseconds, recalculated once per hour
> - [ ] The exact wall-clock time the node crashed ^card-8ei4

Phi-accrual adapts to the network's own observed jitter automatically:
if heartbeats have historically arrived with high variance, a delayed
heartbeat raises phi more slowly than it would on a network with a
tight, consistent inter-arrival history, which is why it produces fewer
false positives than a naive fixed timeout under a fluctuating network
without sacrificing detection speed when the network is calm.

What advantage does using the recent history of heartbeat inter-arrival times (as phi-accrual does) give over comparing against one fixed timeout? :: It lets the detector adapt its sensitivity to the network's actual, currently-observed variability, so a network that is usually jittery doesn't trigger false suspicion on an ordinary delay, while a network that is usually very regular can still be flagged quickly once a delay is unusually large relative to its own history. ^card-l9iu

**Gossip-based** failure detection has nodes exchange membership and
liveness information with a small number of random peers on each round,
rather than every node monitoring every other node directly; information
about a failure (or a node rejoining) then spreads through the cluster
exponentially, in roughly log(N) rounds for N nodes, without requiring
any single node to maintain a direct heartbeat connection to all the
others.

> [!card] mcq
> Why does gossip-based failure detection scale better than every node
> heartbeating every other node directly?
> - [x] Each node only exchanges state with a few random peers per round, and information still propagates cluster-wide in a small number of rounds, avoiding an all-to-all connection count that grows quadratically with cluster size
> - [ ] Gossip protocols eliminate the need for any node to detect failures at all
> - [ ] Gossip only works correctly in clusters smaller than ten nodes
> - [ ] Gossip requires a single coordinator node that all messages pass through ^card-l4nm

> [!card] recall
> Explain why an "is this node alive?" answer from any failure detector
> is fundamentally a probabilistic guess rather than a verified fact, and
> what phi-accrual does differently from a plain heartbeat to represent
> that uncertainty. ^card-ggdw
