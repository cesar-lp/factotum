---
topic: api-design
category: api-grpc
tags: [protobuf, schema-evolution, reserved-fields, compatibility, proto2]
citations: ["Protocol Buffers Language Guide (proto3)", "Protocol Buffers Encoding"]
---

# Protobuf schema evolution

`protobuf-schema-and-wire-format.md` establishes that a field number,
not its name, is what identifies a field on the wire. Every rule in
this note is a direct consequence of that one fact, so it's worth
restating before anything else: whatever meaning a reader attaches to
field number 3 today is the meaning every decoder — old and new alike
— will keep attaching to it.

A field number, once a message has shipped and is being read by
clients in the field, can never be assigned a different meaning later.
An old binary that still expects field 3 to hold a customer email has
no way to know the field was repurposed to hold a shipping address; it
will decode the new bytes and hand back what looks like a perfectly
valid email string, silently wrong.

Why is reusing a field number for a different purpose so dangerous, given that field numbers rather than names identify fields on the wire? :: An old reader that never sees the schema change will decode whatever bytes show up under that number using its old understanding of what the number means, producing data that is structurally valid but semantically wrong — with no error to signal the mismatch. ^card-6i4w

The `reserved` keyword exists specifically to make that mistake
impossible to repeat by accident:

```proto
message Order {
  reserved 3, 8 to 10;
  reserved "customer_email";
}
```

Once a number (or a retired field's name) is marked ==reserved==, the compiler refuses to let anyone declare a field that reuses it, turning a silent runtime hazard into a build-time error. ^card-s03o

Given that guarantee, four kinds of schema change each land differently
on the wire.

> [!card] mcq
> A server adds a brand-new optional field to a message and starts
> populating it, while some clients are still running the old
> generated code without that field. What happens when those old
> clients receive a message containing the new field?
> - [x] They ignore or preserve the unrecognized field and parse everything else normally
> - [ ] Parsing fails outright because the message doesn't match the old schema
> - [ ] The new field is silently coerced into whichever old field shares its wire type
> - [ ] The client crashes unless it reserves the field number in advance ^card-zt26

Removing a field is really the mirror image of adding one: the field
declaration goes away, but its number cannot simply be handed to
something else next time someone edits the schema, for exactly the
reuse hazard already covered above.

What must accompany the removal of a field from a `.proto` message, and why? :: Its number should be marked `reserved` in that same change, otherwise nothing stops a later schema edit from assigning that number to something unrelated and reviving the old-reader-misreads-new-data hazard. ^card-3fsq

Renaming a field is close to a non-event on the wire, since the wire
never carries the name at all — an old and a new binary exchanging
messages don't notice a rename happened. What a rename *does* break is
generated code: every caller in every language that referenced the old
field name has to update that reference, or its build simply fails to
compile.

> [!card] recall
> Renaming a `.proto` field is described as "harmless on the wire and
> breaks generated code instead." Explain both halves of that claim.
> ---
> Harmless on the wire: serialized messages are keyed by field number,
> and a rename doesn't touch the number, so an old binary and a new
> binary can still exchange messages with the field renamed on one
> side and not the other, with no decoding problem at all. Breaks
> generated code: the getters, setters, and struct members the
> compiler generates are named after the field, so every piece of code
> that referenced the old name won't compile against the regenerated
> stubs until it's updated — the damage shows up at compile time in
> each language's generated bindings, not on the wire between services. ^card-fgva

Changing a field's declared type is usually breaking, because the wire
type baked into the key changes along with it — an `int32` reader
handed bytes written as a length-delimited `string` has nothing
sensible to decode. A short list of same-wire-type swaps (for example
`int32` to `int64`, or `int32` to a same-width enum) stays compatible
because the underlying wire representation doesn't move, but that list
is the exception, not the rule.

Is changing a field's type from `int32` to `string` generally a safe or a breaking change, and why does that differ from changing `int32` to `int64`? :: Generally breaking — `int32` and `string` use different wire types (varint versus length-delimited), so a reader expecting one can't correctly decode bytes written as the other. `int32` to `int64` stays compatible because both are varint-encoded on the wire; the change is only in how the decoded value is later interpreted in memory, not in how the bytes are read off the wire. ^card-uegx

Proto2 added a `required` modifier, and it turned out to be one of the
format's own design regrets. Marking a field required means any
message missing it fails to parse at all — not just for the field in
question, but for the whole message — which sounds like a useful
guarantee until you try to evolve the schema.

That guarantee is exactly the trap: a `required` field can never be
safely removed, because any client still running old code will keep
sending or expecting it, and any reader enforcing the constraint will
reject every message that omits it. `required` doesn't just constrain
one field's future — it locks the whole message format in place around
that field forever.

Proto3's response was to drop ==required== entirely: every field is effectively optional, and validation that a message is "complete enough" is pushed into application code instead of being enforced by the schema itself. ^card-4agv

Field-number permanence has one more consequence worth naming: it lets
a service evolve by growing one long-lived schema instead of standing
up parallel versioned endpoints the way a REST API often does.

How do field numbers let a protobuf service add new data to a message over time without publishing a new versioned endpoint the way a REST API might? :: Because a new field just claims an unused number and old readers that don't recognize it simply ignore or preserve it, additive change is safe within a single evolving schema — there's no need for a second endpoint or a version marker, since the field number itself is what keeps old and new readers from colliding. ^card-27s9
