---
topic: aws
category: aws-networking
tags: [vpc, eni, network-interface, ip-addressing, aws-networking]
citations: ["Amazon VPC User Guide"]
---

# Elastic Network Interfaces and IP Addressing

It's tempting to think of an instance as "having" an IP address, the way
a laptop has one. In a VPC that framing is backwards. The address
belongs to an **elastic network interface** (ENI) — a virtual networking
object that sits between an instance and the subnet, and that object,
not the instance, is what actually carries the address.

An ENI is its own thing, independent of any instance: it lives in one
subnet, and it carries a private IPv4 address (optionally more than
one), a MAC address, and one or more security group associations. All
of that belongs to the interface. An instance only has an address, a
MAC address, or a set of security groups because an interface carrying
them happens to be attached to it.

Every instance gets one interface automatically at launch — its
**primary** network interface, conventionally `eth0`.

An instance's ==primary== network interface cannot be detached for as ^card-7ols
long as the instance is running, and it is deleted the moment the
instance terminates.

A **secondary** interface is a completely different kind of object: you
create it on its own, attach it to an instance, and its existence has
nothing to do with that instance's lifecycle.

A secondary interface carries no such restriction: it can be
==detached== from one instance and attached to another, taking its ^card-x5ru
private address, its MAC address, and its security group associations
along with it.

Why does that matter more than it sounds like it should? Because it
means the address and the security posture travel with the interface,
not with whatever compute happens to be plugged into it at the moment.

Why does an elastic network interface hold the private IP address rather than the instance it's attached to? :: The address, MAC address, and security group associations are all properties of the interface object, not the instance. The instance only appears to "have" them because an interface carrying them is currently attached to it — swap the interface and the addressing and security posture move with it, leaving the instance behind. ^card-bniu

That independence has a boundary, though: an interface is created inside
one specific subnet, and it never leaves that subnet for its whole
life. You can move a secondary interface between instances, but only
instances that live in the same place the interface already does.

Why is a network interface permanently tied to the subnet it was created in? :: Its address is allocated out of that subnet's own address range at creation time, so the interface and the subnet's addressing are bound together from the start. It can be detached and reattached to a different instance, but only to one that can sit in that same subnet — moving it to a different subnet isn't an operation that exists. ^card-ujan

An Elastic IP address behaves the same way: it associates with a
network interface, not with a machine.

> [!card] recall
> An Elastic IP address is associated with a network interface rather
> than an instance. Explain how that lets you fail over from a broken
> instance to a standby one without changing anything a client is told
> to connect to, such as a DNS record.
> ---
> Because the Elastic IP is bound to the interface, you can detach that
> interface from the failed instance and attach it to the standby (or
> simply re-associate the Elastic IP with a different interface already
> in place). Traffic aimed at that address starts arriving at the new
> instance immediately — no DNS change, propagation delay, or client
> reconfiguration is involved, because the address never moved from the
> interface's point of view. ^card-vgdz

The same fact that makes an interface portable between instances is
also what makes it a real consumer of a subnet's address space: every
interface, on every instance, holds at least one address drawn from its
subnet's pool, whether or not anyone thinks of it as "using up" an
address.

> [!card] recall
> A subnet has plenty of unused instances' worth of room by headcount
> alone, yet a team reports it has run out of available IP addresses.
> Explain what is actually consuming those addresses, given that the
> count of running instances looks low.
> ---
> Instances are not the only thing drawing from a subnet's address
> pool. Every elastic network interface placed in that subnet consumes
> an address, and a single instance can carry more than one interface;
> managed services and other AWS-created interfaces placed in the
> subnet consume addresses the same way. The number of running
> instances is a poor proxy for how many addresses are actually
> allocated, because interfaces — not instances — are what the subnet
> is actually handing addresses out to. ^card-i0b1

This is also the mechanism behind a fact that surprises people the
first time they meet it: a managed service described as running
"inside your VPC" does so, concretely, by placing a network interface
of its own into one of your subnets — an interface configuration for
Lambda functions is one example, but the pattern is general.

> [!card] mcq
> A managed AWS service is configured to run "inside your VPC." What
> does that actually mean at the networking level, and what follows
> from it?
> - [x] The service places a network interface in one of your subnets, so it draws an address from your subnet's pool and its traffic is subject to your security groups
> - [ ] The service runs on AWS-managed infrastructure outside your VPC but is granted an exception to reach your subnets
> - [ ] The service is granted a route into your VPC without occupying any address space of its own
> - [ ] The service's traffic bypasses your security groups because it originates from AWS-managed infrastructure ^card-zzqz

What two costs does that consequence impose on you as the account ^card-vqng
owner, beyond just "the service works"? :: It consumes address space out of your subnet's own pool, the same as any instance-attached interface would, so a subnet with several such services in it can run short of addresses without you adding a single instance. And because the interface is a first-class member of your subnet, its traffic obeys whatever security groups you've associated with it — the service doesn't get a free pass just because AWS operates it.
