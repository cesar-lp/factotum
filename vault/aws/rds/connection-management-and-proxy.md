---
topic: aws
category: aws-rds
tags: [rds, rds-proxy, connections, lambda, pooling]
citations: ["AWS User Guide — Amazon RDS Proxy, 'How RDS Proxy works'"]
---

# Connection Management and RDS Proxy

A relational engine treats a connection as a real, standing resource, not
a lightweight abstraction — which is exactly what makes connection count a
constraint worth designing around, and what RDS Proxy exists to soften.

Each open connection to a relational engine holds a dedicated backend
==process or thread== and a chunk of memory on the database instance for ^card-t5jk
as long as the connection lives, whether or not a query is currently
running on it. That's unlike a stateless HTTP request, where an idle
client costs the server almost nothing between requests.

That per-connection cost is why an application that opens a new connection
per request, or that leaves many idle connections open under bursty
traffic, can exhaust the instance's capacity for connections well before
it exhausts CPU or storage — the bottleneck is holding connections open,
not the queries running on them.

==RDS Proxy== sits between clients and the database instance, multiplexing ^card-mv7x
many client-side connections onto a much smaller, pooled set of
connections it maintains against the database itself — clients see one
connection each; the database sees a stable pool it can actually sustain.

This connects directly to how ==AWS Lambda== executes: each concurrent ^card-lnvo
invocation can run in its own execution environment, and a function that
opens a fresh database connection per invocation has no natural place to
reuse one across environments, so connection count can scale with
concurrency rather than with steady request volume. Putting a proxy in
front absorbs that fan-out on the database's behalf.

Because it holds its own stable connections to the database, RDS Proxy can
also keep client-facing connections open across an RDS failover, masking
some of the reconnect burden that would otherwise land on every connected
client at once.

> [!card] mcq
> Why can a burst of concurrent AWS Lambda invocations threaten to exhaust an RDS instance's connection capacity?
> - [x] Each concurrent execution environment may open its own database connection, so connection count can scale with concurrency rather than steady load
> - [ ] Lambda functions cannot connect to RDS instances directly under any configuration
> - [ ] RDS instances reject all connections from serverless compute by default
> - [ ] Lambda invocations share a single database connection automatically ^card-vgvh

Why is an idle database connection more expensive to a relational engine than an idle HTTP client is to a web server? :: The database engine keeps a dedicated backend process or thread and associated memory allocated for the life of the connection regardless of activity, while a stateless HTTP server has nothing standing to maintain for a client between requests. ^card-3iix

What does RDS Proxy actually do to reduce database-side connection pressure? :: It terminates many client-side connections itself and multiplexes them onto a smaller, pooled set of connections that it maintains against the database, so the database only ever sees the smaller pool rather than one connection per client. ^card-s8bv

> [!card] recall
> Explain why connection-per-invocation compute models like Lambda create
> a structurally different connection-management problem than a small
> fleet of long-running application servers would, and why pooling at a
> proxy layer — rather than in each invocation — is the natural fix. ^card-d567
