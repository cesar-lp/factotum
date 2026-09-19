---
category: os-persistence
tags: [data-integrity, checksums, corruption, scrubbing]
citations: ["Arpaci-Dusseau, OSTEP, Ch. 45 (Data Integrity and Protection)"]
---

# Data Integrity and Checksums

Disks and SSDs can corrupt data silently — a bit flip, a misdirected
write, a write that never actually landed — without reporting any error
at all. That silence is what makes this failure mode dangerous: nothing
above the device layer notices unless something explicitly checks.

A ==checksum== is a small value computed from a block's data so that a ^card-ettn
later mismatch between the stored value and a freshly recomputed one
reveals the data changed, without needing to keep a full second copy of
the block just to compare against.

Why is silent (undetected) disk corruption more dangerous than a disk simply failing to respond? :: A failed or unresponsive disk clearly signals a problem the OS can react to, while silent corruption returns data that reads back as valid but is actually wrong, so nothing above notices until, if ever, something explicitly checks it against a checksum or a redundant copy. ^card-nuu5

A checksum alone can only ==detect== corruption, not repair it — recovering ^card-3w7u
the correct bytes requires redundancy, such as a mirrored copy or a parity
block, that a checksum by itself does not provide.

Why can't a mismatched checksum tell you what the correct original data was? :: A checksum is a small, lossy summary derived from a whole block, so many different corrupted contents could still be consistent with observing a mismatch; it can only flag that something disagrees, not reconstruct the block it was originally computed from. ^card-knul

> [!card] recall
> Explain why a RAID array with parity can use a checksum mismatch to
> actually repair a corrupted block, not merely detect that it's wrong. ^card-t47o

==Scrubbing== periodically reads every block on disk and checks its ^card-9486
checksum, catching latent corruption early — before, say, a second disk
fails during a RAID rebuild that depends on the surviving data actually
being intact.

Why do systems scrub disks proactively instead of only checking checksums when data is read? :: Some blocks may go unread for a long time, letting corruption sit undetected; if a later failure elsewhere (like another disk in a RAID array) depends on that stale block being intact, discovering the corruption only then is too late, so scrubbing surfaces it earlier while redundancy still exists to fix it. ^card-kcsy

> [!card] mcq
> A RAID-5 array detects a checksum mismatch on one block during a read. What can it do that a single disk with only a checksum cannot?
> - [x] Reconstruct the correct data from parity and the other surviving disks in the stripe
> - [ ] Recompute the correct bytes directly from the mismatched checksum value alone
> - [ ] Nothing differently — checksums provide the same guarantee everywhere
> - [ ] Automatically know which bit flipped without consulting any redundant data ^card-gond
