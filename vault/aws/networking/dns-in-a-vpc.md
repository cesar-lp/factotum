---
topic: aws
category: aws-networking
tags: [vpc-dns, route53, private-hosted-zone, split-horizon]
citations: ["Amazon VPC User Guide", "Amazon Route 53 Developer Guide"]
---

# DNS Inside a VPC

`dns.md` covers how resolution works in general — the hierarchy,
recursion, caching, record types. This note covers only what AWS adds on
top of that once a resolver lives inside a VPC.

Every VPC gets an Amazon-provided DNS resolver, reachable at a fixed
address relative to the VPC's own network: the base of the VPC's CIDR
block plus two.

What IP address does the Amazon-provided DNS resolver for a VPC live at, relative to the VPC's own CIDR block? :: The VPC's base network address plus two — a VPC carved from 10.0.0.0/16 has its resolver reachable at 10.0.0.2, informally "the .2 resolver." ^card-ggx9

Two VPC attributes control DNS behavior and are constantly confused
because their names look alike.

==enableDnsSupport== decides whether that Amazon-provided resolver ^card-pnup
answers queries at all inside the VPC.

==enableDnsHostnames== decides a completely different thing: whether ^card-cdr9
instances launched in the VPC are assigned public DNS hostnames in the
first place. It says nothing about whether anything inside the VPC can
resolve names.

> [!card] mcq
> A VPC has enableDnsHostnames set to true but enableDnsSupport set to
> false. What's the practical effect?
> - [x] Instances get assigned public DNS hostnames, but nothing inside the VPC can actually resolve any name, because the resolver isn't answering queries
> - [ ] Instances get assigned public DNS hostnames and can resolve names normally
> - [ ] Neither hostnames nor resolution work, since the two settings are really one switch
> - [ ] enableDnsHostnames silently forces enableDnsSupport on ^card-ylu6

What is a Route 53 private hosted zone, and what can it hold that a public hosted zone cannot? :: A hosted zone associated with one or more specific VPCs rather than published to the public internet; it can hold names that don't exist in public DNS at all, resolvable only from inside its associated VPCs. ^card-doe1

Can a single private hosted zone be associated with more than one VPC, and what does that association actually control? :: Yes — a private hosted zone can be associated with multiple VPCs, even across accounts; the association is precisely what makes the zone's records resolvable from within those VPCs, since a private zone answers nothing outside them. ^card-geap

A private hosted zone can also share a name with a public zone for the
same domain. When it does, ==split-horizon== DNS results: a resolver ^card-jzdz
inside one of the zone's associated VPCs gets the private zone's
answer, while a resolver outside gets the public zone's answer for the
identical name.

DNS resolution does not automatically cross a peering connection just
because the connection exists — it has to be explicitly enabled on the
peering connection itself, on each side that should be able to resolve
the other's names.

A VPC peering connection is up and an instance in each VPC can already reach the other by IP address. Why might one of them still fail to resolve the other VPC's private DNS name? :: Address reachability and DNS resolution across a peering connection are controlled separately — resolving the peer's names requires DNS resolution support to be turned on for the peering connection itself, which reachability alone does not imply. ^card-5for
