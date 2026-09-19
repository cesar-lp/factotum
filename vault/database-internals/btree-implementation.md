---
category: database-internals
tags: [b-tree, slotted-pages, copy-on-write, rebalancing]
citations: ["Petrov, Database Internals, Ch. 3-4"]
---

# B-Tree Implementation

A B-tree node is stored as one fixed-size disk **page**, and most
implementations lay out variable-length keys and values within that page
using a **slotted page** layout: a small array of offsets (slots) at the
front of the page points into cell data that grows from the other end,
so records can vary in size without the page needing a rigid, fixed-width
row format.

A slotted page's ==slot array== holds pointers into the page rather than ^card-3gkw
the records themselves, which lets a record be deleted or resized by
updating a pointer and compacting cell space, without shifting every
other record's offset on the page.

> [!card] mcq
> Why do B-tree pages commonly use a slotted layout instead of storing
> fixed-width records directly?
> - [x] It lets variable-length records be stored, deleted, or resized by rewriting a small offset array rather than physically shifting every other record on the page
> - [ ] It removes the need to keep records sorted on the page
> - [ ] It eliminates the need for a write-ahead log
> - [ ] It doubles the page's effective storage capacity ^card-4yv2

Deleting a record from a slotted page is often done by marking its slot
as a **tombstone** rather than immediately compacting the page, deferring
the actual space reclamation to a later maintenance pass; this keeps
individual deletes cheap at the cost of some temporarily wasted page
space.

Rebalancing in a B-tree — redistributing keys between siblings, merging
underfull nodes, or splitting overfull ones — keeps every leaf at the
same depth and every node within its occupancy bounds, which is what
gives the tree its predictable, bounded-height lookup cost regardless of
insertion order.

> [!card] mcq
> What guarantee does B-tree rebalancing (splits, merges, key
> redistribution) primarily preserve?
> - [x] Every leaf stays at the same depth and every node stays within its occupancy bounds, regardless of the order keys were inserted or deleted
> - [ ] Every node ends up holding exactly the same keys as its sibling
> - [ ] The tree never needs to write to disk again after the first insert
> - [ ] Keys are stored in insertion order rather than sorted order ^card-l6ji

A traditional B-tree updates a page **in place**: when a value changes,
the engine finds the page, modifies it in the buffer pool, and eventually
overwrites the same page on disk. A **copy-on-write** B-tree instead
writes any modified page to a brand-new location on disk, then
propagates new pointers up through copies of every ancestor page, up to
a new root — the old, unmodified path of pages stays intact and readable
throughout.

Because a copy-on-write B-tree never overwrites a page that a reader
might still be using, it can support a globally-consistent ==snapshot== ^card-3aqg
of the whole tree simply by holding onto an old root pointer, without any
locking against concurrent writers.

What does a copy-on-write B-tree give up in exchange for lock-free, snapshot-consistent reads? :: It must write a new copy of every page on the path from the modified leaf up to the root on each update (not just the one page changed), which increases the amount of data written per logical update compared to in-place updates. ^card-5zry

> [!card] recall
> Explain why a copy-on-write B-tree can offer snapshot isolation for
> readers without taking locks against concurrent writers, in terms of
> what happens (and does not happen) to the old version of a modified
> page. ^card-ly3c

> [!card] mcq
> In a copy-on-write B-tree, what happens to the pages along the path
> from a modified leaf to the root when a single key is updated?
> - [x] Each of those pages is rewritten to a new location, and the parent above it is updated to point to the new copy, all the way to a new root
> - [ ] Only the leaf page is rewritten; all ancestor pages are updated in place
> - [ ] No pages are rewritten; the update is recorded only in a separate log
> - [ ] The entire tree is rewritten from scratch on every update ^card-uyyw
