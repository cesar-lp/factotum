---
topic: api-design
category: api-rest
tags: [async-operations, job-resource, polling, webhooks, long-running-requests]
citations: ["RFC 9110", "WHATWG Fetch Standard (CORS)"]
---

# Async operations and long-running requests

Some work simply outlasts a reasonable request-response cycle: a report
that takes minutes to generate, a video that needs transcoding, a bulk
import of thousands of records. Holding the connection open until the
work finishes looks simplest, but it fails in several ways at once. The
client's own timeout can fire before the server is done. A proxy or load
balancer sitting between them often enforces a shorter timeout than
either endpoint expects, and kills the connection out from under a
request that was actually going to succeed. A client that gives up and
retries can end up firing off a second, separately expensive attempt at
the same work. And for the whole duration there is no way to tell the
caller anything about progress — it either finally gets an answer or it
doesn't.

What makes holding a request connection open until a long-running operation finishes a poor fit, even when the work will eventually succeed? :: Several failure modes stack up at once: the client's own timeout can fire first, an intermediate proxy often enforces a shorter timeout than either endpoint expects and kills the connection regardless of outcome, a client that gives up and retries risks starting a second expensive attempt at the same work, and there is no channel to report progress while it waits. ^card-r9ld

The fix is to stop pretending the operation is synchronous. The server
accepts the request, kicks off the work in the background, and responds
right away with ==202 Accepted== — success in the sense that the request ^card-5fe9
was well-formed and has been queued, but an explicit signal that the
work itself has not completed yet.

That response also carries a reference — typically a URL in a `Location`
header — to a resource representing the operation in progress.

The server represents that in-progress operation as its own
==job resource==, addressable by URL just like anything else in the API, ^card-1pos
with a status representation the client can fetch independently of
whatever the job eventually produces.

Why model the operation as a resource the client can fetch, rather than handing back an opaque ticket string the server interprets internally? :: Because a resource has a uniform way to be addressed and read back — the client just performs a normal GET against its URL and gets a representation of its current state. An opaque ticket has no defined interface: the client would need out-of-band knowledge of some other endpoint and format to check on it. Making the job itself an addressable resource means checking on it, and eventually following a link to whatever it produced, both use the exact same request/response machinery as everything else in the API. ^card-qujs

A GET against the job resource's URL returns its current status. At
minimum that status distinguishes pending, running, succeeded, and
failed:

```
GET /jobs/7f3a
200 OK

{
  "status": "running",
  "createdAt": "2026-09-20T14:02:11Z"
}
```

Once the job finishes, the client needs a way to learn what actually
happened, not just that it's done.

How does a client learn the outcome of an async job, both on success and on failure? :: It keeps fetching the job resource until status leaves pending/running. On success, the response includes a link to the resource the job produced (or updated), so the client follows that link to get the actual result — the job resource itself is a pointer, not the payload. On failure, status becomes failed, and the response should carry enough detail for the client to understand why, though the shape of that error detail is a separate concern from the job mechanism itself. ^card-esnz

```
GET /jobs/7f3a
200 OK

{
  "status": "succeeded",
  "result": { "href": "/reports/9921" }
}
```

The client is expected to poll — issue that GET again after waiting a
bit — rather than hammering the job resource in a tight loop. The server
can make that interval explicit rather than leaving the client to guess.

When a job status response includes a Retry-After hint, what should a polling client do with it, and why is that better than polling on a fixed interval chosen by the client? :: Wait at least that long before the next GET. The server is in the best position to know roughly how much longer the work will take, or to signal that it's currently overloaded and would like clients to back off — a fixed client-side interval either wastes requests polling too often early on or adds needless latency polling too rarely later. ^card-aoe8

> [!card] mcq
> A job takes an unpredictable amount of time to finish, sometimes
> seconds and sometimes many minutes. Which polling strategy best matches
> the job-resource pattern?
> - [x] Poll the job resource at server-suggested intervals until its status leaves pending/running, then follow the result link
> - [ ] Keep the original request connection open and block until the server pushes the final response down it
> - [ ] Poll once immediately after 202, and treat no result yet as failure
> - [ ] Re-send the original request repeatedly until one of the attempts happens to return the final result ^card-eua6

Polling isn't the only option. Instead of the client repeatedly asking
"are you done yet," the server can call the client back once the job
finishes — a webhook. That inverts who initiates the final exchange, and
with it, where the reliability burden sits.

> [!card] recall
> Compare polling a job resource against having the server deliver a
> webhook when the job completes. What shifts from the client to the
> server when the design moves to a webhook, and what new problems does
> the server now have to handle that polling didn't create?
> ---
> With polling, the client controls timing and retries entirely on its
> own side; the server just answers GETs. With a webhook, the server
> becomes responsible for successfully delivering that final callback —
> it has to retry the delivery if the callback endpoint is briefly
> unreachable, and those retries can mean the same completion notice
> arrives more than once, so the receiver has to tolerate a duplicate
> delivery. The client also now needs an endpoint that the server can
> reach from the outside, which polling never required at all. ^card-toxo

A callback endpoint being reachable from the server is itself a
constraint many clients can't meet — a browser or a device behind NAT
has no address the server can call back to — which is why polling a job
resource remains the more universally applicable of the two, even though
a webhook can be far more efficient when the client can host one.
