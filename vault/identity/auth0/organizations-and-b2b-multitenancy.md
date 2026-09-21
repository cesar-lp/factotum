---
topic: identity
category: identity-auth0
tags: [auth0, organizations, b2b, multitenancy, org_id]
citations: ["Auth0 Docs — 'Organizations'", "Auth0 Docs — 'Organizations Authorization Flows'"]
---

# Organizations and B2B multitenancy

`tenants-and-the-auth0-domain.md` treats the tenant as Auth0's own
isolation boundary — one pool of users, connections, and applications,
shared account-wide. Organizations solve a different problem, one layer
down inside that boundary: a single application, in a single tenant,
serving many separate customer companies, each of whom expects to log
in and see only their own users, connections, and access — without
Auth0 provisioning a whole tenant per customer. An Organization is not
a smaller tenant. It's a feature that runs inside one tenant, modeling
one of *your* customers rather than one of Auth0's.

Membership is the relationship that makes this work without multiplying
accounts. A user can belong to any number of Organizations, including
none at all, and belonging to several doesn't split that person into
several identities — underneath, every membership points back to the
==same user record==, just associated with more than one company. ^card-k615

Role assignment then has two different scopes, and confusing them
produces the wrong kind of question. `rbac-roles-and-permissions.md`
covers how a role's permissions are defined once, tenant-wide; what
Organizations add is a second axis for *handing out* that role — it can
be assigned to a user only within the context of one particular
Organization, so the same person can hold an admin role inside one
customer's Organization and hold nothing, or a completely different
role, everywhere else.

What's the difference between assigning a role to a user directly (tenant-level) versus assigning that role to the user within an Organization? :: A tenant-level assignment applies to that user everywhere, regardless of any Organization context. An Organization-scoped assignment only grants the role while the user is acting as a member of that specific Organization — the same user can hold a different role, or none at all, in a different Organization. ^card-qm25

Connections are scoped the same way. A tenant might have a dozen
identity providers configured across every application in it, but each
Organization only enables the subset that makes sense for that one
customer — its own enterprise SSO connection, say — rather than every
member of every Organization seeing every connection the tenant has
ever configured. Which connections are usable for a given login is
decided ==per Organization==, not once for the whole tenant. ^card-chkm

The login then has to carry which company it happened for, and that
travels as a claim on the resulting token: alongside the usual `sub`
identifying the user, Auth0 adds a second identifier naming the
Organization the session was authenticated under, plus its display
name if the application asked for that too. A resource server reading
the token knows not just who is asking, but which of that user's
companies they're asking on behalf of — because the token carries an
==org_id== claim (with a companion `org_name` claim available ^card-2p6o
alongside it) naming exactly that.

Getting that Organization into the login in the first place works one ^card-b6wp
of two ways. What authorization parameter lets an application that already knows which company a user belongs to skip straight to that Organization's login, instead of asking the user to pick? :: The organization parameter, passed to Auth0's authorize call and set to that Organization's id. This scopes both the login and the resulting token to that Organization directly, with no extra step.

Auth0 supports two different login models for an Organization-aware application. What are they, and when does each apply? :: Named-organization login, where the application already knows which Organization a session belongs to — for instance from a company-specific login URL — and passes the organization parameter up front; and organization discovery, where the application doesn't know yet, so Auth0 either prompts the user to choose among the Organizations they belong to or matches them automatically by email domain. ^card-hagt

That `org_id` claim is not a courtesy field — it's the piece that keeps
a member of two Organizations from reading the wrong one's data.

> [!card] mcq
> A user is a member of both Acme's and Globex's Organizations inside
> the same B2B application. They authenticate through Acme's
> Organization-scoped login, then later start a separate session
> through Globex's. A resource server checks only the user id on
> incoming requests, never which Organization the token says the
> session is acting as. What's the concrete risk?
> - [x] The resource server can't tell which company's data a request should be scoped to, so a request authenticated under one Organization's session could end up authorized against the other Organization's data
> - [ ] None — the user id alone uniquely determines which data the request should touch
> - [ ] The token would fail signature validation before it ever reaches the resource server
> - [ ] Auth0 would refuse to issue a second token to a user who already holds one for a different Organization ^card-ef3u

> [!card] recall
> Explain why "this token belongs to user X" is not enough for a
> multi-Organization B2B resource server to authorize a request safely
> — which claim has to be checked in addition, and what goes wrong if
> it isn't.
> ---
> A user can be a member of more than one Organization, so the user id
> alone says who is acting, not which company's data they're acting for
> in this particular session. The resource server has to check the
> org_id claim and scope every query and permission check to that
> Organization specifically. Trusting the user id alone risks a
> legitimate member of two Organizations having a request authorized
> against whichever Organization the resource server's own records
> happen to associate with that user id, even when the token says a
> different Organization entirely. ^card-vw3w
