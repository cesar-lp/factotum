---
topic: identity
category: identity-auth0
tags: [auth0, rbac, roles, permissions, scope]
citations: ["Auth0 Docs — 'Role-Based Access Control'", "Auth0 Docs — 'Enable Role-Based Access Control for APIs'"]
---

# RBAC, roles, and permissions

`applications-versus-apis.md` establishes that an API is its own Auth0
resource, registered separately from the applications that call it.
This note is about the access-control layer Auth0 builds on top of
that split.

A permission — something like `read:invoices` — is defined on an API,
not anywhere global. That placement isn't a filing detail; it's
required by what a permission means. `read:invoices` only makes sense
in relation to whatever resource server is going to receive a token and
decide whether to honor a request — a string with no API behind it
isn't a permission at all, just a label nobody has agreed to interpret.
Two different APIs can each define their own `read:invoices` and they
share nothing but a name.

Why does it make no sense for a permission to exist independently of any API, rather than as a global string every application can reference? :: A permission is only meaningful in relation to the resource server that interprets it and decides what to do when a request carries it — without that API, the string is just text with no agreed meaning, and the same name defined on two different APIs represents two entirely unrelated permissions. ^card-yk3i

A role is a named ==bundle== of permissions — `billing-admin`, say, ^card-k8tg
holding several permissions across one or more APIs — created so an
administrator can assign one thing instead of enumerating a list every
time. A user's actual permission set is the union of both paths: some
permissions can be granted to a user directly, and others arrive
because the user holds a role that includes them. Auth0 doesn't
distinguish the two once a token is issued — a direct grant and a
role-derived grant look identical from the resource server's side.

Can a user hold a permission that isn't backed by any role, alongside permissions that come from a role? :: Yes — direct permission grants and role membership are independent, additive paths to the same outcome. A user's effective permissions are the union of whatever was assigned to them individually and whatever their assigned roles carry, and nothing requires every permission to route through a role. ^card-jsny

Two separate, per-API switches govern how any of this reaches a token,
and confusing them is the most common RBAC mistake. The first is
**enable RBAC**, which tells Auth0 to enforce that the scopes a client
requests for this API are checked against what the logged-in user
actually holds. The second, independent switch is **add permissions in
the access token**, which decides whether the user's permissions are
written into the token's `permissions` claim at all. An API can have
RBAC enforcement on with that second switch off — scopes get filtered
correctly, but the resource server never receives an explicit
permissions list to read, only whatever ended up in `scope`.

> [!card] mcq
> An API has RBAC enabled. A client requests the scopes
> `read:invoices write:invoices delete:invoices` when it authenticates a
> user who — via their assigned roles — only actually holds
> `read:invoices` and `write:invoices`. What does Auth0 do?
> - [x] Issues the token with scope narrowed to read:invoices and write:invoices, silently dropping delete:invoices rather than rejecting the request
> - [ ] Rejects the authentication outright, since the requested scope exceeds what the user holds
> - [ ] Issues the token with all three requested scopes, since scope and permissions are tracked separately
> - [ ] Prompts the user to consent to the reduced scope before continuing ^card-9kr1

That narrowing is the switch's whole point, and it has a consequence
that's easy to miss: with RBAC on, the `scope` claim a resource server
receives is the ==intersection== of what the client asked for and what ^card-2aw7
the user is actually entitled to — never simply an echo of the
request. A resource server that decides what to allow based on what it
believes it *asked* for, rather than what actually landed in the token
it received, will grant access the user was never entitled to the
moment those two things diverge.

Why must a resource server check the scope actually present in the access token it receives, rather than trust the scope the client requested during authentication? :: Because Auth0 enforces RBAC by narrowing, not rejecting — a granted scope can be a strict subset of the requested one, silently. The client's request describes what it asked for, not what the token ultimately carries, so any authorization decision based on the request instead of the token itself can be wrong in the permissive direction. ^card-2rq0

Roles themselves live at the ==tenant== level — created once, available ^card-u8l5
to assign to any user in that whole account.

Scoping *who* holds a role to one customer's slice of a multi-tenant
setup is a different concept, covered in
`organizations-and-b2b-multitenancy.md`.

> [!card] recall
> An engineer argues that turning on "add permissions in the access
> token" is redundant once RBAC enforcement is already enabled for an
> API, since RBAC is already checking permissions under the hood.
> Explain what each switch actually controls, and what breaks if only
> RBAC enforcement is turned on for an API whose resource server needs
> to branch on individual permissions.
> ---
> RBAC enforcement only governs whether requested scopes get filtered
> down to what the user holds — it decides what can end up in the
> `scope` claim. Adding permissions to the access token is a separate
> decision about whether the user's full permission set is also written
> into a `permissions` claim. With RBAC on but that second switch off,
> a resource server that wants to check a specific permission like
> `delete:invoices` has nothing to read except `scope`, and has to fall
> back to treating scope strings as permissions — which works only if
> every permission was also requested as a scope. Enabling the
> `permissions` claim removes that coupling and gives the resource
> server the user's actual permission set directly, independent of
> whatever scopes the client happened to request. ^card-eer4
