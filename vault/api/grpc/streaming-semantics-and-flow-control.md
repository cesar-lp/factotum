---
topic: api-design
category: api-grpc
tags: [grpc, streaming, backpressure, half-close]
citations: ["gRPC Core Concepts (grpc.io)"]
---

# Streaming semantics and flow control

`the-four-call-types.md` covers which call types carry a sequence of
messages on which side. This note is about what that sequence actually
guarantees to the application reading and writing it, and about the one
property — backpressure — that determines whether a stream stays
healthy under mismatched producer and consumer speeds.

A gRPC stream delivers its messages to the reader in the same order the
writer sent them. That ordering guarantee applies within one direction
of one call: it says nothing about how a request stream's messages
interleave with a response stream's messages on the same bidirectional
call, only that each direction, read on its own, comes out in send
order.

It's also worth being precise about the unit that ordering applies to.
A gRPC stream is a sequence of whole application messages, not a byte
stream the application has to frame itself. Whatever transport
machinery divides that data into smaller pieces for transmission is not
something the application sees; it hands over one logical unit and
receives one back, never a partial fragment it must reassemble itself.

Why does saying a gRPC stream carries "whole messages, not bytes" matter for the application code reading it? :: The application never has to buffer partial data and figure out where one message ends and the next begins — every read yields exactly one complete message, in the order it was sent. Any splitting or reassembly needed to move that message over the wire happens beneath the application and is not its concern. ^card-vgns

Either side of a stream can finish sending independently of the other —
this is called ==half-close==. A client that has sent everything it ^card-einf
needs to send can close its sending direction while still reading
responses that keep arriving; the server can likewise finish responding
on its own schedule. Neither side's send-half ending forces the other's
send-half to end at the same moment.

> [!card] mcq
> In a bidirectional streaming call, the client finishes sending its
> last request message and calls half-close. What is the server allowed
> to do afterward?
> - [ ] Nothing further; half-close on either side ends the whole call immediately
> - [x] Keep sending response messages on its own schedule, since half-close only ends the client's sending direction
> - [ ] Only send exactly one final response message, as if the call had been client streaming all along
> - [ ] Re-open the client's sending direction to request more input ^card-qate

Why is it accurate to say the client and server "close" a gRPC stream independently rather than the two of them closing it together? :: Each side controls only its own sending direction. A side that has no more to send finishes that direction on its own, without needing the other side to be done, and without ending the other direction — so the call's two directions can stop sending at different times rather than in lockstep. ^card-6tk1

None of this ordering or half-close machinery solves the problem of a
reader that can't keep up. If a writer is fast and the reader is slow,
something has to give: either the writer is made to slow down to match
the reader, or messages pile up somewhere waiting to be consumed. The
mechanism for the first option is called ==backpressure==: a ^card-lny7
capability for a slow reader to signal a fast writer to hold off, so
consumption speed governs production speed instead of the other way
around.

An application-level detail worth being exact about, in one clause: the
transport underneath gRPC provides windowed flow-control signaling that
makes this slow-down possible in the first place — but what the
application experiences is simply that its writes block or its
callbacks pause until the reader catches up.

What goes wrong if an application ignores backpressure and keeps writing to a stream faster than the reader consumes? :: With nothing to make the writer wait, messages the reader hasn't gotten to yet have to be held somewhere, so they accumulate in an unbounded buffer. That buffer grows for as long as the mismatch continues, consuming memory without limit and turning what should be a flow-control problem into a resource-exhaustion one. ^card-6cs5

A stream that never gets backpressure right doesn't just run slow — it
can be pushed into unbounded memory growth by a producer that never
learns to wait.

It's tempting to think of a gRPC stream as a lightweight queue: messages
go in one end, come out the other, in order. The resemblance stops
there. A stream is not a durable queue.

> [!card] recall
> A client is streaming ledger entries to a server. The connection drops
> partway through. Explain, in terms of what a gRPC stream is and is not,
> why the server cannot assume any of the entries sent so far are safe,
> and why simply reconnecting does not fix this on its own. ^card-fmwq

Nothing about a message sent on a stream is retained by gRPC once the
connection carrying it is gone: there is no replay of messages the
stream already delivered, no acknowledgement that a given message was
durably received, and no redelivery if the receiver never actually
processed it. A stream that dies mid-flight does not come back with its
in-flight messages intact — a fresh connection is a fresh stream, with
none of the previous one's state, and the previous one's messages are
just gone from gRPC's point of view.

Why is "the connection reconnected, so the stream picked up where it left off" a wrong mental model for gRPC? :: A stream does not survive its connection dying — a new connection means a new stream with no memory of the old one's messages or position. Nothing about resuming from a known point, replaying unacknowledged messages, or tracking what was already delivered is handled by gRPC itself; an application that needs that has to build it, for instance by having the stream carry its own resumption markers. ^card-gdly
