---
topic: api-design
category: api-grpc
tags: [protobuf, wire-format, varint, schema-design, serialization]
citations: ["Protocol Buffers Language Guide (proto3)", "Protocol Buffers Encoding"]
---

# Protobuf schema and wire format

A `.proto` message definition looks like a struct, but what it actually
declares is a set of fields each tagged with a small integer:

```proto
message Order {
  string id = 1;
  int32 quantity = 2;
  string customer_email = 3;
}
```

Those integers — 1, 2, 3 — are field numbers, and they are the single
most important idea in the whole format. A field's name (`id`,
`quantity`, `customer_email`) exists only in the `.proto` source and in
the code a compiler generates from it; the name never appears in a
serialized message at all.

What actually identifies a field once a message is serialized onto the ^card-vloc
wire? :: Its field number — the small integer assigned in the `.proto` definition — not its name. Field names live only in the `.proto` file and in generated code; they never appear in the bytes that get sent.

That single fact is why a decoder doesn't need a lookup table of
strings to parse a message: it reads a number, looks up what that
number currently means, and moves on. It's also why, as the next note
covers, the number becomes something you can never quietly repurpose.

Each field on the wire is written as a **key** followed by its value.
The key packs two things into one integer: the field number and a
wire type, a small tag telling the decoder how many bytes to read next
and how to interpret them (varint, 64-bit, length-delimited, 32-bit,
and so on).

That wire-type tag is only ==three bits== wide, which is exactly why it fits alongside a field number in the same single byte for numbers 1 through 15. ^card-05m5

> [!card] mcq
> What two pieces of information does a field's key encode on the
> protobuf wire?
> - [x] The field number and the wire type
> - [ ] The field number and the field name
> - [ ] The field's type name and its byte length
> - [ ] The message name and the field number ^card-wjdc

Integer fields — `int32`, `int64`, `bool`, enums — use **varint**
encoding: each byte holds 7 bits of the value plus one continuation
bit, so the encoder emits only as many bytes as the number actually
needs.

A ==varint== is what lets a field holding the value `1` take a single byte on the wire, instead of the four or eight bytes a fixed-width integer would reserve regardless of how small the value is. ^card-2tay

Strings, byte arrays, and embedded (nested) messages all share one wire
type: length-delimited. The key is followed by a varint giving the byte
length of what follows, and then exactly that many raw bytes — the
decoder never has to guess where the value ends.

Which wire type do a string field and a nested message field share, and what does that wire type prepend to the value's raw bytes? :: Length-delimited encoding; it prepends a varint giving the byte length of the value, so the decoder reads that many bytes and knows exactly where the field ends. ^card-5n3e

The key itself is also varint-encoded, and this is where field-number
choice starts to matter operationally.

> [!card] recall
> Why do field numbers 1 through 15 cost one byte of tag on the wire,
> while field numbers 16 and above cost two bytes — and what design
> advice follows from that for a message with a mix of fields set on
> almost every request and fields set rarely?
> ---
> The key is (field number << 3) | wire type, varint-encoded. With
> three bits already spent on the wire type, a field number up to 15
> still fits the remaining bits of a single byte; 16 or higher spills
> into a second byte. So a message should spend numbers 1-15 on its
> most frequently populated ("hot") fields, saving one byte per
> occurrence of those fields across every message sent, and push
> rarely-set fields to 16 and beyond where the extra tag byte barely
> matters. ^card-u2oy

Put the key encoding and the value encoding together and you get the
format's real payoff. A JSON object re-sends every field's name, as a
quoted string, in every single message — `{"id": "...", "quantity":
2}` pays for the literal text `id` and `quantity` on every wire.

Why can a protobuf-encoded message be dramatically smaller than the equivalent JSON, even though both describe the same data? :: A protobuf message carries no field names at all on the wire — only numeric keys, most of them a single byte — while JSON repeats every field's name as a string in every message it sends. The schema, not the payload, is where the names live in protobuf; JSON has no separate schema, so the names have to travel with the data every time. ^card-koad
