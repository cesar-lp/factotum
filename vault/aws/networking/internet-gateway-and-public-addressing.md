---
topic: aws
category: aws-networking
tags: [internet-gateway, public-ip, elastic-ip, connectivity, vpc-networking]
citations: ["Amazon VPC User Guide"]
---

# Internet Gateway and Public Addressing

An internet gateway is the component that connects a VPC to the
public internet. It isn't something you size or scale yourself: an
internet gateway is a ==horizontally scaled==, redundant, highly ^card-8as7
available VPC component that AWS manages, so there's no capacity to
provision and no single appliance that can fail under load.

A VPC can have at most one internet gateway attached to it at a time.

What has to happen before a VPC that already has one internet gateway attached can be given a different one? :: The existing internet gateway must be detached first — an attached gateway occupies the VPC's single attachment slot, so a second one can't simply be added alongside it. ^card-81rf

For every resource that has a public address, an internet gateway
performs a one-to-one translation between that resource's private
address and its public one.

When a request arrives addressed to a resource's public address, what does the internet gateway do to it before the packet reaches that resource inside the VPC? :: It translates the destination address from the resource's public address to its private address, and performs the reverse translation on the way out, so the resource itself only ever sees its own private address. ^card-21x0

Public IPv4 addressing comes in two flavors that behave very
differently over an instance's life. An address that AWS assigns
automatically at launch is not something you keep: it is
==ephemeral==, released back to AWS's pool and replaced by a new one ^card-1ae9
each time the instance stops and then starts again.

An ==Elastic IP== address is different in kind, not just in ^card-f50s
durability: you allocate it to your own account explicitly, and it
stays associated with your account — and can stay attached to an
instance across a stop and start — until you choose to release it.

Why might a service break right after an EC2 instance is stopped and restarted, if the service depends on the instance's automatically assigned public IPv4 address rather than an Elastic IP? :: Stopping and starting the instance releases the old auto-assigned address and hands out a new one, so anything that recorded the old address — a DNS record, a firewall allowlist entry, a client's cached config — now points at an address the instance no longer has. An Elastic IP would have stayed attached across that same restart. ^card-mo53

Reaching a resource from the public internet requires three independent things to all be true at once. Name them. :: (1) the resource has a public address, (2) its subnet's route table sends 0.0.0.0/0 traffic to an internet gateway, and (3) its security group permits the traffic. These are independent controls maintained in different places, so any one of them missing on its own is enough to block connectivity. ^card-x101

> [!card] mcq
> An EC2 instance has an Elastic IP attached, and its security group
> allows inbound HTTPS from 0.0.0.0/0. You still can't reach it from
> the internet, and its subnet's route table has no route to an
> internet gateway at all. What's going on?
> - [x] The route table is missing the 0.0.0.0/0 route to an internet gateway, so traffic to and from the public internet never gets there
> - [ ] An Elastic IP alone requires a NAT gateway, not an internet gateway, to be reachable
> - [ ] The security group must also explicitly allow the internet gateway as a source
> - [ ] Having a public address is sufficient regardless of routing or security group rules ^card-2dbc
