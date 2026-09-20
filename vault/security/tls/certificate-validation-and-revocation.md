---
topic: security
category: security-tls
tags: [tls, certificate-validation, hostname-verification, revocation, ocsp]
citations: ["Ristić, Bulletproof TLS and PKI, Ch. 4", "RFC 8446"]
---

# Certificate validation and revocation

Building a chain up to a trusted root (covered in the sibling note on
chain construction) only tells a client that *some* valid CA once signed
*some* certificate. It says nothing about whether that certificate
belongs to the server the client actually meant to talk to, whether it's
still within its validity window, or whether the CA has since disowned
it. A client that stops at "the chain builds" has not validated
anything — it has just confirmed a signature exists.

## Hostname verification

This is the step that matters most, and the one most often skipped or
quietly disabled during debugging and never turned back on. After the
chain verifies, the client must check that the name it intended to
connect to — the hostname it typed or resolved, not any name pulled from
the certificate itself — appears in the certificate's Subject
Alternative Name entries.

Here's why this single check carries so much weight: every other
validation step — the chain, the expiry window, the key usage — only
proves that a *legitimate CA* issued a *valid* certificate for *some*
name. None of those steps say the name is the one the client is trying
to reach. Any site operator can obtain a perfectly valid, correctly
signed certificate for a domain they legitimately own. If a client skips
the hostname match, that operator's valid certificate would authenticate
a connection to any server presenting it — the attacker doesn't need to
break any cryptography, just present a certificate for a name that
isn't the one being checked.

> [!card] mcq
> A client completes chain-of-trust verification and confirms the
> certificate hasn't expired, but never compares the connection target
> against the certificate's SAN entries. What does this omission make
> possible?
> - [x] Any server holding a validly-issued certificate for some name it controls can impersonate a completely different site, since nothing ties the presented certificate to the name the client meant to reach
> - [ ] Nothing exploitable, since a valid chain already implies the correct name
> - [ ] Only expired-certificate attacks become possible
> - [ ] The connection fails closed automatically, so this is a safe default ^card-sunu

Why does skipping hostname verification make chain verification, expiry ^card-6biy
checking, and signature checking pointless, rather than merely weakening
them? :: Those three checks only establish that a trusted CA issued a
currently-valid certificate for *some* domain — none of them binds the
certificate to the specific server the client is trying to reach. Without
the SAN-to-target comparison, an attacker just needs *any* validly
issued certificate for *any* name to authenticate as *any* server, which
means the other checks passed with full cryptographic rigor and still
protected nothing.

## Validity window and expiry

Every certificate carries a `notBefore` and `notAfter` timestamp, and a
compliant client rejects a certificate presented outside that window,
in either direction. This is the mechanism CA/Browser Forum baseline
requirements lean on to force key rotation and to bound how long a
mis-issued or compromised certificate stays trusted without any
revocation action at all — a certificate nobody revokes still stops
working the day it expires.

## Chain and key usage checks

The client also has to walk the signature chain from the leaf up to a
root already present in its trust store, confirming each certificate's
signature verifies against the issuer above it (the mechanics of
signature verification itself are a cryptography topic, not a TLS one).
Separately, the leaf certificate's key usage and extended key usage
extensions must permit the way it's being used — a certificate issued
only for code signing, for instance, has no business terminating a TLS
handshake, even if every other check passes.

==Key usage== restricts what a certificate's key is permitted to be used ^card-a2f0
for, independent of whether the chain and hostname checks pass.

## Why revocation exists at all

Expiry alone isn't enough, because certificates commonly live for months
and the events that should kill a certificate's trust early — a private
key leaking, a CA discovering it mis-issued, a domain changing hands —
don't wait for `notAfter`. Revocation is the mechanism for a CA to say
"this certificate is no longer valid" before its natural expiry, and a
client that never checks revocation status has no way to learn that.

## CRLs and their scaling problem

The original mechanism, the Certificate Revocation List, is a signed
list a CA publishes containing the serial numbers of everything it has
revoked. A client fetches the list and checks whether the certificate's
serial number appears on it.

The problem is pure scale: a large CA revokes enough certificates that
its CRL can grow to megabytes, and every relying client has to download
that whole list — or an ever-growing history of them — just to answer a
yes/no question about one certificate. Fetching a multi-megabyte file
before every unfamiliar connection is exactly the kind of cost that
pushes implementations toward skipping the check.

## OCSP

The Online Certificate Status Protocol replaced the "download
everything" model with a targeted query: the client asks a CA's
responder about one specific certificate and gets back a signed
`good`/`revoked`/`unknown` answer.

That fixes the bandwidth problem but introduces two new ones. First,
==privacy== — every OCSP query tells the CA (or whoever operates the ^card-yak5
responder) exactly which site the client is about to visit, for every
connection, which is a meaningful leak for a protocol whose whole point
is protecting the confidentiality of that connection. Second,
availability — the client now depends on a live network round trip to a
third party's server before it can complete a handshake, and if that
responder is slow, unreachable, or blocked, every relying client's
connections suffer with it.

> [!card] mcq
> What privacy problem is specific to plain OCSP that a CRL download
> does not have?
> - [x] The responder learns which specific site the client is about to visit on every single connection
> - [ ] OCSP responses are never signed, so they can be forged
> - [ ] OCSP requires the client to send its private key to the CA
> - [ ] CRLs also leak this information equally, so there is no difference ^card-pjsg

## OCSP stapling and must-staple

OCSP stapling moves the query off the client entirely: the *server*
periodically fetches its own signed OCSP response from the CA and
"staples" that response onto the handshake when a client connects. The
client gets a fresh, signed revocation status with no extra round trip
of its own and no query ever reaching the CA about that client's
browsing.

Stapling is opt-in for the server, though, so a client still has to
decide what to do when a server doesn't staple anything. The
`must-staple` certificate extension closes that gap: it tells the client
that this particular certificate is required to come with a stapled
response, so a connection presenting it with no staple attached should
be treated as suspicious rather than silently accepted.

Explain what problem must-staple solves that OCSP stapling alone does ^card-72it
not. :: OCSP stapling only helps when a server chooses to attach a
staple; a client still has to decide how to treat a certificate that
arrives with none, and if it accepts that silently, a server — or an
attacker who has stripped the staple — can simply omit it to avoid
revealing revocation status. Must-staple is a flag baked into the
certificate itself that requires a staple to be present, turning "no
staple" from an ambiguous default into a hard failure.

## Soft-fail: why revocation mostly doesn't work

Given the cost and fragility of live revocation checks, most clients
adopt ==soft-fail==: if the revocation check can't be completed — the ^card-yhju
responder times out, the network is down, the query is blocked — the
client proceeds as though the certificate were valid, rather than
refusing the connection. The reasoning is pragmatic: hard-failing on
every OCSP outage would make the entire web unreliable whenever any
responder has trouble, and outages are common.

The consequence is that an attacker positioned to intercept traffic can
usually just block the revocation check itself, and a soft-fail client
will connect anyway. This is the core reason revocation checking is
often described as providing little real protection in practice — the
one scenario it exists for, a network-positioned attacker using a
compromised certificate, is exactly the scenario where that attacker can
also suppress the revocation signal.

> [!card] recall
> Explain why soft-fail revocation checking provides weak protection
> specifically against the threat model revocation was designed for.
> ---
> Revocation exists mainly to stop an attacker who holds a compromised
> or mis-issued certificate from using it after the CA has flagged it.
> But that same attacker, if positioned to intercept the connection, can
> also block or drop the revocation-status request. A soft-fail client
> then treats the missing answer as "proceed," so the attacker defeats
> revocation by suppressing the very check meant to catch them — the
> protection fails precisely in the case it was built for. ^card-qnp4

## Short-lived certificates as the modern answer

Rather than trying to make revocation checking fast, private, and
reliable enough to hard-fail on, the current trend is to make
revocation largely unnecessary: issue certificates with very short
validity periods — days rather than years — so a compromised
certificate ages out on its own before revocation infrastructure would
even matter. This doesn't eliminate the exposure window, but it bounds
it tightly and removes the client's dependency on any live check
succeeding, sidestepping CRLs' scaling problem and OCSP's privacy and
availability problems in one move.

Why do short-lived certificates reduce the *practical* need for ^card-squv
revocation checking, rather than making it obsolete outright? :: They
shrink the exposure window a compromised certificate has to matter down
to the certificate's own short lifetime, so many compromises simply
expire before they'd be caught by a revocation check anyway. But the
window isn't zero — a certificate can still be misused during its brief
validity period — so revocation isn't rendered pointless, just far less
load-bearing than it was for long-lived certificates.
