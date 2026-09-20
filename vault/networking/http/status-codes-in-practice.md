---
topic: networking
category: http-protocol
tags: [http, status-codes, redirects, error-handling]
citations: ["RFC 9110 (HTTP Semantics)"]
---

# Status codes in practice

Knowing that 2xx means success and 4xx means a client-side problem
doesn't help once two codes from the same class disagree about what a
client should actually do next. This note is about those specific
disagreements — the pairs and near-neighbors that get mixed up in
practice.

## The redirect quartet: 301, 302, 307, 308

Four redirect codes exist because two independent questions get asked
about any redirect: is it permanent, and is the client allowed to change
the request method (and body) when it follows it?

`301 Moved Permanently` says the resource now lives at a new URL for
good, but historically left it ambiguous whether a client could switch
`POST` to `GET` on the follow-up request — and most browsers do exactly
that in practice. `302 Found` says the move is temporary, with the same
long-standing ambiguity about the method.

`307 Temporary Redirect` and `308 Permanent Redirect` were introduced to
remove that ambiguity: both require the client to reuse the original
method and body on the redirected request. So `307` is `302`'s
unambiguous counterpart, and `308` is `301`'s.

Which two of the four redirect codes guarantee that the client will reuse the original request method and body, rather than potentially switching to GET? :: 307 Temporary Redirect and 308 Permanent Redirect. 301 and 302 predate that guarantee and historically left method-switching behavior up to the client. ^card-nz72

If a resource has permanently moved and the client must keep using its original method on the follow-up request, which single status code fits both conditions? :: 308 Permanent Redirect — permanent like 301, but with 307/308's guarantee that the method and body are preserved rather than possibly downgraded to GET. ^card-0kaz

## 401 vs 403: who failed, and where

`401 Unauthorized` means the request lacks valid authentication — the
server doesn't know who is asking, or the credentials supplied were
invalid, and it must be accompanied by a `WWW-Authenticate` header
telling the client how to authenticate. `403 Forbidden` means the server
knows exactly who is asking and has decided that identity is not allowed
to have this resource, regardless of any credentials it presents.

The distinguishing question is not "did the request fail" but "would
different credentials fix it." Retrying a 401 with valid credentials can
succeed; retrying a 403 with different, even more privileged-looking
credentials for the same account still fails if the resource is simply
off-limits to that account.

A server returns 403 for a request that already carried a valid, correctly-formatted API key. Does supplying a different, also-valid key for the same account have any chance of succeeding? :: No — 403 means the server already identified the requester and is denying access to that identity's account regardless of which valid credential represented it; only a genuinely different identity, or a permission change on the server side, could change the outcome. ^card-9fzq

## 404 vs 410

`404 Not Found` says nothing more than "no resource is currently found
at this URL" — the server is not committing to any claim about whether
it ever existed or might reappear. ==410== Gone is a deliberate, ^card-6jih
stronger statement: the resource used to exist at this URL and has been
intentionally and permanently removed, with no forwarding address.

A server that wants a client (or a search engine) to stop retrying or
re-indexing a URL should prefer 410 over 404, since 410 signals that the
absence is permanent and intentional rather than possibly transient.

Why might a server deliberately choose to return 410 Gone instead of 404 Not Found for a resource it just deleted? :: 410 communicates that the removal is intentional and permanent, discouraging clients and crawlers from retrying or re-indexing the URL, whereas 404 leaves that question open and could be read as "not found right now, maybe try later." ^card-9rwk

## 409 and 422

`409 Conflict` means the request is valid but can't be applied right now
because it collides with the current state of the resource — for
example, trying to create a resource with an identifier that already
exists, or a version mismatch on an update. `422 Unprocessable Content`
means the request was well-formed and understood syntactically, but the
server can't act on it because the content itself is semantically
invalid, such as failing a validation rule.

The difference is state versus content: 409 is about the resource's
current state clashing with the request, while 422 is about the
request's own data being wrong regardless of any existing state.

> [!card] mcq
> A client submits a well-formed JSON body to create a user, but the
> "email" field fails a validation rule the server enforces. Which status
> code fits best?
> - [x] 422 Unprocessable Content
> - [ ] 409 Conflict
> - [ ] 400 Bad Request due to malformed syntax
> - [ ] 401 Unauthorized ^card-ku14

## 429 and Retry-After

`429 Too Many Requests` tells a client it has been rate-limited. It is
commonly paired with a `==Retry-After==` header giving either a number ^card-y75j
of seconds or an HTTP date after which the client may try again. A
well-behaved client reads that header and waits the indicated time
rather than retrying immediately or backing off with an arbitrary guess.

## 502, 503, 504: three different gateway failures

All three can appear when a client talks to a reverse proxy or gateway
sitting in front of the real server, but each names a different failure.

`502 Bad Gateway` means the gateway reached an upstream server but got
back an invalid or malformed response it can't relay. `503 Service
Unavailable` means the gateway (or the server itself) is temporarily
unable to handle the request at all, often due to overload or planned
maintenance, and may include a `Retry-After` hint. `504 Gateway Timeout`
means the gateway reached upstream but gave up waiting for a response
within its timeout window.

> [!card] recall
> A reverse proxy in front of an application server can return 502, 503,
> or 504 for requests it can't fulfill. Describe the distinct failure
> story each code tells, focusing on what the proxy did or didn't
> receive from upstream in each case.
> ---
> 502 Bad Gateway: the proxy got a response from upstream, but it was
> malformed or invalid, so the proxy can't relay it. 503 Service
> Unavailable: the proxy or server is currently unable to handle requests
> at all, typically overload or maintenance, independent of any specific
> upstream call. 504 Gateway Timeout: the proxy sent the request upstream
> and simply never got a response back before its timeout elapsed. ^card-nf9k
