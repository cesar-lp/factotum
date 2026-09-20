---
topic: aws
category: aws-lambda
tags: [lambda, concurrency, scaling, throttling]
citations: ["AWS Lambda Developer Guide — 'Managing Lambda reserved concurrency', 'Configuring provisioned concurrency'"]
---

# Concurrency and Scaling

Lambda's scaling story is really a story about execution environments:
each one handles exactly one invocation at a time, so "how many requests
can this function serve simultaneously" is the same question as "how many
execution environments exist for it right now." This note covers how that
number grows, the two knobs that shape it, and what happens when it's not
enough.

When concurrent invocations exceed the number of existing execution
environments, Lambda responds by creating ==additional environments== in ^card-8fkr
parallel, rather than queuing requests behind the ones already running —
this is what "scaling out" means for Lambda specifically.

Because each environment serves one invocation at a time, a function's
concurrency is fundamentally an ==environment count==, not a property of ^card-jnmq
the code itself; the same handler running on ten environments handles ten
concurrent requests, and on one environment it handles one.

**Reserved concurrency** sets a hard ceiling on how many execution
environments a specific function can use at once, guaranteeing that
capacity for it and also preventing it from ever exceeding that number.

Reserved concurrency is a ==cap==, not a target: it guarantees a function ^card-vrgk
never gets starved of capacity by other functions sharing the account, but
it also means that same function can never scale past the number reserved
for it, no matter how much traffic arrives.

> [!card] mcq
> What is the main functional difference between reserved and provisioned concurrency?
> - [x] Reserved concurrency caps how many environments a function may use; provisioned concurrency keeps a number of environments pre-initialized and warm
> - [ ] Reserved concurrency pre-warms environments; provisioned concurrency caps them
> - [ ] They are two names for the same mechanism
> - [ ] Reserved concurrency only applies to asynchronous invocations ^card-836u

**Provisioned concurrency** keeps a chosen number of execution
environments already through the init phase and sitting idle, so an
invocation that lands on one of them skips init and goes straight to
invoke — it exists to eliminate cold starts for a known baseline of
traffic, not to control how far a function can scale.

Why doesn't provisioned concurrency prevent a function from ever cold-starting? :: Provisioned concurrency only pre-warms a fixed number of environments; traffic beyond that number still has to scale out onto newly created environments the normal way, and those new environments still pay the init phase on their first invocation. ^card-ha66

What happens to a request when a function is already running at its reserved concurrency limit and a new invocation arrives? :: It is throttled — Lambda rejects the invocation rather than creating another environment beyond the cap, and what the caller experiences next depends entirely on the invocation mode (an immediate error for a synchronous caller, an automatic retry for an asynchronous or poll-based one). ^card-zfqm

> [!card] recall
> A function shares an account-level concurrency pool with several other
> functions and has no reserved concurrency configured. Explain the risk
> this creates for that function's availability during a traffic spike on
> an unrelated function in the same account, and how reserved concurrency
> addresses it. ^card-dbtt

Throttling is not a failure of the function's code; it is Lambda declining
to create an environment because a concurrency limit — reserved,
account-level, or otherwise configured — has been reached, and the request
is turned back at the door rather than run and failed.
