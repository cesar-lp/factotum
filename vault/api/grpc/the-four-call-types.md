---
topic: api-design
category: api-grpc
tags: [grpc, streaming, service-contract, rpc]
citations: ["gRPC Core Concepts (grpc.io)"]
---

# The four gRPC call types

A gRPC service definition doesn't just name its methods and their
message types — it also fixes, per method, which of four call types
that method uses. That choice is made once, in the `.proto` file, and
every client and server generated from it is stuck with it. A method
cannot decide at runtime to stream back three responses instead of one;
if the contract says unary, the generated stub only has a call-and-wait
shape to offer, full stop.

```
service Catalog {
  rpc GetItem(ItemRequest) returns (Item);
  rpc ListItems(Filter) returns (stream Item);
  rpc UploadPhotos(stream Photo) returns (UploadSummary);
  rpc Chat(stream Message) returns (stream Message);
}
```

The plainest shape, ==unary==, is one request in and one response out — ^card-nm4a
ordinary RPC, no `stream` keyword anywhere in the signature. It's the
default choice for anything that resembles a normal function call:
fetch a record, submit a form, run a computation, and get back a single
answer.

Server streaming keeps the request singular but lets the response be a
sequence: the client sends one message, then reads responses off the
call until the server closes it. This earns its keep when a single
logical request produces results too large or too open-ended to bundle
into one response message — paginating that instead would just be the
server streaming manually, one page at a time — or when the client is
subscribing to a feed of updates it doesn't know the length of in
advance.

Client streaming flips server streaming around: the client sends a
sequence of request messages, the server reads them and answers with
exactly one response once it's ready. This fits uploads, where the
client's data can't be handed over as one message — a large file
naturally becomes many chunks — and aggregation, where the client is
producing an ongoing sequence of readings and just needs the server to
close it out with one summary at the end.

What distinguishes client streaming from server streaming in terms of which side sends a sequence versus a single message? :: In client streaming the client sends a sequence of messages and gets back one response; in server streaming the client sends one message and gets back a sequence of responses. The sequence always sits on the sending side named by the term. ^card-kd7h

> [!card] mcq
> A method needs to accept a phone's photo library, uploaded in chunks
> as the user scrolls, and once every photo has arrived, return a single
> summary of how many were stored and how many failed. Which call type
> fits this method's contract?
> - [ ] Unary
> - [ ] Server streaming
> - [x] Client streaming
> - [ ] Bidirectional streaming ^card-5fze

Bidirectional streaming lets both sides send a sequence of messages, and
critically, those two sequences are ==independent== — neither side is ^card-84rq
obligated to wait for a message from the other before sending its next
one. This is what a request-then-batch-response pattern like client
streaming can't express: an interactive back-and-forth, or a long-lived
session where either party may need to push something at any moment,
such as a chat or a live collaborative edit.

A method that streams a sequence of requests and reads them one at a
time, answering each individually as it arrives rather than waiting for
the whole sequence to finish, is not client streaming even though the
client sends a stream — client streaming's server produces exactly one
response, so an ongoing per-message reply on both sides needs
bidirectional streaming instead.

Why can't an interactive exchange, where either side might send its next message before receiving the other's reply, be built as client streaming with a very chatty final response? :: Client streaming's contract fixes the server to send exactly one response for the whole call, delivered only after it's done consuming the request sequence — there's no way for it to send anything back mid-stream. An exchange where either side needs to push a message before the other has replied requires both directions to carry a sequence, which is what bidirectional streaming's contract provides. ^card-tw75

> [!card] recall
> Name all four gRPC call types and, for each, state which side (client,
> server, or both) sends a sequence of messages rather than a single one. ^card-x3lo

A large or unbounded result set and a subscription to ongoing updates ^card-3duq
sound like different problems, but they're solved by the same call
type. Why does one call type cover both? :: Both cases share the same shape at the .proto level — one request, many responses read off the call as they arrive — regardless of whether "many" means "more than fits in one message" or "an unknown number arriving over time." Server streaming's contract only commits to a sequence of responses; it says nothing about whether that sequence is finite and already known or open-ended and produced live.

Since the call type lives in the service definition rather than in
application code, a team can't retrofit streaming onto a unary method
without changing the contract — every generated stub, on every
language, has to be regenerated from a `.proto` that now says `stream`.
That's a breaking change to the interface, not a tuning knob.

Why is switching a method from unary to server streaming a breaking change to the interface rather than an internal implementation detail? :: The call type is part of the .proto contract that generated stubs are built from on both sides. A unary stub exposes a single call-and-block-for-one-response shape; changing the method to stream responses changes what the generated client code looks like and how it must be called, so every consumer's generated stub needs to be regenerated and its call sites updated. ^card-pycz
