---
topic: algorithms
category: algo-strings
tags: [radix-trees, patricia, compressed-tries, edge-splitting]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 32 (String Matching)"]
---

# Compressed Tries and Radix Trees

`tries-and-prefix-retrieval.md` ends on the plain trie's weak point: a
node per character, each carrying a full alphabet-sized array of mostly
empty child pointers. Look at what those nodes actually do in a typical
trie, though, and most of them aren't branching at all — they're long
runs of single-child nodes, each one spending an entire node just to
store one character on the way to the next fork.

A compressed trie — also called a **radix tree**, or PATRICIA in its
classic bit-string form — collapses each such run into a single edge
labelled with the whole substring it represents, instead of one edge per
character. Branching nodes stay as nodes; the chains between them become
edge labels.

```
plain trie (each edge = 1 char):        compressed trie:

      c                                        "car"
      |                                       /      \
      a                                  "pet"       "t"
      |                                   /             \
      r                              (car)pet         (car)t
     / \
    p   t
    |
    e
    |
    t
```

Before: 7 nodes to store "car", "carpet", "cart".
After: 4 nodes, with "car" itself sitting at the branch point.

Collapsing chains means the node count stops tracking the total number
of characters across all keys and starts tracking the number of keys
instead. For n keys, a compressed trie has at most

```
2n - 1 nodes
```

— each key contributes at most one leaf and one branch point, and that
bound is the headline reason to prefer this structure: node count no
longer grows with key length at all, only with how many keys there are.

For n stored keys, what is the tight upper bound on the number of nodes in a compressed trie, regardless of how long the individual keys are? :: 2n - 1 nodes — the node count depends only on the number of keys, not on their total length, because runs of single-child nodes are collapsed into single edges. ^card-us05

Lookup walks edge labels instead of single characters, comparing a query
substring against a whole label at once, but it's still a walk from root
toward a leaf and still runs in time proportional to the key length —
compression buys space and cache behavior, not a better asymptotic
lookup bound.

> [!card] mcq
> Compared to a plain trie storing the same keys, a compressed trie (radix tree) offers which benefit?
> - [x] Far fewer nodes and better cache locality, at the cost of more complex insertion and deletion logic
> - [ ] Asymptotically faster lookup, since fewer nodes are visited per query
> - [ ] The ability to answer prefix queries, which a plain trie cannot answer at all
> - [ ] No benefit — a compressed trie is only useful for compressing string values, not lookup structures ^card-r3t7

The one genuinely fiddly operation is insertion when a new key diverges
partway through an existing edge label. The tree can't just extend a leaf,
because the shared prefix and the point of divergence both need their own
nodes. So the edge gets ==split==: a new branch node is created at the ^card-oa4t
point where the new key's characters stop matching the label, the
original edge is shortened to end there, and two children hang off the
new branch — one continuing the original label's remainder, one starting
the new key's remainder.

Deletion has a mirror-image concern: removing a key can leave a branch
node with only one remaining child. That single-child node should be
merged back into its neighbor to restore the collapsed-chain shape,
otherwise the tree slowly degrades back toward a plain trie's
node-per-character layout as keys come and go.

Removing a key from a compressed trie leaves some branch node with exactly one child left. Why does that node need to be merged with its remaining child rather than left alone? :: A branch node with only one child breaks the compression invariant that every branch node has at least two children; leaving it alone would let the tree accumulate single-child nodes over time, gradually reverting toward the space cost of a plain trie that the compression was meant to avoid. ^card-19w8

> [!card] mcq
> Edge-splitting is the operation of introducing a new branch node partway along an existing edge. When is it triggered?
> - [x] When a newly inserted key shares only a partial prefix with an existing edge label, so the shared and divergent parts of the label need separate nodes
> - [ ] Whenever the trie's node count exceeds the 2n - 1 bound and needs rebalancing
> - [ ] Whenever a key is deleted and its leaf becomes empty
> - [ ] Whenever two unrelated keys happen to hash to the same slot ^card-o6d5

> [!card] recall
> A router's forwarding table stores tens of thousands of IP address
> prefixes and must find the longest matching prefix for every incoming
> packet at line rate. Explain why a compressed trie is a better fit for
> this than a plain trie, given that both support longest-prefix match
> in principle.
> ---
> Both structures can walk address bits to find the longest matching
> prefix, so the choice isn't about which one *can* answer the query.
> A plain trie spends one node per bit, so a table of many long prefixes
> costs memory proportional to total prefix length and scatters the walk
> across many cache-unfriendly single-child nodes. A compressed trie
> collapses those single-child runs into edges, so node count tracks the
> number of distinct prefixes rather than their total bit length — it
> fits in far less memory and its shorter walks touch fewer cache lines,
> which is what "line rate" actually demands. ^card-a9fk

Radix trees are the structure behind IP routing tables in real routers —
compressing shared address-prefix chains keeps the table small enough to
search at line rate — and behind the key indexes of several key-value
stores, where keys often share long common prefixes and per-character
nodes would waste enormous amounts of memory.

What does a compressed trie trade away to get its space and cache advantage over a plain trie, and what does it keep unchanged? :: It trades away simplicity — insertion and deletion require edge-splitting and edge-merging logic that a plain trie never needs — while keeping the same asymptotic lookup time, since a query still walks root to leaf following the key's characters, just across fewer, longer edges. ^card-s9sc
