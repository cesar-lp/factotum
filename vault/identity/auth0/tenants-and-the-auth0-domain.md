---
topic: identity
category: identity-auth0
tags: [auth0, tenant, domain, custom-domain, region, data-residency]
citations: ["Auth0 Docs — 'Tenants'", "Auth0 Docs — 'Configure Custom Domains'", "Auth0 Docs — 'Data Residency'"]
---

# Tenants and the Auth0 Domain

Everything else in this category — connections, applications, APIs,
Actions, custom claims — is configured inside one container: the tenant.
Before any of those pieces make sense on their own, it's worth being
precise about what a tenant actually bounds, because that boundary is
stricter, and less negotiable, than it looks from the dashboard.

A tenant holds every user, every connection to an identity provider, every
registered application and API, every signing key, and every tenant-wide
setting — branding, token lifetimes, default audience. None of that is
reachable from outside the tenant it lives in, not even from a second
tenant on the same Auth0 account created for a "related" purpose.

What does creating a second Auth0 tenant give you access to from the first one? :: Nothing automatically. A tenant is a hard isolation boundary, not a namespace within a shared pool — the second tenant starts with its own empty users, connections, applications, APIs, and settings, and nothing carries over unless someone explicitly configures it in both places. ^card-guqb

Every tenant is reachable at a domain of the shape
`<tenant>.<region>.auth0.com`, and that domain is not just where the login
pages live — it is also the value that appears in the `iss` claim of every
token the tenant issues. A resource server validating a token checks that
claim against the domain it expects, so the ==tenant domain== doubles as ^card-qlms
the tenant's OIDC issuer identifier.

> [!card] recall
> Explain why the Auth0 tenant domain is not merely a hostname you can
> swap for cosmetic reasons — what else is tied to it, and what breaks for
> a resource server if that value changes underneath it?
> ---
> The tenant domain is the OIDC issuer baked into every token's `iss`
> claim. A resource server validates that claim against the issuer it
> expects, so changing the domain changes the issuer, and any token
> minted under the old domain (or validation logic still pinned to it)
> stops matching. It is an identity value, not just a routing address. ^card-94wj

Auth0 lets a tenant sit behind a custom domain (something like
`login.example.com`) instead of the default `*.auth0.com` one. That's
usually framed as branding, but the more consequential effect is on
cookies: a login page served from Auth0's own domain is, from the
browser's point of view, a ==third-party== context relative to the ^card-qioz
application, which is exactly the kind of cookie modern browsers
increasingly restrict or block outright — breaking silent authentication
and single sign-on across applications that depend on a session cookie
surviving a redirect through Auth0. Serving the login experience from a
domain under the application's own registrable domain makes that cookie
first-party again.

Why does moving Auth0's hosted login page onto a custom domain fix more than branding? :: Because it changes whether the browser treats Auth0's session cookie as first-party or third-party. On the default `*.auth0.com` domain, that cookie is third-party relative to the application and subject to browser restrictions that break silent authentication and cross-application SSO; a custom domain under the application's own registrable domain makes the same cookie first-party, which those restrictions don't target. ^card-5del

> [!card] mcq
> A team switches a production tenant from its default `*.auth0.com`
> domain to a custom domain. Besides the login page's URL, what else
> changes as a direct consequence?
> - [x] The token issuer (`iss`) value, since the custom domain becomes the tenant's domain and any validation logic pinned to the old issuer string must be updated
> - [ ] Nothing else — the custom domain is purely cosmetic and every other value stays identical
> - [ ] The tenant's region, since custom domains are only available by re-provisioning the tenant in a new region
> - [ ] The client_id of every registered application, since custom domains force credential rotation ^card-2zir

A tenant is also pinned to a ==region== at creation — the geography whose ^card-8eee
data centers actually store and process that tenant's data — and that
choice generally can't be changed later without recreating the tenant, so
it's a data-residency decision made once, up front, not a setting to
revisit.

Given all of that isolation, the natural shape for a real project is one
tenant per environment — separate tenants for development, staging, and
production — rather than one tenant with an `environment` field on its
users and applications to keep them apart logically. The reason isn't
tidiness: inside a single tenant, a "test" user created for a staging
integration test is a real user in the same pool production login counts
against, and a configuration change — a new connection, a stricter
password policy, a rule added to the login pipeline — applies to every
application and every user in that tenant, staging and production alike,
because the tenant has no internal walls to contain it.

Why is "one tenant per environment" the safer default over a single tenant with environment-tagged users and applications? :: A tenant has no isolation inside itself — everything in it shares one user pool, one set of connections, and one configuration. Tagging data by environment doesn't create a boundary; it just labels rows in a pool a staging test can still pollute and a configuration change still affects globally. Separate tenants make that isolation real instead of conventional. ^card-rpid

Splitting environments into separate tenants raises its own question —
how a tenant's configuration is supposed to be kept consistent, and
recoverable, across all of them when most of it isn't version-controlled
by default. That tension is covered in
`operating-a-tenant-environments-and-limits.md`, not here.
