---
topic: algorithms
category: algo-data-structures
tags: [red-black-trees, tree-height, rotations, balanced-search-trees]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 13 (Red-Black Trees)"]
---

# Red-Black Trees

The previous note ended on the BST's weak point: nothing stops a
degenerate, linked-list-shaped tree with Θ(n) height. A red-black tree
is a binary search tree with one extra bit per node — a color — and five
properties on those colors that together force the height to stay
O(lg n) no matter what order keys arrive in.

The five properties: (1) every node is red or black; (2) the root is
black; (3) every leaf (CLRS's sentinel NIL nodes) is black; (4) a red
node's children are both black; (5) every simple path from a given node
to any descendant leaf contains the same number of ==black nodes== — ^card-0xoc
that count, excluding the starting node, is the node's **black-height**.

Why must property 5 (equal black-height on every path from a node) hold specifically for descendant *leaves*, rather than just comparing paths between arbitrary nodes? :: Because every simple path down the tree eventually ends at some leaf, requiring the black-node count to match across all such paths is what pins down a single, well-defined black-height for every node — without that anchor to leaves, "equal black count" would have nothing common to all paths to be equal to. ^card-gj6e

Properties 4 and 5 together bound the height. Property 5 fixes a
black-height bh(x) for every node; property 4 forbids two consecutive
red nodes on any path, so red nodes can only interleave between black
ones. That caps how much a path's red nodes can inflate it past its
black-height, giving a red-black tree with n internal nodes height
==h ≤ 2 lg(n + 1)==. This is what makes SEARCH, INSERT, and DELETE ^card-dq2o
O(lg n) worst case — they inherit the BST's O(h) bound from the previous
note, and now h itself is provably logarithmic.

> [!card] mcq
> What does a red-black tree add to an ordinary binary search tree to guarantee O(lg n) height?
> - [x] A color (red or black) per node, plus five properties on those colors that bound how much red nodes can inflate any path past its black-height
> - [ ] A size field recording how many nodes are in each subtree
> - [ ] A rule that every node must have exactly two children
> - [ ] A cap on the total number of nodes the tree may hold ^card-sz49

A ==rotation== (LEFT-ROTATE or RIGHT-ROTATE) is a local, O(1) operation ^card-oyqj
that swaps a node with one of its children while preserving the BST
property — it changes pointers, not keys, so an inorder traversal still
produces the same sorted sequence before and after. Rotations are the
tool insertion and deletion fix-up use to restore the five properties
after a change to the tree's shape.

```
// LEFT-ROTATE(T, x): pivots x below its right child y,
// giving x y's left subtree as its new right subtree.
// A local, O(1) pointer rewrite; BST order is unaffected.
```

RB-INSERT starts by coloring the new node red and splicing it in exactly
as an ordinary BST insert would, which can only ever violate property 4
(a red node with a red parent) — never properties 1, 2, 3, or 5. Fix-up
then walks upward from the new node, using recoloring where possible and
falling back to rotations only when recoloring alone cannot resolve the
conflict, terminating once it reaches a black parent or the root; it
performs at most two rotations in total.

Why can inserting a new red node into a red-black tree only ever threaten property 4, and never properties 1, 2, 3, or 5? :: The new node is a genuine leaf's replacement colored red, which trivially keeps every node red-or-black (property 1) and every leaf black (property 3, since NILs are unaffected) and does not change the root's color (property 2) or the black count on any path (property 5, since the new node is red and adds nothing to any black-height); the only property a red node's insertion can break is that its parent might also be red. ^card-9s0a

RB-DELETE-FIXUP faces the mirror problem: removing a black node can leave
some path with one too few black nodes, an imbalance CLRS models as an
"extra black" that needs to be absorbed. Fix-up pushes that extra black
up the tree via recoloring, or resolves it locally with a rotation and
recoloring, using at most three rotations in total — in both fix-ups,
the point of the cases is to either fix the violation locally in O(1)
work or push a smaller version of the same problem one level up, which
is why the whole walk stays O(lg n).

> [!card] recall
> Explain, without walking through each named case, what the general
> strategy of both RB-INSERT-FIXUP and RB-DELETE-FIXUP is: what a "case"
> in either fix-up is actually trying to accomplish, and why looping
> through cases still only takes O(lg n) time. ^card-b1fl
