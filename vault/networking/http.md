---
category: networking
tags: [http, application-layer, web]
citations: ["Kurose & Ross, Computer Networking 8e, Ch. 2.2", "RFC 9110"]
---

# HTTP

HTTP is a request-response protocol where a client sends a request and a
server returns a response, with the server retaining no memory of past
requests by default — HTTP is a ==stateless== protocol. ^card-3sgk

Under non-persistent HTTP, how many objects share each TCP connection, and what does that cost per object? :: Each object is fetched over its own new TCP connection, which is opened, used once, and closed, adding a full connection setup delay per object. ^card-8cyf

Under persistent HTTP, how many objects can share one TCP connection, and what overhead does that avoid? :: Multiple requests and responses can be sent over the same open TCP connection, avoiding repeated handshake overhead for objects on the same server. ^card-1jwg

The `GET` method requests a resource, `POST` submits data to be processed
(often creating or modifying state), and `PUT` replaces a resource at a
given URL. A status code in the ==2xx== range indicates success, while a ^card-47oq
==4xx== code means the problem was with the client's request rather than ^card-nm6o
the server.

How does a server use a cookie to recognize a returning client? :: The server sets a unique identifier in a Set-Cookie response header; the browser stores it and automatically resends it in the Cookie header on later requests to that domain, letting the server look up state associated with that identifier. ^card-im70

The `Cache-Control` and `If-Modified-Since` headers let a client avoid
re-downloading unchanged content: a conditional GET asks the server to send
the object only if it has changed since a given time, and the server
replies ==304 Not Modified== if it has not. ^card-pgfv

> [!card] mcq
> Which HTTP status code tells a browser that a cached copy of a resource is still valid?
> - [x] 304 Not Modified
> - [ ] 204 No Content
> - [ ] 404 Not Found
> - [ ] 200 OK ^card-2b24

> [!card] recall
> Explain why persistent HTTP connections reduce page load latency compared
> to non-persistent connections, especially for pages with many small
> objects. ^card-i5lj
