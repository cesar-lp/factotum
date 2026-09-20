---
topic: networking
category: http-protocol
tags: [http1-1, head-of-line-blocking, pipelining, connection-management]
citations: ["RFC 9113 (HTTP/2)", "Grigorik, High Performance Browser Networking"]
---

# Connection management in HTTP/1.1

`http-fundamentals.md` already covers persistent connections: reusing one
TCP connection across many requests instead of opening a fresh one per
object. Reuse solves the handshake-per-object problem, but it does not
solve a separate problem, and that separate problem is this note's
subject.

A persistent HTTP/1.1 connection can only have one request in flight at a
time. The client sends a request, then must wait for the complete
response before it can send the next one on that same connection. If a
request for a large image or a slow-generating page lands at the front of
that queue, every request behind it sits idle until the one ahead
finishes — even though the underlying TCP connection could easily carry
more traffic. This is head-of-line blocking at the application layer: the
protocol's own request/response discipline creates the queue, not
anything about the network underneath it.

Why can a slow response on a persistent HTTP/1.1 connection delay a request that was sent after it, even though the connection has spare capacity? :: HTTP/1.1 allows only one request in flight per connection at a time, so a later request cannot even be sent — let alone answered — until the response to the request ahead of it completes. The delay comes from the protocol's request/response ordering rule, not from any shortage of network bandwidth. ^card-zvlf

The obvious fix is to stop waiting: let the client fire off several
requests back to back on the same connection without waiting for each
response first. That technique is HTTP **pipelining**, and it was
standardised as part of HTTP/1.1 itself.

What does HTTP pipelining allow a client to do that plain persistent HTTP/1.1 does not? :: Send several requests over one connection before any of their responses have arrived, instead of sending each request only after the previous response has fully returned. ^card-uynm

Pipelining sounds like a full answer, but the specification imposed a
constraint that quietly defeated it: a server must return pipelined
responses in the exact order the requests were sent, one at a time, on
that connection. So if the first of five pipelined requests happens to be
the slowest to produce, the other four sit fully computed and waiting —
they still cannot be delivered until the first one is done. Ordering
turned pipelining into a longer queue rather than a parallel one.

> [!card] recall
> HTTP pipelining lets a client send several requests without waiting for
> each response in between. Explain why this still does not prevent one
> slow request from delaying requests that were queued behind it. ^card-1xrn

Beyond the ordering rule, pipelining ran into a second, more mundane
failure: much of the internet's deployed hardware simply handled it
badly. Transparent proxies, load balancers, and even some servers had
never been tested against pipelined traffic and mishandled it — dropping
requests, corrupting the order, or serving the wrong response body to the
wrong request. Because these were silent, hard-to-diagnose failures
scattered across intermediaries nobody controlled, browser vendors
concluded pipelining was not safe to enable by default, and it was
effectively abandoned in practice despite being part of the standard.

> [!card] mcq
> Beyond the in-order response requirement, why did major browsers never enable HTTP pipelining by default?
> - [x] Deployed intermediaries such as proxies handled pipelined requests unreliably, causing silent corruption
> - [ ] Pipelining was never actually included in the HTTP/1.1 specification
> - [ ] Pipelining required a new TCP option unsupported by most operating systems
> - [ ] Pipelining only worked over encrypted connections, which were rare at the time ^card-l50q

With pipelining a practical dead end, browsers worked around
application-layer head-of-line blocking a different way: instead of one
connection to a server, open several. The de facto convention that
emerged was roughly ==six== parallel connections per origin (host plus ^card-wbf9
scheme plus port).

Opening six connections instead of one is not free. Each connection is a
fully independent TCP flow: each needs its own handshake before carrying
data, and each keeps its own congestion window that starts small and has
to grow, so early requests on a freshly opened connection travel slower
than they would on a connection already warmed up. Six connections also
means six times the server-side and client-side resources devoted to one
origin.

What are the two per-connection costs a browser accepts by opening roughly six parallel connections to one origin instead of reusing a single connection? :: Each additional connection needs its own setup handshake before it can carry data, and each maintains its own separate congestion window that starts small and ramps up independently, rather than sharing one already-warmed connection's capacity. ^card-wlkq

Because the six-connection limit is applied per *origin*, developers
found a way to get more parallelism than the browser's own default: split
a site's resources across several subdomains — `img1.example.com`,
`img2.example.com`, and so on — so the browser treats each as a separate
origin and opens six connections to each of them. This workaround is
called domain **sharding**.

> [!card] recall
> Domain sharding serves a site's resources from several different
> subdomains instead of one hostname. Explain, in terms of how browsers
> apply the parallel-connection limit, why this gets a page more
> simultaneous connections than staying on a single hostname would. ^card-9dxk

Sharding bought parallelism, but it did so by multiplying exactly the
costs identified above: every additional shard is another hostname to
resolve and another set of connections to hand-shake and individually
ramp up, so pushing the shard count too high could cost more in setup
overhead and server-side connection management than it gained in
parallel transfer. Once the underlying limitation sharding was built to
route around no longer applied, the technique had nothing left to offer
and only the overhead remained — which is exactly the situation the next
note describes.

Why could aggressive domain sharding end up slowing a page down rather than speeding it up, given what each extra shard costs? :: Each additional shard is a new hostname needing its own DNS resolution and its own set of TCP connections, each with a handshake and a cold congestion window; past a certain shard count that per-connection overhead outweighs the benefit of the added parallelism. ^card-j57z
