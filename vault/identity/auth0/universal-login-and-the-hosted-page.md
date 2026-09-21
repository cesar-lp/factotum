---
topic: identity
category: identity-auth0
tags: [auth0, universal-login, hosted-page, sso, custom-domain]
citations: ["Auth0 Docs — 'Universal Login'", "Auth0 Docs — 'Custom Domains'"]
---

# Universal Login and the hosted page

`the-authorization-code-flow.md` covers the redirect-and-callback
mechanics that carry a user to an authorization server and back. This
note is about what actually sits at the far end of that redirect in
Auth0: Universal Login, a login page Auth0 hosts and serves from its
own domain, rather than a form the application renders inside itself.

The application never draws a login screen at all. It sends the
browser away, to a page living on Auth0's domain, and only gets the
browser back once that page has finished. It's tempting to read that
detour as friction to be engineered away — why not just render the
form locally and call an API? — but the redirect is the feature, not
a workaround for one.

Three things follow directly from the credentials being typed on
Auth0's own origin instead of the application's. First, the
application's own code, and any script it loads, is never in the same
origin as the login form — a compromised or careless application
dependency simply has nothing to intercept, since the ==password== ^card-2my8
field it would need to read never renders in that application's page
at all.

Second, one hosted page serves every application registered in the
tenant. A tenant with a dozen applications maintains one login
surface, not a dozen independent ones that each have to be kept
patched and consistent.

Third — and this is the one that actually changes user experience —
the browser picks up a session cookie scoped to the Auth0 domain the
first time it visits Universal Login. A second application in the
same tenant, redirecting the same browser to that same domain, finds
that cookie already there and returns the user signed in with no
prompt at all. That's single sign-on across independently owned
applications, and it only works because the login page — and the
cookie it sets — genuinely lives in one place shared by all of them.

Why does having every application in a tenant redirect to the same hosted login page, rather than each rendering its own, make cross-application single sign-on possible in the first place? :: Because the SSO session cookie is set on Auth0's own domain during the first login, and every application redirects the browser back to that same domain. A second application's redirect arrives at a page that already recognizes the browser from the shared cookie, so it can return the user authenticated without asking again — something no application could produce by rendering a login form on its own separate origin. ^card-gj9e

> [!card] mcq
> A company runs three independently deployed web applications in the
> same Auth0 tenant and wants a user who logs into one to be signed
> into the others automatically, without re-entering credentials.
> Which approach makes that possible?
> - [x] Have each application redirect to Universal Login, so the SSO session cookie set on the Auth0 domain is shared across all three
> - [ ] Embed a login form in each application, since Auth0 issues one shared token automatically regardless of where the form renders
> - [ ] Redirect only the first application's login through Universal Login and copy its token into the other two
> - [ ] This requires SAML instead of an OAuth-based login flow ^card-tyt4

An application can opt out of the redirect and render its own login
form, submitting credentials directly to Auth0's Authentication API in
the background. Nothing stops this technically, but it gives up
everything the redirect model was buying.

What does an application give up, specifically, by embedding its own login form instead of redirecting to Universal Login? :: It loses the shared SSO session, since there is no longer one common page setting one common cookie — each application now has to establish its own idea of "already logged in." It takes on directly handling user credentials: receiving, transmitting, and never accidentally logging the password itself, which is exactly the liability Universal Login existed to remove from application code. And because the login form now lives on the application's own origin while the token exchange still has to reach the Auth0 domain, that traffic becomes cross-origin, which runs straight into a browser's third-party cookie restrictions on exactly the request that needs to read the Auth0 session. ^card-onmp

That last point is why a ==custom domain== matters so much for Auth0 ^card-0nf9
tenants, and it isn't a branding nicety. Left at its default, Auth0's
endpoints live on a subdomain of auth0.com — a different registrable
domain from the application's own — so browsers enforcing stricter
third-party-cookie rules can quietly break silent authentication and
session detection between the application and Auth0. Putting Auth0's
endpoints on a subdomain of the application's own domain instead makes
that traffic first-party, which is what lets embedded or
cross-subdomain calls to the Auth0 domain keep working as browsers
tighten cookie policy further.

> [!card] recall
> An application still calls Auth0's Authentication API directly for
> its login form instead of redirecting to Universal Login, and its
> engineers argue this is fine because they're "still using Auth0."
> Explain what they've actually lost, and why a custom domain does not
> fix the biggest of those losses.
> ---
> They've lost the shared SSO session and the guarantee that
> credentials never touch the application's own origin — a custom
> domain only addresses the third-party-cookie problem for calls that
> still reach Auth0, it does nothing to restore a login page shared
> across every application in the tenant, since there is no longer a
> shared hosted page at all. ^card-vc7j

Auth0 offers two ways to shape that hosted page itself, and the choice
is a real tradeoff rather than one simply being the "better" option.
The New experience is built from configuration settings and prebuilt
page templates — branding colors, logos, and layout options assembled
by Auth0's own rendering. The Classic experience instead hands over
the page as arbitrary hand-written HTML, CSS, and client-side
JavaScript that the tenant owns outright.

> [!card] mcq
> A team wants a login page with fully custom HTML structure and
> client-side JavaScript behavior beyond what branding settings and
> templates expose. Which Universal Login experience gives them that,
> and what do they take on by choosing it?
> - [x] The Classic experience — arbitrary hand-written page code, but the tenant now owns maintaining and securing that code itself
> - [ ] The New experience — it already supports arbitrary HTML and JavaScript by default
> - [ ] The Classic experience, with no added maintenance burden since Auth0 still renders the page
> - [ ] Neither; that level of customization requires abandoning Universal Login for an embedded form ^card-raam

Cookie attributes, the shape of the resulting session, and how logout
tears that session down belong to `sessions-and-the-session-identifier.md`
and `logout-and-session-termination.md`; this note only covers where the
login page itself lives and why that placement is deliberate.
