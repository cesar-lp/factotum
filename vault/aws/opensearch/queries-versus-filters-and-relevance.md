---
topic: aws
category: aws-opensearch
tags: [query-context, filter-context, relevance-scoring, bm25]
citations: ["OpenSearch Documentation — 'Query DSL'", "OpenSearch Documentation — 'Text scoring'"]
---

# Queries vs. Filters, and Relevance

Every clause in an OpenSearch query runs in one of two contexts, and which
one it runs in changes both what the clause costs and what it produces —
this is a distinction the query DSL forces on every request, not an
optional optimization.

A clause in ==query context== asks "how well does this document match?" ^card-lq8f
and produces a relevance score for each matching document, in addition to
deciding whether it matches at all.

A clause in ==filter context== asks only a yes/no question — "does this ^card-g32a
document match?" — and contributes no score, which is what makes it
eligible for a cheaper code path than a scored query clause.

> [!card] mcq
> Why does OpenSearch cache filter-context results far more effectively
> than query-context results?
> - [x] A filter's result is a plain yes/no for a given clause, independent of any other document, so the same filter reused across many searches can reuse a cached bitset; a relevance score depends on the whole query and document set and isn't reusable the same way
> - [ ] Filters are always applied to fewer documents than queries
> - [ ] Query context results are cached but filter context results never are, the reverse of reality
> - [ ] Filters only work on numeric fields, which are inherently faster to cache ^card-hpy0

Why does wrapping an exact-match clause (like a date range or a status field check) in filter context rather than query context typically make a search faster, beyond just the caching benefit? :: Skipping score computation avoids the per-document scoring work entirely, and because filter context doesn't need to produce a ranked ordering, the underlying execution can use faster set-intersection style operations instead of the machinery needed to accumulate and sort scores. ^card-2wsc

A `bool` query's `must` and `should` clauses run in query context and
contribute to scoring; its `filter` and `must_not` clauses run in filter
context and only include or exclude documents, contributing nothing to the
score even though `filter` behaves like a required `must` for matching
purposes.

> [!card] mcq
> Inside a `bool` query, which clause type is scored?
> - [x] `must` and `should`
> - [ ] `filter` and `must_not`
> - [ ] All four clause types are always scored equally
> - [ ] None of the clause types are scored; only standalone queries are ^card-kcy3

Relevance scoring ranks matching documents by estimated usefulness to the
query rather than treating every match as equally good. The dominant
algorithm, ==BM25==, scores a document higher for a query term the more ^card-rys2
times that term appears in the document (with diminishing returns per
additional occurrence) and the rarer that term is across the whole index,
while also penalizing longer documents that match only because they
contain more words overall.

What does it mean that BM25 gives "diminishing returns" for a repeated term, rather than scoring proportionally to term count? :: A document matching a query term ten times doesn't score anywhere close to ten times higher than a document matching it once — after the first few occurrences, each additional occurrence adds progressively less to the score, so score gains taper off instead of climbing linearly with raw frequency. ^card-45hg

> [!card] recall
> A search for a common word like "the" and a search for a rare technical
> term both use BM25 scoring. Explain why BM25 weighs a match on the rare
> term much more heavily, in terms of what the algorithm actually
> measures about term rarity. ^card-gw5e
