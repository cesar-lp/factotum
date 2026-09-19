---
category: os-persistence
tags: [ssd, flash, ftl, wear-levelling]
citations: ["Arpaci-Dusseau, OSTEP, Ch. 44 (Flash-based SSDs)"]
---

# Flash and SSDs: Erase Blocks, the FTL, and Wear Levelling

Flash memory can be read and written at ==page== granularity but can only ^card-3t2z
be erased at the larger ==block== granularity (each such unit holds many ^card-yc4w
pages), so overwriting even one of them in place would require first
erasing — and therefore rewriting — the whole surrounding region.

Why does an SSD write updates to a fresh page instead of overwriting in place? :: Overwriting in place would force erasing the whole containing block first, a comparatively slow operation, so instead the drive writes the new version to an already-erased page elsewhere and remaps the logical address to it, deferring the erase until garbage collection reclaims the old block later. ^card-5vfk

The flash translation layer (==FTL==) maps the logical block addresses the ^card-hwid
OS uses to physical flash locations, hiding erase-before-write and
block-level erase granularity from the file system entirely — to the OS,
the SSD still looks like an ordinary block device.

Why does an SSD need internal garbage collection, like LFS's cleaner? :: The FTL's out-of-place writes leave old page versions behind as garbage inside blocks, just as LFS's segments do, so the FTL needs its own background process to reclaim blocks by copying any still-live pages forward before erasing them. ^card-a37s

> [!card] recall
> Explain why wear levelling is necessary, given that each flash block
> can survive only a limited number of program/erase cycles before it
> becomes unreliable. ^card-tcde

Without ==wear levelling==, an FTL that kept reusing the same handful of ^card-3syc
free blocks would wear those specific blocks out to failure long before
the rest of the drive's capacity was ever touched, even though plenty of
usable life remained elsewhere on the drive.

What does "write amplification" mean for an SSD? :: The ratio of physical flash writes actually performed to the logical writes the host requested; garbage collection copying live pages out of a block, plus erasing the whole block to reclaim only a fraction of dead pages in it, both add physical writes beyond what the host asked for. ^card-43o1

> [!card] mcq
> An OS issues one small logical write to an SSD. Why might the SSD perform noticeably more physical write and erase work than that single logical write implies?
> - [x] Garbage collection may copy live pages out of the target block and erase the whole block before it can be reused, amplifying one logical write into several physical operations
> - [ ] SSDs always write every logical write to every block for redundancy
> - [ ] The FTL requires the OS to explicitly request a separate erase command for every write
> - [ ] Flash pages are always physically larger than the write, wasting the unused remainder ^card-oegf
