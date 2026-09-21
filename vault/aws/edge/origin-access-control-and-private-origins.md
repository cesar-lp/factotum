---
topic: aws
category: aws-edge
tags: [cloudfront, oac, oai, s3, sigv4, origin-security]
citations: ["Amazon CloudFront Developer Guide — 'Restricting access to an Amazon Simple Storage Service origin'"]
---

# Origin Access Control and Private Origins

Every edge control covered elsewhere in this category — WAF rules,
signed URLs, geo-restriction — is enforced by CloudFront, which means
it only matters if traffic is actually forced through CloudFront. A
distribution sitting in front of a public S3 bucket does not force
that: the bucket still answers requests sent straight to its own URL,
so anyone who finds that URL walks around every control the
distribution was supposed to provide.

**Origin Access Control (OAC)** closes that gap for S3 origins.
CloudFront signs each request it forwards to the bucket using SigV4,
and the bucket policy is written to grant access only when the request
carries a valid signature and originates from that specific
distribution's ==ARN== — which means the bucket can be made fully private, ^card-yr9e
with no public access at all, and still serve the distribution.

> [!card] mcq
> A distribution uses OAC against a private S3 bucket. Someone
> discovers the bucket's direct S3 URL and requests an object from it
> without going through CloudFront. What happens?
> - [x] The request is denied, because the bucket policy only grants access to SigV4-signed requests from that distribution, which a direct request cannot produce
> - [ ] The request succeeds, since OAC only restricts CloudFront's own outbound requests
> - [ ] The request succeeds if the object is publicly cacheable
> - [ ] The request is denied only if the bucket also has Block Public Access enabled ^card-4xri

What single condition does an OAC-protected bucket policy check that a direct request to the bucket's own URL can never satisfy? :: A valid SigV4 signature applied by CloudFront on the origin fetch, scoped to that specific distribution's ARN — a request sent straight to the bucket was never signed by CloudFront at all, so it never carries the credential the policy is checking for, regardless of what other permissions the requester might have. ^card-rfn8

OAC supersedes the older **Origin Access Identity (OAI)**, and the
reasons are concrete rather than stylistic: OAC signs with SigV4, which
OAI does not support, so OAC works with SSE-KMS-encrypted buckets where
OAI cannot decrypt on the origin's behalf; OAC covers every AWS Region
including newer ones, and it isn't restricted to ==S3== the way OAI ^card-0ad7
effectively was, so it also fits other CloudFront-compatible origin
types.

Why does an S3 bucket encrypted with SSE-KMS behind an OAI-based distribution fail to serve objects, in a way that switching to OAC fixes? :: OAI's origin-fetch authentication doesn't carry SigV4 credentials, so it has no way to satisfy the KMS key's own permission check on decrypt; OAC signs the origin request with SigV4, which does carry an identity that can be granted `kms:Decrypt`, so the same encrypted object serves correctly once the distribution is switched from OAI to OAC. ^card-c2vo

Custom origins — an ALB, an API Gateway endpoint, or a plain HTTP
server, none of which are S3 — have no OAC equivalent, so locking them
down comes down to two honest options rather than one clean mechanism.
The first is a ==shared-secret== custom header that CloudFront attaches ^card-zxim
to every origin request, which the origin checks before serving
anything, rejecting requests that lack it or carry the wrong value.

The second is restricting the origin at the network level to accept
connections only from CloudFront's published IP range (its managed
prefix list), so a direct request never even reaches the application —
this is stronger than a header check in one respect (nothing gets a
chance to inspect the request at all) but says nothing about which
*distribution* is calling, only that the caller is CloudFront somewhere.

Why must a shared-secret origin header be rotated periodically, in a way that an OAC-signed S3 request's protection does not need to be? :: Because the header is a single static value baked into the distribution's origin configuration and checked verbatim by the origin — anyone who obtains that value (a misconfigured log, a leaked config file) can replay it indefinitely until it's changed, whereas OAC's SigV4 signature is computed fresh per request from CloudFront's own service credentials and isn't a static secret that can leak from a config file in the first place. ^card-kua2

The principle underneath all of this generalizes past S3 and
CloudFront: an edge control only controls anything if the origin is
unreachable by any other path. WAF, signed URLs, and geo-restriction
all run at the edge — every one of them is decorative unless the origin
itself refuses traffic that skipped the edge to get there.

What does it mean to say that an edge-layer control like WAF or geo-restriction is only as real as the origin's own reachability? :: It means the control's enforcement point (the edge) and the resource it's protecting (the origin) are physically separate, so the control only has teeth if the origin independently refuses any request that didn't pass through that edge; if the origin will answer anyone directly, the edge control filters some traffic but leaves a second, unfiltered path to the exact same data. ^card-ljny
