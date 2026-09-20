---
topic: aws
category: aws-networking
tags: [vpc, flow-logs, troubleshooting, connectivity, diagnostics]
citations: ["Amazon VPC User Guide"]
---

# Flow Logs and Connectivity Troubleshooting

A flow log captures a record for the IP traffic going to and from a
network interface. What it captures is strictly ==metadata== — source ^card-p5l6
and destination interface, addresses, ports, protocol, packet and byte
counts, and a verdict of ACCEPT or REJECT.

It never captures the payload. A flow log can tell you that a
connection to port 443 was allowed and how many bytes moved, but it
cannot tell you a single byte of what was actually sent.

That distinction is the whole reason flow logs matter for
troubleshooting: they answer "was this traffic let through?", not "what
did this traffic contain?" — and for a huge share of "it can't connect"
problems, that's exactly the question that needs answering.

What fields does a flow log record about a connection, beyond the verdict of ACCEPT or REJECT? :: The interface it crossed, the source and destination addresses and ports, the protocol in use, and counts of the packets and bytes transferred — a description of the traffic's shape and disposition, not its contents. ^card-uvqs

Flow logs can be enabled at three different scopes.

At which three scopes can a flow log be enabled? :: VPC, subnet, or individual network interface — enabling one at a wider scope (VPC or subnet) covers every interface underneath it, while enabling one directly on an interface captures only that interface's traffic. Records are delivered to a log destination for later review. ^card-f7a8

With that vocabulary in place, flow logs turn "the connection just
doesn't work" into something diagnosable, because three unrelated
causes of that complaint leave three different fingerprints in the
log.

A security group rejection appears in the flow log as an inbound
==REJECT== record with no matching outbound entry at all, because a ^card-3w8x
security group evaluates the connection as a single unit rather than
its two directions separately — if the inbound side is denied, there is
no session for a reply to belong to.

A network ACL rejection produces something that looks, at first
glance, like success: the inbound request itself shows up as an
accepted flow. What gives the failure away is the *next* record —
the reply comes back rejected, because a network ACL evaluates inbound
and outbound traffic as two independent rule sets rather than one
stateful connection.

Both a security group rejection and a network ACL rejection can make the same connection fail, but their flow log signatures differ. If the inbound request itself shows up as ACCEPT in the log and the failure only appears on the return trip, which of the two caused it? :: The network ACL. NACLs evaluate each direction of traffic independently, so an accepted inbound request can still have its reply rejected as a separate flow; a security group rejection would instead have shown the inbound request itself as REJECT, with no return trip to speak of at all. ^card-chz2

A missing or incorrect route produces a fingerprint unlike either of
those: nothing at all. No REJECT, no ACCEPT — because the packet never
arrived at the interface in question, there's nothing there to
evaluate or log in the first place.

Unlike either kind of rejection, a routing failure leaves no REJECT record anywhere. Where should you look for evidence of it, and why won't you find a REJECT entry to explain it? :: Look at the destination interface's flow log for the connection's time window and expect to find no entry at all, in either direction. A REJECT record requires the packet to have reached an interface and been evaluated against its rules; a missing or wrong route means the packet was never delivered there, so no evaluation — and no log entry — ever happens. ^card-yel6

Put together, these three signatures give you a rule of thumb for
reading a flow log fast, without walking every rule by hand.

As a rule of thumb, what does it mean if flow logs show a request going out but never any reply, versus showing nothing at all for the attempt? :: Seeing the request but never a reply points at stateless filtering blocking only the return direction, or at an asymmetric route sending the reply somewhere else entirely. Seeing nothing at all — no request logged at the destination either — points at a routing problem or simply the wrong target, since the packet never got there to produce any record. ^card-3r6w

> [!card] mcq
> An application team reports that a connection "just hangs." Flow logs
> at the destination interface show the inbound request accepted, but
> no reply is ever recorded in either direction — not even a rejected
> one. What does this pattern point to?
> - [x] Stateless filtering blocking the return path, or an asymmetric route carrying the reply elsewhere — not a security group problem
> - [ ] A security group rejecting the inbound request
> - [ ] A missing or incorrect route to the destination
> - [ ] An application-layer timeout unrelated to networking ^card-yzac

> [!card] recall
> You're handed three flow log observations from three different
> connectivity complaints:
>
> (a) an inbound REJECT record with no corresponding outbound entry
> (b) an inbound ACCEPT record followed by a rejected return flow
> (c) no flow log entry at all at the destination interface
>
> For each, name the most likely cause and explain the reasoning that
> lets you tell the three apart using only the pattern in the log —
> without inspecting any rule directly.
> ---
> (a) A security group rejection: security groups evaluate a connection
> as one unit, so a denied inbound request never produces an outbound
> counterpart. (b) A network ACL rejection: NACLs evaluate inbound and
> outbound traffic independently, so the request can be accepted while
> its reply is rejected as a separate flow. (c) A missing or wrong
> route: the packet never reached that interface at all, so nothing was
> evaluated and nothing was logged — silence itself is the signature,
> in contrast to the other two, which both leave at least one record
> behind. ^card-r3de
