---
topic: algorithms
category: algo-strings
tags: [aho-corasick, multi-pattern-matching, failure-links, output-links]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 32 (String Matching)"]
---

# Aho-Corasick and Multi-Pattern Search

Every earlier string-matching note in this category searches a text for
one pattern. Real filtering systems rarely have that luxury — an
intrusion detection system checks a packet against thousands of attack
signatures, and a content filter checks a document against thousands of
banned phrases, all in a single pass. Running a single-pattern matcher
once per pattern costs

```
O(n * number of patterns)
```

where n is the text length, because the text gets re-scanned from
scratch for every pattern. That repeated re-scanning is exactly the cost
Aho-Corasick is built to avoid.

A security appliance checks every packet against 5,000 attack signatures using single-pattern KMP, one signature at a time. Why does this scale badly as the signature set grows, even though each individual KMP search is only O(n)? :: Each of the 5,000 searches re-reads the entire packet from the start, so the total cost is O(n * 5000) — the text gets rescanned once per pattern instead of once total, so doubling the signature count doubles the total work even though the packet itself never changed. ^card-11zo

`kmp-and-the-failure-function.md` covers how KMP avoids re-examining text
characters for a single pattern, by falling back to the longest proper
prefix of that pattern which is also a suffix of what's matched so far,
instead of restarting the comparison from the pattern's beginning.

Aho-Corasick's construction starts by merging all the patterns into one
trie, so that patterns sharing a common prefix share the same path
through it — "he", "she", and "hers" collapse onto overlapping branches
rather than three separate structures. On top of that trie, the
algorithm adds a **failure link** at every node, pointing to the deepest
other node in the trie whose spelled-out string is a proper suffix of the
current node's spelled-out string.

Say plainly what that construction is: it's ==KMP's failure function==, ^card-c8wt
generalized from a single pattern's self-overlap to overlap across an
entire set of patterns sharing one trie.

Where a single pattern's failure function tells you how much of that
one pattern's own prefix to reuse after a mismatch, an Aho-Corasick
failure link tells you which other node in the shared trie represents
the longest suffix of what you've matched so far across *any* of the
patterns in the set.

> [!card] mcq
> How does an Aho-Corasick failure link relate to KMP's failure function?
> - [x] It's the same idea generalized from one pattern to a trie of many patterns: it points to the node representing the longest proper suffix of the current match that is also a prefix of some pattern
> - [ ] It's unrelated — Aho-Corasick failure links are a hashing shortcut, while KMP's failure function is purely about prefixes
> - [ ] It performs the opposite role, pointing forward to the next possible match instead of backward to a shorter one
> - [ ] It only exists to detect when two patterns in the set are duplicates of each other ^card-hrvy

Once the trie and failure links are built, scanning the text takes one
pass: at each text character, follow a child edge if one matches, or
follow failure links until one does (or the root is reached), exactly
the way KMP falls back on a mismatch. Every node visited that happens to
be a pattern's terminal node reports a match ending at the current text
position. Total time is

```
O(n + total pattern length + number of matches)
```

and the ==number of matches== term in that bound has to be there, not ^card-1bar
merely tolerated, because a heavily overlapping pattern set can produce
far more matches than the text has characters — imagine a text that is
just "aaaa...a" against a pattern set containing every prefix of "a"s, where
one text position alone can end dozens of matches at once.

Why can't the "number of matches" term be dropped from Aho-Corasick's running-time bound, the way it effectively doesn't matter for single-pattern search? :: Because in single-pattern search a match count is bounded by n/(pattern length), which is dominated by n, but with many overlapping patterns a single text position can simultaneously end matches for several patterns at once, so total matches can exceed n and must be counted separately in the bound rather than assumed to be swallowed by it. ^card-24kz

There's one more link the construction needs, and skipping it is the
classic implementation bug: when one pattern is itself a suffix of
another pattern, reaching the longer pattern's terminal node in the trie
should also report the shorter one, because matching the longer string
necessarily matches the shorter one ending at the same text position.
Following only child edges and failure links to the current node isn't
enough to surface that — the current node's failure-link chain has to be
checked for other terminal nodes too, which is exactly what an
==output link== is built to shortcut. ^card-dbif

An implementation that walks the trie and follows failure links on a
mismatch, but never consults that extra chain, will silently miss every
match of a pattern that happens to be a suffix of a longer one in the
same set — the classic Aho-Corasick bug.

If pattern set {"he", "she"} is being matched against text "she", and the implementation only reports a match when the current trie node it's standing on is itself terminal, what match does it silently miss, and why? :: It misses "he" — reaching the terminal node for "she" doesn't automatically flag that "he" (a suffix of "she") has also just matched ending at the same position; only consulting output links, which chain a node to other terminal nodes reachable through its failure links, surfaces that second match. ^card-n0k2

> [!card] recall
> Walk through what building an Aho-Corasick automaton for a set of
> patterns actually involves, from the raw pattern set to a structure
> ready to scan text in one pass. Name each piece and what it's for.
> ---
> First, merge all patterns into a single trie, so patterns sharing a
> prefix share a path. Second, add a failure link at every node,
> pointing to the node representing the longest proper suffix of the
> current match that is also reachable in the trie — this is what lets
> a mismatch fall back without re-scanning text, generalizing KMP's
> single-pattern failure function to the whole set. Third, add output
> links chaining each node to any other terminal node reachable through
> its failure-link chain, so that matching a longer pattern also
> reports any stored pattern that is a suffix of it. With all three in
> place, scanning is a single pass over the text. ^card-mm2t

That failure mode is why the classic uses of Aho-Corasick — network
intrusion detection systems checking packets against large signature
databases, antivirus engines scanning files against virus signature
sets, and content filters checking text against banned-phrase lists —
all depend on the output-link chain being wired up correctly; a
signature that happens to be a suffix of a longer one is exactly the
case those systems can least afford to miss silently.
