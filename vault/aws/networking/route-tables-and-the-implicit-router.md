---
topic: aws
category: aws-networking
tags: [route-tables, routing, cidr, longest-prefix-match]
citations: ["Amazon VPC User Guide"]
---

# Route Tables and the Implicit Router

Every subnet is associated with exactly ==one== route table — never ^card-acgw
zero, and never two at the same time. AWS treats a subnet without any
route table as an impossible state, not a default-deny state, which is
why every VPC ships with a route table already in place before you
create a single subnet.

That pre-existing table is the **main route table**: whatever subnet
you create and don't explicitly associate with a route table of your
own falls back to it by default. It isn't special in what it can
contain — it's special only in being the fallback association.

What happens to a subnet's routing if you create it and never explicitly associate it with a route table? :: It is not left without one; AWS associates it with the VPC's main route table by default, since a subnet with zero route table associations isn't an allowed state at all. ^card-643q

A **custom route table** is any additional route table you create and
then explicitly associate with one or more subnets, overriding that
default main-table fallback for just those subnets. This is how a
public and a private subnet in the same VPC end up with different
routing: each is associated with its own custom table rather than both
inheriting the same one.

> [!card] recall
> Explain the difference between the main route table and a custom
> route table in terms of what determines which subnets use which —
> not in terms of what routes each is allowed to contain. ^card-vyt8

Every route table, main or custom, carries one entry that you did not
write and cannot remove: the ==local== route, covering the VPC's own ^card-vbrf
CIDR block, which keeps every subnet in the VPC able to reach every
other subnet in it by default.

Why can the local route never be removed or overridden by a more specific conflicting entry? :: It is what guarantees baseline connectivity between every subnet in the VPC; if it could be deleted or superseded, resources in different subnets of the same VPC could lose the ability to reach each other, which would break the VPC's basic function as a single network. ^card-oq2s

> [!card] mcq
> A route table has the mandatory local route covering the VPC's CIDR
> block, plus a custom route sending a narrower, more specific slice
> of that same CIDR range to a different target. A packet's
> destination falls inside that narrower slice. Which route wins?
> - [x] The custom route — the route table always chooses the most specific matching route, regardless of which one was added first
> - [ ] The local route — it always takes priority as the default entry
> - [ ] Neither — overlapping ranges in one table are rejected outright
> - [ ] Both — traffic is split between the two targets ^card-wmf5

That mcq scenario is an instance of a general rule: when more than one
route in a table matches a packet's destination, the route table picks
the entry with the most specific matching CIDR — the longest prefix
match — rather than the first one listed or the broadest one.

How does a route table decide which entry to use when a packet's destination matches more than one route in the table? :: It applies longest-prefix match: among all the routes whose CIDR range contains the destination address, the one with the most specific (longest) prefix wins, regardless of the order the routes appear in the table. ^card-5jd6

A default route — one matching all traffic that nothing more specific
already caught — can point at several different kinds of target
depending on what a subnet needs: an internet gateway, a NAT gateway,
a VPC peering connection, a virtual private gateway, or a VPC
endpoint, among others. Which target is correct is a question this
note doesn't answer on its own; the route table's job is only to hold
and select among whatever targets have been configured.

> [!card] recall
> A subnet's route table has only the mandatory local route and no
> other entries. State what that subnet can and cannot reach as a
> result, and what kind of entry would need to be added to change
> that. ^card-x2e7
