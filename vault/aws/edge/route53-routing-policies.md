---
topic: aws
category: aws-edge
tags: [route53, routing-policies, weighted, latency-based, geolocation]
citations: ["Amazon Route 53 Developer Guide — 'Choosing a routing policy'"]
---

# Route 53 Routing Policies

`route53-hosted-zones-and-records.md` covers what a record is; a
**routing policy** is the logic Route 53 applies when a zone holds
several records for the same name and has to pick which one to answer
with. Each policy exists to answer one specific question, and picking
the wrong one for the question you actually have is the usual mistake.

**Simple** routing returns one answer, with no logic behind it at all —
it's the default and the right choice whenever there's nothing to
decide between.

**Weighted** routing splits traffic across multiple records
proportionally, by a weight you assign each one. This is the mechanism
behind canary releases and gradual migrations: shifting a weighted split
from 100/0 to 90/10 to 50/50 and onward is how traffic moves to a new
version or a new environment incrementally rather than all at once.

**Latency-based** routing returns whichever record's associated region
has the lowest ==measured latency== for the resolver that asked — not ^card-i1n4
the record whose region is geographically nearest. Those two routinely
diverge: network path and peering can make a farther region measurably
faster than a nearer one for a given resolver.

> [!card] mcq
> A resolver in Ireland queries a latency-based routing policy with
> records in `eu-west-1` and `us-east-1`. Route 53's latency
> measurements show `us-east-1` currently has a lower round-trip time
> for that resolver's network path. Which record does Route 53 return?
> - [x] The us-east-1 record, since latency-based routing follows measured latency, not physical distance
> - [ ] The eu-west-1 record, since it's geographically closer to Ireland
> - [ ] Both records, letting the client pick
> - [ ] Whichever record was created first ^card-r7pd

**Geolocation** routing answers based on where the ==querying resolver== ^card-p4v7
is located, and exists for policy reasons rather than performance ones —
compliance requirements that mandate a user's traffic stay within a
jurisdiction, or serving genuinely different content by region rather
than just different infrastructure. **Geoproximity** routing (available
through traffic flow) also routes by location, but adds a *bias* value
that lets you shift the effective boundary between regions without
touching the underlying geography — expanding one region's catchment
area at another's expense.

Why would swapping a geolocation-based routing setup for a latency-based one silently break a data-residency requirement, even if both policies happen to route most users to sensible-seeming endpoints? :: Because latency-based routing optimizes purely for measured network performance and has no concept of jurisdiction — it will happily route a user to whichever region answers fastest even if that region is outside the boundary the compliance requirement demands, while geolocation routing is the one policy that actually keys off where the user is, which is the property compliance needs, not fast response times. ^card-crio

**Failover** routing designates a primary and a secondary record, and
switches to the secondary only when a health signal on the primary
reports it unhealthy.

Failover routing consumes a health signal without needing to know how
that signal is produced: all this note requires is that a
==health check== reports the primary unhealthy, and the policy switches. ^card-xi9z

What such a check actually monitors, and how failure is detected, is
developed in `health-checks-and-failover.md`.

**Multivalue answer** routing returns several healthy records in one
DNS response, and lets the client itself pick among them — that's a
crude spread of load across endpoints, not a load balancer, since Route
53 does nothing to track connection counts or actual backend load the
way an ALB does.

> [!card] recall
> A team wants "load balancing" for a fleet of endpoints and considers
> multivalue answer routing. Explain precisely what it does and does not
> do compared to an actual load balancer, and why calling it "crude" is
> accurate rather than dismissive.
> ---
> Multivalue answer routing returns up to several healthy records in a
> single response and leaves the client to choose one, typically the
> first or a random entry — that's the entire mechanism. It has no
> visibility into which endpoints are currently under heavier load,
> makes no attempt to balance connection counts, and can't rebalance
> mid-connection. An ALB actively distributes individual requests based
> on target health and load. Multivalue answer only spreads *which
> address a client starts with*, which is a real but blunt improvement
> over a single point of failure — hence "crude spread," not "load
> balancing" in the ALB sense. ^card-1zyd

The distinction that matters more than any single policy's mechanics is
that ==all== of them resolve at DNS lookup time, which means the ^card-nm0u
client's resolver and however long it caches that answer decide what
actually happens next — none of these policies is a load balancer in
the sense of reacting request-by-request, and none of them can redirect
an in-flight connection once a client has already resolved and
connected to an endpoint.

Because of that, health-check-driven failover is only as fast as the
record's TTL allows, exactly as `route53-hosted-zones-and-records.md`
covers for DNS changes generally — a failover policy paired with a
24-hour TTL fails over just as slowly as any other DNS change would.
