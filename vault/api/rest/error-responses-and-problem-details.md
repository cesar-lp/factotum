---
topic: api-design
category: api-rest
tags: [error-handling, problem-details, validation, rest-api]
citations: ["RFC 9457 (Problem Details for HTTP APIs)", "RFC 8288 (Web Linking)"]
---

# Error responses and Problem Details

A status code says how to classify a failure; it says almost nothing
about what actually went wrong. This note is about the body that goes
with the code — what a well-formed error response contains and why each
piece of it exists.

## Why the status code alone isn't enough

A client that only sees `422 Unprocessable Content` (a distinction
covered in `status-codes-in-practice.md`) has no way to tell which of
several possible validation failures actually occurred, and a human
looking at that response alone has no way to know which field to fix or
what to change about the request. The status code answers "what kind of
problem is this, broadly," but two completely different failures — a
duplicate email versus a password too short — can legitimately share the
same code, and the code carries no information that distinguishes them.

Why is a bare status code like 422 not enough for either a machine client or a human debugging a failed request? :: Because many distinct failures can legitimately share one status code — the code only says what kind of problem occurred in general, not which specific one. A machine client can't branch its handling on "which validation rule failed," and a human has no indication of what to actually change about the request, without more information than the code alone provides. ^card-lsf9

## RFC 9457: Problem Details

RFC 9457 defines a standard JSON shape for an error body, called a
problem detail, so that clients across different APIs can parse errors
the same way instead of every API inventing its own error schema.

```
HTTP/1.1 422 Unprocessable Content
Content-Type: application/problem+json

{
  "type": "https://api.example.com/errors/insufficient-funds",
  "title": "Insufficient Funds",
  "status": 422,
  "detail": "Account balance of 30 does not cover the 50 charge.",
  "instance": "/accounts/12345/transactions/abc"
}
```

The `type` member is a URI that identifies the specific *kind* of
problem, not this one occurrence of it — every insufficient-funds error
across the whole API shares the same `type`.

The `type` field is a ==stable URI== that names a category of problem; RFC 9457 does not require it to be dereferenceable, only consistent, so the same failure kind always reports the same value. ^card-sijr

`title` is a short, human-readable summary of that same problem kind —
also meant to be reusable across every occurrence of it, not written
fresh for each response. `status` repeats the numeric HTTP status code,
mainly so that the code survives being separated from the response's own
status line (for example, once logged or forwarded). `detail` is
occurrence-specific human-readable explanation, filled in with whatever
is particular to this one failure.

The field that identifies this one specific occurrence of a problem, distinct from the general kind named by `type`, is ==instance==, given as a URI reference such as a path to the resource or request involved. ^card-zcbl

> [!card] mcq
> A problem detail's `title` field is "Insufficient Funds" on every
> response describing that error kind. What best describes the intended
> relationship between `title` and `detail`?
> - [x] `title` is a reusable, generic summary of the problem kind; `detail` fills in what's specific to this particular occurrence
> - [ ] `title` and `detail` are redundant and either may be omitted
> - [ ] `detail` is the generic summary and `title` holds the occurrence-specific explanation
> - [ ] `title` is machine-readable and `detail` is only for logging, never shown to a human ^card-m5sj

## A stable code matters more than the message

`type` (or a dedicated application error code alongside it) is what a
client's code should actually branch on, because it's a fixed identifier
that doesn't change between API versions or get reworded by a copywriter.
`title` and `detail` are for a human, and their exact wording is free to
change at any time — a client that parses the human-readable message
to decide what to do (say, checking whether `detail` contains the
substring "balance") will break the moment the wording is tweaked, even
though nothing about the actual error changed.

Why should a client branch its error handling on a field like `type` rather than on the wording of `title` or `detail`, and why is parsing the human-readable message considered fragile? :: `type` is a stable identifier meant to stay constant for a given problem kind across API versions, so code that checks it keeps working as long as the failure kind is unchanged. `title` and `detail` are free-text meant for a human and can be reworded at any time without that being considered a breaking change, so a client that parses their text for meaning can break from a wording change alone, with no change to the actual error. ^card-ic4u

## Validation errors: report every failure, not just the first

A request that fails validation on several fields at once — say, both
`email` is malformed and `password` is too short — should report both
failures in a single response rather than only the first one the server
happened to check. Returning just the first failure forces the client
(or the person filling out a form) to fix one field, resubmit, discover
the next failure, fix that, and resubmit again, one round trip per
mistake instead of one round trip for all of them. A problem detail
handles this with an extension member — commonly an array named
something like `errors`, each entry naming the field and what's wrong
with it — alongside the top-level `type`, `title`, `status`, and
`detail`.

Why should a validation error response report every field that failed validation at once, rather than stopping at the first failure found? :: Reporting only the first failure means the client can only ever fix one problem per request, so a request with several validation errors takes one round trip per error to fully resolve. Reporting all of them at once lets the client (or the person behind it) fix every failing field before resubmitting, cutting an N-error case down to a single retry. ^card-w78n

## The security tension in `detail`

A `detail` message specific and useful enough to actually debug a
failure — naming a table, a query fragment, an internal service, a stack
frame — is also specific enough to teach an attacker something about the
system's internals. What goes into `detail` is therefore a deliberate
editorial decision on the server's part, not just "whatever the
exception message happened to say": an internal error might log its full
detail server-side while returning a generic, safe `detail` to the
client, saving the specific version for cases where the failure is
routine and safe to describe, like a validation failure on the client's
own input.

> [!card] recall
> Explain the tension involved in deciding what to put in a problem
> detail's `detail` field, and describe a reasonable policy for handling
> it (for example, treating a validation failure differently from an
> internal server error).
> ---
> A `detail` message detailed enough to help a legitimate client debug
> its request is also detailed enough to potentially expose internal
> implementation details — table names, internal paths, stack traces —
> to anyone who triggers an error, including an attacker probing the
> system. A reasonable policy distinguishes by cause: a validation
> failure on the client's own input is safe to describe precisely, since
> the client already knows its own request, while an internal server
> error should return a generic `detail` to the client (something like
> "an unexpected error occurred") and log the full, specific detail only
> server-side. ^card-8ei7
