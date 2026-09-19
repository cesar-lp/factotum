---
topic: networking
category: networking
tags: [dns, application-layer]
citations: ["Kurose & Ross, Computer Networking 8e, Ch. 2.4", "RFC 1035"]
---

# DNS

DNS resolves human-readable hostnames into IP addresses using a distributed,
hierarchical database rather than a single central server, so that no one
machine has to hold or answer for every name on the Internet.

The hierarchy has three main levels: ==root== servers at the top, which ^card-67w2
point to top-level domain (TLD) servers (`.com`, `.org`, country codes),
which point to authoritative servers that hold the actual records for a
specific domain.

In an iterative DNS query, what does the queried server return instead of the final answer, and who has to follow up? :: A DNS server responds with the address of the next server to ask, rather than the final answer, leaving the requester to follow the chain itself. ^card-vikl

In a recursive DNS query, who does the work of contacting further servers, and what does the original requester get back? :: A DNS server takes on the work of contacting other servers on the requester's behalf and returns only the final answer. ^card-70hq

A local DNS resolver typically issues ==recursive== queries to itself on ^card-vqne
behalf of the client, while it issues ==iterative== queries when walking ^card-z181
down the root-to-authoritative chain.

Common record types include `A` (an IPv4 address), `AAAA` (an IPv6 address),
`CNAME` (an alias to another hostname), `NS` (the authoritative name server
for a domain), and `MX` (the mail server for a domain).

Why does a DNS record carry a TTL, and what happens when it expires? :: The TTL tells resolvers how long they may cache the record before it must be discarded and re-fetched, letting operators trade off staleness against reducing repeated lookups at the authoritative server. ^card-4xz1

> [!card] mcq
> A resolver's cache holds an `A` record with TTL 300 seconds, cached 400 seconds ago. What should the resolver do on the next lookup?
> - [x] Discard the cached entry and query again, since the TTL has expired
> - [ ] Serve the cached entry, since DNS records never truly expire
> - [ ] Serve the cached entry but flag it as insecure
> - [ ] Contact the root servers directly, bypassing the authoritative server ^card-8fw7

> [!card] recall
> Explain why caching DNS results at local resolvers is important for the
> scalability of the whole DNS system. ^card-nur3
