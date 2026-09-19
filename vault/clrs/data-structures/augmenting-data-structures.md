---
topic: algorithms
category: algo-data-structures
tags: [augmentation, order-statistics, interval-trees, red-black-trees]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 17 (Augmenting Data Structures)"]
---

# Augmenting Data Structures

Rather than invent a new data structure for every new query, CLRS's
==augmentation== methodology takes an existing structure — almost always ^card-l1jh
a red-black tree in this chapter — and adds extra information to each
node that a new operation needs, while making sure the structure's
existing operations still maintain that information correctly.

The methodology has four steps: choose an underlying structure; decide
what extra field(s) each node needs; verify the structure's existing
modifying operations (insert, delete, rotation) can maintain those
fields without blowing past the original time bounds; and only then
design the new query on top of the augmented fields.

Why does the augmentation methodology insist on checking that existing operations can still maintain the new field, rather than just adding the field and the new query? :: An augmented field is only useful if it stays correct as the tree changes; if insertion, deletion, or a rebalancing rotation could silently leave the field stale, every later query built on it would be quietly wrong, so that maintenance check is what makes the whole augmentation trustworthy rather than just convenient-looking. ^card-huaw

A key theorem makes red-black trees especially good augmentation targets:
if an added field at node x can be computed from x's own data plus the
corresponding fields of x's two children — a ==locally computable== field ^card-n9l6
— then rotations can be modified to update it in O(1) extra work per
rotation, so augmenting never changes the O(lg n) bound on insert or
delete.

> [!card] mcq
> Why are red-black trees a favorable structure to augment with a new field?
> - [x] A locally computable field (derived only from a node and its two children) can be kept correct through rotations in O(1) extra work each, preserving the O(lg n) bound
> - [ ] Red-black trees never need to rebalance, so added fields never need updating
> - [ ] Augmented fields are stored separately from the tree, so the tree itself never changes
> - [ ] Red-black trees have unbounded branching factor, leaving room for extra fields ^card-u3w1

An **order-statistic tree** augments each node x with a `size` field:
the number of nodes in the subtree rooted at x, computed as
1 + size(x.left) + size(x.right), which is locally computable and so
costs nothing extra through rotations. This supports OS-SELECT(x, i), finding
the i-th smallest key in the subtree, and OS-RANK(x), finding a given
node's rank in the whole tree, both in O(lg n) by comparing i against
left-subtree sizes while descending.

What field does an order-statistic tree add to a red-black tree, and what does it let OS-SELECT compute in O(lg n)? :: A `size` field per node, holding the count of nodes in that node's subtree; OS-SELECT uses it to find the i-th smallest key by comparing i against the left subtree's size at each node and deciding whether to recurse left, return the current node, or recurse right with an adjusted rank — all in O(lg n) since it is just a single downward walk. ^card-atz0

An ==interval tree== augments a red-black tree, keyed on each interval's ^card-ljin
low endpoint, with a `max` field: the largest endpoint value anywhere in
that node's subtree. This lets INTERVAL-SEARCH find some interval
overlapping a query interval in O(lg n): at each node, the `max` field
lets the search decide whether the left subtree could possibly contain
an overlap, and prune it entirely when it cannot, rather than searching
both subtrees.

> [!card] recall
> Explain why an interval tree's `max` field is enough to safely prune
> an entire subtree during INTERVAL-SEARCH without missing an overlapping
> interval that might be hiding inside it. ^card-mbse
