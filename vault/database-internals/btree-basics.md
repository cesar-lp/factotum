---
category: database-internals
tags: [b-tree, fanout, disk-seeks]
citations: ["Petrov, Database Internals, Ch. 2"]
---

# B-Tree Basics

A B-tree is a self-balancing tree where each node holds several sorted
keys and, in an internal node, a pointer to a child subtree between each
pair of keys. Unlike a binary tree, a B-tree node can hold many keys and
many children at once, which is what lets the tree stay shallow even
when it holds millions of entries.

A B-tree's ==fanout== is the number of child pointers a single node can ^card-vohr
hold; high fanout is what keeps tree height — and therefore the number of
disk seeks needed to find a key — low, since each level of the tree can
represent a much larger multiple of keys than in a binary tree.

> [!card] mcq
> Why do B-trees favor a high fanout (many keys and children per node)?
> - [x] It keeps the tree's height small, so fewer nodes (and disk seeks) must be visited to reach any key
> - [ ] It reduces the total number of keys the tree can store
> - [ ] It makes each node fit in less disk space
> - [ ] It removes the need to keep keys sorted within a node ^card-35d6

Each node lives on one disk page, and a node's ==occupancy== is how full ^card-ih4x
that page is relative to its capacity; B-tree implementations typically
enforce a minimum occupancy (e.g. at least half full) so pages aren't
mostly wasted space, while still allowing partially-filled nodes so
inserts don't force a rewrite on every operation.

When an insert would overflow a full node, the node ==splits== into two ^card-q0pz
nodes, and the split promotes one key up to the parent to separate them;
if that promotion overflows the parent in turn, the split cascades
upward, and in the worst case a split reaches the root, which grows the
tree's height by one level.

> [!card] mcq
> Under what condition does a B-tree's height increase?
> - [x] A split cascades all the way up to the root, which itself splits and creates a new root
> - [ ] Any single leaf node splits, regardless of its position in the tree
> - [ ] The tree is rebalanced on a fixed schedule regardless of inserts
> - [ ] A node falls below minimum occupancy ^card-br0l

Deleting a key can leave a node below its minimum occupancy; when that
happens the node either **merges** with a sibling (combining both into
one node and removing the separating key from the parent) or borrows a
key from a sibling that has room to spare, so occupancy stays within
bounds without needing a full rebuild.

What is the relationship between a B-tree's fanout and its height for a fixed number of stored keys? :: Height is roughly logarithmic in the number of keys with the fanout as the log's base, so a higher fanout means each level accounts for exponentially more keys and the tree needs fewer levels — which is why real B-trees pick a fanout in the hundreds, sized to fill one disk page, rather than the small fanout of a binary tree. ^card-hpz9

> [!card] recall
> Explain why B-trees are the standard on-disk index structure for
> databases, in terms of disk seeks, even though seeking to a random
> disk page is orders of magnitude slower than an in-memory pointer
> dereference. ^card-wmnd

A **B+tree**, the variant almost every production database actually
uses, stores all records only in its ==leaf== nodes; internal nodes hold ^card-p6nd
only keys used for routing, and leaves are typically linked together for
fast in-order range scans. A plain B-tree, by contrast, may store a
record's value at whichever internal node its key first appears in.

> [!card] mcq
> What distinguishes a B+tree from a plain B-tree?
> - [x] In a B+tree, records live only in leaf nodes; internal nodes hold routing keys only, and leaves are linked for range scans
> - [ ] A B+tree has no internal nodes at all
> - [ ] A B+tree never splits nodes on insert
> - [ ] A B+tree stores records in internal nodes but not in leaves ^card-o7ft
