---
topic: identity
category: identity-auth0
tags: [auth0, user-profile, metadata, account-linking, identities]
citations: ["Auth0 Docs — 'User Profile Structure'", "Auth0 Docs — 'Metadata Overview'", "Auth0 Docs — 'User Account Linking'"]
---

# User Profiles and Account Linking

`connections-and-identity-providers.md` covers how a connection is the
source of an identity. This note covers the consequence of that: what
Auth0 actually stores per identity, and what happens — and doesn't
happen automatically — when the same person shows up through more than
one connection.

What is an Auth0 user_id actually composed of? :: The connection's provider identifier and that identity provider's own subject id, joined by a pipe — for example auth0| followed by a database user's internal id, or google-oauth2| followed by the Google account's subject id — not a plain Auth0-generated UUID on its own. ^card-8hkd

That composition has a sharp consequence. The same human signing in
once with a Google account and once with a database password produces
==two distinct users==, each with its own user_id and its own profile, ^card-ik02
because each id is scoped to the connection that produced it rather
than to the person. Auth0 has no built-in notion that these are the
same human until something tells it so.

Why does it matter operationally that Google-you and password-you start out as two separate Auth0 users? :: Because any data your application keyed to a user_id — stored roles, preferences, purchase history, consent records — lives on whichever of the two ids created it. The other identity sees none of it until the two are deliberately linked, so a returning customer who happens to pick a different login method can look, to your app, like a stranger. ^card-o1d9

Auth0 smooths some of this over with a normalized profile: a small set
of common attributes — email, name, picture — get promoted onto the
profile's ==root==, computed the same way regardless of which ^card-13gc
connection produced them, so your app can read `user.email` without
caring whether the source was a password database or an enterprise
IdP. The raw, connection-specific version of those attributes (and
anything a connection provides that doesn't map onto the normalized
set) stays nested in the `identities` array instead, one entry per
linked identity, so nothing the connection actually returned is
discarded even after normalization.

Two other top-level fields hold data your application puts there
itself, and confusing them is a real vulnerability rather than a style
mistake. ==user_metadata== is writable directly by the end user — through ^card-81zb
their own profile update, or a token scoped to their own identity —
so it's the right place for preferences and settings the person
should control. ==app_metadata== is writable only by server-side or ^card-sig1
Machine-to-Machine calls carrying elevated scope; an ordinary user's
own token cannot touch it.

Storing a role, an entitlement, or a plan tier in the user-writable
store means the user can edit their own privilege level, because
nothing there enforces who's allowed to write it — the split between
the two stores is a security boundary, not a naming convention.

> [!card] mcq
> Your application reads a `role` field from a user's profile to decide
> what they're allowed to do, and wants that field safe from being
> edited by the user it describes. Which store must it live in?
> - [x] app_metadata — no user-scoped token or self-service profile edit can write to it
> - [ ] user_metadata — the two stores enforce the same write permissions
> - [ ] Either, since Auth0 encrypts both identically
> - [ ] The root profile, alongside email and name ^card-ti6c

Account linking — making Auth0 treat two of these separate users as
one person — is never automatic on its own. Linking has to be
triggered deliberately, whether through the Management API or a
linking flow in your application, and it produces one **primary**
identity that keeps its user_id while the other becomes a **secondary**
identity nested under it; the secondary's own login still works
afterward, but it now resolves to the primary's user_id and profile.

Is it safe to link two accounts automatically just because they share the same email address? :: Only if that email is verified on both sides. Email addresses aren't proof of ownership by themselves — an attacker can register a social or database account using someone else's address and leave the verification step incomplete. Auth0's automatic account linking is designed to require a verified email precisely so this can't be used to hijack an existing account. ^card-xzlp

> [!card] recall
> Explain concretely how skipping the verified-email requirement in
> automatic account linking turns it into an account-takeover
> technique — walk through what an attacker would do and what they'd
> gain.
> ---
> An attacker signs up through a connection Auth0 will consider for
> auto-linking (say, a social provider) using the victim's real email
> address, without ever proving they control that inbox. If Auth0 linked
> purely on the email string matching, that attacker's new identity
> would be merged as a secondary onto the victim's existing primary
> account — and depending on the flow, the attacker could then log in
> as, or gain visibility into, an account that isn't theirs. Requiring
> the email be verified first closes this off, since the attacker would
> need control of the victim's inbox to complete verification, which is
> the same bar as directly proving account ownership. ^card-nyik

None of this touches what a session or access token looks like once
issued for a linked or unlinked user, or how the browser holds onto
it — `jwt-structure-and-pitfalls.md` and `token-storage-in-the-browser.md`
in `identity-sessions` cover both.
