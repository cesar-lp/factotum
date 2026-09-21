---
topic: aws
category: aws-edge
tags: [route53, dns, hosted-zones, alias-records, ttl]
citations: ["Amazon Route 53 Developer Guide — 'Working with hosted zones'"]
---

# Route 53 Hosted Zones and Records

A **hosted zone** is a container for all the DNS records belonging to
one domain, and Route 53 assigns every zone its own set of four
authoritative name servers when the zone is created. Creating the zone
and having the rest of the internet actually ask it questions are two
separate steps: **delegation** is the act of updating the domain's
registrar so its NS records point at those four name servers. A zone
that exists, fully configured, but was never delegated resolves for
nobody — the registrar is still sending resolvers somewhere else
entirely — which is the confusing first failure anyone hits after
creating a zone and expecting it to just work.

> [!card] mcq
> A hosted zone for `example.com` is created in Route 53 with several
> records already added, but the domain's registrar still lists the
> registrar's own default name servers. What happens when someone looks
> up `example.com`?
> - [x] Resolution never reaches Route 53 at all — the registrar's name servers answer instead, ignoring everything configured in the new zone
> - [ ] Route 53 and the registrar's name servers are both queried and merged
> - [ ] The lookup fails outright with NXDOMAIN
> - [ ] Route 53 answers correctly, since the zone itself is fully configured ^card-jngs

What has to happen, beyond creating a hosted zone and adding records to it, before any resolver in the world will actually ask that zone for answers? :: The domain's registrar has to be updated to list that zone's four Route 53 name servers as the domain's NS records — this is delegation, and until it's done, resolvers keep asking whatever name servers the registrar currently points at, unaware the new zone exists. ^card-aro4

Zones also split into **public** and **private**. A public hosted zone
answers to the whole internet; a private hosted zone only answers
queries originating from VPCs it's explicitly associated with, which is
the mechanism behind split-horizon DNS — the same name resolving
differently depending on whether the resolver sits inside one of those
associated VPCs or out on the public internet.

Several record types are worth knowing by what each is for: **A** and
**AAAA** map a name to an IPv4 or IPv6 address; **CNAME** maps a name to
another name; **MX** routes mail for the domain to specific mail
servers; **TXT** holds arbitrary text, commonly used for domain
ownership or validation proofs (including the ACM DNS-validation record
covered in `certificates-and-acm.md`); and **NS** records name a zone's
authoritative name servers, which is exactly what delegation points the
registrar at.

Route 53 adds one record type of its own beyond the standard DNS set:
the ==alias== record, which behaves like a CNAME but is resolved ^card-i0f4
internally by Route 53 rather than being a real DNS-level CNAME.

Why does that distinction matter in practice? A CNAME record, by DNS
protocol rules, cannot coexist with other records at a zone's ==apex== ^card-v7sc
— the bare `example.com`, with no subdomain — because that name also
needs NS and SOA records, and DNS forbids a name from carrying both a
CNAME and other record types at once.

That restriction makes pointing the bare domain itself at a CloudFront
distribution or an ALB, both of which only expose a DNS name rather than
a stable IP, impossible with a plain CNAME. Route 53's alias record
sidesteps the problem entirely: it's evaluated internally by Route 53
rather than existing as a real CNAME on the wire, so nothing stops it
from being placed at that top-level name.

> [!card] recall
> Explain why `example.com` (no subdomain) can point at a CloudFront
> distribution using a Route 53 alias record but not using a standard
> CNAME record, and why alias queries also come at no additional cost.
> ---
> DNS forbids a CNAME from coexisting with other record types at the
> same name, and a zone apex always needs NS and SOA records there too
> — so a CNAME at the apex is invalid regardless of what it points to.
> An alias record isn't a real CNAME on the wire; Route 53 resolves it
> internally to the target's current address before answering, which
> both makes it legal at the apex and means Route 53 doesn't bill it as
> a lookup the way it would a standard query, since alias resolution
> happens as an AWS-internal lookup rather than a queried DNS record. ^card-lt71

Alias records carry a second advantage beyond being apex-legal: they
resolve to the target's ==current== address automatically, so a ^card-htps
CloudFront distribution's or ALB's underlying IPs can rotate without the
alias record itself ever needing an update.

Every record carries a **TTL**, which controls how long resolvers are
allowed to cache an answer before asking again — and TTL is therefore
the ceiling on how fast any DNS change actually propagates. A record
with a 24-hour TTL means a change made now is still being served stale
by some fraction of resolvers a full day later purely because they
haven't re-asked yet.

Explain why a 24-hour TTL makes a DNS change a poor tool for incident response, even though the change itself takes effect in Route 53 immediately. :: The change is live at Route 53 the moment it's saved, but every resolver that already cached the old answer keeps serving it until that cached entry's TTL expires — with a 24-hour TTL, that can mean a full day before all traffic sees the new value, which is far too slow to redirect traffic away from a failing endpoint during an active incident; failover routing paired with a much shorter TTL is the actual tool for that. ^card-o74a

Even a short TTL is only ever a request, not a guarantee: resolvers and
client-side caches outside Route 53's control can hold an answer longer
than the record's stated TTL, so no TTL setting is a hard promise about
propagation time, only an upper bound on the well-behaved case.
