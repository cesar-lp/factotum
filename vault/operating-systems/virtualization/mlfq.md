---
topic: operating-systems
category: os-virtualization
tags: [scheduling, mlfq, multi-level-feedback-queue]
citations: ["Arpaci-Dusseau, OSTEP, Ch. 8 (Multi-Level Feedback Queue)"]
---

# Multi-Level Feedback Queue (MLFQ)

MLFQ tries to get SJF/STCF-like turnaround time and RR-like response
time at once, without knowing in advance how long a job will run — it
learns a job's nature from how it behaves and adjusts priority
accordingly. It keeps several queues, each with its own priority level,
and a job always sits on exactly one queue.

The base rules: a higher-priority queue always runs before a lower one,
and jobs on the same queue share the CPU in round robin. To decide how
priority changes over time, MLFQ tracks a job's ==allotment==: the amount ^card-sf97
of CPU time it may use at its current priority level before being
demoted one queue.

Why does a job entering the system start at the highest-priority queue rather than the lowest? :: The scheduler has no information yet about whether the job is short and interactive or long and CPU-bound, so it optimistically assumes short/interactive first; a truly short job finishes quickly from there, while a long job reveals itself by using up its allotment and sinking down. ^card-vuab

A naive version demotes a job only when it uses its full allotment in
one uninterrupted burst, and resets its allotment whenever it gives up
the CPU early (e.g. for I/O). That naive version is exploitable.

How can a process game a naive MLFQ that resets allotment on voluntary yield? :: The process can issue a near-instant I/O request just before its allotment runs out, over and over, so it never gets demoted despite consuming nearly all of the CPU's time — it "relinquishes" just often enough to stay parked at the top queue. ^card-o4yf

The fix is better accounting: MLFQ tracks total CPU time consumed at the
current level across ALL the bursts a job has had there, however many
times it yielded and came back, and demotes it once that running total
hits the allotment — not just on one long uninterrupted burst.

Even with gaming fixed, a purely one-directional demotion scheme starves
long-running jobs once enough interactive jobs are in the system,
because the CPU-bound job keeps sinking to the bottom queue and never
gets picked again while short jobs keep arriving at the top.

What mechanism keeps a long-running, low-priority MLFQ job from starving? :: A periodic priority boost: after a fixed time period S, every job in the system — regardless of current queue — is moved back to the topmost queue, giving starved long-running jobs a fresh chance to run again. ^card-6jpq

```
# Rules, for reference/illustration only (not to be memorized verbatim):
# 1. Priority(A) > Priority(B) => A runs
# 2. Priority(A) == Priority(B) => round robin
# 3. New job enters at the highest priority
# 4. Once a job's allotment at a level is used up (however many bursts
#    it took), demote it one queue
# 5. After time period S, boost every job back to the top queue
```

> [!card] mcq
> The priority-boost interval S is set far too long for the workload. What is the most likely symptom?
> - [x] Long-running jobs starve for extended stretches before being boosted
> - [ ] Short jobs never get to run at all
> - [ ] The scheduler degenerates into pure FIFO immediately
> - [ ] Context-switch overhead disappears entirely ^card-46fc

Choosing S itself is famously hard: John Ousterhout called such
hard-to-tune constants "voodoo constants" — set S too high and
long-running jobs starve between boosts; set it too low and the system
wastes time re-learning which jobs are actually interactive, hurting
throughput for CPU-bound work.

> [!card] recall
> Explain why MLFQ counts as "learning from history to predict the
> future," and describe one way that strategy can backfire if a job's
> behavior changes partway through its life. ^card-ch7q
