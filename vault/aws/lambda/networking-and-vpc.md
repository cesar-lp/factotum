---
topic: aws
category: aws-lambda
tags: [lambda, vpc, networking, nat-gateway, eni]
citations: ["AWS Lambda Developer Guide — 'Configuring a Lambda function to access resources in a VPC'"]
---

# Networking and VPC

By default a Lambda function's execution environment runs on AWS-managed
network infrastructure with a route straight to the public internet and
to AWS service endpoints — it has no direct network path into your own
VPC's private subnets at all. Attaching a function to a VPC is what buys
that path, and it comes with real tradeoffs, not just a checkbox.

Attaching a function to a VPC gives it a network interface inside one or
more of that VPC's ==subnets==, so it can reach private resources — an ^card-uuju
RDS instance on a private subnet, an internal load balancer — that aren't
reachable from the public internet at all.

Why can't a Lambda function reach a database sitting on a private RDS subnet unless the function is attached to that VPC? :: A private subnet has no route from the public internet by definition, and a function's default execution environment sits outside the VPC entirely on AWS-managed networking; without an elastic network interface placed inside that VPC's subnet, the function has no network path into it, no matter what credentials or SDK calls it has. ^card-9mdo

A VPC-attached function's outbound traffic follows the same rules as any
other resource inside that VPC: a private subnet has no direct route to
the internet, so a function placed there needs a ==NAT gateway== in a ^card-ns3b
public subnet to reach the public internet or any AWS service endpoint
that isn't accessed through a VPC endpoint.

This is precisely the routing problem `vault/networking/network-layer.md`
describes for NAT generally — a private-subnet resource has a private
address with no public route, and something has to rewrite outbound
packets to a public source address for replies to make it back at all;
inside a VPC that something is a managed NAT gateway rather than the
consumer-router NAT that note focuses on.

> [!card] mcq
> A Lambda function is attached to a VPC's private subnets with no NAT gateway configured. What happens when its code tries to call a public API over the internet?
> - [x] The call fails — a private subnet has no route to the internet without a NAT gateway
> - [ ] The call succeeds normally, because Lambda always has internet access regardless of VPC configuration
> - [ ] The call is automatically routed through AWS's managed non-VPC network path instead
> - [ ] The call succeeds, but only for HTTPS traffic ^card-xejx

What must be added to a function's VPC configuration for it to reach a downstream AWS service like DynamoDB or S3 without traversing a NAT gateway at all? :: A VPC endpoint for that service — either a gateway or interface endpoint — routes the traffic privately within AWS's network instead of sending it out through a NAT gateway to the public internet, which also avoids NAT gateway data-processing cost and keeps the traffic off the public internet entirely. ^card-p6h5

Attaching a function to a VPC is a tradeoff, not a strictly safer default:
it adds the operational surface of subnets, route tables, and NAT (or VPC
endpoints) that have to be sized and maintained correctly, and a
misconfigured private subnet with no egress path can silently break a
function that needs to call anything outside the VPC.

> [!card] recall
> A function that calls a third-party HTTPS API and also needs to query an
> RDS instance on a private subnet is moved into that VPC. Explain both why
> the VPC attachment is necessary for the RDS access, and what additional
> piece of infrastructure it now needs purely to keep the third-party API
> call working, and why. ^card-w2oa

Only attach a function to a VPC when it actually needs to reach a resource
that lives inside one; a function that only talks to public AWS service
endpoints gains ==nothing== from VPC attachment and only inherits its ^card-bgmw
extra networking surface to maintain.
