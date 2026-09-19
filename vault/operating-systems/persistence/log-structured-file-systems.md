---
category: os-persistence
tags: [log-structured-file-systems, lfs, cleaning, imap]
citations: ["Arpaci-Dusseau, OSTEP, Ch. 43 (Log-structured File Systems)"]
---

# Log-Structured File Systems

Random writes are expensive on a mechanical disk, no matter how cleverly
an in-place file system lays out its structures. Log-structured file
systems (LFS) sidestep the problem at its root by never updating anything
in place at all.

LFS buffers writes in memory and flushes them together as one large
==sequential== write, turning many small, scattered updates into a single ^card-z8mg
efficient streaming write to the next free region of disk.

Why can't LFS simply update an inode in place, the way FFS does? :: Updating in place would mean seeking back to that inode's old, fixed disk location on every write, reintroducing exactly the random-access cost LFS exists to avoid; instead LFS writes the updated inode to whatever the next free spot in the current write happens to be. ^card-r2iu

Because inodes move on every update, LFS adds an ==inode map (imap)== ^card-g77u
translating inode numbers to their current on-disk location — itself
written to the log rather than kept at one fixed spot.

Why must even the imap itself avoid a single fixed disk location? :: A fixed imap location would need an in-place update on every write, the exact random-access cost LFS was built to eliminate; so LFS logs imap updates too, and keeps only a small, fixed checkpoint region to bootstrap finding the current imap after a restart. ^card-c6te

> [!card] recall
> Explain why old versions of overwritten blocks are left behind as
> "dead" data in earlier parts of the log, rather than being erased
> immediately at the moment a newer version is written. ^card-r4n1

A background ==cleaner== process identifies segments holding mostly dead ^card-jch1
blocks, copies their few remaining live blocks forward into a fresh
segment, and frees the old segment for reuse.

Why does cleaning cost more as a segment's fraction of live data increases? :: A mostly-dead segment yields a lot of reclaimed space for very little copying, but a mostly-live segment forces the cleaner to read and rewrite almost as much data as it frees, so cleaning nearly-full segments has poor amortized efficiency compared to cleaning mostly-empty ones. ^card-d210

> [!card] mcq
> LFS just finished writing several updated blocks. Where does it place a data block belonging to a file whose inode lives at a completely different disk location?
> - [x] Wherever the current write's next free slot is — LFS never seeks back to a fixed home location for an update
> - [ ] At the exact same offset the block held before, overwriting it in place
> - [ ] In a fixed region reserved per file, adjacent to nothing else
> - [ ] Immediately next to the inode, regardless of where the current log write is ^card-xnl4
