---
topic: aws
category: aws-networking
tags: [vpc-peering, transit-gateway, routing, hub-and-spoke]
citations: ["Amazon VPC User Guide", "Amazon Route 53 Developer Guide"]
---

# VPC Peering and Transit Gateway

A peering connection joins two VPCs directly so resources in each
address the other by private IP, as if they sat on the same network.

That directness is also the limit. Peering connections are
==non-transitive==: if VPC A peers with VPC B, and VPC B separately ^card-y42g
peers with VPC C, A still cannot reach C. There is no forwarding through
B — each peering connection only ever links the exact two VPCs on its
own ends, and this trips people up constantly.

A peering connection also cannot be created at all between two VPCs
whose CIDR ranges ==overlap==. Peering routes traffic by address, so an ^card-gqr5
address that could belong to either VPC leaves nothing for the
connection to route.

> [!card] mcq
> VPC A and VPC B create a peering connection. An engineer adds a route
> to the connection in A's route table but forgets to do the same in
> B's route table. What happens when an instance in A tries to reach
> one in B?
> - [x] A's packets can leave toward B, but B has no route back through the peering connection, so the exchange never completes
> - [ ] Traffic flows normally in both directions once either side has a route
> - [ ] AWS automatically mirrors the missing route onto B
> - [ ] The peering connection refuses to pass any traffic until it is deleted and recreated ^card-ryle

Creating the connection itself changes nothing else. Traffic only flows
once both VPCs add a route pointing at the peering connection, and both
sides' security rules permit it — three separate requirements, and
skipping any one is a common reason "the peering connection exists but
nothing can talk."

What three things have to be true before traffic actually flows across an established peering connection? :: Both VPCs' route tables must point at the connection, and both sides' security rules must permit the traffic — the connection existing is necessary but not sufficient. ^card-gxt9

Peering also doesn't scale on its own. Fully meshing n VPCs — every VPC
able to reach every other — needs n(n-1)/2 separate peering
connections, each with its own pair of route table entries to add and
keep correct by hand.

Connecting 6 VPCs into a full mesh with peering alone requires how many separate peering connections? :: 15 — n(n-1)/2 with n = 6, i.e. (6 x 5) / 2. ^card-077i

Transit Gateway exists to remove that arithmetic. It's a ==hub== that ^card-no54
each VPC attaches to just once; every attached VPC can then reach every
other attached VPC transitively, with the actual routing decisions made
in the gateway's own route tables rather than replicated across every
VPC pair.

A Transit Gateway can also terminate VPN and Direct Connect connections,
so hybrid on-premises links join the same routing domain as the VPCs.

> [!card] recall
> Peering scales as n(n-1)/2 connections with per-pair hand-maintained
> routes; Transit Gateway scales as one attachment per VPC. Explain what
> structural difference between the two models produces that gap.
> ---
> Peering routing is a property of each individual pairwise connection,
> so every new VPC means a new route table entry in every existing VPC
> it should reach. Transit Gateway centralizes routing into the gateway
> itself, so adding a VPC means one attachment and one set of entries in
> the gateway's own route table, not one new entry scattered across
> every existing VPC. ^card-wcgr

Neither option is unconditionally better. Peering has no direct cost
and is simplest for a handful of VPCs. Transit Gateway bills per
attachment and per GB processed, but it turns an O(n^2) management
problem into an O(n) one.

What's the honest tradeoff between choosing VPC peering and Transit Gateway as the number of VPCs to connect grows? :: Peering is free and simplest for a small, fairly static number of VPCs; Transit Gateway charges per attachment and per GB but replaces per-pair route maintenance with one attachment per VPC, which pays for itself once the mesh gets large. ^card-09ji
