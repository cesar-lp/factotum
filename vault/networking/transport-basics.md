---
category: networking
tags: [transport-layer, udp, multiplexing]
citations: ["Kurose & Ross, Computer Networking 8e, Ch. 3.1-3.3", "RFC 768"]
---

# Transport Layer Basics and UDP

The transport layer extends the network layer's host-to-host delivery into
process-to-process delivery, using port numbers to identify which
application on a host should receive a given segment.

Multiplexing :: The sending-side task of gathering data from multiple sockets, wrapping each chunk with header information, and passing the resulting segments down to the network layer. ^card-d82i

Demultiplexing :: The receiving-side task of using header fields to deliver each arriving segment's data to the correct socket. ^card-xoi1

A UDP segment carries very little header overhead: just source port,
destination port, length, and checksum, each occupying ==16 bits==. This ^card-l423
compactness is part of why UDP is favored for latency-sensitive
applications like streaming and DNS.

Unlike TCP, UDP provides no connection setup, no reliability guarantees, and
no congestion control — it simply hands datagrams to the network layer and
lets the application deal with loss or reordering ==itself==. ^card-2uba

The UDP checksum is computed over the segment (header and data) plus a
pseudo-header containing source and destination IP addresses; if the
computed value does not match, the receiver ==discards== the segment. ^card-w4ol

> [!card] mcq
> Why might a real-time voice application prefer UDP over TCP?
> - [x] TCP's retransmission and reordering can add delay that is worse for real-time audio than simply dropping a late packet
> - [ ] UDP guarantees in-order delivery, which voice requires
> - [ ] UDP has a larger header, giving more room for timestamps
> - [ ] TCP cannot be used for audio data at all ^card-eud5

> [!card] recall
> Explain how a socket's (source IP, source port, destination IP, destination
> port) tuple is used differently by UDP demultiplexing versus TCP
> demultiplexing. ^card-p61e
