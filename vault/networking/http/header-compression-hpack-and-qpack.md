---
topic: networking
category: http-protocol
tags: [http2, hpack, qpack, header-compression, http3]
citations: ["RFC 9113 (HTTP/2)", "RFC 9204 (QPACK)"]
---

# Header compression: HPACK and QPACK

Once bodies are routinely compressed and a connection is reused across
many requests, headers stop being the small part of an HTTP exchange.
A single request on a modern site can carry a long cookie, a user
agent string, `Accept-*` negotiation fields, and a handful of custom
headers — and the *same* connection sends nearly the same header set on
every request that follows it. Early HTTP/2 traffic studies found that
uncompressed headers, repeated verbatim on every request, could
dwarf the compressed body of a small response.

Why did headers become a disproportionately large share of HTTP/2 ^card-s5aa
traffic once bodies were already compressed and connections were
reused for many requests? :: Because headers are large and highly
repetitive across the requests sharing a connection, yet — before
HPACK — every request sent them again in full; with body compression
already shrinking the response side, the uncompressed, repeated
header block became the dominant remaining overhead.

**HPACK** attacks that redundancy with three mechanisms working
together.

A ==static table== ships with the specification itself: a fixed list ^card-omrz
of common header fields and common values (`:method: GET`, common
`content-type` values, and so on) that every HPACK implementation
already knows, so referencing one costs only a small index rather
than any text at all.

A ==dynamic table== is built up *during* the connection: the first ^card-a764
time a header not already in the static table appears, the endpoint
adds it to a table private to that connection. Later requests on the
same connection can then reference that entry by index instead of
resending its text.

For a header that has no table entry at all — a fresh cookie value, a
freshly generated request ID — HPACK falls back to sending it as a
literal, but even that literal is not sent as raw bytes. It is passed
through a ==Huffman code== tuned to the byte-frequency statistics of ^card-z1e7
real HTTP header text, so the literal itself comes out smaller than
its plain-text form.

What are HPACK's three space-saving mechanisms, and which of them applies to a header value seen for the first time on a connection? :: A static table of common fields shared by all implementations, a per-connection dynamic table built up as new headers appear, and Huffman coding of literal values; a first-time value has no table entry yet, so it is sent as a Huffman-coded literal. ^card-neo8

> [!card] recall
> Explain why a header repeated on request 50 of a long-lived HTTP/2
> connection is cheap under HPACK even though it was expensive on
> request 1.
> ---
> Request 1 has no table entry for that header, so it goes out as a
> Huffman-coded literal. Once sent, the encoder adds it to the
> connection's dynamic table. Every later request that repeats it can
> reference that dynamic-table entry by a small index instead of
> resending any text, so the cost drops from the literal's size to a
> few bits regardless of how long the header actually is. ^card-crr9

HPACK is not "just gzip for headers," and that is a deliberate design
choice, not an oversight. Generic compressors build their dictionary
from *all* the bytes fed into them, including bytes an attacker
controls (a value they can get reflected into a request, such as a
query parameter mirrored into a header) sitting alongside bytes the
attacker cannot see, such as a session cookie. When attacker-chosen
input is compressed together with a secret, the *size* of the
compressed output leaks information about how much the input
overlapped the secret — an attacker who can trigger many requests and
watch the resulting sizes can recover the secret byte by byte. This is
the design consequence that shaped HPACK: rather than run a
general-purpose compressor over the whole header block, HPACK was
built as a purpose-specific scheme with explicit, bounded indexing
rules precisely to avoid mixing untrusted and secret bytes into one
compression context the way a generic compressor would.

Why is HPACK a purpose-built indexing scheme rather than a thin wrapper around a generic compressor like gzip? :: Because a generic compressor builds a shared dictionary from everything it compresses, and compressing attacker-influenced data together with a secret lets the compressed size leak information about the secret; HPACK's explicit static/dynamic table and literal-encoding rules avoid that shared, uncontrolled compression context. ^card-5a20

HPACK's dynamic table has one hard requirement: both sides must agree
on its exact contents at every point, which means table-update
instructions must arrive in the same order they were sent — a decoder
that saw update 2 before update 1 would build the wrong table and
misinterpret every index that follows. HTTP/2 could guarantee that
ordering because it multiplexed all requests over a single ordered
byte stream to begin with. Given independent streams as a starting
point, that guarantee is gone: two streams may finish in either order,
so an HPACK-style table tied to strict delivery order cannot stay in
sync across them.

==QPACK== is the response to exactly that mismatch. It keeps HPACK's ^card-e5nt
core idea — static table, dynamic table, Huffman-coded literals — but
decouples dynamic-table updates from the request streams that use
them, carrying them on their own dedicated stream and having each
reference name the specific table state it depended on. That lets a
decoder process a request referencing the table without having to
wait for every earlier update to arrive in a fixed sequence first.

Why couldn't HTTP/2's HPACK be reused unchanged for HTTP/3, given that QPACK keeps the same static table, dynamic table, and Huffman-coding ideas? :: HPACK's dynamic table only stays synchronized if table-update instructions are delivered in the exact order they were sent, which HTTP/2 could guarantee because it multiplexed everything onto one ordered stream. HTTP/3's streams are delivered independently of one another, so that strict-order guarantee no longer holds, and QPACK exists to decouple table updates from request streams so the encoding survives that. ^card-v6cx
