---
topic: aws
category: aws-networking
tags: [vpc-endpoints, privatelink, gateway-endpoint, interface-endpoint]
citations: ["Amazon VPC User Guide", "AWS PrivateLink documentation"]
---

# VPC endpoints and PrivateLink

"VPC endpoint" isn't one mechanism — it's a name shared by two genuinely
different pieces of infrastructure that happen to solve a similar
problem in incompatible ways, and AWS networking questions lean hard on
knowing which one a scenario actually describes.

A ==gateway endpoint== only exists for two services, S3 and DynamoDB, and ^card-vkdq
it isn't a device on the network at all — it's an entry added to a route
table. Traffic destined for that service's address range, identified by
a ==prefix list== rather than a fixed CIDR block, gets routed to the ^card-q4bz
endpoint instead of wherever it would otherwise go. It costs nothing to
use.

An ==interface endpoint== is a real elastic network interface, sitting in ^card-6lgs
one of your subnets with a private address of its own, and it exists for
a much broader set of services than just S3 and DynamoDB. Unlike a
gateway endpoint it's billed hourly plus a per-GB data processing charge.

What does it cost to route traffic through a gateway endpoint, versus through an interface endpoint? :: A gateway endpoint costs nothing to use. An interface endpoint is billed hourly for the endpoint itself plus a per-GB charge for data processed through it, because it's a running network interface rather than a free route table entry. ^card-c5ks

Because a gateway endpoint is only a route table entry, it only helps
traffic that's already following that VPC's own route table — it doesn't
work for traffic crossing a peering connection into another VPC, and it
doesn't work from on-premises networks at all. An interface endpoint has
no such limit: anything that can route to the subnet it sits in — a
peered VPC, an on-premises network over a VPN or Direct Connect link —
can reach it, because from the network's point of view it's just another
private IP address to route to.

> [!card] mcq
> An application in a peered VPC needs to read objects from an S3 bucket entirely over private AWS networking, without traversing the public internet. Which endpoint type in the bucket's own VPC will NOT satisfy this by itself?
> - [x] A gateway endpoint — it only serves traffic following that VPC's own route table, not traffic arriving across a peering connection
> - [ ] An interface endpoint for S3 — it's reachable from anything that can route to its subnet, including a peered VPC
> - [ ] Either endpoint type would work equally well here
> - [ ] Neither endpoint type can serve S3 traffic privately ^card-07cc

Most interface endpoints are set up with private DNS enabled, which
matters operationally more than it sounds: the service's ordinary public
hostname resolves to the endpoint's private address instead, so existing
code and SDKs reach the service privately without pointing at a
different, endpoint-specific hostname.

> [!card] recall
> An interface endpoint for an AWS service is created with private DNS enabled. Explain what changes for application code that already calls the service's standard public hostname, and why that matters compared to requiring the endpoint's own DNS name. ^card-j07k

AWS PrivateLink is the general pattern interface endpoints are built on:
it lets a service running in one VPC be exposed to consumers in other
VPCs — including other accounts entirely — as an interface endpoint in
the consumer's own subnet, without peering either network and without
either side gaining broader network reach into the other.

Why does exposing a service through PrivateLink avoid the exposure that peering two VPCs together would create? :: PrivateLink only connects consumers to the specific service endpoint, as a network interface in the consumer's subnet; it never joins the two VPCs' networks the way peering does, so neither side gains a route into the other's broader address space, only into that one published service. ^card-ik26

A VPC endpoint can also carry its own endpoint policy — a resource policy
attached directly to the endpoint that constrains what can be reached or
done through it. That's a separate control surface from the IAM policies
attached to the calling principal: a request through the endpoint has to
satisfy both the endpoint policy and IAM, not just one or the other.

> [!card] mcq
> A gateway endpoint for S3 has an endpoint policy restricting access to a single bucket. A caller's IAM identity policy grants broad `s3:*` access to every bucket in the account. What happens when that caller tries to reach a different bucket through this endpoint?
> - [x] Denied — the endpoint policy also has to allow the request, regardless of how permissive the caller's IAM policy is
> - [ ] Allowed, since the IAM policy is the only control that matters once the endpoint routes the traffic
> - [ ] Allowed, because endpoint policies only restrict which services can be reached, not which resources within them
> - [ ] Denied, and the endpoint policy would have blocked the same caller from every bucket, including the allowed one ^card-he7f
