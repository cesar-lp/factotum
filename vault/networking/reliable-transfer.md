---
category: networking
tags: [reliable-transfer, sliding-window, transport-layer]
citations: ["Kurose & Ross, Computer Networking 8e, Ch. 3.4"]
---

# Reliable Data Transfer Protocols

Reliable transfer over an unreliable channel requires handling both bit
errors and packet loss. The simplest approach, stop-and-wait, sends one
packet, waits for its acknowledgment, and only then sends the next — which
wastes link capacity because the sender is idle while a full round trip
elapses per packet.

Pipelining improves on stop-and-wait by letting the sender have multiple
unacknowledged packets in flight at once, bounded by a ==window size==. The ^card-d1vp
two classic pipelined protocols differ in how they recover from loss.

Go-Back-N :: On detecting a lost or out-of-order segment (via a timeout or an out-of-order ACK), the sender retransmits that segment and every segment sent after it, even ones the receiver already got correctly. ^card-4gu6

Selective repeat :: Both sender and receiver maintain a window and buffer out-of-order segments; only the specific lost segment is retransmitted, and the receiver individually acknowledges each correctly received segment. ^card-n2ae

Go-Back-N needs a smaller receiver buffer than selective repeat because the
receiver ==discards== any out-of-order segment instead of buffering it, ^card-jhpu
simplifying the receiver at the cost of wasted retransmissions.

Sequence numbers must be large enough that the sender's window cannot wrap
around and reuse a number still in flight; if it did, the receiver could not
tell a genuinely new packet from a ==retransmission== of an old one. ^card-7ghf

> [!card] mcq
> Under Go-Back-N, a receiver gets segments 0, 1, 3, 4 (segment 2 is lost). What does the receiver do with segments 3 and 4?
> - [x] Discards them, since they arrived out of order, and re-ACKs segment 1
> - [ ] Buffers them and waits for segment 2 to arrive before delivering any
> - [ ] Delivers them to the application immediately, out of order
> - [ ] Sends a NAK for segment 2 and buffers 3 and 4 for later delivery ^card-3ea6

> [!card] recall
> Explain the main tradeoff between Go-Back-N and selective repeat in terms
> of receiver complexity versus retransmission efficiency. ^card-u35o
