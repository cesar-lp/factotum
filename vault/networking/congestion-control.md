---
topic: networking
category: networking
tags: [congestion-control, tcp, transport-layer]
citations: ["Kurose & Ross, Computer Networking 8e, Ch. 3.6-3.7"]
---

# TCP Congestion Control

TCP treats the network itself as a resource that must be shared without
explicit coordination, so senders probe for available capacity and back off
when they infer it has been exceeded, generally treating packet loss as a
==congestion== signal. ^card-uprv

AIMD (additive increase, multiplicative decrease) governs steady-state
behavior: on each successful round trip the congestion window grows by
roughly one segment, but on a detected loss the window is cut, typically
==in half==. This sawtooth pattern keeps senders probing for more bandwidth ^card-iwku
without piling on indefinitely.

During TCP slow start, how fast does the congestion window grow, and how does that compare to AIMD? :: The initial phase after a connection starts (or after a timeout), where the congestion window doubles every round trip until it reaches a threshold or a loss occurs, growing far faster than AIMD's linear increase. ^card-sbuh

What triggers TCP's fast retransmit, and why does it beat waiting for the timer? :: A sender that receives three duplicate ACKs for the same segment infers that segment was lost and retransmits it immediately, without waiting for the retransmission timer to expire. ^card-3mgt

Fast retransmit lets TCP recover from an isolated loss in roughly one round
trip instead of waiting a full ==timeout== interval, which is much longer ^card-z816
than a typical RTT.

Why does TCP reduce its window more aggressively after a timeout than after fast retransmit (three duplicate ACKs)? :: A timeout suggests a more severe congestion event with no ACKs getting through at all, so TCP resets the window to its minimum and re-enters slow start, whereas duplicate ACKs mean segments are still arriving and only one was lost, so TCP can halve the window and continue. ^card-st5f

CUBIC, used by default in Linux, grows its window as a cubic function of
time since the last loss rather than AIMD's linear growth, letting it reach
a link's available capacity faster on high-bandwidth, high-delay paths than
==Reno==-style AIMD does. ^card-5zh2

> [!card] mcq
> A TCP sender's window is 20 segments when it experiences a timeout. What does it do?
> - [x] Resets the window to 1 segment and re-enters slow start
> - [ ] Halves the window to 10 and continues in congestion avoidance
> - [ ] Leaves the window unchanged and retransmits the lost segment
> - [ ] Doubles the window to probe for more bandwidth ^card-88gi

> [!card] recall
> Explain what "congestion avoidance" means as a TCP Reno phase, and how it
> differs in growth rate from slow start. ^card-q28g
