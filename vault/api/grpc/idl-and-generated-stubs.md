---
topic: api-design
category: api-grpc
tags: [protobuf, contract-first, code-generation, stubs, idl]
citations: ["Protocol Buffers Language Guide (proto3)", "Protocol Buffers Encoding"]
---

# IDL and generated stubs

A `.proto` file is an interface definition language document: it
describes a service's messages and methods completely on its own,
independent of any particular client or server implementation written
against it. Nothing about the file requires that a Go server or a
Python client exist yet — the contract can be written, reviewed, and
agreed on before a single line of business logic does.

That ordering is the whole point, and it has a name: ==contract-first== design, where the interface is fixed first and every implementation is built to satisfy it, rather than one team's implementation becoming the de facto interface that everyone else has to reverse-engineer. ^card-0zc0

Contrast that with an implementation-first style, where a server is
built first and its behavior — whatever shape its JSON responses
happen to take — becomes the API by default. A client written against
that server can only discover the real contract by reading the code or
the actual traffic, since there's no independent document the server
is obligated to match.

From that one `.proto` file, a compiler (`protoc`, or a language
plugin) generates two complementary things: client stubs and server
skeletons, the boilerplate a service implementation fills in. Because
generation is mechanical, the same `.proto` file can produce working
stubs and skeletons in many languages at once, all guaranteed to agree
with each other because they all came from the same source.

A generated client ==stub== is what lets a caller invoke a remote method by writing what looks like an ordinary local function call, instead of hand-assembling a request and parsing a response. ^card-wjep

> [!card] mcq
> Generating both client stubs and server skeletons from a single
> `.proto` file, in multiple languages, is possible mainly because of
> which property of the generation step?
> - [x] It's mechanical and deterministic — the same input always produces the same structural output, regardless of target language
> - [ ] The `.proto` compiler executes the business logic itself, so no server code is needed
> - [ ] Each generated language stub silently converts messages to JSON internally
> - [ ] gRPC requires every client and server to be written in the same language ^card-rc48

That guarantee — stub and skeleton, in any language, always agreeing
with the shared `.proto` source — is what contract-first design
actually buys you day to day.

What does generating client code directly from the `.proto` contract prevent that hand-writing an HTTP client against a JSON API does not? :: It prevents the client from drifting out of sync with the contract — the client's code is derived from the same source the server implements, rather than written by hand against documentation or observed behavior that can quietly fall out of date. ^card-2czt

A mismatch between what a client sends and what a contract now expects
also gets caught at a different point in the lifecycle. A hand-written
JSON client that references a field the server renamed only fails when
that code path actually runs, in production if nobody exercised it
first. A generated stub referencing the old field name won't compile
at all once the `.proto` is regenerated, so the mismatch surfaces
before the code ships.

> [!card] recall
> Compare when a contract mismatch is caught for a generated gRPC stub
> versus a hand-written JSON client, and explain why the difference
> exists.
> ---
> A generated stub fails at compile time: the stub's fields and method
> signatures are regenerated straight from the `.proto` file, so a
> reference to a field that no longer exists simply won't build. A
> hand-written JSON client has no such check — it's just calling
> whatever field names its author typed into request and response
> handling code, so nothing catches a stale reference until that exact
> code path executes and fails at runtime, possibly long after the
> server actually changed. The difference exists because the generated
> stub's structure is mechanically tied to the contract, while the
> hand-written client's structure is tied only to what its author
> remembered or copied. ^card-qcit

None of that comes free, though. Generating code from a contract adds
a build step that a plain JSON-over-HTTP API doesn't need, and the
generated output — often thousands of lines per language — has to live
somewhere in the repository, checked in or produced fresh on every
build.

It also creates a coordination requirement that a loosely-typed API
doesn't have: every party consuming the contract has to regenerate
their stubs when the `.proto` file changes, or they keep building
against a stale interface that no longer matches the server.

> [!card] mcq
> A team changes a `.proto` file and pushes the change, but a
> downstream client team doesn't regenerate its stubs afterward. What
> is the most direct consequence?
> - [x] The client keeps building and running against an outdated generated interface that no longer matches the current contract
> - [ ] The client automatically fetches the updated `.proto` file at runtime and adapts
> - [ ] Nothing — generated stubs are wire-compatible across any version of the contract
> - [ ] The server refuses connections from clients running older generated code ^card-lk60

Finally, contract-first generation costs something JSON-and-`curl`
users take for granted: casual exploration. A JSON API can be poked at
with nothing more than a terminal and a guess at the URL; a generated
stub expects to speak to a service through its own compiled interface
and transport, which makes an ad hoc, no-tooling request much less
convenient to try.

Name two concrete costs of contract-first code generation that a plain JSON API avoids. :: An extra build step plus generated code that has to live in the repository, and the need for every consuming team to regenerate their stubs whenever the contract changes; it also loses the ability to casually explore the API with a bare command-line tool the way a JSON-over-HTTP API allows. ^card-0s9z
