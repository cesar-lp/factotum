---
category: networking
tags: [delay, queuing, throughput]
citations: ["Kurose & Ross, Computer Networking 8e, Ch. 1.4"]
---

# Delay, Loss, and Throughput

End-to-end delay at each hop is the sum of four components: nodal
processing, queuing, transmission, and propagation delay. Processing delay
covers header inspection and error checking; it is typically the smallest
term on modern routers.

Transmission delay is the time to push all of a packet's bits onto the link,
equal to packet length divided by ==link bandwidth==. Propagation delay is ^card-h7jf
the time for a bit to travel the physical link, equal to link length divided
by the propagation speed of the medium.

What is queuing delay, and what determines how long a packet waits in it? :: The time a packet waits in a router's output buffer before it can be transmitted, and it depends on how many other packets are already queued ahead of it. ^card-jwnf

Traffic intensity is defined as the ratio of the average bit arrival rate to
the link's transmission rate. As traffic intensity approaches ==1==, average ^card-1kkn
queuing delay grows without bound for bursty arrivals, and a full buffer
starts dropping packets.

Why can two routers with the same average load see very different queuing delay? :: Delay depends on the burstiness of arrivals, not just the average rate; bursty traffic causes queues to build even when the long-run average utilization is well below 1. ^card-bn79

End-to-end throughput between a sender and receiver is limited by the
==bottleneck link== — the link along the path with the smallest available ^card-n9op
capacity — regardless of how fast the other links are.

> [!card] mcq
> A path has links of capacity 10 Mbps, 100 Mbps, and 1 Gbps in series. What is the maximum achievable end-to-end throughput?
> - [x] 10 Mbps
> - [ ] 100 Mbps
> - [ ] 1 Gbps
> - [ ] The average of the three, about 370 Mbps ^card-95b6

> [!card] recall
> Explain why queuing delay, unlike transmission and propagation delay, cannot
> be computed from static link properties alone. ^card-yjam
