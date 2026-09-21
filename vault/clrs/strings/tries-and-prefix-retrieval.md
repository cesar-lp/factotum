---
topic: algorithms
category: algo-strings
tags: [tries, prefix-trees, retrieval, longest-prefix-match]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 32 (String Matching)"]
---

# Tries and Prefix Retrieval

A trie stores a set of strings by turning each one into a *path* through a
tree, rather than into a value sitting at a single node. Every edge is
labelled with one character, and a key is spelled out by walking root to
some node and concatenating the edge labels along the way. No node holds
the whole key; the key exists only as the route to reach that node. That
structural fact is what everything else in this note follows from.

Because a key is a path rather than a stored value, looking one up means
walking that path one character at a time and checking that each edge
exists. That takes time proportional to the key's own length, k, and

```
lookup / insert / delete: O(k)
```

crucially that cost does not depend on how many other keys share the trie
— a trie with ten entries and one with ten million answer a k-character
lookup in the same number of steps, because the walk only ever touches
the k nodes on that one path.

It's tempting to read that as "tries are faster than hash tables," but
that's the wrong takeaway. A hash table also has to read every character
of the key to compute its hash before it can do anything else, so a hash
table lookup is roughly O(k) too — the two structures are not competing
on raw speed. `hash-tables-and-chaining.md` and `binary-search-trees.md`
cover those structures' own costs in full.

> [!card] mcq
> A trie and a hash table both store the same set of strings. What is the trie's real advantage over the hash table?
> - [x] It can answer questions the hash table structurally cannot, such as enumerating all keys with a given prefix or finding the longest stored prefix of a query string
> - [ ] It performs a single-key lookup in less time, since it avoids computing a hash
> - [ ] It uses less memory per stored key
> - [ ] It never needs to compare full keys, only single characters ^card-844r

A hash function scrambles a key into a slot number that carries no
relationship to any other key's slot, so a hash table cannot recover
"which stored keys start with this substring" without scanning
everything. A trie answers it directly: descend the path spelled by the
prefix, and every leaf below that node is a match. The same path
structure gives ==ordered traversal== — walking the trie in a fixed child ^card-0mzb
order visits keys in sorted order for free, something a hash table's
scattered slots cannot offer at all.

What two capabilities does a trie provide that a hash table cannot provide at all, regardless of how it's implemented? :: Prefix-based enumeration (listing every stored key sharing a given prefix) and longest-prefix matching (finding the longest prefix of a query string that is itself a stored key) — both require the keys to sit along shared paths, which a hash table's independent, scattered slots don't provide. ^card-blya

Some node along a path has to be marked as a genuine end of a stored key,
because one key can be a strict prefix of another — "car" and "carpet"
share the same first three edges, and only the node reached after "car"
should be flagged as terminal. Without that flag, a lookup couldn't tell
"the path to this node exists" apart from "this exact string was
inserted."

Why can't a trie tell "this string was inserted" apart from "this string happens to be a prefix of something longer that was inserted" without an explicit terminal marker on each node? :: Because a node is reached whenever some stored key passes through it on the way to a longer key, so the path existing is not evidence that the string ending there was itself ever inserted — only an explicit per-node flag records that a key actually terminates there. ^card-n5mv

The structure has a real cost: a plain trie spends one whole node per
character, and if that node holds a child pointer for every symbol in the
alphabet — 26 for lowercase letters, 256 for bytes — most of those
pointers sit unused, null, at any given node. That per-node array is the
reason plain tries are so memory-hungry, and it's exactly the waste that
`compressed-tries-and-radix-trees.md` addresses by collapsing long
single-child chains into single edges.

The space a plain trie spends on ==unused child slots== per node is what motivates building a compressed variant instead. ^card-wzv0

> [!card] recall
> A plain trie storing English words uses a 26-entry child array at
> every node. Explain concretely why storing 100,000 words this way can
> cost far more memory than storing the same 100,000 words as plain
> strings in a hash table, even though both structures store the same
> keys.
> ---
> A hash table's memory scales with the total length of the stored
> strings — each key is stored roughly once, as a compact string. A
> plain trie instead allocates a full node, with its 26-entry child
> array, for every distinct character position across all keys — long
> chains of single-child nodes each pay for an entire array to store one
> character, most of whose 26 slots are empty. That per-node overhead,
> multiplied across every character of every key, is what makes a plain
> trie's memory footprint far larger than the strings it holds, and it's
> the specific waste a compressed trie targets. ^card-0pp3

Tries are the natural structure whenever the *query itself* is prefix- or
path-shaped rather than an exact-match lookup: autocomplete systems walk
the trie to the point typed so far and enumerate everything below it; IP
routers store address prefixes in a trie and use longest-prefix match to
pick the most specific route for a packet; and spell-checkers use trie
membership as a fast dictionary test.

Router forwarding tables need the single longest stored prefix that matches a destination address, not just any match. Which structure answers that query directly, by construction? :: A trie — walking the address bit by bit and remembering the deepest terminal node passed along the way gives the longest matching prefix directly, which is exactly what longest-prefix-match routing needs. ^card-qwx0
