---
category: os-virtualization
tags: [scheduling, fifo, sjf, stcf, round-robin, turnaround-time, response-time]
citations: ["Arpaci-Dusseau, OSTEP, Ch. 7 (Scheduling: Introduction)"]
---

# Scheduling Basics

Once a process is ready to run, the scheduler decides which ready process
gets the CPU next. Two metrics capture most of what we care about, and
they pull in opposite directions. Turnaround time is completion time
minus arrival time — how long a job took from the user's point of view.
Response time is the time from arrival until the job first gets the CPU
— how long a user waits before seeing anything happen at all.

Why can a scheduler that is excellent for turnaround time be terrible for response time? :: Optimizing turnaround favors running whichever job finishes soonest to completion without interruption, but that can force an interactive job to wait behind a long job's entire run before it is ever touched, producing a long response time even though total turnaround looks good on average. ^card-yk72

FIFO (first-in-first-out) runs jobs in arrival order to completion. It is
simple but suffers from the convoy effect: a short job stuck behind one
long job waits far longer than its own runtime would suggest, dragging
down average turnaround time.

What is the "convoy effect" in FIFO scheduling? :: A short, quick job gets queued behind a long-running job that arrived slightly earlier, so many short jobs collectively wait on one long one, inflating average turnaround time well beyond what the jobs' own lengths would justify. ^card-n52o

Shortest Job First (SJF) fixes the convoy effect by always running the
shortest available job next, which is provably optimal for average
turnaround time among non-preemptive policies — but only if all jobs
arrive at time zero. If a short job arrives while a long job is already
running, SJF cannot preempt, so the convoy effect can reappear.

Shortest Time-to-Completion First (STCF) is SJF's preemptive twin: it
adds the ability to preempt the running job whenever a newly-arrived job
has less remaining time than what is currently running. This closes
SJF's late-arrival gap.

STCF optimizes for turnaround time but is bad for ==response time== under ^card-terk
a mix of short and long jobs, because a long job that is not yet
finished can still be picked over a job that has been waiting a while,
if a still-shorter job keeps arriving.

Round Robin (RR) takes the opposite priority: it runs each ready job for
a fixed time slice, then moves to the next, cycling through repeatedly.
This gives excellent response time — a job never waits longer than
(time slice × number of other ready jobs) to get its first turn — at the
cost of turnaround time, since jobs are done piecemeal rather than
back-to-back.

Why does an overly short RR time slice hurt performance despite better response time? :: A very short time slice means the fixed cost of a context switch (saving and restoring register state, flushing caches/TLB entries) happens far more often relative to useful work done, so switching overhead starts to dominate and total throughput drops. ^card-wfas

> [!card] mcq
> Jobs A (100ms), B (10ms), C (10ms) all arrive at time 0 and run under FIFO in that order. Which policy would give B and C the best average turnaround time here?
> - [ ] FIFO, unchanged
> - [x] SJF, running B and C before A
> - [ ] Round robin with a 50ms time slice
> - [ ] Running A first always minimizes turnaround for all three ^card-ihhj

> [!card] recall
> Explain why no single scheduling policy can simultaneously minimize
> average turnaround time and minimize average response time for a mixed
> workload of long and short jobs — what is the fundamental tension? ^card-6wdi
