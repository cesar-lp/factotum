---
topic: aws
category: aws-edge
tags: [cloudfront, signed-url, signed-cookies, key-group, access-control]
citations: ["Amazon CloudFront Developer Guide — 'Serving private content'"]
---

# Signed URLs and Signed Cookies

Restricting a single API call to an authenticated caller is a solved
problem: check credentials, decide, respond. Serving private *cached*
content through a CDN is harder, because the whole point of a cache is
that the edge answers without calling back to your application on every
request — so CloudFront has to be able to grant or refuse a request on
its own, using something that travels with the request itself.

That something is a signed policy. A **key group** holds a public key
that CloudFront uses to verify signatures made with the matching private
key you control; every signed URL or signed cookie is a policy — naming
the resource, an expiration, optionally an allowed IP range — signed
with that private key, so CloudFront can check authenticity ==locally== ^card-hfia
at the edge without ever contacting your origin or your app.

> [!card] recall
> Explain why CloudFront needs a public/private key pair and a locally
> verifiable signed policy to serve private content, rather than simply
> calling back to the origin application to ask "is this request
> allowed?" on every hit.
> ---
> The entire value of caching at the edge is answering requests without
> a round trip to the origin. If every access decision needed a
> callback to the app, cached responses would be worthless for private
> content — you'd pay the latency and load cost of an origin call on
> every single request regardless of cache state. A locally verifiable
> signature lets the edge make the access decision itself, using only
> the request and a public key it already holds. ^card-h4zi

A **signed URL** protects exactly one object, and the signature lives
in that object's own query string — it's what you hand someone for a
single download or a single video segment. A **signed cookie** instead
covers every object matching a path pattern, set once and sent
automatically on every subsequent request to that pattern; that's why
streaming and paywalled sites use cookies, not URLs — signing every one
of hundreds of video segments individually would be absurd when one
cookie authorizes the whole session's worth of requests.

Why would a video-streaming site choose signed cookies over signed URLs even though both mechanisms can restrict access to private CloudFront content? :: Because a video stream is served as many small segment files, and a signed URL only authorizes one object at a time — using signed URLs would mean generating and distributing a fresh signature for every segment. A signed cookie is issued once, matches a path pattern covering the whole video (or whole library), and is then sent automatically by the browser on every request that matches it, so one signature covers arbitrarily many objects. ^card-keyy

A policy can be **canned** — a fixed shape covering just resource,
expiration, and optional IP restriction, generated with a simpler API —
or ==custom==, which allows wildcard resource matching and a start time ^card-lxmg
in addition to an expiration, at the cost of writing the policy JSON
yourself.

The interaction with caching is the part that is easy to get backwards:
the signature sits in the query string (for a signed URL) or a cookie
(for signed cookies), and if the cache policy folded that value into
the cache key, every distinct signature would produce its own cache
entry — which means every single user, and every re-signed request
from one returning user, would be a guaranteed miss. The signature
has to be checked by CloudFront's access-control layer and then
excluded from the cache key entirely, so distinct signatures authorizing
the ==same== object still share one cached response. ^card-gz34

What would happen to a private video's cache hit rate if its signed-cookie value were included in the CloudFront cache key instead of being excluded from it? :: The hit rate would collapse toward zero, because every viewer (and every re-issued cookie for the same viewer) carries a distinct signature value, so a cache key that includes it turns every request into a distinct key that nothing else can ever match — the fix is validating the signature for access control while keeping it out of the key that decides cache hits. ^card-7t76

Expiration is the *only* revocation mechanism a signed URL or signed
cookie has. Once issued, there is no server-side call that invalidates
it early — anyone holding it before it expires can use it, which is why
short lifetimes matter for anything sensitive, and why a leaked
long-lived signed URL is a real incident, not just an inconvenience.

Why is a signed URL with a long expiration a meaningfully worse leak than a normal session token if it's exposed in a log or a browser history? :: Because a session token can typically be revoked server-side the moment a leak is discovered, while a signed URL or cookie has no revocation path at all — the signature was already computed and embedded, and CloudFront's edge validation has nothing to check it against except the expiration time baked into the policy, so the only way to limit the blast radius is having chosen a short expiration up front. ^card-qbed

S3's own presigned URLs solve a related but distinct problem: an S3
presigned URL is signed with a caller's IAM SigV4 credentials and
carries exactly that caller's own permissions, checked by S3 itself
(`../s3/access-control-and-presigned-urls.md`), whereas a CloudFront
signed URL is verified at the edge against a key group's public key
that has nothing to do with IAM, and it authorizes access to the
*distribution's* served content rather than exercising anyone's AWS
permissions.
