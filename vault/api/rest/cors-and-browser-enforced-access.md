---
topic: api-design
category: api-rest
tags: [cors, same-origin-policy, preflight, browser-security, fetch-standard]
citations: ["WHATWG Fetch Standard (CORS)", "RFC 9110", "RFC 7231"]
---

# CORS and browser-enforced access

The single fact that resolves most confusion about CORS: it is enforced
by the browser, not the server. CORS headers are the server's way of
telling a browser which cross-origin scripts it will permit to read a
response — the server still processes the request and sends the
response either way. The browser is the party that reads those headers
and decides whether to hand the response to the calling script or block
it.

That means CORS is not access control on the API. Anything that isn't a
browser running someone else's JavaScript — curl, a server-to-server
call, a mobile app, a script using an HTTP library directly — never
consults CORS headers at all, because there is no browser sandbox
enforcing same-origin rules for it to opt out of. A response can carry
whatever `Access-Control-*` headers it likes; a non-browser client reads
the body regardless.

> [!card] recall
> Explain why setting permissive CORS headers on an endpoint does nothing
> to stop a non-browser client — say, a script calling the API directly
> with curl — from reading data it shouldn't have access to. What
> mechanism, if any, actually restricts that client?
> ---
> CORS headers are instructions to a browser about whether to let a
> cross-origin script read a response it already received; the browser is
> the thing that reads and enforces them. A curl script isn't a browser
> and has no same-origin sandbox to begin with, so there's nothing for
> the headers to relax or restrict for it — it simply reads whatever the
> server sends back. Real access control has to come from authentication
> and authorization on the server itself, which CORS headers play no part
> in. ^card-b8gv

An **origin** is the triple of scheme, host, and port that a page was
loaded from — `https://app.example.com:443` and
`https://api.example.com:443` are different origins even though they
share a registered domain, because the host differs; changing just the
scheme or port also produces a different origin.

Why does the same-origin policy exist as a default restriction in browsers at all? :: Because a browser routinely has multiple tabs and embedded frames open at once, each potentially loaded from a different site, while also holding cookies and other ambient credentials for those sites. Without a default restriction, a script from one origin could freely read responses (and thus data) from any other origin the browser happens to have access to, turning every open tab into a potential data leak for every other one. The same-origin policy makes "different origin" a hard boundary by default, and CORS is the mechanism a server uses to deliberately punch a hole in that boundary for specific origins. ^card-5k0l

Not every cross-origin request needs a round trip to ask permission
first. A request qualifies as a ==simple request== if it uses one of a ^card-ooxo
short list of methods (GET, HEAD, POST), only sets headers from a small
allowed set, and if it sets `Content-Type` at all, restricts it to one
of a few plain form or text values.

One of those goes straight to the server, with the browser only checking
the response's `Access-Control-Allow-Origin` header afterward before
deciding whether to expose the response to the script.

Anything that falls outside those bounds — a non-simple method like PUT
or DELETE, a custom header such as an `Authorization` bearer token or an
app-specific header, or a `Content-Type` like `application/json` —
triggers a round trip that asks the server for permission before the
real request is sent at all.

Which three properties of a cross-origin request determine whether it counts as simple or triggers a preflight first? :: Its HTTP method, whether it sets any headers outside the small allowed set, and its Content-Type value if one is set — anything outside the simple bounds on any of these three forces a preflight. ^card-fkh9

Before sending a preflighted request, the browser sends an
==OPTIONS== request of its own to the same URL, asking the server to ^card-65qz
name what the real request would be allowed to do:

```
OPTIONS /api/orders
Origin: https://app.example.com
Access-Control-Request-Method: DELETE
Access-Control-Request-Headers: authorization

Response:
204 No Content
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST, DELETE
Access-Control-Allow-Headers: authorization
```

The browser compares the actual request it wants to make against those
`Access-Control-Allow-*` values, and only sends the real request if
everything it needs is covered. That check happens entirely in the
browser; the server never sees a second confirmation that the check
passed.

> [!card] mcq
> A script at `https://app.example.com` sends a cross-origin `DELETE`
> request carrying an `Authorization` header. The server's OPTIONS
> response lists `Access-Control-Allow-Methods: GET, POST` and no
> `Access-Control-Allow-Headers` at all. What happens?
> - [x] The browser blocks the DELETE request from being sent — the preflight didn't authorize the method or the header
> - [ ] The DELETE request is sent and succeeds, since the origin itself was allowed
> - [ ] The DELETE request is sent, but the response body is hidden from the script
> - [ ] The preflight is ignored for authenticated requests ^card-g6qb

By default, a cross-origin request is sent without cookies and without
whatever `Authorization` header the calling page might normally attach
for same-origin requests — the browser strips that ambient credential
context unless both sides opt in explicitly.

What must a cross-origin request set to send credentials such as cookies or an Authorization header, and what must the server's response set in turn for the browser to expose the result to the script? :: The client-side fetch has to explicitly opt in to including credentials. The server must respond with Access-Control-Allow-Credentials set to true, and critically, Access-Control-Allow-Origin naming that one specific origin exactly — a wildcard value there is disallowed the moment credentials are involved, so credentialed cross-origin access can never be paired with "allow any origin." ^card-dtkg

That wildcard restriction is deliberate: a server that reflects back
whatever `Origin` header it receives and pairs it with
`Access-Control-Allow-Credentials: true` has, in effect, told every
website on the internet that its authenticated users' browsers may read
authenticated responses on their behalf — the exact leak the
same-origin policy was there to prevent.

A common way teams "fix" a CORS error in development is to set
`Access-Control-Allow-Origin: *` and move on. That satisfies the
immediate symptom because the browser stops blocking the response, but
it also means literally any site's script can read that endpoint's
responses in a logged-out, non-credentialed context — which is often
fine for a public GET, and a real problem the moment the endpoint
returns anything the requester shouldn't be able to see from an
arbitrary third-party page. One clarification worth holding onto
separately: CORS says nothing about whether a request can be *sent* — a
browser will still send a cross-site form submission or a preflighted
request either way — so it is not a defense against cross-site request
forgery, which is a different problem solved elsewhere.

What does loosening an endpoint's CORS policy to allow any origin actually cost, given that it does stop the immediate browser error? :: It removes the browser-side restriction on which cross-origin scripts may read the endpoint's responses entirely, so any website's script can read that data from a visitor's browser. For a public, non-credentialed GET that may be harmless, but for anything that returns data scoped to who is asking, it turns the endpoint into one any third-party page can read through a visiting user's browser. ^card-3rko
