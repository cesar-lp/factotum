---
category: amp
tags: [linked-lists, optimistic-synchronization, lazy-synchronization, lock-free]
citations: ["Herlihy & Shavit, The Art of Multiprocessor Programming, Ch. 9 (Linked Lists: The Role of Locking)", "Heller et al., \"A Lazy Concurrent List-Based Set Algorithm\" (2005)"]
---

# Concurrent Linked Lists: A Synchronization Case Study

OSTEP's lock-based data structures note already covers hand-over-hand
(fine-grained) locking on a list: a thread holds one node's lock only long
enough to grab the next node's lock before releasing the first. This note
goes further, into the strategies OSTEP never reaches — optimistic,
lazy, and non-blocking synchronization — which trade *when* a thread
locks, or whether it locks at all, for far less overhead on the common
case.

When does optimistic synchronization lock nodes, compared to hand-over-hand? :: Hand-over-hand acquires a lock on every node as it is visited, one at a time chained down the list, so the path already walked can never change concurrently. Optimistic synchronization traverses the entire path with no locks at all, and only locks the (typically two) nodes it believes it needs once the search is done. ^card-6fmp

What does optimistic sync's validation step catch that hand-over-hand rules out? :: A stale traversal: because optimistic synchronization walked the list with no lock held anywhere, another thread could have inserted, removed, or reordered nodes in the meantime, so before committing, it must explicitly re-check that the remembered predecessor and successor are still adjacent and unmarked — a check hand-over-hand never needs, since it never lets go of a node before securing the next. ^card-u4kf

==Lazy synchronization== adds a boolean "marked" field to each node for ^card-9o13
logical deletion: a remove first marks the node as logically deleted
(under the same brief locking and validation as optimistic synchronization)
and only unlinks it physically afterward, as a separate step.

> [!card] mcq
> In lazy synchronization, what is the main benefit of adding a "marked" field for logical deletion?
> - [x] Lookup operations can traverse the list without acquiring any lock and never need to retry
> - [ ] It removes the need for locks during insert and remove as well
> - [ ] It eliminates the need to ever physically unlink a removed node
> - [ ] It makes the whole list wait-free ^card-i9jj

A ==lock-free== linked list typically deletes a node by atomically marking ^card-o7yp
its next-pointer's low bit via compare-and-swap at the same time as (or
immediately before) unlinking it, so a thread concurrently inserting right
after that node sees the mark and retries instead of splicing its new node
onto one that is already being removed.

> [!card] recall
> Explain why lazy synchronization's lookups being lock-free is a bigger
> practical win than making insert or remove lock-free, for a typical
> workload on a set-like data structure. ^card-ifw3

What does optimistic sync give up vs hand-over-hand under heavy contention? :: Its guaranteed-once traversal cost becomes probabilistic: heavy concurrent modification near the target nodes can repeatedly fail validation, forcing a full retraversal from scratch, whereas hand-over-hand's per-node locking never needs to redo work it already completed. ^card-akb7
