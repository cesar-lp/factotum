---
topic: aws
category: aws-api-gateway
tags: [api-gateway, resources, methods, integrations, routing]
citations: ["AWS Developer Guide — Amazon API Gateway, 'Set up API integrations for REST API', 'Set up a REST API method'"]
---

# Resources, Methods, and Integrations

A REST API's routing model is a tree: **resources** are path segments
(`/orders`, `/orders/{id}`) arranged hierarchically, and a **method** — a
specific HTTP verb (`GET`, `POST`, `DELETE`) — is attached to a resource
to make that path/verb combination callable. A resource with no method
attached simply isn't invocable; it's a path segment, not an endpoint.

What is the difference between a resource that exists in an API's tree and one that is actually callable? :: A resource is only a path segment. It becomes callable when an HTTP verb is attached to it as a method, and a resource carrying no method is not an endpoint at all — a request to that path fails at routing, before any integration is consulted. ^card-8c1p

What actually determines what a method *does*, though, isn't the resource
tree — it's the **integration** attached to that method. The same
resource and verb can be wired to entirely different kinds of backend
depending on which integration type you choose, and the routing model
alone tells you nothing about that.

The four integration types are:

- **Lambda** — invokes a Lambda function, either as a full proxy (the raw
  request is handed to the function, and the function's response shape is
  used directly) or as a custom integration bound by a stricter
  request/response contract.
- **HTTP** — proxies the request to an existing HTTP endpoint (an ALB, a
  service running on EC2, a third-party API), with API Gateway acting as a
  pass-through or transforming layer in front of it.
- **AWS service** — calls another AWS service's API directly (for
  example, putting an item straight into DynamoDB, or an SQS queue)
  without any compute layer sitting in between at all.
- **Mock** — returns a response API Gateway generates itself, with no
  backend call of any kind; used for CORS preflight responses and for
  testing a route's shape before a real backend exists.

> [!card] mcq
> A `PUT /items/{id}` method is configured with an AWS service
> integration targeting DynamoDB's `PutItem` action. What role does
> Lambda play in serving this request?
> - [x] None — the AWS service integration calls DynamoDB's API directly, with no compute layer involved
> - [ ] Lambda still runs, but only to format the DynamoDB request
> - [ ] API Gateway always invokes a Lambda function internally regardless of integration type
> - [ ] This configuration is invalid; AWS service integrations require a Lambda integration in front of them ^card-rp5x

Because API Gateway is ==synchronous== from the caller's perspective for a ^card-t8yn
REST/HTTP API request — the client is blocked waiting on a response
either way — a Lambda integration behind it is always invoked
synchronously; there is no async or poll-based mode available to an API
Gateway-fronted function, regardless of integration type.

Why can't you infer whether a given API Gateway method's backend is Lambda, an HTTP service, or another AWS service just by looking at the resource path? :: The resource/method pair only defines the route; the integration attached to that method is a separate, independently configured layer that determines the actual backend behavior, so identical-looking paths (`/orders/{id}` in two different APIs) could be backed by a Lambda function, a raw HTTP proxy, or a direct DynamoDB call with nothing about the path itself indicating which. ^card-w5rq

A **mock integration** returns a response with no backend at all — which real use does this serve, beyond testing? :: Serving CORS preflight (`OPTIONS`) requests, which need only a fixed set of response headers and no actual resource lookup; a mock integration lets API Gateway answer these directly without invoking any backend, which would otherwise have to implement OPTIONS handling itself for no functional reason. ^card-l91d

> [!card] recall
> Explain why "what integration type is this method using" is the first
> question to ask when debugging unexpected behavior on a route, before
> looking at the resource path, the method's request settings, or the
> backend service's own logs. ^card-fz6a
