---
topic: aws
category: aws-edge
tags: [waf, web-acl, rate-limiting, managed-rules]
citations: ["AWS WAF Developer Guide — 'How AWS WAF works'"]
---

# WAF Rules and Rate Limiting

`origin-access-control-and-private-origins.md` covers making an origin
unreachable except through the edge in front of it; this note covers
what that edge actually does to the requests it lets through. A **web
ACL** is an ordered list of rules evaluated against every incoming
request, and each rule resolves to one of four actions: allow, block,
count, or challenge.

**Count mode is the feature that makes WAF safe to adopt.** A rule
deployed in count mode runs against every real request and records what
it *would* have done, without actually blocking anything — which means
you find out how many legitimate customers a new rule would have turned
away before it ever does, instead of discovering it from a support queue
after deployment.

> [!card] mcq
> A team wants to roll out a new WAF rule they wrote themselves but are
> unsure how aggressively it will match real traffic. What should they
> do before switching it to block mode?
> - [x] Deploy it in count mode first and review what it would have blocked against real traffic
> - [ ] Deploy it directly in block mode, since WAF rules rarely produce false positives
> - [ ] Test it only against a staging environment's synthetic traffic
> - [ ] Enable challenge mode instead, since it never fully blocks a request ^card-d0ed

Why is count mode described as what makes WAF "safe to adopt" rather than just a debugging convenience? :: Without it, the only way to learn a rule is too aggressive is to ship it in blocking mode and watch legitimate traffic get rejected — and a rejected legitimate user typically doesn't file a ticket explaining why, they just leave. Count mode lets a rule run against full production traffic and surfaces exactly what it would have blocked, so the false-positive rate is known before the rule can cost you a single real customer. ^card-8udz

Rules come from two places. **Managed rule groups** — AWS's own
baseline set, plus purpose-built groups for SQL injection and known bad
inputs — are maintained and updated by AWS without any action on your
part. **Custom rules** are ones you write yourself, matching on headers,
query strings, geography, or IP reputation. The managed groups' biggest
selling point is also their biggest risk: because AWS pushes updates to
them on its own schedule, new attack signatures get covered automatically
— but a broadened signature can also start matching your own traffic
without any deploy on your side to point to.

Why can traffic that a managed rule group happily allowed yesterday get blocked today, with no change on your end at all? :: AWS updates managed rule groups' contents independently of your deployments, adding coverage for newly discovered attack patterns. If a broadened rule's pattern happens to overlap something in your legitimate traffic, that traffic starts getting blocked purely because AWS changed the rule's definition — not because you changed anything. ^card-ce9l

A **rate-based rule** counts requests over a rolling five-minute window
per ==aggregation key== and blocks or challenges whichever key exceeds ^card-nslq
the configured threshold. The choice of key is the whole design decision:
aggregating on source IP alone punishes an entire office or campus
sitting behind one NAT gateway as if it were a single abusive client,
while aggregating on a header value — like a client identifier, or the
originating address from an `X-Forwarded-For` chain — is what you
actually want once real clients arrive through a shared proxy or load
balancer in front of WAF.

> [!card] recall
> A rate-based rule aggregates on source IP and is deployed in front of
> an API used by a large enterprise customer whose employees all exit
> through one corporate NAT gateway. Explain what goes wrong for that
> customer, and what change to the aggregation key would fix it without
> weakening protection against a real single-source flood.
> ---
> Every employee's request looks, to WAF, like it came from the same one
> IP address, so the whole company's combined traffic gets counted
> against a single key — once their combined legitimate volume crosses
> the threshold, WAF starts blocking or challenging the entire customer,
> not an attacker. Aggregating on a header that identifies the actual
> client instead — an API key, a session token, or the real client
> address carried in a forwarded-for value — separates that traffic back
> into per-client buckets, so one attacker's key still trips the limit
> while the enterprise customer's combined volume never does. ^card-mszi

A web ACL can attach at three different points: CloudFront (globally, at
the edge), an Application Load Balancer, or API Gateway. Attaching at
CloudFront blocks malicious requests earliest and cheapest, since they
never reach the origin infrastructure at all — but only if the origin
truly cannot be reached by any other path, which is exactly the guarantee
`origin-access-control-and-private-origins.md` covers separately.

The honest limits are worth stating plainly. WAF matches ==patterns== in ^card-35j5
requests — headers, bodies, query strings, IP ranges — so it does
nothing against a request that is syntactically and structurally normal
but logically abusive, like a scripted account takeover using valid
credentials or a bot that scrapes public pages one legitimate-looking
request at a time. And every rule evaluated against every request costs
both latency and money — a web ACL loaded with managed groups and custom
rules is not a free filter sitting in front of your traffic.

Why can a request that WAF allows through still be part of an attack? :: WAF operates on the syntactic shape of a request — pattern matches against headers, bodies, query strings, and IP data — not on whether the request's intent is legitimate. A logically abusive request that is structurally identical to a normal one, such as a credential-stuffing attempt using otherwise valid-looking login fields, matches none of WAF's patterns and passes straight through. ^card-jkl9

The real operational cost of WAF is rarely a security incident — it's
the false positive nobody hears about. A blocked legitimate user doesn't
open a support ticket explaining that a rule mismatched their traffic;
they simply leave, which is why count mode and careful aggregation-key
choice matter more in practice than adding one more rule ever does.
