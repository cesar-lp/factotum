---
topic: aws
category: aws-step-functions
tags: [step-functions, asl, jsonpath, inputpath, resultpath, outputpath]
citations: ["AWS Step Functions Developer Guide — 'Input and Output Processing'"]
---

# Input and Output Processing

`state-machines-and-the-amazon-states-language.md` says what flows between
states is a single JSON value rather than variables. This note is about
the part that actually trips people up: the sequence of filters and
transforms a state applies to that value on the way in, around the actual
work, and on the way out — and the two stages where data quietly goes
missing.

A state's raw input passes through, in order: `InputPath` narrows the raw
input down to the slice the state will actually use; `Parameters`
reshapes that slice into whatever payload the task or service call
actually needs; then the task itself runs and produces a result;
`ResultSelector` reshapes *that* result before it's combined with
anything; `ResultPath` decides how the result gets combined with the
state's original input; and finally `OutputPath` filters what of the
combined value moves on to the next state.

What is the practical difference between what `InputPath` filters and what `OutputPath` filters? :: InputPath filters the raw input on the way into a state, before Parameters and the task run — it controls what the state gets to work with. OutputPath filters the combined result on the way out, after ResultPath has merged the task's result back in — it controls what the next state receives, and can throw away parts of the input that InputPath let through. ^card-majy

The two stages that actually cause outages aren't the ones people worry
about — they're `ResultPath` and `OutputPath`, because both can silently
drop data that later states need.

`ResultPath` decides whether a task's result **replaces** the state's
entire data, or gets **merged in** as one field of it, alongside
everything that was already there. Leaving `ResultPath` at its default
(`$`, meaning "replace everything") is exactly how a task's output
overwrites input fields a later state was still going to need.

Omitting `ResultPath` on a Task state discards the rest of the state's ==input== the moment that task produces a result, because the default replaces the entire data value instead of adding to it. ^card-prss

> [!card] recall
> A workflow's first state validates an order and its data includes both
> `orderId` and `customerEmail`. The second state calls a Task that looks
> up the shipping cost and returns just a number. A later state needs
> `customerEmail` to send a confirmation, but by then it's gone. What
> ResultPath mistake most likely caused this, and what should the shipping
> lookup's ResultPath have been set to instead of left at its default?
> ---
> The shipping lookup almost certainly left ResultPath at its default of
> `$`, which replaces the entire state data with the task's bare number
> result — discarding orderId and customerEmail along with everything
> else. Setting ResultPath to something like `$.shippingCost` would merge
> the result in as one new field instead, leaving the rest of the data,
> including customerEmail, intact for later states. ^card-zjcf

`OutputPath` causes the same kind of loss from the opposite direction: it
filters the state's combined output down to whatever path you give it,
and anything outside that path simply doesn't reach the next state.

Why is an overly narrow `OutputPath` easy to get wrong without any error being raised? :: Because OutputPath's filtering isn't validated against what later states expect — it just produces whatever JSON is at the given path, silently, even if that's a small fragment missing fields a downstream state needs. There's no failure at the OutputPath stage itself; the failure surfaces later, wherever the missing field first gets read. ^card-72lb

ASL borrows a small piece of ==JSONPath== syntax for all of these path ^card-lo5g
fields: `$` refers to the whole current value, and `$.field` reaches into
one field of it.

`$$` is different from the other two — it refers to the separate
**context object** rather than a location within the workflow's own data.

What kind of information does the context object (`$$`), reached with paths like `$$.Execution.Id`, actually hold? :: Metadata about the execution and state machine itself — things like the execution's ID and start time, or the current state's name — rather than anything from the JSON data flowing between states. It's a second, parallel source of values a path can pull from, separate from the workflow's own input and results. ^card-mz2r

One convention is easy to forget and produces no error when you do:
inside `Parameters` or `ResultSelector`, a field whose *value* should be
computed from a path rather than taken as a literal string needs its key
suffixed with `.$`. `"orderId.$": "$.order.id"` pulls the value from the
path; writing the key as plain `"orderId"` with that same string as its
value assigns the literal text `"$.order.id"` instead of resolving
anything.

> [!card] mcq
> A `Parameters` block is meant to forward the input's `userId` field into
> a Task's payload, but the field is written as `"userId": "$.userId"`
> instead of `"userId.$": "$.userId"`. What does the Task actually
> receive?
> - [x] The literal string `"$.userId"`, not the value of the input's userId field
> - [ ] The Task fails validation before it ever runs
> - [ ] Step Functions infers the intent and resolves the path anyway
> - [ ] An empty string, because the path syntax is malformed ^card-oz6t

Forgetting the `.$` suffix is the single most common ASL bug, precisely
because it fails silently — the state machine still validates, still
runs, and hands the receiving service a string that looks like a path but
is never evaluated as one.
