---
topic: operating-systems
category: os-persistence
tags: [ffs, locality, block-groups, disk-awareness]
citations: ["Arpaci-Dusseau, OSTEP, Ch. 41 (Locality and The Fast File System)"]
---

# FFS and Locality

The earliest UNIX file system placed inodes and data blocks on disk
without regard to the disk's physical geometry, so related pieces of a
file — and files within a directory — often ended up scattered far apart.
Over time this produced heavy seeking and poor throughput, which is what
the Fast File System (FFS) set out to fix.

FFS divides the disk into ==cylinder groups==, each with its own inodes, ^card-eavj
bitmaps, and data blocks, instead of relying on one disk-wide inode table
far away from the data it describes.

Why does keeping a file's inode and data blocks in the same cylinder group improve performance? :: Reading a file means reading its inode and then its data blocks in short order; keeping both nearby means the disk head barely has to seek between the two, unlike a layout where the inode region sits physically far from the data region. ^card-4teo

FFS also places a new file's data, where possible, in the ==same cylinder ^card-6v35
group== as its parent directory, on the heuristic that files created
together in one directory are often accessed together later too.

What tradeoff does FFS accept by keeping a large file confined to one cylinder group? :: A very large file would eventually fill its group and force later allocations elsewhere regardless, so FFS spreads a big file's later chunks into new groups once one fills up, trading perfect locality for balanced use of space across the whole disk. ^card-4v22

Why does FFS deliberately leave a fraction of the disk unallocated? :: FFS reserves roughly 10% of total space as headroom; letting a disk fill completely forces the allocator to scatter later writes across whatever scraps of free space remain, which destroys the very locality FFS is designed to preserve and degrades performance sharply as free space grows scarce. ^card-kmy0

> [!card] mcq
> A workload creates thousands of small files, all inside one directory. What does FFS's placement policy do to help?
> - [x] Cluster those files' inodes and data in the same cylinder group as the directory, reducing seeks between them
> - [ ] Spread the files evenly across every cylinder group to balance disk wear
> - [ ] Keep all small files in RAM permanently instead of writing them to disk
> - [ ] Merge the small files into one large file transparently ^card-swgs

> [!card] recall
> Explain why the original UNIX file system's placement policy caused
> fragmentation and heavy seeking over time, even though nothing about
> its individual allocation decisions was obviously wrong in isolation. ^card-5yzd
