---
topic: aws
category: aws-edge
tags: [acm, certificates, dns-validation, renewal, wildcard]
citations: ["AWS Certificate Manager User Guide — 'Managed renewal'"]
---

# Certificates and ACM

`vault/security/tls/` covers what a certificate cryptographically proves
and how a chain of trust is built; none of that is repeated here. This
note is about ACM as an operational service: where a certificate has to
live, how it gets issued, and what keeps it valid over time.

The single most common ACM error is regional placement. A certificate
used by CloudFront ==must== be requested in `us-east-1`, full stop, ^card-np5w
regardless of where the distribution's origins or the account's other
resources live — CloudFront only ever looks in that one region for
certificates to attach. A certificate backing a regional Application
Load Balancer, by contrast, has to live in that ALB's own region. The
two rules point in opposite directions, which is exactly why mixing them
up is so easy.

> [!card] mcq
> An ALB in `eu-west-1` and a CloudFront distribution both need to
> present a certificate for the same domain. Where must each certificate
> be requested?
> - [x] The ALB's certificate in eu-west-1; the CloudFront certificate in us-east-1
> - [ ] Both in us-east-1, since CloudFront is a global service
> - [ ] Both in eu-west-1, matching the account's primary region
> - [ ] Either region works for both, since ACM certificates are global resources ^card-7txh

Why does a certificate requested in the wrong region for CloudFront fail silently as "certificate not found" rather than a permissions error? :: CloudFront's certificate picker only queries us-east-1 for ACM certificates to offer — a certificate sitting correctly issued and valid in any other region is invisible to it, not denied, so the failure looks like the certificate doesn't exist rather than like an access problem. ^card-oob7

ACM offers two validation methods, and they are not operationally
equivalent. ==DNS validation== works by having you add a CNAME record ACM ^card-od3f
provides to your hosted zone; ACM polls for that record and issues the
certificate once it finds it. Email validation instead sends approval
messages to a handful of addresses derived from the domain (like
`admin@` or the WHOIS contact) and waits for a human to click a link.

Why is DNS validation the method you actually want, rather than a matter of preference? :: Because it's the only one of the two that supports fully automatic renewal — ACM can keep re-checking the same CNAME indefinitely with no human involved, while an email-validated certificate requires someone to click an approval link again at renewal time, which makes an email-validated certificate an outage with a date already on the calendar, waiting for the day nobody clicks in time. ^card-ovi6

ACM-issued, DNS-validated certificates are ==free== and renew ^card-351v
automatically — but "automatically" depends entirely on that validation
CNAME record staying in the hosted zone. Deleting it after issuance,
during a DNS cleanup that looks unused, doesn't break anything
immediately; it breaks renewal silently, and the failure doesn't surface
until months later when the certificate tries to renew and the
validation record it needs is gone.

> [!card] recall
> A teammate deletes what they assume is a leftover, unused CNAME record
> from the hosted zone during a cleanup. The record was actually the ACM
> DNS validation record for a certificate issued eight months ago.
> Explain the actual failure timeline this produces, and why it's worse
> than an immediate error would be.
> ---
> Nothing breaks at deletion time — the certificate is already issued
> and serving traffic, and ACM doesn't re-validate on every check. The
> problem surfaces only when ACM attempts automatic renewal near
> expiry: it can no longer verify domain control through the now-missing
> CNAME, renewal fails, and the certificate silently lapses on its
> original expiry date. That's worse than an immediate error because the
> root cause (a DNS deletion) and the symptom (an expired certificate
> outage) are separated by months, so nobody connects the two without
> already knowing to look. ^card-0mlt

Certificates don't have to be issued by ACM to be used by it — you can
==import== an externally-issued certificate into ACM so services like ^card-7fmv
CloudFront or an ALB can reference it. The tradeoff is that ACM cannot
renew an imported certificate; it never validated domain control for it
in the first place, so tracking that certificate's expiry and re-
importing a replacement is entirely on you.

For organizations that need to issue their own internal certificates —
for service-to-service TLS inside a private network rather than
publicly-trusted certificates — ACM Private CA offers a managed private
certificate authority, which is a different product from public ACM
issuance and worth knowing exists even without going further into it
here.

A wildcard certificate for `*.example.com` covers exactly one label of
subdomain depth and no more: it matches `api.example.com` but not
==a.b.example.com==, because the wildcard only stands in for a single ^card-00w3
DNS label, not an arbitrary number of them.

`route53-hosted-zones-and-records.md` covers the CNAME record type this
note's DNS validation step depends on; `vault/security/tls/` covers what
the resulting certificate actually does during a handshake once ACM has
issued it.
