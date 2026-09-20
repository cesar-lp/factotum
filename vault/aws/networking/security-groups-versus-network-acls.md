---
topic: aws
category: aws-networking
tags: [security-groups, network-acls, vpc, stateful, stateless]
citations: ["Amazon VPC User Guide"]
---

# Security groups versus network ACLs

Most AWS networking questions that mention both firewalls at once are
really testing one thing: whether you know which of these two behaves
statefully and which doesn't, and what falls out of that difference in
practice.

A security group is ==stateful==: a reply to a connection your instance ^card-gwl8
initiated outbound, or a connection an allowed inbound rule let in, is
automatically permitted back through in the opposite direction, with no
matching rule required for the reply itself.

A network ACL is ==stateless==: it treats each direction independently, ^card-z9qu
so allowing inbound traffic on a port grants nothing to the reply going
back out — that reply needs its own explicit outbound rule, evaluated on
its own merits.

Where does each of these firewalls actually sit? A security group
attaches to individual resources — their network interfaces — so two
instances in the same subnet can carry completely different rule sets.
A network ACL instead enforces at the subnet boundary itself, applying
identically to everything inside that subnet regardless of which
resource the traffic is headed to or from.

Where does a network ACL enforce its rules, compared to where a security group enforces its rules? :: A network ACL enforces at the subnet boundary and applies identically to every resource in that subnet; a security group attaches to individual resources (their network interfaces), so two instances in the same subnet can have entirely different security group rules. ^card-94pj

The two also disagree on what a rule is even allowed to do. A security
group has no deny rule at all — it can only permit traffic, so a port
that isn't opened by any attached security group's rules is denied purely
by the absence of a permitting rule. A network ACL supports both allow
and deny rules, each numbered, evaluated in ascending order, with the
first matching rule deciding the traffic's fate no matter what a
higher-numbered rule would otherwise have done.

How does a security group deny traffic, given that it has no deny rule, and how does that differ from how a network ACL reaches a deny decision? :: A security group denies implicitly — traffic not matched by any allow rule is dropped simply because nothing permitted it. A network ACL denies explicitly, using its own numbered deny rules evaluated in order alongside its allow rules, so an earlier deny can block traffic a later, more permissive rule would have allowed. ^card-7x1c

> [!card] mcq
> Which single statement correctly holds true for BOTH security groups and network ACLs at once?
> - [x] Both can be used to control traffic at layer 3/4 based on protocol, port, and source or destination
> - [ ] Both are stateful, tracking connections so replies are automatically permitted
> - [ ] Both attach to individual resources rather than to a subnet
> - [ ] Both support explicit deny rules alongside allow rules ^card-4w0c

Statelessness has a consequence that trips people up because it looks
like an application-layer bug. A client's reply to an allowed inbound
connection doesn't come back on the port it connected to — it lands on
whichever high-numbered ==ephemeral== port the client's own OS picked for ^card-hac3
that connection. A network ACL that allows inbound 443 but has no
outbound rule covering that high-numbered range will happily let
requests in and then silently drop every single reply.

> [!card] mcq
> A network ACL allows inbound TCP 443 and allows outbound TCP 443, nothing else. External clients can open HTTPS connections to the instance, but every response times out on the client side. What's the most likely cause?
> - [x] The NACL is stateless, so replies leave on ephemeral ports that aren't covered by any outbound rule
> - [ ] The security group attached to the instance is missing an inbound 443 rule
> - [ ] The NACL's numbered rules are being evaluated out of order
> - [ ] Port 443 cannot be used for stateless firewalls ^card-auqd

A security group's source (or destination) doesn't have to be a CIDR
block — it can name another security group directly. Doing that says
"anything currently carrying security group X may reach this resource,"
which keeps working automatically as instances in the app tier are
launched and terminated, since membership is evaluated by which security
group an instance carries right now rather than by a fixed address.

> [!card] recall
> A three-tier application wants its database tier to accept connections only from instances in its app tier, and the app tier's instance count changes constantly under autoscaling. Explain why referencing the app tier's security group as the database security group's source is a better fit here than writing CIDR-based rules, and what would break if the app tier's address range shifted after a CIDR rule had been written. ^card-lc7e
