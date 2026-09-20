---
topic: identity
category: identity-sessions
tags: [sessions, authentication, session-fixation, timeouts]
citations: ["OWASP Session Management Cheat Sheet", "RFC 6265bis (HTTP State Management)"]
---

# Sessions and the session identifier

A session is state the server holds about a user it has already
authenticated — who they are, when they signed in, whatever else the
application needs to remember between requests. The client's only copy of
that relationship is a token it presents on each request, and that token
is a ==bearer credential==: possession alone is proof. The server has no ^card-0mx2
way to check that the party presenting it is the same party it was issued
to, so whoever holds it is treated as that user, full stop.

That single fact is why the identifier has to be unguessable and
high-entropy, and why it deserves the same handling as a password for as
long as it remains valid — logged, cached, or leaked into a URL, and it is
exactly as dangerous as a stolen password.

A session comes into being at authentication, and ends one of two ways:
the user logs out and it is destroyed, or it simply expires on its own
without anyone acting.

Expiry is not one mechanism but two, tracking different clocks, and a
session can be ended by either one independently of the other.

An ==idle== timeout counts from the moment of last activity: every request ^card-ehv4
resets the clock, and the session only lapses once a gap that long passes
with nothing happening.

A separate, ==absolute== timeout counts from the moment the session was ^card-bf4f
created and never resets, no matter how continuously the user keeps
working — enough elapsed wall-clock time ends it regardless of activity.

> [!card] mcq
> A session has an idle timeout of 30 minutes and an absolute timeout of 8
> hours. A user has been actively working, one request every few minutes,
> for 9 hours straight. What happens?
> - [x] The session ends when the 8-hour absolute timeout is reached, even though the user was never idle
> - [ ] The session stays valid indefinitely as long as requests keep arriving within 30 minutes of each other
> - [ ] The idle timer being repeatedly reset also resets the absolute timer
> - [ ] Only the idle timeout applies once the user has proven they are actively working ^card-j9rt

Why does an absolute timeout exist at all, given that an idle timeout already ends abandoned sessions? :: It bounds how long a single stolen or lingering session identifier stays usable regardless of activity, capping the damage from a credential that keeps getting silently reused rather than trusting that continued activity means it's still the legitimate user. ^card-4pfo

A distinct attack targets the moment of authentication rather than an
existing session. If an attacker can get a victim to authenticate while
using an identifier the attacker already knows — planted via a crafted
link, a shared device, or an identifier that isn't replaced at login — the
attacker can then use that same known value and finds it valid. This is
==session fixation==. Once that authentication completes, the attacker ^card-m6iz
needs to do nothing more clever than present that same known value
themselves — the server now considers it authenticated as the victim.

> [!card] recall
> Explain the defense against session fixation, and why it must apply at
> every privilege change and not only at login.
> ---
> The server must issue a brand-new identifier whenever the user's
> privilege level changes, discarding whatever value was in use
> beforehand. Login is the most important case, since it is the moment an
> anonymous session becomes an authenticated one, but any later elevation
> (for example, stepping up to an administrative capability) creates the
> same opportunity: if the pre-elevation value survives unchanged, an
> attacker who fixed that value before the elevation inherits the higher
> privilege the same way they would have inherited a login. ^card-v4bp
