---
topic: identity
category: identity-saml
tags: [saml, troubleshooting, clock-skew, key-rotation, encoding]
citations: ["OASIS SAML 2.0 Core", "OASIS SAML 2.0 Profiles"]
---

# SAML integration failure modes

The siblings in this category cover what a correct exchange looks
like: the assertion's conditions, the trust model behind a signature,
what RelayState carries and why it's untrusted input. This note covers
what happens when an integration is *almost* correct — because SAML
tends to fail in ways that hide their own cause, and the same visible
symptom, "login doesn't work," can point at several completely
different problems.

The first distinguishing feature of a failure worth knowing is whether
it happens to everyone at once or only sometimes.

> [!card] mcq
> A SAML login has started failing, but not consistently — it works
> for some users and fails for others, and retrying a failed login a
> minute later sometimes succeeds where it just failed. Nothing was
> deployed or rotated recently. Which cause fits best?
> - [x] Clock skew — the validity window on an assertion is only a few seconds wide, so whether a given login lands inside or outside it depends on exactly how far apart the two servers' clocks have drifted at that moment
> - [ ] Certificate rotation — a key changed on one side and the mismatch is being caught inconsistently
> - [ ] The assertion is being posted to the wrong endpoint
> - [ ] The assertion's encoding is being corrupted by a proxy in the path ^card-yada

A validity window that narrow means the failure this produces is
==intermittent== by nature, tracking clock drift rather than any ^card-f1y3
single broken component, which is exactly what makes it read as
flaky rather than as a bug.

Contrast that with what happens when a signing key changes.

> [!card] mcq
> Every single login through a SAML integration stops working within
> the same few minutes, across every user and every server, with no
> code deploy and no configuration change on the service's own side.
> What's the most likely cause?
> - [x] Certificate rotation — the identity provider (or the service) rotated its signing key, and the other side is still validating against the old one
> - [ ] Clock skew — two independent clocks drifting apart at the same instant, everywhere, simultaneously
> - [ ] The assertion is being posted to the wrong endpoint — that would fail some requests, not every request identically
> - [ ] Encoding corruption introduced by a proxy — that typically breaks decoding, not signature validation ^card-wuph

A rotated key breaks validation for ==all at once==, with no warning, ^card-d87j
because every assertion signed under the new key fails the same check
the moment the old key stops being the one either side is looking for.
That signature is the reason expiry dates on a signing certificate
belong on a calendar rather than in someone's memory — a rotation that
was never scheduled is discovered the moment it breaks every login,
not before.

A third symptom looks like neither of those: no timing pattern, no
sudden across-the-board outage, just a rejection with no useful detail
in the error the service returns.

Why does posting an assertion to a URL that isn't the one the service actually expects tend to surface as a bare rejection with little diagnostic detail, rather than a specific "wrong endpoint" error? :: Because the receiving handler is validating something it received at a URL it wasn't necessarily built to explain — from its point of view, a message simply arrived somewhere, and if that somewhere doesn't match what was configured or advertised, the simplest and most common response is a generic rejection rather than a message that names the mismatch. The contents themselves are fine, so signature and condition checks give no hint either. ^card-8qpt

A fourth failure hides in the transport rather than in the assertion
or the endpoint. A SAML message is compressed and encoded before it
travels — ==deflated== and then base64-encoded — and that two-step ^card-qafw
packaging is exactly the kind of thing an intermediate proxy,
framework, or library "helpfully" tries to redo.

> [!card] recall
> A SAML message fails to parse, but only when it passes through one
> particular piece of infrastructure — a proxy, gateway, or framework
> layer — that isn't present in a working path. What class of bug does
> that narrow down to, and why does it produce a parse failure rather
> than a validation failure?
> ---
> An encoding bug: something in that layer is decoding or re-encoding
> the deflated, base64 message a second time, or applying the wrong
> step, so the bytes the receiving end tries to inflate and parse are
> no longer the bytes that were actually sent. It shows up as a parse
> failure rather than a signature or validation failure because the
> message never becomes well-formed XML in the first place — the
> corruption happens before there's anything to validate. ^card-f4r2

The last failure mode is the one most likely to be reported as a bug
in the login itself, when it isn't one.

A user authenticates successfully and lands on the service's default landing page instead of the specific page they were trying to reach before logging in — the login worked, but the trip back to where they started didn't. Why is this not an authentication failure at all, and what actually got lost? :: Every check that matters passed, and the user is correctly logged in, so nothing about authenticating them failed. What's missing is a value that was supposed to travel alongside the request and come back with the response, carrying where the user was trying to go; when that round-trip value is dropped somewhere along the way, the service has nothing left to send the user back to except its default page. ^card-hcwo

The common thread across all five is that SAML's messages are not a
black box. They're inspectable, signed XML sitting in a browser
request the moment something goes wrong.

> [!card] mcq
> A SAML login is failing and the cause isn't obvious from the error
> message alone. What's the most productive first move?
> - [x] Capture the actual assertion or request as it crosses the wire and read it directly, rather than reasoning about what the configuration on either side is probably doing
> - [ ] Re-check every configuration value on both sides before looking at any live traffic
> - [ ] Restart the identity provider and service and see if the problem recurs
> - [ ] Assume it's clock skew, since that's the most common cause of an intermittent failure ^card-qjtq
