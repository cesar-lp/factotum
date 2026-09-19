---
category: os-persistence
tags: [file-system-implementation, inodes, allocation, superblock]
citations: ["Arpaci-Dusseau, OSTEP, Ch. 40 (File System Implementation)"]
---

# File System Implementation: Inodes, Bitmaps, and Allocation

A file system's on-disk layout divides a partition into a handful of
regions: a superblock, bitmaps tracking free space, an inode table, and
the data blocks themselves. Every file and directory operation ultimately
reads or writes some combination of these structures.

The ==superblock== is the first structure read when a file system is ^card-8428
mounted; it holds file-system-wide metadata such as block size, total
inode and block counts, and pointers to where the other regions begin.

A ==bitmap== marks each inode or data block as free or in-use with a ^card-ahgj
single bit, letting the allocator find free space by scanning for a 0 bit
rather than maintaining a separate free list.

Why do inodes use indirect pointers instead of one flat block-pointer list? :: A fixed-size inode can't hold enough direct pointers for large files, so an indirect pointer (a pointer to a block full of further pointers) adds one level of indirection, and a double-indirect pointer adds another; small files stay cheap with only direct pointers and one I/O, while large files reach far more blocks through progressively deeper indirection. ^card-c1si

Why do most inodes reserve room for several direct pointers before any indirect pointer? :: Most files are small, so a handful of direct pointers lets small files' data be reached with zero extra indirection I/O; the indirect pointers only get consulted once a file's size outgrows that direct capacity. ^card-b4a1

Why does opening a deeply nested path like /a/b/c.txt require several separate disk reads? :: Each path component's directory must be read in turn to find the next component's inode number, so the OS walks the tree one directory-read (and inode-read) at a time rather than jumping straight to the final file. ^card-5lpc

```
// illustration only: resolving /a/b/c.txt
// read root dir -> find inode(a) -> read a's dir -> find inode(b)
// -> read b's dir -> find inode(c.txt) -> read c.txt's inode -> read data
```

> [!card] mcq
> A file system needs to allocate a new data block for a growing file. What must it check first?
> - [x] The data bitmap, to find a block currently marked free
> - [ ] The superblock's block-size field, since block size changes on each allocation
> - [ ] The file's directory entry, since directories track free space
> - [ ] Nothing — the OS always appends at the next unused disk address ^card-ujja

> [!card] recall
> Explain why reading even a single, small file can require multiple
> distinct disk I/Os, even though the file's own data fits in one block. ^card-t4f0
