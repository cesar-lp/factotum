---
topic: aws
category: aws-api-gateway
tags: [api-gateway, throttling, token-bucket, api-keys, usage-plans]
citations: ["AWS Developer Guide — Amazon API Gateway, 'Throttle API requests for better throughput', 'Create and use usage plans with API keys'"]
---

# Throttling and Usage Plans

Throttling in API Gateway is a mechanism first, and a business feature
(metering customers) second — the same underlying algorithm serves both
purposes at different scopes, and conflating them is what makes usage
plans confusing on first read.

The mechanism is a **token bucket**: requests consume tokens, tokens
refill at a steady **rate** (the sustained requests-per-second the bucket
allows indefinitely), and the bucket has a **burst** capacity — a maximum
number of tokens it can hold at once, which lets a short spike above the
steady rate through without being throttled, as long as the bucket has
tokens saved up. Once the bucket is empty, additional requests are
throttled with a 429 until refill catches up.

> [!card] mcq
> A client sends a short spike of requests well above the steady-state
> rate limit, and none of them are throttled. What does this tell you
> about the token bucket at that moment?
> - [x] The bucket had enough saved-up tokens (unused burst capacity) to absorb the spike
> - [ ] The rate limit was temporarily disabled during the spike
> - [ ] Throttling only applies to sustained traffic, never to short spikes
> - [ ] The client's requests were exempted because they arrived faster than the bucket could measure ^card-roea

Rate and burst are ==two independent numbers==, not one setting: a low ^card-t4gv
rate with a large burst tolerates occasional spikes but not sustained
high throughput, while a high rate with a small burst handles sustained
load but has little slack for sudden bursts — tuning one without the
other addresses a different failure mode entirely.

Token-bucket throttling exists at more than one scope simultaneously.
Account-level and API/stage-level throttling settings exist to
==protect the backend itself== from being overwhelmed by aggregate ^card-b9zh
traffic, regardless of who's sending it — this is the same protective
purpose throttling serves in DynamoDB (see
`../dynamodb/capacity-and-throttling.md`), even though the mechanism there
is per-partition capacity rather than a token bucket.

An **API key** is not a credential — it doesn't authenticate anyone; it's
an identifier the caller includes with a request so API Gateway knows
which caller a request belongs to. That identification is what makes
per-customer throttling possible at all.

A **usage plan** associates one or more API keys with their own rate,
burst, and **quota** (a request-count ceiling over a longer window, like
a day or month) — layered on top of, not instead of, the account/API-level
throttling. This is the second scope: ==metering a specific customer's== ^card-w2ln
usage against a commercial tier, as distinct from protecting the backend
from aggregate load.

Why does an API need both account/stage-level throttling and per-key usage-plan throttling, rather than just one or the other? :: They answer different questions — account/stage throttling protects the backend from total traffic regardless of source, while a usage plan's per-key limits meter and cap one specific customer's consumption independent of how much headroom the backend has overall; a customer could be well within the backend's total capacity and still need throttling to enforce their commercial tier, and the backend could need protecting from aggregate load even if every individual customer is within their own quota. ^card-f7qk

> [!card] recall
> Explain why an API key by itself provides no security guarantee, and
> what would actually happen if a caller sent requests with no API key at
> all on an API where usage plans are configured. ^card-k3dz
