---
topic: aws
category: aws-api-gateway
tags: [api-gateway, stages, deployments, stage-variables, canary]
citations: ["AWS Developer Guide — Amazon API Gateway, 'Deploy a REST API in Amazon API Gateway', 'Canary release deployments for REST APIs'"]
---

# Stages, Deployments, and Canary Releases

Editing an API's resources, methods, or integrations changes a draft, not
a live endpoint — nothing a client can reach reflects that edit until a
separate, explicit act happens: a **deployment**.

A **deployment** is an immutable snapshot of the entire API's
configuration at the moment it's created — every resource, method, and
integration setting, frozen. Deployments accumulate over the API's
lifetime; a deployment on its own is not reachable by any client, because
nothing points a callable URL at it yet.

A **stage** is a named reference (`prod`, `dev`, `v1`) that points at
exactly one deployment at a time, and it's the stage — not the deployment
— that has an invokable URL. ==Promoting== a change to production means ^card-s6qp
pointing the `prod` stage at a new deployment snapshot; rolling back means
pointing it back at the previous one. Both are metadata operations, not
re-deploys of the underlying configuration.

> [!card] mcq
> A team edits a method's integration in the console, tests it, and is
> satisfied. Their production stage's URL still returns the old behavior.
> What's missing?
> - [x] The edit exists only in the draft configuration; it hasn't been captured as a deployment or pointed to by the production stage
> - [ ] The edit needs to propagate through DNS, which can take time
> - [ ] Console edits require a redeploy of the underlying Lambda function, not the API
> - [ ] The production stage has caching enabled, which is masking the change ^card-xjf5

Why is deployment kept as a separate act from editing the API, instead of every save going live immediately? :: Separating them lets a change be tested against a non-production stage (or a canary slice of production traffic) using the exact deployment snapshot that would go live, and lets a bad change be rolled back instantly by re-pointing the stage at the prior deployment — neither would be possible if editing and going live were the same action, since there would be no earlier, known-good snapshot left to roll back to. ^card-n5pt

**Stage variables** are key-value pairs scoped to one stage, referenceable
inside integration URIs, Lambda function ARNs, and mapping templates. They
let the ==same API definition== point at different backend resources per ^card-r8mf
stage — a `dev` stage's Lambda alias versus a `prod` stage's — without
maintaining separate API configurations for each environment.

> [!card] recall
> Explain how stage variables let one deployment snapshot serve as the
> basis for both a `dev` and a `prod` stage that invoke entirely different
> backend Lambda aliases, without the underlying API configuration itself
> differing between the two stages. ^card-c1wy

A **canary release** lets a stage split live traffic between its current
(base) deployment and a separate canary deployment, by percentage,
instead of switching the stage over all at once. This validates a new
deployment against real production traffic at a controlled, limited
blast radius before promoting the canary to be the stage's full
deployment — the same rollback safety a stage/deployment split provides,
applied gradually rather than as a single all-or-nothing switch.

What would be lost if a canary release forced 100% of a stage's traffic onto the canary deployment the moment it's created, instead of a configurable percentage? :: The entire point of a controlled blast radius — a bad canary deployment would immediately affect all traffic rather than a limited, bounded slice, eliminating the safety margin that lets a team catch a problem on live traffic before it's fully promoted; canary release without a percentage split is just an ordinary full deployment with an extra naming step. ^card-v4xj
