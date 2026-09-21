---
topic: aws
category: aws-security
tags: [secrets-manager, caching, runtime, lambda]
citations: ["AWS Secrets Manager User Guide — 'Cache secrets for AWS Lambda functions'"]
---

# Retrieving Secrets at Runtime

`secrets-manager-versus-parameter-store.md` and
`secret-rotation-and-staging-labels.md` cover what a secret store does
and how it stays current. This note is about the part that only shows
up once code actually asks for a value: fetching a secret is a network
call to a throttled, billed API, not a free local lookup, and code that
treats it as free is exactly how a service becomes slow and expensive
at scale.

Every `GetSecretValue` call leaves the process, waits on a service with
its own latency and its own throttle limits, and gets billed per
request. Call it on every incoming request a service handles and you've
added an external dependency, a latency tax, and a cost line to
something that used to be a constant your code already had in memory.
The default expectation should be the opposite: fetch once, **cache**,
and re-fetch on a schedule — not on every use.

A cache needs a ==TTL==, and choosing one is a real trade, not a ^card-ycbm
formality: too long, and a rotated secret keeps getting served stale
long after `AWSCURRENT` moved, so a successful rotation turns into an
outage at the worst possible moment — precisely when the old credential
finally stops being honored. Too short, and the cache barely reduces
call volume at all, undermining the reason it exists.

> [!card] recall
> A team sets a secret cache's TTL to 24 hours to minimize API calls,
> and rotation runs every 12 hours. Explain what happens to requests in
> the second half of each rotation cycle, and why the failure looks like
> a rotation bug rather than a caching bug when someone investigates it.
> ---
> For up to 12 hours out of every cycle, the cache is still serving a
> secret value that's no longer AWSCURRENT — once the old credential's
> grace period (if any) ends, every request using the cached value
> starts failing. It looks like a rotation bug because rotation is the
> event that immediately precedes the failure and the team's mental
> model is "rotation either works or breaks something," when the actual
> defect is a cache TTL longer than the rotation interval, sitting one
> layer away from where rotation itself runs. ^card-tloo

AWS ships answers to this rather than leaving every team to hand-roll
a cache. The **AWS Parameters and Secrets Lambda extension** runs
alongside a Lambda function as a local sidecar, serving cached secret
values over `localhost` so the function's code makes an in-process HTTP
call instead of a cross-network one — the extension owns the TTL and
the refresh, not the function's own code. Outside Lambda, the
**SDK caching libraries** (a `SecretCache` class in several language
SDKs) give the same in-process caching behavior to a long-running
service that isn't Lambda at all.

What does routing secret reads through the AWS Parameters and Secrets Lambda extension change about where the network call actually goes? :: The function's code calls a local endpoint on localhost instead of Secrets Manager directly — the extension is the one making (and caching) the actual cross-network call, so a cache hit inside the function never leaves the execution environment at all. ^card-uida

Three anti-patterns show up repeatedly, and each fails for a different
reason. Baking a secret into a container image or AMI puts it in every
layer of that image and every copy sitting in a registry or snapshot —
rotating the live credential afterward does nothing to the copies
already shipped, so the old value is permanently recoverable by anyone
who can pull an old image. Passing a secret as a plaintext Lambda
==environment variable== is visible to anyone holding ^card-1q00
`lambda:GetFunctionConfiguration` on that function, and it renders
in the console configuration tab in plain text — there's no encryption
boundary protecting it from a principal who can merely describe the
function, let alone invoke it. And fetching fresh on every single
request, the third anti-pattern, is the throttling and cost problem
this whole note opened with, just restated as a habit rather than a
one-off mistake.

> [!card] mcq
> A Lambda function's database password is stored as a plaintext
> environment variable rather than fetched from Secrets Manager. Who
> can see that value without ever invoking the function?
> - [x] Anyone with lambda:GetFunctionConfiguration on that function — the value renders in the console's configuration view and the API response, independent of invoke permissions
> - [ ] No one — environment variables are encrypted and inaccessible outside the running execution environment
> - [ ] Only someone who can also invoke the function and read its logs
> - [ ] Only the account root user, regardless of IAM permissions ^card-5tru

There's a fourth option that sidesteps the runtime code path entirely:
resolving a secret at **deploy time** instead of read time. An ECS task
definition can reference a Secrets Manager ARN directly, and the ECS
agent injects the resolved value into the container's environment at
task launch; Lambda supports the same idea for certain configuration.
The application code never calls a secrets API at all — there's no
runtime fetch, no cache, no TTL to get wrong. The cost is that the
injected value is pinned to whatever the secret held at that specific
deploy or task launch; a rotation afterward has no effect until the
next deploy or task restart picks up the new value.

Why does deploy-time secret injection eliminate an entire class of runtime bugs that caching can't, and what does it give up in exchange? :: It eliminates the runtime fetch path entirely — no network call, no cache, no TTL to mis-tune, so there's nothing left to fail at request time. In exchange, the injected value is frozen to whatever the secret held at deploy or task-launch time; a rotation that happens afterward is invisible to that running task until it's redeployed or restarted, unlike a runtime cache that eventually picks up the new value on its own. ^card-g444

The other side of treating the API as fallible: when a `GetSecretValue`
call gets throttled, it fails outright rather than degrading gracefully.
A service with no cache and no retry logic around that call discovers,
at the worst possible moment, that it is quietly relying on Secrets
Manager's own availability and rate limits — an unacknowledged
==dependency== it inherited silently the day someone added a fetch ^card-02lr
call, long before anyone treated it as one worth protecting against.
