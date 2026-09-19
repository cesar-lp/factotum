---
category: os-concurrency
tags: [event-based-concurrency, event-loop, non-blocking-io, select]
citations: ["Arpaci-Dusseau, OSTEP, Ch. 33 (Event-based Concurrency)"]
---

# Event-Based Concurrency

Thread-based concurrency hands each unit of work its own thread and
relies on the scheduler and locks to keep things correct, but that comes
with real costs: thread creation and context-switch overhead, and the
constant risk of races and deadlock whenever threads share state.
Event-based concurrency is a different model built around a single
thread running an ==event loop==: wait for an event, handle it to ^card-u5hp
completion, then wait for the next one.

Because only one event handler runs at a time and each handler runs to
completion before the next begins, there is no interleaving between
handlers within the same loop — shared state can be touched without
locks, since two handlers never execute concurrently with each other.

Why does a single-threaded event loop avoid races over shared state without locks? :: Only one event handler executes at any instant and each one runs uninterrupted to completion before the loop dispatches the next, so no two handlers ever interleave their accesses to shared state — mutual exclusion falls out of the model rather than needing explicit locks. ^card-tven

The loop typically waits on many file descriptors at once using an API
like `select()` or `poll()`, which blocks until at least one of a set of
descriptors is ready for I/O, then returns which ones so the loop can
dispatch the corresponding handlers.

What is the central risk of using a blocking system call inside an event handler? :: Because only one thread runs the loop, a handler that blocks (on disk I/O, a slow lock, or any blocking call) stalls the entire loop — no other event, however ready, can be handled until that call returns, defeating the model's whole purpose. ^card-odtu

To avoid that trap, event-based systems push I/O through ==non-blocking== ^card-xkxb
variants of system calls, which return immediately with an error code
(rather than blocking) if the operation is not ready yet, so the loop
can move on and retry later instead of stalling.

Why is blocking disk I/O more troublesome for an event loop than blocking network I/O? :: Most operating systems lack a general non-blocking interface for disk I/O the way they have one for sockets, so a handler that needs to read from disk has few good options besides blocking the whole loop or offloading the work to a helper thread, which reintroduces some of the concurrency concerns event-based design was meant to avoid. ^card-msrl

A further complication is that state which would live naturally on a
thread's stack across a blocking call (a stack variable held "across"
waiting for a reply) has nowhere to live in a single-threaded event
loop, since the handler returns control to the loop instead of blocking
in place; the program has to manually package that state into a
continuation to resume when the event it was waiting for arrives.

> [!card] mcq
> Why does an event-based server typically avoid ordinary blocking `read()` calls inside its handlers?
> - [x] A blocking call stalls the single event loop thread, delaying every other pending event
> - [ ] Blocking calls are not allowed by the C standard library
> - [ ] Blocking calls always corrupt shared state without a lock
> - [ ] `select()` cannot be used at all once any blocking call exists in the program ^card-glb0

> [!card] recall
> Explain what problem manual state management (turning "the rest of
> this handler" into an explicit continuation) is solving in event-based
> code, and why a thread-based program does not need it. ^card-ocav
