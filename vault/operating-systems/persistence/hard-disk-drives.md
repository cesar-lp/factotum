---
category: os-persistence
tags: [hard-disk-drives, disk-scheduling, seek-time, rotational-latency]
citations: ["Arpaci-Dusseau, OSTEP, Ch. 37 (Hard Disk Drives)"]
---

# Hard Disk Drives and Disk Scheduling

A hard disk stores data on spinning platters, read and written by a head
on an arm that moves across the platter's surface. Getting to a specific
sector is a mechanical process, not an instant lookup, and that mechanics
dominates disk performance far more than the electronics do.

A single disk access has three components: ==seek time== (move the arm to ^card-5nz4
the target track), rotational latency (wait for the target sector to spin
under the head), and transfer time (actually read or write once
positioned). Seek and rotation are pure overhead paid before any useful
data moves.

Why is sequential access on a disk far faster than random access to the same amount of data? :: Sequential access pays one seek and one rotational wait, then streams many contiguous sectors in a row; random access pays a fresh seek and rotational wait for nearly every block, and those mechanical delays dwarf the time actually spent transferring data. ^card-b2fc

Because seek and rotation are so costly, the order in which pending
requests are serviced matters a great deal, which is why disks (and the
OS layer above them) run a scheduler rather than servicing requests in
arrival order. The simplest such scheduler is shortest seek time first
(SSTF).

The ==SSTF== scheduler always services the ^card-vo0a
pending request closest to the disk head's current position. It minimizes
seek distance greedily, but a steady stream of nearby requests can keep
pushing a distant request to the back indefinitely.

How does the elevator (SCAN) algorithm avoid the starvation SSTF can cause? :: It sweeps the head in one direction, servicing every request in its path in position order, then reverses at the far end and sweeps back, so any single request's maximum wait is bounded by one sweep instead of being pushed back indefinitely by closer arrivals. ^card-58v1

```
// illustration only: SCAN sweeping outward then reversing
// head: 20 -> 45 -> 80 -> 95 (end) -> 60 -> 30 -> 10
```

Why might a disk report a write done before data reaches the platter? :: A disk with an on-board write-back cache can acknowledge a write as soon as it lands in that volatile buffer, trading a small window of vulnerability (power loss before the buffer flushes) for lower perceived write latency. ^card-noag

> [!card] mcq
> A workload issues many small requests to scattered locations, arriving continuously. Compared with pure SSTF, what does SCAN most directly improve?
> - [x] Bounded worst-case wait for far-away requests, since the sweep must eventually reach them
> - [ ] Total seek distance, which SCAN always makes smaller than SSTF
> - [ ] Rotational latency, which SCAN eliminates entirely
> - [ ] Transfer time per request, which SCAN halves on average ^card-wdue

> [!card] recall
> Explain why disk scheduling can change total service time even though
> the same requests eventually get serviced and the same data is read or
> written either way. ^card-mt3s
