---
topic: identity
category: identity-auth0
tags: [auth0, connections, social-login, enterprise-connections, home-realm-discovery]
citations: ["Auth0 Docs — 'Identity Providers Supported by Auth0'", "Auth0 Docs — 'Connections'"]
---

# Connections and Identity Providers

`tenants-and-the-auth0-domain.md` covers the tenant as the container
everything else lives inside. This note covers what actually sits
inside it and produces an identity: not "users", but connections.

Auth0's data model has no such thing as a bare, connection-less user.
Every account a person holds is tied to a specific source that vouches
for it — a password store, a social provider, an enterprise identity
provider — and that source, plus everything Auth0 configures about how
to talk to it, is what Auth0 calls a connection. "The user cannot log
in" almost never means the account is missing; it means one particular
source of identity, for one particular app, is misconfigured or absent.
Losing sight of that distinction is the single most common source of
confusing Auth0 support threads.

Connections come in three families. **Database connections** are the
simplest: Auth0 hosts the user store itself (hashed passwords included),
or you point it at a **custom database** you already run, supplying
your own ==scripts== for login, user creation, and password changes so ^card-4bqj
Auth0 can defer to your existing store instead of importing it wholesale.

**Social connections** federate to a consumer identity provider — Google,
GitHub, Facebook — using that provider's own OAuth flow underneath.
**Enterprise connections** federate to an organization's own identity
system: SAML, OIDC, Azure AD/Entra, or ADFS. What belongs here is only
that Auth0 treats an enterprise IdP as one more connection type,
configured with the same enable/disable and mapping machinery as any
other.

The flow mechanics underneath a social connection are
`../oauth/the-authorization-code-flow.md`'s subject, and the SAML
protocol itself — assertions, bindings, signatures — is
`identity-saml`'s territory.

Why are Auth0's default social connection developer keys unsuitable for production? :: They're Auth0's own shared OAuth application registered with the provider, pooled across every tenant that hasn't configured its own keys. They come pre-enabled for quick testing, but every tenant using them shares one rate-limited allotment at the provider, so they can throttle or fail unpredictably under real traffic. Production use requires registering your own application with the social provider and supplying its keys. ^card-2a5l

A second, distinct fact about connections often reads like the first:
they are not enabled tenant-wide just by existing. A connection is
switched on **per application**, one checkbox per client. Creating a
"Login with Google" connection does nothing for an app that never had
it enabled, and a connection can be perfectly healthy for one
application while being invisible to another in the same tenant. When
someone insists their account exists and their password is right but
Auth0 still rejects them, checking whether their connection is enabled
for the application they're hitting is the first move, well before
suspecting the credential itself.

What are the three families of connection Auth0 supports? :: Database connections (Auth0-hosted, or a custom database backed by your own scripts), social connections (federating to a consumer identity provider like Google or GitHub), and enterprise connections (SAML, OIDC, Azure AD/Entra, ADFS, and similar organizational identity systems). ^card-2e2x

Enabling several connections on one application creates a problem
neither connection solves by itself: something has to decide, before
any credential is checked, which connection a given login attempt
should even be routed to. That decision — mapping an incoming login to
the right connection out of several enabled ones — is what identity
literature calls ==home realm discovery==. ^card-ahcm

> [!card] mcq
> An application has a database connection and two enterprise
> connections enabled, with no explicit connection specified by the
> caller. How does Auth0 decide which connection a given login belongs
> to?
> - [x] It matches the email domain the person enters against each enterprise connection's configured domains, falling back to the database connection otherwise
> - [ ] It tries every enabled connection's credential check in sequence until one succeeds
> - [ ] It always defaults to whichever connection was created first
> - [ ] It requires the resource server to declare the connection in the access token's audience ^card-7wgs

Domain matching is the implicit path; the explicit one is passing a
`connection` parameter on the authorization request, naming the exact
connection to use and skipping discovery entirely. Applications that
embed a "sign in with your company" button per enterprise customer are
using the explicit form — it's also how `organizations-and-b2b-multitenancy.md`
routes a login without asking the person to type an email first.

Which two mechanisms does Auth0 use to route a login to the right connection when several are enabled on one application? :: Home realm discovery by matching the email domain entered against each connection's configured domains, or an explicit `connection` parameter passed on the authorization request that names the connection outright and bypasses discovery. ^card-7v6a

> [!card] recall
> A support ticket says "our SSO users can log in, but our regular
> password users on the same app suddenly can't." Given that
> connections are enabled per application and not per tenant, what
> configuration change would produce exactly this symptom, and why
> wouldn't it affect the SSO users at all?
> ---
> The database connection was disabled (or removed) from that specific
> application while the enterprise connection stayed enabled on it.
> Because each connection's enabled/disabled state is scoped to the
> application, not the tenant, disabling one connection has no effect
> on any other connection's users — the SSO users' enterprise connection
> was never touched, so only the password-based population is locked out. ^card-blhr
