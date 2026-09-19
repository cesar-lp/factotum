---
topic: networking
category: networking
tags: [internet-structure, access-networks, switching]
citations: ["Kurose & Ross, Computer Networking 8e, Ch. 1"]
---

# Internet Structure and Switching

The Internet's "network of networks" is organized in a rough hierarchy: end
systems (hosts) connect through access networks into local or regional ISPs,
which connect to large tier-1 ISPs that peer with each other at the core.
Content providers increasingly bypass this hierarchy by placing servers
directly inside access and regional networks.

An access network is the link that physically connects an end system to the
first router on its path, sometimes called the ==edge router==. Common ^card-ftnu
examples include DSL, cable, fiber-to-the-home, and cellular.

In circuit switching, for how long is a connection's link capacity reserved? :: A network reserves a fixed slice of link capacity (a circuit) for the entire duration of a connection, whether or not data is being sent. ^card-g80b

In packet switching, how do packets share a link's bandwidth, and how is each one forwarded? :: Data is split into packets that share link bandwidth on demand, each queued and forwarded independently based on store-and-forward transmission. ^card-49sc

Packet switching is more efficient for bursty traffic than circuit switching because unused capacity during silent periods can ==be given to other flows== instead of sitting idle. ^card-cml7

> [!card] mcq
> Why can packet-switched networks experience congestion that circuit-switched networks cannot?
> - [x] Packets from many flows statistically share link capacity, so aggregate demand can exceed it
> - [ ] Packets are always larger than the reserved circuit capacity
> - [ ] Circuit switching uses more bandwidth per connection
> - [ ] Packet switching requires a dedicated end-to-end path ^card-kzzj

> [!card] mcq
> What is a tier-1 ISP?
> - [x] A network that peers with other tier-1 networks to form the global backbone, with no ISP above it
> - [ ] The ISP that directly serves residential customers
> - [ ] A regional network that only connects to one upstream provider
> - [ ] A content delivery network embedded inside access networks ^card-ubb3

> [!card] recall
> Describe the store-and-forward transmission behavior of a packet switch and
> why it adds delay proportional to packet size. ^card-27or
