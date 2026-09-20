---
topic: identity
category: identity-sessions
tags: [account-recovery, user-enumeration, rate-limiting, step-up-auth]
citations: ["OWASP Authentication Cheat Sheet", "OWASP Forgot Password Cheat Sheet"]
---

# Login Flows and Account Recovery

Every property built into a login flow — strong hashing, throttling,
whatever else guards the front door — can be walked around if the
"forgot your password" path next to it is easier to attack. An account
is only ever as strong as the weaker of the two entrances, which makes
recovery worth examining as carefully as login itself, not as an
afterthought bolted on beside it.

## User enumeration

A login or password-reset form that answers "wrong password" for a
registered address but "no such account" for an unregistered one is
handing out membership information for free: an attacker can feed it a
list of addresses and learn which ones have accounts on the service,
independent of ever guessing a password. The standard fix is a single
generic response for both cases — something like "if that address is
registered, we've sent instructions."

Why does a login or reset form that distinguishes "wrong password" from "no such account" count as a security leak on its own, even before any password is guessed? :: Because it confirms or denies whether a given address has an account at all, regardless of whether the attacker knows the password. That's membership information — useful for targeting a phishing campaign, confirming a person uses a particular service, or narrowing a credential-stuffing list to addresses known to be live — and it costs the attacker nothing to collect at scale by feeding the form a list of addresses. ^card-8cy4

Making the message identical isn't enough by itself, though. A real
lookup — hashing a submitted password and comparing it, or checking a
database for a matching account before generating a reset token — takes
measurably longer than a code path that returns immediately because the
address was never found. An attacker who can't read the response text
can still read the clock.

A generic response text has to be paired with a response that's uniform
in ==timing== as well: the registered and unregistered paths need to ^card-w5wj
take roughly the same amount of time, or the wording accomplishes
nothing.

## Rate limiting versus lockout

The obvious defense against repeated guessing is to make guessing
expensive: throttle how fast attempts can be retried, whether per
account, per source, or both. Account lockout looks like a stricter
version of the same idea — freeze the account entirely after some
number of failures — but it introduces a failure mode throttling
doesn't have.

> [!card] mcq
> A site locks any account after five failed login attempts, and the
> lockout message tells the visitor whose account got locked. What can
> an attacker who merely knows a target's email address, without
> knowing or guessing anything about their password, now do?
> - [ ] Nothing — five failed attempts reveals no information without a correct guess
> - [x] Deliberately submit five wrong passwords to lock the victim out of their own account on demand
> - [ ] Use the lockout to recover the victim's actual password
> - [ ] Bypass the login form entirely once the account is locked ^card-r1ne

A failure-triggered lockout, in other words, can be weaponized by anyone
who merely knows or guesses a valid identifier — they don't need to come
close to the actual password, just submit enough wrong ones to freeze
the real owner out, turning an anti-guessing control into a
denial-of-service tool against any account they can name. Throttling
the rate of attempts avoids that failure mode: it still raises the cost
of guessing, but it never fully shuts a legitimate owner out of their
own account the way an outright lockout does.

## Reset token properties

A password-reset link is only as trustworthy as the token embedded in
it. That token has to be single-use, short-lived, bound to the specific
account it was issued for, and hard enough to guess that brute-forcing
it isn't practical — and it has to be invalidated the moment it's
redeemed or the moment the password changes by any other route.

> [!card] recall
> List the properties a password-reset token needs to have to be safe,
> and for each one, name the specific attack it closes off. ^card-rqw0

Short-lived and single-use sound like they cover the same ground, but
they close off different attacks. A token that's short-lived but not
single-use is still fine to intercept and replay repeatedly within its
window — say, from a shared inbox, a browser's autofill history, or a
proxy log that captured the reset link before the legitimate user
clicked it.

Why does a reset token need to be explicitly invalidated the instant it's redeemed, rather than relying on its short lifetime to eventually retire it? :: A short lifetime only bounds how long a token stays valid — it does nothing to stop the same still-valid token from being used more than once within that window. If a token leaked to a second party (an email left open, a proxy that logged the link, a browser history entry), that party could redeem it at any point before expiry unless redemption itself immediately kills the token, closing the window the instant it's used rather than waiting for it to expire on its own. ^card-0wfg

Binding matters for a related but separate reason: unguessability stops
an attacker from forging a valid-looking token from scratch, but it says
nothing about what happens if validation only checks "is this token
currently valid" without also checking "was this token issued for the
account being reset."

Why isn't an unguessable reset token enough on its own, without also strictly binding it to one account? :: Unguessability only defends against an attacker who has no token at all and has to construct or brute-force one. It doesn't defend against a system that, given a token that legitimately exists, forgets to check which account issued it — a bug like that would let a token generated for one account's reset flow be replayed to reset a completely different account, since nothing about the token's randomness prevents misuse once it's already been accepted as valid. ^card-1nfb

Whatever route the password changed through, the reset flow has to
invalidate the sessions that existed before it, on the same principle
that any other credential change does — how that invalidation is
carried out is a property of session handling itself, not of the reset
flow. A reset must also never quietly stand in for a second factor: if
the account has one configured, completing a password reset should not,
by itself, satisfy it.

## Step-up authentication

A session that was opened hours ago and has been valid ever since isn't
necessarily still backed by the same level of confidence that a
sensitive action deserves right now — the person who authenticated that
morning might not be the person sitting at the keyboard this afternoon.

==Step-up authentication== asks for another proof of identity at the ^card-7lo8
moment an action like changing a password, adding a payment method, or
viewing sensitive data is attempted, instead of extending trust from
whatever the session proved at login.

Why should a sensitive action re-verify identity at the moment it's attempted, instead of trusting that the session is still controlled by whoever logged in originally? :: A long-lived session's initial proof of identity ages — the device could have been left unlocked, handed off, or compromised sometime after login without the session itself changing state at all. Re-checking at the moment of a high-consequence action confirms the person acting right now still controls the credential, rather than extending indefinite trust from a single check performed possibly hours earlier. ^card-e104
