---
topic: networking
category: http-protocol
tags: [content-negotiation, encoding, compression, chunked-transfer, http]
citations: ["RFC 9110 (HTTP Semantics)"]
---

# Content Negotiation and Encoding

A single URL can have multiple valid representations — different
languages, different compressed forms, different media types — and HTTP
needs a way for a client and server to agree on which one gets sent.

What is "proactive negotiation," and which three request headers commonly drive it? :: Proactive negotiation is the client telling the server upfront, before any response is sent, which representations it's willing to accept — via the Accept header for media types, Accept-Encoding for compression schemes, and Accept-Language for languages. The server picks the best match from those preferences and returns that one representation directly, rather than making the client choose among several offered alternatives afterward. ^card-tl36

Each entry in one of those `Accept*` headers can carry a quality value
to express relative preference rather than a flat yes/no. A quality
value like ==q=0.8== attached to an `Accept-Language` entry tells the
server how strongly the client prefers that option relative to the
others listed, on a scale where an entry with no explicit value counts
as `q=1` and `q=0` means the option is rejected outright.

Negotiation picks a representation; the next question is what happens
to it in transit, and this is where two headers get confused constantly
because they sound like the same idea.

> [!card] mcq
> A response arrives with `Content-Encoding: gzip`. What must the
> recipient do to read the actual resource?
> - [x] Decompress it — Content-Encoding is an end-to-end property of the representation itself, and reversing it is required to recover the resource
> - [ ] Nothing — Content-Encoding is metadata for intermediate caches only, not the final recipient
> - [ ] Strip it at the first hop, since it behaves like Transfer-Encoding
> - [ ] Nothing — encodings named in this header are undone automatically below the application layer ^card-ov4t

Why is Transfer-Encoding a hop-by-hop concern while Content-Encoding is end-to-end? :: Transfer-Encoding describes how a message is packaged for one specific connection between adjacent nodes — for example, breaking the body into chunks for this hop — and any intermediary is free to add, remove, or change it. Content-Encoding describes a property of the representation itself, applied by the origin and left untouched by every intermediary, so it arrives at the final recipient exactly as sent and that recipient is the one who must decode it. ^card-ga8h

The hop-by-hop case that matters most in practice is one specific
framing scheme. ==Chunked== transfer encoding lets a server start ^card-oq3z
sending a response body before it knows the total length in advance,
splitting the body into a series of length-prefixed pieces and
signaling the end with a final zero-length one — useful for streamed or
dynamically generated content where buffering the whole thing first
isn't practical.

Why can a response not declare both a Content-Length and chunked Transfer-Encoding? :: Content-Length commits to the exact total body size upfront, which requires already knowing the full length before sending the first byte. Chunked encoding exists precisely to handle the opposite case, where that length isn't known in advance, so a recipient is told where the body ends by the framing itself instead. The two are alternative ways of answering the same question — where does the body stop — and only one can apply at a time. ^card-ef0y

Content-Encoding is where actual body compression lives, and the choice ^card-688l
of scheme is a real tradeoff rather than a solved question. What's the practical tradeoff between choosing gzip versus brotli to compress a response body? :: Brotli generally compresses text more tightly than gzip, partly thanks to a static dictionary tuned for web content, but costs more CPU time to compress at high quality settings. gzip compresses faster and is supported by a wider range of older clients, making it the safer universal default even where brotli would save more bytes.

Finally, a representation needs to say what kind of data it is and how
to read its bytes as text. A header like
==Content-Type: text/html; charset=utf-8== tells the recipient both the
media type of the body and the character encoding required to decode
its raw bytes into the correct text.
