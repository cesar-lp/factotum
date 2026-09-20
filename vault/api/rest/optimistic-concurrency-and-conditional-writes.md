---
topic: api-design
category: api-rest
tags: [concurrency, conditional-requests, optimistic-locking, preconditions, rest]
citations: ["RFC 9110 (HTTP Semantics)"]
---

# Optimistic concurrency and conditional writes

Two clients both GET the same resource, so each holds its own copy.
Each one edits that copy locally, and each PUTs its version back,
one shortly after the other. Nothing about either PUT looks wrong in
isolation — both carry a well-formed representation of the resource
at the URL they were given. But the second PUT simply replaces
whatever the first one wrote, and the first client's change is gone
as if it had never happened.

No error is raised anywhere in that sequence. Both writes succeed.
Nothing in an access log distinguishes them from two unrelated,
perfectly legitimate updates. This is the ==lost update== problem, ^card-2ufe
and what makes it dangerous is exactly that silence — there is no
signal, at the time it happens, that anything went wrong at all.

Why is a lost update dangerous in a way that a rejected write is not? :: A rejected write is visible — the client gets an error and knows to react. A lost update produces no error on either PUT; both look like ordinary successful writes, so nothing tells either client that its change was silently discarded by the other. ^card-eeq1

One answer to this is pessimistic locking: a client acquires a lock
on the resource before reading it, and nobody else can write until
that lock is released. That works, but it is a poor fit for an API
built around independent, stateless requests. A lock like this has
to be held *across* requests, which means the server must remember
who holds it between one call and the next, and a client that
crashes, times out, or simply wanders off mid-edit leaves the
resource locked for everyone else, indefinitely, with no request
left to release it.

Why does pessimistic locking fit poorly with an API made of independent, stateless requests, rather than being merely inconvenient? :: Holding a lock across requests requires the server to keep session state tying a lock to whichever client acquired it, and a client that disappears before releasing it — crashing or simply never sending the follow-up request — leaves that resource locked indefinitely, with nothing left to release it. ^card-zbru

The REST answer instead is optimistic: let both writes proceed
without ever blocking anyone, and only check for a conflict at the
moment a write actually happens. The client that read the resource
already has its validator from that GET. It sends that same validator
back on the write, and the server compares it against the resource's
*current* validator before applying anything.

The mechanism for a PUT is the ==If-Match== header, carrying the ^card-tnpt
validator the client read earlier as a precondition on the write
itself — "apply this only if the resource still matches what I
last saw."

If the resource has moved on since that read, the validator sent in
If-Match no longer matches, and the server must refuse the write
rather than silently proceeding with stale assumptions. That refusal
has its own status: ==412==, meaning the precondition failed and the ^card-y6gi
write was not applied to the resource at all.

What does a 412 response to a conditional PUT tell the client about the write it sent? :: That the precondition — the If-Match validator — did not match the resource's current state, and the server therefore did not apply the write at all. The resource is unchanged by that request. ^card-rfyv

The same precondition mechanism covers a second failure mode: two
clients both trying to *create* the same resource for the first
time, where neither has read an existing validator because, from
each client's point of view, nothing exists yet to read one from.

How does a client use If-None-Match to make a create fail if the resource already exists, rather than silently overwriting it? :: It sends If-None-Match with a value of "*", which matches any existing representation at all. The server applies the write only if no representation currently exists at that URL, and returns a precondition failure instead of creating over — or replacing — whatever is already there. ^card-qmw9

A 412 is not something a client can shrug off by simply resending
the same PUT — the body it's holding was built against a version of
the resource that no longer exists, so sending it again would just
fail the same precondition check, or worse, silently overwrite
whatever change caused the conflict.

> [!card] mcq
> A client's conditional PUT (with If-Match) gets back a 412. What
> should the client do next?
> - [x] Re-read the resource to get its current state and validator, re-apply its intended change on top of that, and retry the write with the new validator
> - [ ] Immediately resend the exact same PUT request unchanged
> - [ ] Treat 412 like a transient server error and retry after a short backoff with no other changes
> - [ ] Fall back to a plain PUT with no If-Match header, since the conditional one failed ^card-8l2y

> [!card] recall
> Walk through the full sequence, from a client's initial GET through
> a rejected write and its recovery: what does the client hold after
> the GET, what does it send with its PUT, what does a 412 mean about
> that write, and what must the client do before it can succeed?
> ---
> The client's GET returns the resource along with its current
> validator. When the client PUTs its edited copy back, it sends that
> same validator in If-Match, asking the server to apply the write
> only if the resource still matches it. A 412 means the resource
> changed underneath the client since its GET, and the write was not
> applied. The client cannot just resend the same PUT — it must
> re-read the resource to see the new state and validator, re-apply
> its intended change on top of that current state, and retry the
> write with the fresh validator. ^card-uqzq
