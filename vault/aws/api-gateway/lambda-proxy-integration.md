---
topic: aws
category: aws-api-gateway
tags: [api-gateway, lambda, proxy-integration, event-shape]
citations: ["AWS Developer Guide — Amazon API Gateway, 'Set up Lambda proxy integrations', 'Working with AWS Lambda proxy integrations'"]
---

# Lambda Proxy Integration

Lambda proxy integration is a **contract**, not a convenience feature: API
Gateway hands the function the entire request, unmodified, as a
structured event, and in exchange the function is required to return a
response in an exact shape API Gateway knows how to translate back into
an HTTP response. Break either side of that contract and the integration
doesn't degrade gracefully — it fails outright.

On the way in, the event object contains the HTTP method, resource path,
path parameters, query string parameters, headers, the request body (as a
string, base64-encoded if binary), and a request context (identity,
authorizer output if one ran, stage variables). The function receives
==everything== about the request — there is no separate mapping step ^card-vh2r
deciding what parts of the request the function is allowed to see, unlike
a non-proxy integration.

On the way out, the function's return value **must** be an object shaped
like:

```
{
  "statusCode": 200,
  "headers": { "Content-Type": "application/json" },
  "body": "{\"ok\":true}",
  "isBase64Encoded": false
}
```

`statusCode` and `body` are required; `body` must be a **string** (a JSON
object literal is not acceptable — it must already be serialized), and if
the response is binary, `isBase64Encoded: true` must accompany a
base64-encoded `body`.

> [!card] mcq
> A Lambda function behind a proxy integration returns `{"message":
> "success"}` — a plain object with no `statusCode` or `body` field. What
> does the client receive?
> - [x] A 502 Bad Gateway — API Gateway cannot map a response missing the required proxy-integration fields
> - [ ] A 200 with the object serialized directly as the response body
> - [ ] A 500 Internal Server Error, since the function itself technically ran without throwing
> - [ ] API Gateway infers `statusCode: 200` and uses the whole object as `body` ^card-t406

That 502 is the precise, important fact here: a **malformed proxy
response** — missing `statusCode`, a non-string `body`, an unparseable
shape — is not something API Gateway repairs or passes through as-is. It
treats the response as an integration failure and returns a generic 502
to the caller, which means a client-visible error can originate entirely
from a formatting mistake in the function, with no exception ever thrown
inside the function's own code.

Why can a Lambda function "succeed" (run to completion, throw nothing) and still produce a 502 for the caller? :: Because success at the function-execution level and validity at the proxy-integration-contract level are separate questions; if the returned object doesn't match the required shape (string body, present statusCode), API Gateway can't construct an HTTP response from it and reports a 502, regardless of whether the function's own logic completed without error. ^card-y7cn

This is what distinguishes proxy from **non-proxy (custom) integration**:
with proxy integration, there is no mapping template on the way in or the
way out — the ==raw request== becomes the event, and the function's ^card-b3ku
literal return value becomes the response (per the contract above). A
non-proxy integration instead runs the request through a mapping template
before it reaches the function, and runs the function's raw output
through a separate mapping template before it reaches the client — see
`request-validation-and-mapping-templates.md` for what that buys you and
what it costs.

> [!card] recall
> A function currently used behind a proxy integration is returning a raw
> data object instead of the `{statusCode, headers, body}` shape, and
> requests are failing with 502s. Explain what specifically needs to
> change, and why simply "fixing the data being returned" without also
> fixing the shape won't resolve it. ^card-8mtd

What single body-type requirement, if violated, causes a proxy-integration Lambda response to fail even though every other field is present and correct? :: The `body` field must be a string; returning a JSON object or array directly (unserialized) as `body` breaks the contract even with a valid `statusCode` and headers present, because API Gateway expects a literal string it can pass straight through as the HTTP response body, not a structure it needs to serialize on the function's behalf. ^card-r4wp
