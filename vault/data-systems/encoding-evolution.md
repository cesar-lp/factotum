---
category: data-systems
tags: [encoding, schema-evolution, avro, protobuf, compatibility]
citations: ["Kleppmann, Designing Data-Intensive Applications, Ch. 4"]
---

# Encoding and Schema Evolution

**Backward compatibility** means newer code can read data written by
older code; **forward compatibility** means older code can read data
written by newer code. Both matter in practice because during a rolling
deployment, old and new code versions of a service run simultaneously,
and data written by one version must remain readable by the other.

JSON and XML are widely supported and human-readable but ambiguous about
number types (JSON cannot distinguish integers from floats reliably
across implementations) and carry no compact binary representation,
making them inefficient for large-scale data interchange compared to
purpose-built binary encodings.

Protocol Buffers and Thrift both encode fields using a numeric ==tag== ^card-i6zu
(field number) instead of the field name, which keeps encoded messages
compact since the schema (not the data) carries the field names.

> [!card] mcq
> In Protocol Buffers, why must an existing field's tag number never be
> reused for a different field, even after the old field is removed?
> - [x] Old encoded data or old code still refers to that tag number, so reusing it would cause new code to misinterpret old data as the new field
> - [ ] Tag numbers are used to compute a checksum and must be globally unique across all schemas ever written
> - [ ] Protocol Buffers does not allow more than 100 tag numbers per message
> - [ ] Reusing a tag number would break the human-readable field names ^card-gec1

Adding a new field to a Protobuf or Thrift schema is backward and forward
compatible only if the new field is optional (or has a default) and is
not marked required, because old code reading new data will simply not
know about it, and new code reading old data must ill-fall back to a
default rather than fail.

Avro takes a different approach from Protobuf/Thrift: it has no per-field
tag numbers at all, and instead a reader decodes data using both the
==writer's schema== and its own reader's schema, resolving differences ^card-s36d
between them field-by-field.

> [!card] mcq
> Avro readers resolve schema differences by comparing the writer's schema
> to the reader's schema. What must accompany Avro-encoded data for this
> to work?
> - [x] Some way for the reader to obtain the exact schema the writer used (e.g. embedded, versioned in a registry, or negotiated per connection)
> - [ ] The reader's own schema must be sent alongside every record
> - [ ] Avro data is self-describing and requires no schema at all
> - [ ] A checksum of the data must match a checksum of the schema ^card-msto

What problem do a "schema registry" and dataflow through a database (rather than only through service APIs) both illustrate about forward compatibility? :: A value written once (to a database, or a message queue) may be read much later by code that didn't exist yet when it was written, so the encoding format must tolerate schemas evolving over the interval between write and read, not just between two versions deployed at the same moment. ^card-9nhl

Dataflow through services (REST/RPC) couples a request and response in
time, but dataflow through a ==message broker== decouples producers and ^card-hbdp
consumers entirely — they don't call each other directly and don't even
need to be running at the same time.

> [!card] recall
> A REST API adds a required (non-nullable, no default) new field to its
> JSON response. Explain which compatibility guarantee this breaks and for
> whom. ^card-gpne
