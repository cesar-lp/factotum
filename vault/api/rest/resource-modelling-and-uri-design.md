---
topic: api-design
category: api-rest
tags: [rest, resource-modelling, uri-design, identifiers, api-design]
citations: ["Fielding, Architectural Styles and the Design of Network-based Software Architectures, Ch. 5"]
---

# Resource modelling and URI design

REST's identification-of-resources constraint says every resource
gets a stable name, but it says nothing about what that name
should look like. The conventions that grew up around REST APIs
for URI shape are practical follow-on decisions, not part of
Fielding's dissertation itself — and they're worth separating from
the style's actual constraints for exactly that reason.

The most load-bearing of those conventions is that a URI path
segment names a thing, not an action performed on it.

A URI path should read as a ==noun== — the resource itself — never ^card-ml8v
as a verb describing an operation on that resource.

```
GET  /orders/42        (a resource)
POST /orders/42/cancel (a verb smuggled into the path — see below)
```

The method carries the verb; `GET /orders/42` retrieves the order,
`DELETE /orders/42` removes it, and the same noun-shaped path
serves every one of those operations. A path like
`/getOrder?id=42` or `/deleteOrder` duplicates the verb the method
already carries and gives the URI no stable identity independent
of what's being done to it.

Two different shapes of resource sit under that convention, and
mixing them up is a common source of confusing endpoint design.

What is the difference between a collection resource and an item ^card-m5dx
resource, and how does that difference typically show up in a
URI? :: A collection resource represents the set of all resources
of a kind — for example every order — while an item resource is
one specific member of that set. The convention is a plural
collection path, with the item's identifier appended as a further
path segment: `/orders` for the collection, `/orders/42` for one
member of it. `GET` on the collection lists members; `GET` on the
item retrieves that one; `POST` on the collection is the
conventional way to create a new member, since the client doesn't
yet know the identifier a fresh item will get.

Once there's an item resource, something has to serve as its
identifier in the URI, and that choice is not neutral.

> [!card] mcq
> An API currently identifies orders by their auto-incrementing
> database primary key, e.g. `/orders/8842`. A reviewer flags this
> as a design decision worth reconsidering rather than a safe
> default. What is the strongest reason for that concern?
> - [x] It leaks internal implementation detail — competitors or attackers can estimate order volume and growth rate, and the API is now coupled to that column never changing shape
> - [ ] Numeric identifiers are invalid in URIs and must be percent-encoded
> - [ ] Database primary keys are always slower to look up than a UUID
> - [ ] REST forbids exposing any server-generated value in a URI ^card-n953

An ==opaque identifier== — a random or hashed token with no ^card-5rte
guessable structure — avoids that leak entirely, at the cost of
being unreadable and unguessable by a human working with the API
directly.

A **slug** (a human-readable string derived from a name, like
`/articles/rest-api-design`) trades that opacity for readability
and memorability, but only suits resources whose defining text is
stable — an edited title forces a choice between breaking old
links or keeping a separate immutable id underneath the slug
anyway. A **natural key** — a value that's already unique in the
domain, like an ISO country code or an email address — avoids
inventing an identifier at all, but only when the domain actually
guarantees that uniqueness permanently; a value a user is allowed
to change later is not a safe natural key.

What must hold true of a natural key for it to be a safe choice as ^card-0de0
a public resource identifier? :: Its uniqueness has to be
guaranteed permanently by the domain itself, and it must not be a
value the owning user or system is allowed to change later —
otherwise a resource's identifier would shift out from under
anyone who had linked to or stored it.

Exposing a database's own primary key as the public identifier is
one option among these, not the default it's often treated as: it
is quick to implement, but it fuses a public, hard-to-change
contract to an internal column that the schema might otherwise be
free to renumber, resequence, or drop.

Resource nesting raises a parallel question: how deep should a
path go before a sub-resource deserves to stand on its own?

When should a sub-resource nested under its parent, like ^card-xocv
`/orders/42/line-items`, be promoted to a top-level resource
addressed directly, like `/line-items/{id}`? :: When it develops
an identity and a lifecycle independent of that one parent —
callers need to fetch, link, or reference a specific line item
without knowing which order it belongs to, or the same item
conceptually needs to be reachable, queried, or modified outside
its parent's context. As long as a sub-resource is only ever
meaningful in the context of exactly one parent and is never
addressed on its own, nesting it one level deep is fine; nesting
several levels deep (`/orders/42/line-items/7/adjustments/3`) is
usually a sign that at least one of those levels should have been
promoted, since a client now has to carry the whole chain of
parent ids just to name one adjustment.

Not everything fits the noun-and-method mold, and Fielding's style
doesn't require pretending it does. Some operations genuinely
don't manipulate a resource's state in a way `PUT`, `PATCH`, or
`DELETE` naturally express — sending a password-reset email, or
canceling a running job — and forcing one of those methods onto
them just to stay "pure" produces an API that's harder to read
than one that admits the operation is an action.

> [!card] recall
> Give an example of an operation that is not naturally a resource
> to be created, replaced, or deleted, and describe the pragmatic
> way REST APIs commonly model it in the URI despite the
> noun-not-verb convention.
> ---
> Something like canceling an order, resetting a password, or
> resending a verification email doesn't map onto a resource being
> created, fully replaced, or removed — it's an action with a side
> effect. The common pragmatic approach is a `POST` to a path that
> names the action as a sub-resource of the noun it acts on, such
> as `/orders/42/cancel` or `/users/9/password-resets`: the path
> still hangs off a real resource, and `POST`'s "process this, with
> server-defined effect" semantics fit an action far better than
> contorting a `PUT` or `PATCH` to represent it. ^card-43cg
