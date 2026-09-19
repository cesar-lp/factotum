---
category: os-virtualization
tags: [scheduling, lottery-scheduling, stride-scheduling, cfs, proportional-share]
citations: ["Arpaci-Dusseau, OSTEP, Ch. 9 (Scheduling: Proportional Share)"]
---

# Proportional-Share Scheduling

Proportional-share (fair-share) schedulers give up on optimizing
turnaround or response time directly, and instead guarantee each job a
specified *share* of the CPU over time — job A should get, say, twice as
much CPU as job B, rather than being ranked by length or arrival order.

Lottery scheduling implements this with randomness. Each job holds some
number of ==tickets==, and on every scheduling decision the scheduler ^card-178l
draws a random winning ticket and runs whichever job holds it — a job
with twice the tickets of another wins (and thus runs) about twice as
often, in expectation, over many draws.

Why is lottery scheduling only probabilistically fair over short intervals? :: Because the winner is chosen by drawing a random ticket each time, short runs can deviate from the target ratio purely by chance (e.g., a low-ticket job could win several draws in a row); the guarantee only holds as a long-run average, by the law of large numbers. ^card-adbt

Two mechanisms make lottery scheduling flexible: ticket currency lets a
group of processes divide up a parent's tickets in units local to that
group (an easy way to subdivide a fair share among related jobs), and
ticket transfer lets one process temporarily hand its tickets to
another — useful when a client is blocked waiting on a server, so the
client can boost the server's share until the server replies.

Stride scheduling replaces randomness with a deterministic pass-based
counter aimed at the same proportional goal. Each job gets a stride
inversely proportional to its ticket count (a job with more tickets has
a smaller stride), and a running pass value that increases by the job's
stride every time it is scheduled.

Which job does stride scheduling pick to run next? :: The scheduler always picks whichever runnable job currently has the lowest accumulated pass value, then adds that job's stride to its pass value — since a high-ticket job's stride is small, its pass value climbs slowly, so it gets picked more often. ^card-d6ti

Stride scheduling achieves the same long-run proportions as lottery
scheduling but with much less variance in the short term, at the cost of
extra bookkeeping: every job's pass value must be tracked, and a new job
joining partway through needs a pass value chosen carefully (too low and
it monopolizes the CPU until its pass catches up).

Linux's CFS (Completely Fair Scheduler) takes a related but distinct
approach: instead of tickets, it tracks each runnable process's
==vruntime==, virtual runtime, which increases as the process consumes ^card-kae7
CPU time, and always runs whichever runnable process currently has the
lowest vruntime — approximating an ideal where every process's vruntime
advances at the same rate.

How does CFS use "nice" values to give some processes a larger share of the CPU than others? :: A process's nice value sets a weight that scales how fast its vruntime accumulates per unit of real CPU time — a higher-priority (lower nice) process's vruntime grows more slowly for the same work, so it appears to have run "less" and gets picked again sooner. ^card-o1j1

CFS keeps runnable processes in a red-black tree ordered by vruntime, so
finding "who has run the least" is an efficient tree lookup rather than
a scan — a detail that matters at the scale of a general-purpose kernel
juggling hundreds of runnable tasks.

> [!card] mcq
> Two jobs run under lottery scheduling: A has 100 tickets, B has 300 tickets (400 total). What is B's expected long-run share of the CPU?
> - [ ] 25%
> - [ ] 50%
> - [x] 75%
> - [ ] 100%, since it holds the most tickets ^card-577n

> [!card] recall
> Explain why stride scheduling can reproduce lottery scheduling's target
> ratios with far less short-term variance, given that both are driven by
> the same underlying ticket counts. ^card-eap6
