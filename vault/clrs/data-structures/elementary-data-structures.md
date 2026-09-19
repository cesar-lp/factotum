---
topic: algorithms
category: algo-data-structures
tags: [stacks, queues, linked-lists, arrays, pointers]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 10 (Elementary Data Structures)"]
---

# Stacks, Queues, and Linked Lists

CLRS treats stacks, queues, and linked lists as the base layer everything
else in this category is built from: red-black trees, B-trees, and
disjoint-set forests are all, at bottom, nodes connected by pointers, and
the array-vs-pointer tradeoff introduced here recurs everywhere.

A ==stack== supports LIFO access: the element removed is always the one ^card-l89j
inserted most recently. Implemented on an array with a `top` index,
PUSH and POP both run in O(1), since each only touches the slot at `top`
and adjusts the index — no shifting of other elements is needed.

A ==queue== supports FIFO access: the element removed is always the one ^card-1h04
that has been waiting longest. A circular array implementation keeps
`head` and `tail` indices that wrap around the array's end, so ENQUEUE
and DEQUEUE are also O(1) without ever shifting elements.

Why can a stack or queue be implemented on a fixed-size array in O(1) time per operation, when inserting into the middle of an array is O(n)? :: Both only ever add or remove at one fixed end (or two, for a queue) — the top of the stack, or the head/tail of the queue — so no other elements need to shift to make room or close a gap; only the boundary index moves. ^card-dut1

A linked list's elements are objects in arbitrary memory locations, each
holding a key and one or more pointers. A **singly linked list** node has
only a `next` pointer; a **doubly linked list** node adds `prev`, letting
it be traversed in either direction and letting a node be deleted in O(1)
once you already hold a pointer to it — an operation that costs O(n) on
a singly linked list, since finding the predecessor to unlink from means
walking the list.

A ==sentinel== is a dummy object placed at a list's boundary (e.g. as ^card-f8w0
`nil[L]` in a circular, doubly linked list) purely to simplify boundary
code: insert and delete no longer need special-case branches for an empty
list or an operation at the head or tail, since the sentinel is always
there to link against. This trades a small, constant amount of memory
per list for simpler, branch-free code — a bad trade when a program keeps
many short lists, since the sentinel overhead is paid on every one of
them.

> [!card] mcq
> What is the main practical downside of using a sentinel in a linked list?
> - [x] It wastes memory when a program maintains many short lists, since each pays the sentinel's overhead
> - [ ] It makes insertion take O(n) instead of O(1)
> - [ ] It prevents the list from being traversed in reverse
> - [ ] It requires the list to be stored in an array ^card-islg

Searching a linked list for a given key is O(n) in the worst case, since
there is no random access — you must walk pointers from the head until
you find it or run off the end. This is the core array-vs-pointer
tradeoff: an array gives O(1) access to any element by index but O(n)
insertion or deletion in the middle (everything after must shift), while
a linked list gives O(1) insertion or deletion at a known point but O(n)
search and no random access at all.

Why does inserting into the middle of an array cost O(n) while inserting into the middle of a linked list costs O(1)? :: An array stores elements contiguously by position, so inserting one means shifting every later element over by one slot to keep the array packed; a linked list stores elements wherever they happen to live in memory and connects them by pointers, so inserting only means rewriting a couple of `next`/`prev` pointers at the insertion point, with nothing else moving. ^card-kbka

> [!card] recall
> Explain why a doubly linked list needs an explicit pointer to a node
> (not just its key) to delete that node in O(1), and why a singly linked
> list cannot match that bound for an arbitrary node. ^card-927x
