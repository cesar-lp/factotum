---
topic: identity
category: identity-auth0
tags: [auth0, actions, extensibility, triggers, rules, hooks]
citations: ["Auth0 Docs — 'Actions'", "Auth0 Docs — 'Actions Triggers'"]
---

# Actions and the extensibility pipeline

Auth0 lets a tenant run its own Node code at defined points inside a
login, token, or registration flow, rather than only configuring
built-in behavior. An Action is that code: a small function Auth0
invokes, passes context to, and expects a result back from before it
continues the flow. What matters most about any given Action isn't
the code inside it — it's which point in the flow it's bound to,
because that binding, the ==trigger==, is what determines what the ^card-303t
function can even see and what it's allowed to change. The same
twenty lines of logic that work perfectly bound to one point in the
flow can be inert, or actively wrong, bound to another.

The post-login trigger is the one most tenants reach for first, and
its scope is wider than the name suggests.

Besides an ordinary interactive username-and-password login, what else runs a post-login Action? :: Silent authentication and refresh token exchanges also fire the post-login trigger, not just an interactive login where the user is present and typing credentials. Logic written assuming a fresh interactive session — prompting for extra verification, or reading a field only ever set at explicit login — can misfire quietly in the background on every refresh instead. ^card-j18n

A separate trigger, credentials-exchange, fires for the client-credentials
grant that `client-credentials-and-machine-to-machine.md` covers — the
grant where a service authenticates as itself, with no end user
involved anywhere in the request.

Why does an Action bound to the credentials-exchange trigger that checks something like a user's email address or profile field silently do nothing, rather than raising an error? :: A client-credentials token has no associated user at all, so the event object handed to that Action carries no user record to inspect. A check written for a user-shaped field simply finds nothing there and moves on — there's no user to be wrong about, so nothing fails loudly; the logic just never has any effect on a machine-to-machine token. ^card-pyze

Two more triggers bracket account creation itself rather than login:
pre-user-registration runs before a new user record is written to a
database connection, in time to block or alter that record, and
post-user-registration runs afterward, once the user already exists.

> [!card] mcq
> A tenant wants to reject new signups whose email domain matches a
> banned list, before any user record is created in the database
> connection at all. Which trigger should that Action be bound to?
> - [x] pre-user-registration — it runs before the user record is created, so it can still veto or modify it
> - [ ] post-user-registration — the user record already exists by the time this trigger runs
> - [ ] post-login — this trigger has nothing to do with the registration flow
> - [ ] credentials-exchange — this trigger only fires for machine-to-machine tokens, which never register users ^card-sw1u

Whatever the trigger, every Action receives the same two-object shape:
an event object and an api object, and the two are not interchangeable.

What can an Action accomplish by mutating the event object it receives? :: Nothing. Event is a read-only snapshot of the current context — who's logging in, which client, which connection — and changes made to it are simply discarded. Every effect an Action can have on the outcome of the flow, from adding a claim to canceling it outright, has to go through the separate api object instead. ^card-wrs2

When a tenant chains several Actions onto one trigger, they run in a
defined order, one after another — but "in sequence" doesn't mean
they form one program.

What do two post-login Actions bound to the same trigger, running one after another, actually share with each other? :: Nothing beyond whatever the first one explicitly attaches to the api object for the next to read — there's no shared variable scope or memory between them. Each Action executes as its own isolated invocation; if the second one needs something the first computed, the first has to have written it onto api itself, not just held it in a local variable. ^card-h0oh

That isolation makes a single Action's reliability the reliability of
the whole login, which is easy to underestimate until it fails.

> [!card] mcq
> A tenant's post-login flow has one Action, twenty lines long, that
> calls an external API to enrich the user's profile. That external
> call hangs and the Action never returns within its execution time
> limit. What happens to the login attempt itself?
> - [x] The login fails outright — an unhandled timeout in a post-login Action fails the flow it's bound to, not just that one Action
> - [ ] The login succeeds, just without the enrichment data the Action would have added
> - [ ] Auth0 retries the Action once automatically and only fails the login if the retry also times out
> - [ ] Only that Action's remaining code is skipped; earlier changes it made to the token still apply and login proceeds ^card-ufg9

An Action can also refuse a login on purpose rather than by accident.
Calling ==access.deny== on the api object is the deliberate way to ^card-r872
stop a login in its tracks — the mechanism a fraud check or a
suspended-account check reaches for, as distinct from a login that
fails because something in the Action broke instead.

`custom-claims-and-namespacing.md` covers, as its own subject, how a
post-login Action uses the api object to attach claims to an issued
token — one example among many of what api, and only api, can do.

Actions replaced two older extensibility mechanisms that a long-lived
tenant may still have lying around.

What is the relationship between Rules and Hooks, and Actions? :: Rules and Hooks are Auth0's older, now-deprecated mechanisms for the same kind of customization Actions provide today — Rules ran custom logic at login time, Hooks ran it at specific pipeline events like registration. Existing tenants may still have them configured and running, but they are not the model to build new customization on. ^card-ggtu
