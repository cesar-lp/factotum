---
topic: aws
category: aws-api-gateway
tags: [api-gateway, request-validation, mapping-templates, vtl, non-proxy]
citations: ["AWS Developer Guide — Amazon API Gateway, 'Set up basic request validation', 'Set up data transformations for a REST API'"]
---

# Request Validation and Mapping Templates

Two separate mechanisms let a REST API do work on a request before a
single line of backend code runs: request validation and mapping
templates. They solve different problems and only one of them needs a
non-proxy integration to matter.

**Request validation** checks an incoming request against a JSON Schema
model (or a simpler required-parameters check) at the gateway itself,
==before== the request is passed to any integration. A request that fails ^card-n2xj
validation never reaches the backend at all — API Gateway returns a 400
directly. This works the same whether the integration behind it is proxy
or non-proxy, because it happens earlier, at the method level.

> [!card] mcq
> A method has request validation configured to require a `body` field
> matching a schema, and a request arrives missing that field entirely.
> What happens?
> - [x] API Gateway returns a 400 without ever invoking the integration or backend
> - [ ] The request reaches the Lambda function, which is expected to check for the missing field itself
> - [ ] The request is queued until a valid retry arrives
> - [ ] Request validation only warns in logs; the request proceeds regardless ^card-o061

**Mapping templates**, by contrast, only apply to **non-proxy**
integrations: they use Velocity Template Language (VTL) to transform the
incoming request into whatever shape the integration expects on the way
in (the integration request template), and to transform the raw
integration response into whatever shape you want the client to see on
the way out (the integration response template). A proxy integration has
no room for this step — the raw request and raw response pass straight
through by contract.

Why does it make no sense to configure a request mapping template on a Lambda proxy integration? :: Proxy integration's whole contract is that the raw request becomes the event untouched, so there is no transformation stage in that path for a template to run in; mapping templates only exist as a step in the non-proxy request/response pipeline, which proxy integration bypasses entirely. ^card-x8pv

The tradeoff of doing transformation in the gateway rather than the
backend is real in both directions. Putting reshaping logic in a
==mapping template== keeps the backend decoupled from the exact shape of ^card-m1qf
the HTTP request — the same Lambda function or service call can serve
multiple differently-shaped frontends without knowing about any of them —
and it can reject or reshape malformed input before backend code ever
runs. The cost is that VTL is a separate, gateway-specific templating
language: it's harder to unit test, harder to version alongside
application code, and debugging a transformation failure often means
reading API Gateway execution logs rather than stepping through code in
an IDE.

> [!card] recall
> A team is deciding whether to reshape an inconsistent legacy backend
> response into a clean client-facing shape using a mapping template, or
> to fix the reshaping in the Lambda function itself. Explain the actual
> tradeoff — what does each option buy, and what does each cost in
> maintainability? ^card-p6ln

Why can request validation reject a malformed request even for an integration type that has no mapping template step of its own? :: Request validation happens at the method level, before any integration is invoked at all — proxy or non-proxy — so it isn't part of the integration's transformation pipeline; it's a gate in front of every integration type, which is exactly why it applies uniformly regardless of which integration sits behind the method. ^card-c9zt
