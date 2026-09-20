---
topic: security
category: security-tls
tags: [tls, outages, misconfiguration, hsts, interception-proxy]
citations: ["Ristić, Bulletproof TLS and PKI, Ch. 6"]
---

# TLS failure modes and operational pitfalls

The sibling notes on validation and chain-building cover what a client
*checks* and how it decides a certificate is trustworthy. This note is
about what actually goes wrong when TLS is running a real production
service — and almost none of it involves the cryptography failing. The
math holds. What breaks is process, configuration, and clocks.

**Expiry is the single most common cause of TLS outages**, and the
reason is almost embarrassing: unlike an attack, an expiry date is known
in advance, sitting right there in the certificate from the day it's
issued. A service goes down not because anything was compromised, but
because nobody's renewal process or monitoring caught the deadline
before every client started refusing the connection at once, all at the
same moment, with no warning.

Why do teams describe an expired-certificate outage as a process failure rather than a security incident? :: Because nothing was attacked or compromised — the certificate simply crossed a date that was fixed and known from the moment it was issued. The failure is that no renewal automation or monitoring caught the deadline in time, not that any cryptographic protection broke. ^card-h7av

> [!card] mcq
> A production service goes down at midnight because its TLS certificate
> crossed its expiration date with no renewal in place. What kind of
> failure is this, in terms of where the fix belongs?
> - [x] An operational failure — the fix is renewal automation and expiry monitoring, not anything cryptographic
> - [ ] A cryptographic failure — the signature algorithm reached end of life
> - [ ] A key-compromise incident requiring revocation
> - [ ] A protocol-version failure requiring a client update ^card-9re9

A second, subtler failure sits one layer down the chain rather than at
its end. A server is supposed to send its own leaf certificate *and*
every intermediate needed to connect that leaf up to a root the client
already trusts. Operators frequently configure the leaf and forget the
intermediate, or send it in the wrong order — and the connection can
then work in some places and fail in others, which is what makes this
one so instructive.

> [!card] recall
> A server is missing an intermediate certificate from what it sends
> during the handshake. It works fine in a browser during testing but
> fails for a plain HTTP client library in production. Explain why the
> same misconfiguration produces two different outcomes.
> ---
> Many browsers cache intermediates they've seen on other connections,
> or can fetch a missing one from a URL embedded in the leaf, and
> quietly complete the chain themselves. A bare client library usually
> has neither behavior: given only the leaf, it has nothing to build the
> rest of the chain from, so validation fails outright. The
> misconfiguration is identical in both cases — only the client's
> tolerance for it differs, which is exactly why it survives testing on
> a browser and then breaks in production for a different caller. ^card-2lvd

A client's own clock matters just as much as the certificate's dates,
and the sibling note's validity-window check is only as good as the
clock it runs against. If a client's system clock is wrong — set too
far in the past, or too far in the future — a perfectly current
certificate can come out looking not-yet-valid or already expired on
that one machine, even though nothing about the certificate itself is
wrong.

What does clock skew on a client machine cause during certificate validation, and whose fault is it? :: A certificate that is genuinely within its validity window can be rejected as not-yet-valid or expired, because the comparison is against the client's own clock rather than real time — the certificate is fine; the client's clock is wrong. ^card-a0jl

Some networks — corporate environments and security appliances are the
usual case — deliberately break the direct connection between a client
and the site it thinks it's talking to. They do this by installing a
private root certificate into the client's own trust store (often as
part of managed-device setup) and running an interception proxy that
terminates the client's TLS connection, inspects the plaintext, and
opens a fresh TLS connection of its own out to the real site.

> [!card] recall
> Explain, in terms of trust rather than cryptography, why an
> interception proxy's forged-on-the-fly certificate is accepted by the
> client without any warning, and what that means the client is
> actually trusting at that point.
> ---
> The proxy's certificates chain up to a root that was deliberately
> added to the client's trust store, so from the client's point of view
> the chain is completely legitimate — trust was never broken
> cryptographically, it was extended on purpose to whoever controls that
> root. In practice this means the client's TLS connection only ever
> reaches the proxy, and everything from there to the real site is a
> second, separate connection the client has no visibility into and no
> say over. ^card-l9hp

A page served over HTTPS can still undermine itself by pulling in some
of its own resources — a script, a stylesheet, an image — over plain
HTTP instead. Browsers call this ==mixed content==, and for anything ^card-x22a
capable of running code they refuse or warn rather than load it
silently, because an attacker who can tamper with that one plaintext
request can inject or rewrite content that then runs inside the page
the user believes is fully protected.

Finally, HTTP Strict Transport Security addresses a narrower but
sharper gap: the first request to a site, before HSTS has ever been
seen, might still go out over plain HTTP — say, from a bookmark or a
typed bare domain — and a network attacker sitting on that first request
can intercept or redirect it before TLS is ever negotiated. A site sends
an HSTS response header telling the browser to remember, for a stated
duration, that it must ==never attempt an unencrypted connection to this ^card-i0in
host again==, closing that opening for every visit after the first.

> [!card] mcq
> What specifically does an HSTS header prevent, once a browser has
> already seen and remembered it for a given host?
> - [x] The browser ever issuing a plain HTTP request to that host during the remembered period, even if the user types or clicks an HTTP link
> - [ ] An attacker forging a valid certificate for that host
> - [ ] A certificate on that host from expiring unnoticed
> - [ ] Mixed content from loading on that host's pages ^card-0ag0

Put together, these are the failures that actually take TLS-protected
services down or quietly weaken them in practice: renewal deadlines
missed, chains sent incomplete, clocks disagreeing with reality, trust
stores extended to a party the user never chose, and pages that
undercut their own protection by trusting one plaintext resource too
many. None of it is a weakness in the cryptography — the algorithms hold
up exactly as designed in every one of these cases.

Why is it accurate to say that TLS failures in production are "overwhelmingly operational rather than cryptographic"? :: Because the recurring causes of real outages and weakened deployments — missed renewals, incomplete certificate chains, clock skew, deliberately installed trust anchors, insecure sub-resource loading — are all failures of process, configuration, or deployment choices, none of which involve any cryptographic algorithm or key being broken. ^card-tkr1
