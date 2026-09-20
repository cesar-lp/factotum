---
topic: identity
category: identity-sessions
tags: [webauthn, passkeys, origin-binding, phishing-resistance]
citations: ["RFC 6238 (TOTP)", "W3C Web Authentication (WebAuthn)"]
---

# WebAuthn and Passkeys

Every factor covered elsewhere in this category — a password, a TOTP
code, a code texted to a phone — is a value the user can be talked
into typing into the wrong place. WebAuthn changes the shape of the
credential itself so that this stops being possible even in principle.

Instead of a secret both sides hold, an authenticator (a security key,
or a platform's built-in authenticator such as a fingerprint sensor)
generates a public/private key pair at registration and never releases
the private key to anything — not the browser, not the site, not even
the user. The site receives and stores only the public key.

What does a WebAuthn relying party store for each registered ^card-n0hw
credential, and why does that make a stolen authentication database
far less damaging than a stolen password database? :: Only the public
key. A public key on its own doesn't let whoever steals the database
authenticate as the user, and because there's no shared secret sitting
in that database at all, there's nothing to phish out of the user
later either — unlike a password or a TOTP seed, which are secrets by
themselves.

The property that actually distinguishes this from every code-based
factor isn't the key pair by itself — it's that the resulting
credential is bound to the exact site that created it.

A WebAuthn credential is bound to the ==origin== it was created for, ^card-t0dl
and the browser enforces that binding itself, refusing to produce a
usable response for any lookalike no matter what the page asks for.

That enforcement doesn't depend on the user noticing anything wrong.
A look-alike phishing page, however convincing, is served from a
different origin than the real site — and the browser simply will not
invoke the matching credential for it, so there is no valid response
for the user to hand over even if they're completely fooled by the
page.

> [!card] mcq
> A user is fooled by a pixel-perfect phishing copy of their bank's
> site, served from a different domain, and attempts to log in with
> WebAuthn. What happens?
> - [x] The browser won't produce a usable assertion at all, because the phishing page's origin doesn't match the origin the credential was registered to
> - [ ] The authenticator signs the request anyway, and the attacker relays it to the real site within a short window
> - [ ] The login succeeds only if the user doesn't notice the URL is wrong
> - [ ] The credential works on any origin, so the phishing page can capture and reuse it ^card-c2nu

At a high level, every WebAuthn sign-in follows the same
challenge-response shape:

```
1. Site sends a freshly generated challenge to the browser
2. Browser routes it to the authenticator, tagged with the site's origin
3. Authenticator prompts for a user gesture (touch, PIN, biometric)
4. On that gesture, authenticator signs the challenge with the private key
5. Signed response goes back to the site for authentication
```

The signing step never happens silently in the background — step 3's
user gesture is what stands in for "something you are" or "something
you have," confirming a live, present user rather than a background
process replaying a stored value.

Why does the authenticator require a user gesture immediately before ^card-v26u
signing the challenge, instead of signing automatically as soon as a
challenge arrives? :: Without it, any process capable of reaching the
authenticator — malware running on the device, for instance — could
request signatures on its own, with no way to distinguish that from a
real login. Requiring a touch, PIN, or biometric at the moment of
signing ties each signature to a live, present person choosing to
authenticate right then.

Authenticators split into two kinds. A **platform authenticator** is
built into the device itself — a laptop's fingerprint reader, a
phone's face unlock — and can't be moved to another device. A
**roaming authenticator** is a separate piece of hardware, such as a
USB or NFC security key, that a user can carry and plug into whichever
device they're signing in from.

> [!card] mcq
> What is the defining difference between a platform authenticator and
> a roaming authenticator?
> - [x] A platform authenticator is built into one specific device and can't move; a roaming authenticator is separate hardware a user carries between devices
> - [ ] A platform authenticator works over the network; a roaming authenticator only works offline
> - [ ] A roaming authenticator stores the site's public key; a platform authenticator doesn't
> - [ ] They differ only in which biometric method they support ^card-lktp

A related design choice is whether the credential is *discoverable* —
stored on the authenticator in a way that lets it be looked up without
the site first telling it which credential to use.

==Discoverable== credentials are what make username-less sign-in ^card-ijhd
possible: the authenticator can enumerate its own stored credentials
for the current origin and let the user pick one, instead of the site
needing to already know who's logging in before it can ask.

Passkeys take a discoverable WebAuthn credential and add one more
piece: instead of living on a single authenticator forever, the key
pair is synced across a user's devices by a platform provider, so
signing in from a new phone or laptop doesn't require re-registering
from scratch.

> [!card] recall
> Explain the tradeoff passkey syncing makes relative to a credential
> that lives on a single hardware authenticator and never leaves it.
> What does syncing gain, and what guarantee does it give up to gain
> it?
> ---
> A single-device credential offers a strong guarantee that the private
> key exists in exactly one place and can never be extracted or copied
> elsewhere — losing that device means losing the credential entirely,
> with no path back except a separate recovery mechanism. Syncing a
> passkey across a user's devices through a provider trades that
> single-location guarantee for recoverability: losing one device no
> longer strands the user, but the private key now exists wherever the
> provider has synced it, so the guarantee shifts from "physically
> confined to one authenticator" to "as strong as the provider's own
> sync and account security." ^card-yclt
