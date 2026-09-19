---
category: networking
tags: [network-layer, ip, nat, dhcp]
citations: ["Kurose & Ross, Computer Networking 8e, Ch. 4", "RFC 791", "RFC 2131"]
---

# The Network Layer: IPv4, Fragmentation, NAT, and DHCP

The IPv4 header carries, among other fields, a version number, a header
length, a total length, a time-to-live (TTL) that is decremented at every
router hop, a protocol field identifying the transport-layer payload, and
32-bit source and destination addresses. When TTL reaches ==0==, a router ^card-e2gi
discards the packet, which is what makes traceroute-style tools possible.

Fragmentation happens when a packet is larger than the maximum transmission
unit (MTU) of an outgoing link; the router splits it into smaller fragments,
each with the same identification field so the destination can reassemble
them, and an offset field recording each fragment's position. The default
Ethernet MTU is ==1500 bytes==. ^card-7a3g

Subnetting divides an IP address into a network portion and a host portion
using a mask; ==CIDR== notation (e.g. `/24`) expresses how many leading bits ^card-w4yg
belong to the network portion, letting routers aggregate many addresses
under one routing table entry.

NAT (Network Address Translation) :: A NAT-enabled router rewrites the source IP and port of outgoing packets from a private address to its own public address and a chosen port, keeping a translation table so replies can be routed back to the correct internal host. ^card-s1qp

Why can NAT make it difficult for two hosts behind separate NATs to establish a direct peer-to-peer connection? :: Neither host has a public address that the other can dial directly; a connection has to be initiated from inside each NAT (or use techniques like hole punching or a relay) because an unsolicited inbound packet has no translation table entry to match against. ^card-7yxi

DHCP lets a host joining a network automatically obtain an IP address,
subnet mask, default gateway, and DNS server, through a four-message
exchange commonly remembered as ==DORA==: discover, offer, request, and ^card-isly
acknowledge.

> [!card] mcq
> A router receives an IPv4 packet with TTL = 1. After decrementing it, what does the router do?
> - [x] Drops the packet, since TTL reached 0, and typically sends an ICMP time-exceeded message
> - [ ] Forwards the packet normally and resets TTL to 255
> - [ ] Fragments the packet to extend its lifetime
> - [ ] Sends the packet back to its source unmodified ^card-b5wl

> [!card] recall
> Explain why NAT breaks the original end-to-end connectivity model of IP,
> where any two hosts could address each other directly. ^card-f91a
