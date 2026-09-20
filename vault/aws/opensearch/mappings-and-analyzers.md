---
topic: aws
category: aws-opensearch
tags: [mappings, analyzers, tokenizer, text-analysis]
citations: ["OpenSearch Documentation — 'Mappings and field types'", "OpenSearch Documentation — 'Text analysis'"]
---

# Mappings and Analyzers

A **mapping** tells OpenSearch what type each field is and how to index it;
getting a field's type wrong at index time is expensive to fix later,
because changing a mapping usually means reindexing. Text fields go through
an extra step no other field type does — the **analysis chain** — and
getting that step wrong is the single most common cause of "my search
finds nothing" surprises.

A ==mapping== defines each field's data type (text, keyword, integer, ^card-lvfb
date, and so on) and how it should be indexed.

Leaving a field unmapped doesn't skip this step — OpenSearch guesses a type
from the first document it sees and locks that guess in for every later
document, even one that would have needed a different type.

> [!card] mcq
> A field is mapped as `keyword` instead of `text`. What does this change
> about how it can be searched?
> - [x] It is indexed as one exact, unanalyzed value, so it supports exact-match filtering and sorting but not full-text term matching
> - [ ] It becomes searchable with fuzzy matching but loses exact-match filtering
> - [ ] It is stored but excluded from every query entirely
> - [ ] It is automatically converted to a numeric type ^card-vamw

`text` and `keyword` are the two mappings for string data and are usually
applied to the same field together (`text` for full-text search, `keyword`
as a sub-field for exact filtering and aggregations), because a single
mapping type can't serve both needs at once.

Analysis happens in a fixed pipeline: a ==tokenizer== first breaks a text ^card-2xle
field's value into individual terms (typically splitting on whitespace and
punctuation), and then a chain of token filters transforms that stream —
lowercasing, removing stopwords, stemming words to a common root, and so on
— before the terms are written to the index.

What is the difference in job between a tokenizer and a token filter within an analyzer? :: A tokenizer performs the initial split of raw text into a stream of individual tokens (there is exactly one tokenizer per analyzer); token filters then run in sequence over that already-tokenized stream, each one transforming, adding, or removing tokens (lowercasing, stemming, stopword removal), and any number of filters can be chained. ^card-72tc

Why must the exact same analyzer configuration be used when a field is indexed and when a query against that field is parsed? :: The analyzer determines which terms end up in the index and which terms a query is reduced to before matching; if indexing lowercases and stems words but the query analyzer doesn't, or vice versa, the query's terms simply won't match the terms actually stored, and the search silently returns nothing even though the data is present. ^card-fd2s

> [!card] mcq
> A field was indexed using a stemming analyzer (so "running" is stored as
> "run"), but a query later searches that field with a non-stemming
> analyzer for the exact word "running". What happens?
> - [x] The query looks for the literal token "running," which was never stored, so no match is found even though "run" is in the index
> - [ ] OpenSearch automatically detects the mismatch and stems the query too
> - [ ] The query matches because analyzers only affect indexing, never queries
> - [ ] The field is rejected at index time for using stemming ^card-jt6d

A **custom analyzer** lets an index designer pick a specific tokenizer plus
an ordered list of filters instead of relying on the built-in default,
which matters for language-specific stemming, synonym handling, or
domain-specific tokenization (e.g. keeping hyphenated product codes
intact) that the default analyzer would otherwise mangle.

> [!card] recall
> Explain why applying a synonym filter only at query time (searching "car"
> and having it also match "automobile") is a different design decision
> from applying that same synonym filter at index time, and what tradeoff
> each choice makes. ^card-d4ex
