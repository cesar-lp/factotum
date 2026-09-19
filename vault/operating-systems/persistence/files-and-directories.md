---
category: os-persistence
tags: [file-api, directories, inodes, links]
citations: ["Arpaci-Dusseau, OSTEP, Ch. 39 (Files and Directories)"]
---

# Files, Directories, and the File API

Programs interact with persistent storage almost entirely through a small
file API: `open`, `read`, `write`, `close`, and friends. Underneath that
simple interface, the OS is managing buffering, permissions, and on-disk
structures the caller never sees directly.

A file descriptor returned by ==open()== is just a small integer index ^card-fhwm
into a per-process table pointing at an open-file entry — it is not the
file's contents, and two descriptors can point at independent positions
within the same underlying file.

Why doesn't write() guarantee data has reached disk when it returns? :: The OS typically buffers writes in memory (the page cache) and flushes them to disk later for performance, so a successful write() only guarantees the data is queued; fsync() (or similar) is needed to force it to durable storage before the call returns. ^card-rmkq

A directory is not a special data structure at the file-system level — it
is just a file whose contents are a list of ==(name, inode number)== pairs, ^card-j6ku
which is why directory operations (create, rename, list) are really just
reads and writes of an ordinary file's data.

What actually gets removed when unlink() is called on a file with one remaining hard link? :: Its directory entry is removed, and because the inode's link count then drops to zero, the inode and its data blocks are freed; if other hard links still point at the same inode, the data survives untouched. ^card-7938

> [!card] mcq
> A file has two hard links, `a` and `b`, both pointing at the same inode. `a` is deleted. What happens to the file's data?
> - [x] It remains fully accessible through `b`, since the inode's link count is still above zero
> - [ ] It's deleted immediately, since deleting any link deletes the underlying data
> - [ ] It becomes read-only until `b` is also deleted
> - [ ] A private copy is silently made for `b` ^card-0gb9

Why can a symbolic link "dangle" in a way a hard link cannot? :: A symlink stores a path string that is resolved fresh at access time, so if the target is deleted the symlink is left pointing at a name that no longer resolves; a hard link instead is another direct reference to the same inode, so it cannot outlive the data it names. ^card-ilzf

> [!card] recall
> Explain why a hard link and "the file it links to" are not actually
> distinguishable at the file-system level — why there is no original
> versus copy once both links exist. ^card-io2y
