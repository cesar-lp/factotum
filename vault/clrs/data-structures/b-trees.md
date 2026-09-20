---
topic: algorithms
category: algo-data-structures
tags: [b-trees, branching-factor, disk-access, node-splitting]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 18 (B-Trees)"]
---

# B-Trees

CLRS presents the B-tree as an abstract, comparison-based balanced search
tree, parameterized by a minimum degree, and analyzes it purely in a cost
model where reading one node costs one disk access. It says nothing
about page layout, buffer pools, or crash recovery — this note leaves
those on-disk storage-engine concerns to other material and does not
repeat them here.

A B-tree of ==minimum degree== t requires every node other than the root ^card-4y7n
to hold at least t − 1 keys (and, if internal, at least t children), and
allows any node to hold at most 2t − 1 keys (at most 2t children); the
root may hold as few as one key. Every leaf sits at the same depth,
exactly like the height-balance property B-trees maintain in general.

Why does CLRS bound a B-tree node's key count between t − 1 and 2t − 1 instead of giving it a fixed size? :: A hard lower bound (t − 1) keeps every node reasonably full so the tree doesn't waste levels on nearly-empty nodes, while the upper bound (2t − 1) caps how much work — and how large a disk read — touching one node requires; letting the count vary within that range (rather than fixing it) is what allows keys to be inserted and deleted without rebuilding the tree from scratch each time. ^card-sr5d

The reason to make t large rather than small is the ==cost model==: CLRS ^card-r85l
treats one node access as one disk read, which — on real hardware where a
disk seek costs orders of magnitude more than an in-memory comparison —
is exactly the assumption behind why B-trees favor a high fanout to
keep disk seeks low. A larger t means fewer, fatter nodes, so a
tree over n keys has height h ≤ log_t((n + 1)/2): more comparisons happen
inside each node, but those are cheap relative to the disk read that
fetched the node in the first place.

> [!card] mcq
> Why does CLRS's B-tree favor a large minimum degree t?
> - [x] It shrinks the tree's height (which shrinks the number of disk accesses), at the cost of more in-memory comparisons per node — a good trade because a disk read costs far more than a comparison
> - [ ] It reduces the maximum number of keys the tree can store overall
> - [ ] It removes the need to keep keys sorted within a node
> - [ ] It guarantees the tree never needs to split a node ^card-wcoc

On insertion, CLRS's B-TREE-INSERT-NONFULL descends from the root looking
for the leaf to insert into, but splits any full node it finds along the
way ==proactively==, before recursing into it rather than after — so the ^card-ugi1
whole operation is a single downward pass with no backtracking.
Splitting a full node (2t − 1 keys) produces two nodes of t − 1 keys each
and promotes the median key up to the parent; this is the same split
operation B-trees use at the conceptual level, just performed
pre-emptively here rather than reactively.

What is the effect on tree height when a node split cascades all the way up to the root? :: The root itself splits into two nodes, and a brand-new root is created above them holding the single promoted median key — the only way a B-tree's height increases. ^card-rb9k

Deletion is the more delicate direction: B-TREE-DELETE ensures, before
recursing into a child, that the child has at least t keys — one more
than the bare minimum — by either moving a key over from a sibling or
merging the child with a sibling if no sibling has a key to spare. That
guarantee is what lets deletion also complete in one downward pass, and
it is the same borrow-or-merge choice generally known as rebalancing;
CLRS just specifies the exact threshold (t keys) that triggers it.

> [!card] recall
> Explain why both B-TREE-INSERT and B-TREE-DELETE are structured to fix
> a node's key count *before* recursing into it, rather than recursing
> first and fixing up on the way back out. ^card-nzi9
