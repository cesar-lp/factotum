---
topic: aws
category: aws-api-gateway
tags: [api-gateway, rest-api, http-api, websocket-api, api-types]
citations: ["AWS Developer Guide — Amazon API Gateway, 'Choose between REST APIs and HTTP APIs', 'About WebSocket APIs in API Gateway'"]
---

# API Types: REST, HTTP, and WebSocket

API Gateway offers three distinct API products, not three settings on one
product. Picking the wrong one isn't a matter of missing an optimization —
it's discovering, mid-project, that the type you chose structurally cannot
do something you need.

A **REST API** is the original, full-featured product: request/response
over HTTP, with the complete surface of API Gateway's capabilities —
request validation, usage plans and API keys, response caching, resource
policies, AWS WAF integration, private (VPC-only) endpoints, and
fine-grained request/response transformation via mapping templates.
Everything this category covers elsewhere assumes a REST API unless
stated otherwise, because several of those features simply don't exist
on the other two types.

An **HTTP API** is a newer, deliberately narrower product for the common
case: proxying HTTP requests to a backend (usually Lambda or an HTTP
endpoint) with minimal configuration. It supports JWT authorizers, Lambda
authorizers, and IAM authorization, plus CORS configuration and simple
parameter mapping, but it does **not** support usage plans, API keys,
response caching, request validation, resource policies, direct WAF
association, or private VPC endpoints the way REST APIs do — these are
not "coming later," they are out of scope for what the product is. (A
CloudFront distribution in front of an HTTP API can still have WAF
attached, since the WAF integration point there is CloudFront, not API
Gateway itself.)

> [!card] mcq
> A team needs to meter individual customers with per-key request quotas
> and throttling tiers. Which API type can do this?
> - [x] REST API — usage plans and API keys are a REST API feature; HTTP APIs have no equivalent
> - [ ] HTTP API — it supports usage plans with a simplified configuration model
> - [ ] Either type — usage plans are a account-level feature independent of API type
> - [ ] WebSocket API — persistent connections make per-connection metering straightforward ^card-58fo

The real choice between REST and HTTP APIs is **feature surface versus
simplicity and latency**, not price. If you need caching, usage plans,
request validation, or mapping-template transformations, a REST API is
the only option regardless of what it costs; if your backend is a single
==Lambda proxy== integration with no gateway-side transformation needs, an ^card-h4qk
HTTP API gets you there with less configuration and lower added latency,
because it has less machinery in the request path to begin with.

Why does an HTTP API typically add less latency to a request than a REST API serving the same route? :: An HTTP API has a narrower feature set by design — no mapping-template evaluation, no usage-plan lookup, no cache check — so there is less processing API Gateway must do per request; the latency difference is a direct consequence of the reduced feature surface, not an independent tuning knob. ^card-9j3m

A **WebSocket API** is a different shape of problem entirely: it manages
persistent, bidirectional connections rather than discrete request/response
cycles. Instead of resources and HTTP methods, routing is driven by a
==route selection expression== evaluated against the content of each ^card-k7pl
inbound message, with reserved routes (`$connect`, `$disconnect`,
`$default`) for connection lifecycle events that have no message body to
route on.

> [!card] recall
> Explain why "REST API vs. HTTP API" is a meaningful either/or decision
> that can force a redesign later, rather than a setting you can safely
> change after launch if you guessed wrong. ^card-q2vd

A team building a chat feature that needs the server to push messages to
clients without the client polling would need which API type, and why would a REST or HTTP API not fit? :: A WebSocket API, because REST and HTTP APIs are both request/response — the client always initiates — with no mechanism for the server to send data over a connection the client isn't actively requesting on; only a WebSocket API keeps a connection open that either side can push through. ^card-3fbz
