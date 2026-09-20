---
topic: aws
category: aws-networking
tags: [subnets, availability-zones, route-tables, public-subnet]
citations: ["Amazon VPC User Guide"]
---

# Subnets, Availability Zones, and Public vs. Private

A subnet is scoped to exactly ==one== availability zone. That fact is ^card-10y1
what everything else in this note follows from: a VPC itself spans an
entire region, but the moment you carve a subnet out of it, that
subnet is pinned to whichever AZ you created it in and can never
spread into another.

Why can't a single subnet ever span two availability zones, even though its parent VPC spans the whole region? :: A subnet is defined as belonging to exactly one availability zone at creation time — that scoping is fixed, so spanning AZs would require the subnet to belong to more than one AZ at once, which AWS's model doesn't allow; multi-AZ coverage is achieved by creating separate subnets, one per AZ, not by widening a single subnet. ^card-8eks

This is worth stating precisely because it's easy to get backwards: the
VPC is the region-wide container, and each subnet inside it is the
piece that is bound to a single AZ.

> [!card] recall
> A VPC and its subnets are being laid out for a new application.
> State which of the two — the VPC or an individual subnet — spans
> the entire region, and which is confined to a single availability
> zone, and explain why that asymmetry is what forces you to create
> multiple subnets when you want multi-AZ coverage. ^card-gtl6

The other fact worth correcting head-on: "public subnet" is not a
setting you flip and not an attribute a subnet carries on its own.

A subnet is public for exactly one reason: its route table sends
0.0.0.0/0 traffic to an internet gateway. Nothing else about the
subnet — its size, its name, whether an instance in it happens to have
a public IP — makes it public or private; the route table is the only
thing that decides.

What single condition makes a subnet "public," as opposed to any naming convention, size, or instance-level setting? :: Its associated route table has a route sending 0.0.0.0/0 (all traffic with no more specific match) to an internet gateway; a subnet with no such route is private regardless of anything else about it or the resources placed in it. ^card-9mot

> [!card] mcq
> A subnet is named "public-subnet-1" and every instance in it has a
> public IP address, but its route table has no route to an internet
> gateway. Is this subnet actually public?
> - [x] No — without a route table entry sending 0.0.0.0/0 to an internet gateway, the subnet is private no matter its name or the instances in it
> - [ ] Yes — the name settles it
> - [ ] Yes — having instances with public IPs makes a subnet public
> - [ ] It depends on whether the VPC itself is marked public ^card-p6j9

Because that route-table condition is the whole story, moving a
subnet from private to public is purely a routing change: associate
its route table with a route to an internet gateway, and every
resource in it that also has a public address becomes reachable from
the internet — no other property of the subnet has to change.

The standard layout that follows from "one AZ per subnet" is one
subnet per AZ per tier: a public subnet and a private subnet in
us-east-1a, a matching pair in us-east-1b, and so on, rather than one
large public subnet and one large private subnet for the whole VPC.

Why does a standard multi-tier design create a separate subnet per AZ per tier, instead of one public subnet and one private subnet covering the whole VPC? :: Because a subnet cannot span more than one AZ, giving each tier only one subnet would confine that entire tier to a single AZ; to place resources for the same tier across multiple AZs, each AZ needs its own subnet for that tier. ^card-upo6

> [!card] recall
> An application's database tier currently has only one subnet, in a
> single availability zone. Explain why this leaves the application
> unable to survive an AZ failure, and what has to be added — in terms
> of subnets — to fix it. ^card-m1k6

Anything that has to keep running through an AZ failure therefore
needs subnets in ==several== AZs, never just one, no matter how large ^card-7pj3
that one subnet's CIDR block is sized.

A subnet is also where instances and interfaces draw their addresses
from, which is one more reason its AZ scoping matters: everything
placed in a given subnet inherits that subnet's single-AZ location,
with no way to spread a single subnet's resources across AZs short of
creating more subnets.
