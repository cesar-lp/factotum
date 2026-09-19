---
category: os-persistence
tags: [crash-consistency, fsck, journaling, write-ahead-logging]
citations: ["Arpaci-Dusseau, OSTEP, Ch. 42 (Crash Consistency: FSCK and Journaling)"]
---

# Crash Consistency: fsck and Journaling

A single logical file-system update — say, appending a block to a file —
usually touches several on-disk structures: an inode, a data bitmap, and
a data block. Those are separate writes, and a crash between any two of
them can leave the disk in a state no single update would ever produce on
its own.

A crash between a file system's related writes (an inode update, a bitmap
update, a data block write) can leave the disk in an ==inconsistent== ^card-x8pz
state, since only some of those writes may have actually completed before
the crash.

The problem is not just that a write might be lost — those writes are interdependent (a bitmap must agree with what an inode claims is allocated), so a crash between them can leave the bitmap and inode disagreeing with each other, corrupting the file system's own bookkeeping rather than merely losing the newest data. ^card-fy8o

One recovery strategy is ==fsck==: after a crash, scan every inode, ^card-fi5x
bitmap, and directory on the whole disk and reconcile any inconsistencies
found, using redundancy already present in the structures (like link
counts) to guess the right fix.

Why does fsck not scale as disks grow into the terabyte range? :: Its recovery time is proportional to total disk size and inode count, regardless of how few writes were actually in flight at the moment of the crash, so a crash right after mount can trigger a scan lasting minutes to hours on a large disk. ^card-24kn

Journaling instead writes a description of an update to a small,
sequential log before touching the update's real, scattered home
locations at all — turning an unordered set of risky in-place writes into
one durable, ordered record that recovery can trust. Metadata-only
journaling is also called ordered journaling, after that same durable
ordering.

> [!card] recall
> Explain why write-ahead journaling writes and commits a transaction to
> the journal BEFORE applying any of its changes to the file system's
> actual home locations, rather than the other way around. ^card-xatv

Once a journaled transaction's changes are safely applied to their home
locations, the file system performs a ==checkpoint== and can then reclaim ^card-7igb
that transaction's journal space for future use.

After a crash, how does a journaling file system know which journal transactions to replay? :: Only transactions with a complete commit record are replayed; a transaction interrupted before its commit record was fully written is discarded, since it was never guaranteed durable in the first place. ^card-5f5f

Journaling comes in two common flavors. ==Data journaling== writes both a ^card-zosc
block's content and its metadata to the journal before writing them again
to their home locations, doubling I/O for every changed block but
protecting file content itself against a crash. ==Metadata-only journaling== ^card-jjel
logs only metadata, writing data blocks directly to their
home locations once, before the commit record — much cheaper, at the cost
of a smaller window where a crash can leave stale (but not corrupt) data
behind a valid pointer.

Why does data journaling write more total I/O than metadata-only journaling? :: Data journaling logs both file content and metadata to the journal, then writes both again to their home locations, doubling writes for every changed data block, while ordered journaling logs only metadata and lets data blocks be written once, directly, before the commit record. ^card-ddml

> [!card] mcq
> A file system uses metadata-only (ordered) journaling instead of full data journaling. What does it give up in exchange for less journal I/O?
> - [x] A guarantee that a file's actual data content survives a crash unchanged, since only metadata is journaled
> - [ ] The ability to recover the directory structure at all after a crash
> - [ ] Any consistency guarantee whatsoever
> - [ ] The use of a journal — ordered journaling does not use one ^card-b8mq
