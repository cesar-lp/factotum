---
topic: identity
category: identity-sessions
tags: [mfa, totp, sms, phishing, push-fatigue]
citations: ["RFC 6238 (TOTP)", "W3C Web Authentication (WebAuthn)"]
---

# Multi-Factor Authentication and TOTP

Authentication factors come in three kinds: something you know (a
password, a PIN), something you have (a phone, a hardware token), and
something you are (a fingerprint, a face). "Multi-factor" means
combining factors from *different* kinds, and that word "different" is
load-bearing rather than decorative.

> [!card] mcq
> A site requires both a password and a secret PIN memorized separately
> to log in. Is this multi-factor authentication?
> - [x] No — both are something you know, so one compromise route (the user disclosing or writing down secrets, or a keylogger capturing keystrokes) can take both at once
> - [ ] Yes, because two separate secrets are required instead of one
> - [ ] Yes, as long as the PIN and password are different lengths
> - [ ] No, but only because PINs are shorter than passwords ^card-31oh

Two factors of the same kind fail to add real protection because they
share a single point of failure: whatever breaks one — a keylogger, a
stolen wallet, a copied fingerprint database — tends to break the other
too. Real multi-factor authentication forces an attacker to pull off
two structurally different attacks, not the same attack twice.

TOTP (Time-based One-Time Password) is the most common something-you-
have factor built from a shared secret rather than a physical object.
Enrolment happens once: the server generates a random secret and hands
it to the user's device, typically through a QR code, and from then on
both sides hold an identical copy.

```
Enrolment:
1. Server generates a random secret
2. Secret is shared with the user's device (e.g. via QR code)
3. Both server and device now hold the same secret
```

From that point on, neither side ever transmits the secret again.
Instead, both independently derive a short numeric code by running a
keyed MAC over the shared secret and the current time step — the
running time divided into fixed-length windows, typically 30 seconds —
and truncating the result to a handful of digits.

The current time step, not any past use of the code, is what the
derivation runs on.

That's why a TOTP code changes on a fixed ==time== step rather than on ^card-m5te
every use: generate it twice within the same window and it comes back
identical, generate it a window later and it's completely different,
whether or not anyone ever verified the first one.

Why does verifying a submitted TOTP code require checking a small ^card-f0fu
window of adjacent time steps instead of one exact time step? :: The
server's clock and the device's clock are never perfectly in sync, and
neither is instantaneous — a code computed a second before the step
boundary and checked a second after it would otherwise be wrongly
rejected. Accepting the current step plus one step on either side
absorbs that drift without letting the tolerance grow so wide that old
codes stay valid long after they should have expired.

TOTP is genuinely effective against one specific threat: a password
that's been reused elsewhere or leaked in a breach. An attacker holding
nothing but that password still can't produce the code, because they
never received the shared secret at enrolment.

It is not effective against a look-alike site that simply asks for the
code. If a user is tricked into typing their current TOTP code into a
phishing page, the attacker receives a value that is, for the next
several seconds, exactly as good as the real thing — they relay it to
the genuine site within the same time step and log in as the victim.
The factor never left the user's hand, but the user handed over
something the attacker could use immediately, and TOTP has no
mechanism to notice the difference between "typed into the real site"
and "typed into a copy of it."

A submitted TOTP code, standing alone, tells the verifying server
nothing about which site the user typed it into.

> [!card] mcq
> A user receives a fake login page that looks identical to their
> bank's site. They enter their password and current TOTP code. The
> page immediately forwards both to the real bank. What happens?
> - [x] The attacker logs in successfully, because the relayed TOTP code is still valid for the remainder of its time step
> - [ ] The login fails, because TOTP codes are only valid on the device that generated them
> - [ ] The login fails, because the bank's server can tell the request didn't originate from the user's own browser
> - [ ] The attacker gets access to the account's future logins but not this one ^card-jxr1

A weaker variant delivers the one-time code over SMS instead of
generating it locally. This quietly changes what the factor actually
is: it's no longer possession of a specific device, but possession of
a phone *number* — and a phone number is something a phone company can
be tricked into repointing.

A ==SIM swap== — convincing a carrier to move a victim's phone number ^card-c2b8
onto a SIM the attacker controls — hands over every future SMS code
without the attacker ever touching or infecting the victim's actual
phone.

What does an SMS-delivered one-time code actually authenticate as ^card-hjj2
possession of, and why does that make carrier-side attacks relevant to
an otherwise sound MFA design? :: Possession of a phone number, not
possession of a specific device. Since the number's routing is
controlled by the carrier rather than the user, an attacker who
compromises that routing (for example through a SIM swap or an inside
job at the carrier) receives the codes without ever needing the
victim's physical phone.

Two more MFA weaknesses are worth naming on their own. Recovery codes —
a batch of one-time backup codes issued when the second factor is set
up, for use if the device is lost — are unavoidable, because without
them a lost phone locks the user out permanently. But every recovery
code is a standing secret that, once written down, functions exactly
like a password: whoever has it can authenticate with no second factor
at all, indefinitely, until it's used or revoked.

> [!card] recall
> Explain why recovery codes are simultaneously a necessary part of an
> MFA scheme and a security weakness in it. What single property do
> they have that undermines the "second factor" guarantee? ^card-9fr5

Push-based approval — where logging in sends a notification to the
user's device and they tap "approve" — is convenient enough to invite
its own attack: push fatigue. The attacker, already holding a valid
password, simply triggers login attempt after login attempt, sending
approval prompt after approval prompt, until the user taps "approve"
just to make the notifications stop, without ever checking what
they're approving.

What makes push fatigue an effective attack even when the underlying ^card-1kvt
push-approval mechanism is implemented correctly? :: It doesn't attack
the mechanism at all — it attacks the user's attention by repeating a
correct request until they approve one out of annoyance or confusion,
so no flaw in the push protocol needs to exist for the attack to
succeed.
