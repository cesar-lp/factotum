---
category: networking
tags: [tcp, transport-layer]
citations: ["Kurose & Ross, Computer Networking 8e, Ch. 3.5", "RFC 9293"]
---

# TCP Connection Management

TCP establishes a connection with a three-way handshake: the client sends a
SYN carrying its initial sequence number, the server replies with SYN-ACK
carrying its own, and the client completes it with an ACK. Data may ride on
that third segment.

Connection teardown is a ==four-way== exchange, because each direction is ^card-rcsz
closed independently with its own FIN and ACK.

The side that closes first enters ==TIME_WAIT== and waits ==2·MSL== before ^card-mdle
^card-btcf
releasing the socket.

What does the TIME_WAIT state protect against? :: Delayed duplicate segments from the old connection being delivered to a new connection reusing the same four-tuple, and the loss of the final ACK. ^card-ixx9

TCP's retransmission timeout is derived from a smoothed RTT estimate plus
four times the RTT ==deviation==. ^card-ng8b

> [!card] mcq
> A TCP receiver advertises a window of 0. What does the sender do?
> - [x] Sends periodic window-probe segments until the window reopens
> - [ ] Retransmits the last segment until acknowledged
> - [ ] Closes the connection after the retransmission timeout
> - [ ] Switches to slow start and continues sending ^card-ulbl

> [!card] mcq
> Which field makes a TCP connection uniquely identifiable on a host?
> - [x] The four-tuple of source IP, source port, destination IP, destination port
> - [ ] The destination port alone
> - [ ] The initial sequence number
> - [ ] The socket file descriptor ^card-zq3q

> [!card] recall
> Explain why TCP's head-of-line blocking hurts a multiplexed protocol like
> HTTP/2, and how QUIC avoids it. ^card-yaqy
