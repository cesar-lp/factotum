---
topic: api-design
category: api-grpc
tags: [grpc, metadata, interceptors, cross-cutting-concerns, rpc]
citations: ["gRPC Core Concepts (grpc.io)"]
---

# Metadata and Interceptors

A gRPC message body is defined entirely by its schema — every field in
it is something the sender and receiver both agreed to ahead of time.
**Metadata** is the escape hatch next to that: a list of key-value pairs
attached to a call, carried alongside the message rather than inside
it, for information the schema was never meant to describe.

Metadata comes in two batches with different timing. **Leading**
metadata goes out before the first message on the call, which is the
obvious place to put something a receiver needs before it can even
start handling the request — a request id or an auth credential, say.

==Trailing== metadata is the other batch: it is sent only after all the ^card-tlx4
messages on the call, once the handler has actually finished.

That split exists because some facts genuinely cannot be known until
the work is done — a resource actually consumed, a cache actually hit
or missed — so there has to be a slot for metadata that is only ready
at the end. This is why a long streaming call is where trailing
metadata earns its keep: a value the handler can only compute after
producing its last message has nowhere else to go but a trailer.

> [!card] mcq
> A handler wants to attach the number of database rows it scanned
> while satisfying a request. It only knows that count once it has
> finished processing. Where does that value belong?
> - [ ] In leading metadata, sent before the first message
> - [x] In trailing metadata, sent after the call's messages are done
> - [ ] In the message body, since counts are business data
> - [ ] It cannot be communicated outside the message body ^card-iptk

Metadata splits into two attachment points by timing — what are they, and what is each one for? :: Leading metadata, sent before the call's first message (for things a receiver needs up front, like a request id), and trailing metadata, sent after all of the call's messages (for things that are only known once the handler has finished, like a count it only tallies while doing the work). ^card-h9rz

The pull to put "one more useful field" into metadata is constant, and
it is almost always a mistake. Metadata carries **cross-cutting**
context that describes the call rather than the work the call is
doing — request ids, tracing identifiers, auth credentials, locale —
the sort of thing every method needs without any of them being *about*
what a particular method computes.

Business data belongs in the message, and the reason is not
stylistic. The message body is defined by a schema, and that schema is
what gives the parties every compatibility guarantee they get: a field
in it is documented, typed, and versioned. A value stashed in metadata
instead sits outside that schema entirely, so nothing enforces its
shape, its presence, or what happens when one side changes how it is
produced.

A field holding the currency a customer wants their order priced in is ^card-h6zc
being added to a call that already carries a request id and a locale
in metadata. Where should the new field go? :: In the message body, not metadata — it is business data the schema should describe and version like any other field, and putting it in metadata instead would strip away the type-checking, documentation, and compatibility guarantees that come from being part of the schema.

An ==interceptor== is a hook that a client or a server installs once, ^card-teew
and that then runs around *every* call that passes through it, rather
than being wired into each method's own implementation.

Logging, tracing propagation, authentication, retry policy, and
metrics are the classic uses, and they share one property: none of
them is specific to any one method's business logic, so writing them
into every handler by hand would mean the same handful of lines
repeated across the whole service.

Why do concerns like logging, auth, and metrics get implemented as an interceptor rather than as code copied into each RPC method? :: Because those concerns apply uniformly to every call regardless of what that call actually does — putting the logic in one interceptor means it is written and fixed once, instead of being duplicated (and drifting) across every method that needs it. ^card-rzim

> [!card] recall
> A team adds an authentication check by pasting a few lines of
> validation code at the top of every RPC method's handler, instead of
> writing one interceptor. Name two concrete problems this causes as
> the service grows past a handful of methods.
> ---
> New methods are easy to add without the check, since there is no
> single place enforcing that it always runs — an omission fails
> silently. And updating the check (a new header name, a different
> validation rule) means finding and editing every copy correctly,
> where an interceptor would need the change made in exactly one place. ^card-8m5e

Tracing identifiers are a good illustration of what metadata is *for*:
they need to ride along with a call the way a request id does, but
developing how a full tracing system correlates those identifiers
across services is a separate subject from what metadata itself is.

The same caution applies to auth credentials carried as metadata —
they are a typical payload for it, but the schemes for issuing and
validating them are their own topic, not part of what makes something
belong in metadata rather than the message.
