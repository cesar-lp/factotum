---
category: networking
tags: [routing, link-layer, ethernet, arp, bgp, ospf]
citations: ["Kurose & Ross, Computer Networking 8e, Ch. 5-6"]
---

# Routing Algorithms and the Link Layer

In link-state routing, what does each router learn from flooding, and how does it use that to compute routes? :: Every router floods information about its directly connected links to all other routers in the network, so each router independently builds a complete map of the topology and computes shortest paths itself, typically with Dijkstra's algorithm. ^card-ooah

In distance-vector routing, what does a router know, and how does it update its distances? :: Each router only knows the distance to each destination as reported by its immediate neighbors, and iteratively recomputes its own distances by combining a neighbor's reported distance with the cost to reach that neighbor, using a form of the Bellman-Ford algorithm. ^card-6abb

A well-known problem with naive distance-vector routing is
==count-to-infinity==: when a link fails, routers can keep telling each ^card-bob5
other stale, ever-increasing distances to a now-unreachable destination
before the bad route is finally purged.

Within a single administrative domain (an autonomous system), OSPF is the
common ==link-state== intra-domain protocol. Between autonomous systems, BGP ^card-j2vr
is used instead — it is a path-vector protocol that lets each AS apply its
own routing policy, not just minimize hop count or cost.

Why does BGP use policy rather than shortest-path selection between autonomous systems? :: Different autonomous systems are independent businesses with their own commercial relationships (customer, provider, peer), so route selection has to respect contracts and business interests, not just technical distance, which shortest-path metrics alone cannot express. ^card-yvcz

At the link layer, Ethernet frames are addressed using ==48-bit== MAC ^card-8c10
addresses that are (in principle) globally unique and burned into the
network interface, unlike IP addresses which change with location in the
network.

A switch is a link-layer device that is ==self-learning==: it builds its ^card-4uve
forwarding table by observing the source MAC address and incoming port of
each frame it sees, rather than requiring manual configuration or running a
routing protocol.

How does ARP discover the MAC address that corresponds to an IP address on the local network? :: A host broadcasts a request asking "who has this IP address" on the local network, and the host owning that IP replies directly with its MAC address, which the requester then caches for future frames to that IP. ^card-7u3r

> [!card] mcq
> How does a router fundamentally differ from a switch in how it forwards traffic?
> - [x] A router forwards based on IP addresses and participates in routing protocols across networks, while a switch forwards based on MAC addresses within a single local network
> - [ ] A router only works with wireless links, while a switch only works with wired links
> - [ ] A switch can connect different IP subnets, while a router cannot
> - [ ] A router requires no configuration, while a switch must be manually configured ^card-t2r2

> [!card] recall
> Explain why link-state routing is generally more resistant to the
> count-to-infinity problem than distance-vector routing. ^card-gai5
