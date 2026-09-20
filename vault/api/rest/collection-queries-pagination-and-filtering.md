---
topic: api-design
category: api-rest
tags: [pagination, keyset, filtering, sorting, rest-api]
citations: ["RFC 9457 (Problem Details for HTTP APIs)", "RFC 8288 (Web Linking)"]
---

# Collection queries: pagination and filtering

A collection resource can hold far more items than any client wants back
in one response, so a request for it needs a way to ask for one page at
a time. The obvious scheme — an offset and a limit — is also the one
with the sharpest failure modes once the collection is large or being
written to concurrently.

## Offset/limit and why it degrades

`?offset=10000&limit=20` reads naturally: skip the first ten thousand
rows, then return the next twenty. The trouble is in "skip" — the
database still has to walk (or count) past every one of those ten
thousand rows before it can hand back the twenty a client actually
wanted, so the cost of a page grows with how deep into the collection it
sits, not with the page size itself. A request for page 2 is cheap; a
request for page 5,000 does roughly 5,000 times the work of page 1.

Why does an offset/limit request for a page deep into a large collection cost more than a request for an early page, even though both ask for the same number of rows? :: The database still has to walk past (or count) every skipped row before it can return the requested page, so the work grows with the offset itself, not with the page size — a late page can cost orders of magnitude more than an early one. ^card-ru6d

## Offset/limit and why it's unstable

Cost aside, offset/limit has a correctness problem: it identifies a page
by counting from the start of the collection, and that count keeps
changing under concurrent writes. If another client deletes a row that
sits before the current offset while a caller is paging through, every
row after it shifts one position earlier — a row the caller had not
seen yet slides into a page it already fetched, and the caller skips it
forever. If a row is inserted before the offset instead, everything
shifts one position later, and a row the caller already saw slides back
into view, so the caller sees it twice.

Why can offset/limit pagination cause a client to see the same item twice, or to skip an item entirely, when paging through a collection that's being written to concurrently? :: Because each page is defined by a row count from the start, not by anything about the rows themselves. An insert before the current offset shifts every later row forward, so an already-seen row reappears (a duplicate); a delete before the offset shifts every later row backward, so a not-yet-seen row slides into an already-fetched page and is skipped. ^card-mvuf

## Keyset (cursor) pagination

Keyset pagination — often called cursor pagination — sidesteps both
problems by never counting rows at all.

A cursor/keyset page is requested with a token that encodes ==a position in the sort order==, such as the last item's sort key and id, rather than a row count. ^card-uhr9

The next page is simply "give me the rows after this position," which
the query answers directly without touching anything before it. Because
the cursor names a row rather than an offset, a delete earlier in the
collection doesn't shift what "after this position" means, so a client
paging forward neither skips nor repeats items — the earlier fix stays
isolated to earlier pages instead of leaking into the ones still to
come.

> [!card] mcq
> A collection is being paged while other clients concurrently insert
> and delete rows before the client's current position. Which pagination
> style keeps the client from seeing duplicates or skipped items?
> - [x] Keyset (cursor) pagination, since each page is defined by a position in the sort order rather than a row count
> - [ ] Offset/limit pagination, since the limit stays fixed regardless of writes
> - [ ] Neither — both are equally affected by concurrent writes
> - [ ] Offset/limit pagination, but only if the offset is small ^card-jloi

The trade-off is that a cursor can only move forward or backward from
where it is — it has no way to compute "page 47" without walking there
page by page, so a UI that wants numbered page links or a jump straight
to an arbitrary page still needs offset/limit, accepting its cost and
instability as the price of that feature.

Why can't cursor/keyset pagination jump directly to an arbitrary page the way offset/limit can? :: A cursor only encodes a position to continue from, not a count of rows before it, so there's no way to compute "the start of page 47" without walking the collection page by page from a known position — arbitrary page jumps are exactly what a row count gives you and a cursor doesn't. ^card-eika

## Total count: often expensive, sometimes skipped

A page of results is often accompanied by a "how many total items" figure,
and that figure is deceptively costly: for offset/limit it means the
database counting every matching row, which for a large or heavily
filtered collection can cost more than fetching the page itself, and for
keyset pagination there's no row-counting step in the query at all, so a
total has to come from a separate count query with its own cost. Because
of this, many APIs simply omit an exact total, returning only whether a
next page exists, or an approximate count refreshed on a delay.

> [!card] recall
> Explain why an API returning a page of results might deliberately leave
> out an exact total-item count, even though clients often want one for
> building "page X of Y" UI.
> ---
> Computing an exact total means counting every row matching the query,
> which for a large or heavily filtered collection can cost as much as or
> more than fetching the requested page — and for keyset pagination there
> is no counting step in the normal query path at all, so a count means
> an entirely separate, expensive query. APIs often trade the exact total
> for something cheaper: just a has-next-page flag, or an approximate
> count computed on a delay. ^card-19u7

## Carrying pagination links: the Link header

Rather than have every client hand-build the next page's query string,
RFC 8288 defines a standard way to hand it back one ready to use.

The ==Link== header carries one or more URIs tagged with a relation, and a paginated response uses `rel="next"` and `rel="prev"` to give the client the next and previous page's URLs directly. ^card-wxzg

```
Link: <https://api.example.com/widgets?cursor=abc123&limit=20>; rel="next",
      <https://api.example.com/widgets?cursor=xyz789&limit=20>; rel="prev"
```

A client that only ever follows the `next` link doesn't need to know
whether the server is using offset/limit or a cursor under the hood, or
how the query string is structured — it just requests whatever URI the
header gave it. That opacity is what makes the Link header the standard
mechanism for handing off pagination state, independent of pagination
strategy.

## Filtering, sorting, and sparse fieldsets

Beyond paging, a collection endpoint typically accepts query parameters
for narrowing and shaping what comes back. Common conventions: a
parameter named after the field being filtered (`?status=open`), a
`sort` parameter naming one or more fields with a leading `-` for
descending order (`?sort=-created_at,name`), and comma-separated values
for filtering on a set (`?status=open,pending`).

What convention do many REST APIs use in a `sort` query parameter to request a field in descending rather than ascending order? :: A leading minus sign before the field name (for example `sort=-created_at`), with no prefix meaning ascending order; multiple comma-separated fields give a secondary sort key. ^card-fk0l

A full representation of a resource can carry far more fields than a
given client needs, especially in a list of hundreds of items where each
one is fetched only to read its name and id.

A `fields` query parameter naming a comma-separated subset of a resource's own fields to include in the representation, such as `?fields=id,name`, is called ==sparse fieldsets==. ^card-9sxo

Trimming the representation this way cuts payload size for large lists
without requiring a separate endpoint per use case.
