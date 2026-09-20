---
topic: aws
category: aws-api-gateway
tags: [api-gateway, authorizers, iam, cognito, lambda-authorizer, resource-policy]
citations: ["AWS Developer Guide — Amazon API Gateway, 'Control access to a REST API using Amazon Cognito user pools', 'Use API Gateway Lambda authorizers', 'Control access to an API with API Gateway resource policies'"]
---

# Authorizers and Access Control

API Gateway has four independent mechanisms for deciding who may invoke
an API, and mixing them up — treating one as a substitute for another —
is the most common source of confused access-control debugging on this
service.

**IAM authorization** requires the caller to sign the request with SigV4
using their own AWS credentials; API Gateway checks the caller's IAM
identity policy for an `execute-api:Invoke` grant against the specific
method's ARN. This is the natural fit for service-to-service calls
already living inside IAM, where the caller already has an AWS identity.

A **Cognito user pool authorizer** validates a JWT issued by a specific,
configured Cognito user pool — the client authenticates against Cognito
separately and attaches the resulting token to each request. API Gateway
==validates the token's signature and claims directly==; no custom code ^card-yq1n
runs for this path, which is what distinguishes it from a Lambda
authorizer even though both consume a token from the caller.

A **Lambda (custom) authorizer** is a Lambda function you write that
receives the incoming request (token-based, reading a bearer token; or
request-based, reading arbitrary headers/query params) and returns an IAM
==policy document== — an Allow or Deny for the specific method ARN — plus ^card-df7w
an optional context object of arbitrary key-value data that gets passed
through to the backend integration if the call is allowed.

> [!card] mcq
> What does a Lambda authorizer function return to API Gateway on a
> successful authorization?
> - [x] An IAM policy document (Allow/Deny for the method ARN) and an optional context object
> - [ ] A boolean true/false indicating whether to allow the request
> - [ ] The HTTP response to send directly to the client
> - [ ] A signed JWT that API Gateway then validates itself ^card-o1j0

The authorizer's returned policy is ==cacheable== by API Gateway for a ^card-e5tm
configurable TTL, keyed on the caller's identity source (the token or
header value used). This matters because a Lambda authorizer function is
itself just another Lambda invocation, subject to the same cold-start and
execution-latency realities as any other function; caching the resulting
policy means most requests from the same caller within the TTL skip
invoking the authorizer function at all, rather than paying that latency
and cost on every single request.

Why is a Lambda authorizer's output specifically cacheable, in a way that would make no sense for, say, a mapping template's output? :: Because the authorizer's decision (allow/deny plus context) depends only on the caller's identity source, which is stable for a given caller across many requests within a short window — caching it by that identity source correctly reuses the same decision for the same caller, whereas a mapping template's output depends on the full, generally-unique contents of each individual request and has no comparable stable cache key. ^card-h3ov

A **resource policy** is a JSON policy attached to the API itself — not
to any caller's identity — that restricts which principals, source VPCs,
or IP ranges may invoke it at all, evaluated independently of whichever
authorizer (IAM, Cognito, Lambda, or none) is configured on the methods
themselves.

Why can a resource policy deny a request even when the caller passes a Cognito authorizer's token check cleanly? :: A resource policy is a separate, resource-side gate evaluated on top of whatever the method's own authorizer decides — analogous to an S3 bucket policy sitting alongside IAM identity policies — so a caller can satisfy the authorizer entirely and still be denied by the resource policy if it excludes their source VPC, IP range, or principal. ^card-j8bz

> [!card] recall
> A caller successfully obtains a valid Cognito token and the user pool
> authorizer accepts it, but the request is still denied. List the other
> access-control layer that could be responsible, and explain why passing
> the authorizer doesn't guarantee passing it. ^card-a4wm
