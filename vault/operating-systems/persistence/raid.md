---
topic: operating-systems
category: os-persistence
tags: [raid, redundancy, fault-tolerance, parity]
citations: ["Arpaci-Dusseau, OSTEP, Ch. 38 (RAID)"]
---

# RAID Levels and Their Trade-offs

RAID combines several physical disks into one logical unit, and every
RAID level is a different trade-off among three axes: usable capacity,
performance, and reliability (how many disk failures it survives). No
level wins on all three at once.

==RAID-0== stripes data across disks with no redundancy at all: it gains ^card-3pa9
capacity and parallel performance, but tolerates zero disk failures —
losing any one drive loses data, since no other disk holds a copy or a
way to reconstruct it.

Why does RAID-1 (mirroring) cost the most usable capacity among common RAID levels? :: Every block is written twice, to two separate disks, so exactly half of the raw capacity across the array is ever usable no matter how many mirrored pairs are added. ^card-kk4h

==RAID-4== dedicates one disk entirely to parity, computed across the ^card-rkei
corresponding blocks on the other disks. Because every write must also
update that one parity disk, it becomes a bottleneck whenever writes
happen concurrently, even though the data disks themselves could be
written in parallel.

How does RAID-5 fix RAID-4's parity-disk bottleneck without adding disks? :: RAID-5 rotates which physical disk holds parity from one stripe to the next instead of dedicating a single disk to it, so parity writes are spread across every drive and no one disk absorbs the write load of the whole array. ^card-wfji

RAID-5 tolerates exactly ==one== disk failure per stripe: losing a second ^card-b03p
disk before the array finishes rebuilding from the first loses data,
because a stripe's parity can only reconstruct a single missing block,
not two.

What does RAID-6 add over RAID-5, and what does that buy? :: A second, independently computed parity block per stripe, so the array can reconstruct data even when any two disks fail at the same time, not just one. ^card-4sia

> [!card] mcq
> A RAID-5 array has one failed disk and is mid-rebuild when a second disk fails before the rebuild finishes. What happens?
> - [x] Data is lost — RAID-5's single parity block can only recover from one failure per stripe
> - [ ] The array keeps running normally using the remaining parity
> - [ ] RAID-5 automatically reconfigures itself into RAID-6 to absorb the second failure
> - [ ] Only the blocks written during the rebuild window are lost; the rest survive ^card-bey7

> [!card] recall
> Explain the "small write problem" in parity-based RAID (RAID-4 and
> RAID-5): why updating a single data block requires more disk I/O than
> simply writing that one block would on its own. ^card-4m5t
