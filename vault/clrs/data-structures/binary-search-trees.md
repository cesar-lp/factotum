---
topic: algorithms
category: algo-data-structures
tags: [binary-search-trees, tree-traversal, tree-height, bst-property]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 12 (Binary Search Trees)"]
---

# Binary Search Trees

A binary search tree stores keys so that, for every node x, every key in
x's left subtree is less than or equal to x.key, and every key in x's
right subtree is greater than or equal to x.key. This ==BST property== ^card-8g3u
is what lets search, insertion, and deletion all be expressed as walks
down a single path from the root, choosing left or right at each node by
comparing to the target key.

The BST property also makes an ==inorder== traversal (recurse left, ^card-k00y
visit the node, recurse right) print every key in sorted order — the
defining reason the property is useful, not just a search aid.
**Preorder** (visit node, then left, then right) and **postorder**
(left, then right, then visit node) instead reflect the tree's shape,
which is what makes them the natural choice for tasks like copying a
tree or evaluating an expression tree. All three run in Θ(n) time, since
each visits every node exactly once.

Which traversal order visits a binary search tree's keys in sorted order, and why? :: Inorder traversal (left subtree, then the node, then right subtree); the BST property guarantees every key in the left subtree is ≤ the node's key and every key in the right subtree is ≥ it, so recursively applying that ordering at every node produces the keys in sorted order overall. ^card-oq2z

SEARCH, INSERT, and (the trickiest) DELETE all run in ==O(h)== time, ^card-0edg
where h is the tree's height — each walks at most one path from the
root to a leaf, doing O(1) work per node along the way.

```
// TREE-SEARCH(x, k): O(h)
if x = NIL or k = x.key: return x
if k < x.key: return TREE-SEARCH(x.left, k)
else:         return TREE-SEARCH(x.right, k)
```

Deleting a node z has three cases: if z has no children, just remove it;
if z has exactly one child, splice that child into z's position; if z
has two children, find z's **successor** (the minimum key in z's right
subtree, which has no left child itself), and either move that
successor's key into z or splice the successor out and put it in z's
place — either way, reducing the two-child case to one already handled
by the other two.

> [!card] mcq
> Why is deleting a node with two children handled by finding its inorder successor?
> - [x] The successor (the minimum of the right subtree) is guaranteed to have no left child, so removing it reduces to the already-solved zero- or one-child case, and it is the smallest key still larger than z's, so replacing z with it preserves the BST property
> - [ ] The successor is always a leaf, so it can simply be deleted with no further work
> - [ ] Using the successor avoids ever needing to update any parent pointers
> - [ ] The successor is chosen arbitrarily among z's descendants ^card-uu6m

What single tree property determines the running time of BST search, insertion, and deletion, and why do all three share it? :: The tree's height h, because each operation is just a walk down one path from the root, making a constant amount of comparisons and pointer updates per node visited — so the total work is proportional to how many nodes that one path can contain, which is exactly what height measures. ^card-t37x

A tree built by inserting n keys in random order has expected height
O(lg n), giving O(lg n) expected time per operation. But nothing in the
BST property itself prevents a degenerate shape: inserting keys in
already-sorted order builds a tree that is really a linked list, with
height Θ(n) and every operation costing Θ(n) — the exact problem
red-black trees are built to rule out by bounding height directly.

> [!card] recall
> Explain why "binary search trees run in O(lg n) time" is not a correct
> unqualified claim, and under what condition on how keys are inserted
> it does hold. ^card-e6qx
