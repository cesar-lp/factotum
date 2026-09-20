---
topic: aws
category: aws-lambda
tags: [lambda, execution-environment, lifecycle, statelessness]
citations: ["AWS Lambda Developer Guide — 'Lambda execution environment'"]
---

# Execution Model and Lifecycle

A Lambda function doesn't run in a bare-metal sense of "always on"; AWS
provisions an isolated **execution environment** (a microVM plus the
runtime and your code) on demand, runs one or more invocations inside it,
and eventually tears it down. Understanding the shape of that environment's
life is the key to writing functions that behave correctly and cheaply.

Every execution environment goes through an ==init phase== before it can ^card-gjio
handle any invocation, during which the runtime starts, your handler's
module-level code runs, and any SDK clients you construct outside the
handler function are created.

The ==invoke phase== runs your handler function itself, once per request, ^card-mxzj
against an execution environment that has already completed init.

> [!card] mcq
> Code written at module scope, outside the handler function, runs during which phase?
> - [x] Init — once, when the execution environment is created
> - [ ] Invoke — once per request
> - [ ] Only during a cold start, never during a warm one
> - [ ] It runs concurrently with every invocation on that environment ^card-8myt

AWS reuses a warm execution environment across multiple invocations rather
than creating a fresh one every time, which is why a global variable set on
one invocation can still be present on the next.

Because the runtime may route the ==next invocation== to the same warm ^card-ux6i
environment, anything expensive to create — a database connection, an
HTTP client, a parsed configuration file — is worth building once at module
scope and reusing, instead of rebuilding it inside the handler on every call.

Reused environment state is a double-edged tool: it saves setup cost, but a
warm environment is never ==guaranteed== on any given invocation, because ^card-wxk7
AWS can, without warning, route a request to a brand-new environment
instead of an existing warm one.

What follows from that guarantee not holding? :: A function must be correct whether or not any prior state survives — never assume a counter, cache entry, or connection set up on a previous call is present, and never rely on side effects from one invocation being visible to another beyond opportunistic reuse. ^card-e15x

Why is it a mistake to open a new database connection inside the handler body on every invocation, rather than at module scope? :: A connection opened inside the handler is created and torn down on every single call, paying the connection-setup cost every time; a connection opened at module scope is created once per execution environment and then reused across every invocation that lands on that same warm environment, amortizing the cost across many requests. ^card-qrgh

> [!card] recall
> A function stores a mutable in-memory cache in a module-level variable to
> avoid a repeated downstream lookup. Explain both why this works most of
> the time, and the concrete way it can produce stale or inconsistent
> results across invocations. ^card-295x

After some period of inactivity, or as part of routine platform
maintenance, AWS reclaims an execution environment; the next invocation
that needs one must go through init again on a fresh environment, which is
what a cold start actually is at the mechanism level.
