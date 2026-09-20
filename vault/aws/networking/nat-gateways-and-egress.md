---
topic: aws
category: aws-networking
tags: [nat-gateway, egress, availability-zone, nat-instance, ipv6]
citations: ["Amazon VPC User Guide"]
---

# NAT Gateways and Egress

`vault/aws/lambda/networking-and-vpc.md` already covers what happens
to a resource in a private subnet with no NAT gateway configured at
all, and that a VPC-attached resource's outbound traffic follows its
subnet's route table like anything else. This note takes that as
given and covers the AWS resource itself: where it has to live, why
its blast radius is scoped to one Availability Zone, what it costs,
its older self-managed predecessor, and its IPv6 counterpart.

Although a NAT gateway exists to serve resources sitting in private
subnets, the NAT gateway itself must be created inside a ==public== ^card-g8kt
subnet — it needs its own route to an internet gateway in order to
reach the internet at all.

If the NAT gateway sits in a public subnet, what does the associated private subnet's route table need to point at for 0.0.0.0/0 traffic? :: The NAT gateway itself, referenced by its NAT gateway ID — not at an internet gateway directly. The private subnet's resources get outbound-only internet access by routing through the NAT gateway, which in turn relies on the public subnet's own route to reach the internet from there. The two subnets play genuinely different roles: one hosts the gateway, the other only points at it. ^card-x8k4

A NAT gateway is ==zonal==: it runs in one specific Availability Zone ^card-fze5
and is built to serve subnets within that same zone.

Because of that, relying on a single NAT gateway to serve an entire multi-AZ VPC creates two separate problems at once. What are they? :: It becomes a single point of failure — if that one Availability Zone has an outage, every private subnet in the other zones loses internet-bound egress too — and it generates cross-AZ data transfer charges, since traffic from resources in other zones has to cross an AZ boundary just to reach the NAT gateway in the first place. ^card-zfsx

What's the recommended pattern for making NAT gateway egress resilient to a single Availability Zone failure? :: Deploy one NAT gateway per Availability Zone, each sitting in that zone's own public subnet, and route each zone's private subnets to the NAT gateway in the same zone rather than sharing one gateway across zones. ^card-sn8o

How is a NAT gateway billed? :: With an hourly charge for every hour it's provisioned, plus a per-GB data processing charge on all traffic that flows through it. The per-GB charge is the part that most often surprises people on a bill, since it scales with traffic volume rather than being a flat, predictable fee. ^card-lon8

Before NAT gateways existed, what was the self-managed alternative, and what did it cost you that a NAT gateway doesn't? :: A NAT instance — an ordinary EC2 instance configured to forward and translate traffic for a private subnet. Running one means patching and maintaining its software yourself, sizing and scaling its instance type by hand as throughput needs grow, and building your own failover if that instance or its Availability Zone goes down — all of which a managed NAT gateway takes off your plate. ^card-k61d

The IPv6 equivalent of a NAT gateway is the ==egress-only== internet ^card-tcxr
gateway.

> [!card] recall
> Explain why IPv6 egress from a VPC is handled by an egress-only
> internet gateway rather than by something that performs address
> translation the way a NAT gateway does for IPv4. What is the actual
> problem an egress-only internet gateway is solving? ^card-wddw
