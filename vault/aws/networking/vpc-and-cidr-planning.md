---
topic: aws
category: aws-networking
tags: [vpc, cidr, ip-address-planning, network-design]
citations: ["Amazon VPC User Guide"]
---

# VPC and CIDR Planning

A VPC is a logically isolated network that you define inside a single
AWS region. Defining it means choosing an IPv4 CIDR block — the range
of addresses everything inside that VPC will be carved out of. That
choice is the first and most consequential decision in the whole
design, because unlike almost everything else about a VPC, it is hard
to walk back.

You can add more address space later through a secondary CIDR block,
but you cannot shrink or reassign the VPC's primary range once
subnets, route tables, and peering connections have been built on top
of it. Picking a CIDR block is therefore a decision you should expect
to live with for the life of the VPC, not one to leave until a subnet
needs to be created.

Why is a VPC's initial CIDR block choice so hard to undo once the VPC is in active use? :: Everything downstream — subnet ranges, route tables, peering connections, on-premises routing — gets built against that address space, so changing it means re-carving every subnet and re-establishing every connection rather than editing one setting. ^card-wrw1

Sizing the block has two failure modes, and they are not symmetric.
A block that is too small cannot grow gracefully — you run out of
address space for new subnets and are forced into a secondary block
as a workaround rather than a choice. A block that is too large costs
nothing technically inside the VPC itself; the risk it creates only
shows up later, when that oversized range turns out to collide with
another network you need to connect to.

> [!card] recall
> A team picks the largest CIDR block AWS allows for a new VPC,
> reasoning that more address space is strictly safer than less.
> Explain why this reasoning is incomplete: what does an oversized
> CIDR block cost you, and when does that cost actually show up? ^card-b4n7

AWS reserves ==five== addresses in every subnet you create, regardless ^card-wqiq
of that subnet's size: the network address, the address AWS uses for
the VPC router, the address reserved for DNS, one reserved for future
use, and the broadcast address at the top of the range (even though
VPCs don't support broadcast traffic, AWS still reserves it for
consistency).

Why does a /28 subnet, which spans 16 addresses on paper, only provide 11 usable addresses for your own resources? :: Because AWS reserves 5 of those 16 addresses in every subnet no matter its size — the network address, the VPC router address, the DNS address, one reserved for future use, and the broadcast address — leaving 16 minus 5, or 11, for you to assign. ^card-9kbg

> [!card] mcq
> A subnet is sized as a /28. How many addresses can actually be
> assigned to instances or interfaces in that subnet?
> - [x] 11 — AWS reserves 5 of the 16 addresses in every subnet
> - [ ] 16 — the full range is usable
> - [ ] 14 — only the network and broadcast addresses are reserved
> - [ ] 5 — only the reserved addresses are usable ^card-59sn

When the original CIDR block runs out of room for new subnets, a
==secondary CIDR== block is the escape hatch: you attach an additional ^card-cax4
range to the existing VPC rather than recreating it, buying more
address space without disturbing anything already built on the
primary range.

The planning rule that matters most, though, is not about size at
all: a VPC's CIDR range must not overlap with the range of any network
you might later need to connect to — another VPC, an on-premises
data center, a partner's network.

Why does an overlapping CIDR range between two networks rule out peering between them, rather than just making it awkward? :: Peering (and most other VPC-to-VPC or VPC-to-on-premises connectivity) routes traffic by destination address, so if both networks claim the same addresses there is no way to tell which network a given address actually belongs to — the connection has no way to route traffic correctly, so AWS refuses to establish it at all. ^card-w5v7

That non-overlap requirement is why CIDR planning has to look outward,
not just at the VPC being created: a range that looks perfectly sized
for today's workload can still be the wrong choice if it collides with
a network this VPC will need to reach next year.

What single planning rule, if violated, blocks future connectivity outright rather than just wasting address space? :: The VPC's CIDR range must not overlap with any network it might later need to connect to; overlap doesn't just waste space, it makes routing between the two networks ambiguous and connectivity impossible. ^card-hwjw
