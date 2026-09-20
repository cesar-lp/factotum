---
topic: identity
category: identity-sessions
tags: [credential-storage, breach-response, credential-stuffing, hash-migration]
citations: ["OWASP Authentication Cheat Sheet", "OWASP Forgot Password Cheat Sheet"]
---

# Credential Storage and Breach Response

A separate cryptography category covers why passwords are hashed with a
deliberately slow, memory-hard function, and how a work factor gets
chosen. This note takes all of that as given and asks a different set of
questions: what discipline has to surround a stored hash for the hashing
itself to matter, and what happens once it fails anyway.

## Never recoverable, anywhere

The rule sounds obvious stated once: a password must never be written
down anywhere in a form that could be read back out. Stated that way, it
sounds like a rule about the database, and the database is usually the
one place a team actually gets right — it's designed, reviewed, and
audited precisely because everyone knows it holds credentials.

Where does most accidental password disclosure actually happen, and why does hardening the database not prevent it? :: In application logs, request traces, error reports, and analytics — not the password database. A submitted password passes through a request handler, a validation layer, sometimes a third-party monitoring tool, before it ever reaches the hashing step, and any one of those systems can end up writing the raw value to disk (a debug log line, a stack trace that dumps request parameters, an analytics event that captures form fields) without anyone treating that as a credential-storage decision at all. ^card-ofkx

The fix isn't a single control but a posture: treat the raw password as
radioactive from the moment it's received until the moment it's hashed
and the plaintext variable goes out of scope. That means scrubbing it
from logging middleware, excluding it from error-reporting payloads by
name rather than by accident, and never passing it to an analytics or
tracing call that wasn't built with that exclusion in mind.

## Migration: raising the cost later

A stored hash isn't just an opaque blob — it records the parameters it
was produced with, because verifying a future login requires reproducing
the exact computation. That fact has a consequence that surprises people
the first time they hit it: there is no batch job that can take an
existing table of hashes and raise their work factor.

Why can't an existing stored hash simply be recomputed at a higher work factor? :: Hashing is one-directional: the stored value is the output of the old, cheaper computation, and there's no way to run it "in reverse" and then forward again at a new setting without the original input. The system would need the plaintext password back, and by design it never kept a copy of that. ^card-ynia

The only moment that plaintext is available again is the ==next ^card-gb0g
successful login==, when the user has just typed their password in and
the system is holding it in memory anyway, on its way to being verified
against the old hash. A system that wants to migrate work factors
verifies against the stored parameters as normal, and if that check
succeeds, immediately re-hashes the same plaintext at the new setting
and overwrites the stored value before discarding it. Accounts that
don't log in for a long stretch simply carry an old-parameter hash until
they do — there's no way to force the upgrade any sooner.

A team wants to migrate every user's password hash from bcrypt at an old work factor to Argon2 at a new one, but refuses to require a mass password reset. Describe the mechanism that lets them do this gradually, and explain why an account that never logs in again will never be migrated. :: They upgrade opportunistically at login: verify the submitted password against the existing bcrypt hash using its stored parameters, and only if that succeeds, hash the same plaintext with Argon2 at the new settings and store the result in place of the old hash. Migration piggybacks on the one moment the plaintext is briefly available. An account that never authenticates again never provides that plaintext, so its hash is stuck at the old algorithm and work factor indefinitely — there's no other path to strengthen it. ^card-gezh

## Credential stuffing

Slowing down guesses helps against an attacker probing one account
directly, but it does nothing against a much more common attack that
needs no interaction with the hashing at all. Because people reuse
passwords across unrelated services, a breach at one company hands an
attacker working credentials for accounts on completely different
systems that were never themselves compromised.

That attack — trying breached username/password pairs from elsewhere
against a system that has no flaw of its own — is called ==credential ^card-awql
stuffing==, and it needs defenses that look nothing like the ones built
for guessing.

Why does per-account rate limiting do little to stop credential stuffing, even though it works fine against someone brute-forcing a single account? :: Credential stuffing doesn't repeat attempts against one account — it makes one or two attempts each against a huge number of different accounts, using credentials already known to be valid somewhere. A limit on failed attempts per account never triggers, because no single account ever sees more than a couple of tries. The signal that actually distinguishes this traffic is volume and reputation aggregated across the whole login surface — many accounts being tried from the same IP ranges, credential lists, or automation fingerprints — not the failure count on any one of them. ^card-1qea

## Breach response

Discovering that a credential store was exposed doesn't end with
confirming the hashes held up. Passwords being hashed well limits what
an attacker can do with the stolen table directly, but it says nothing
about credentials already reused elsewhere, sessions already issued
before the breach was found, or whether affected people even know to
act.

Why is "the passwords were hashed" not, by itself, a reassuring response to a breach? :: Because hashing only slows down offline guessing against the stolen table — it doesn't prevent credential stuffing against other services using the same reused passwords, it doesn't retroactively secure sessions that were already active when the breach happened, and it does nothing for users who never find out their credentials were exposed. A response has to invalidate existing sessions tied to affected accounts, force re-authentication, and disclose the breach so people can change reused passwords elsewhere — hashing quality is one input to how bad the breach is, not a substitute for responding to it. ^card-qdhd
