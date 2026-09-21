---
topic: data-systems
category: data-processing
tags: [batch, streaming, latency, lambda-architecture, kappa-architecture]
citations: ["Kleppmann, Designing Data-Intensive Applications, Ch. 10 (Batch Processing)"]
---

# Batch versus stream processing

Every other note in this category is really an answer to one question:
when is the answer complete? Batch and stream processing are the two
possible answers, and almost every hard problem that follows — windowing,
watermarks, exactly-once — exists because "unbounded" makes that question
unanswerable in the way "bounded" makes it trivial.

A **batch** job runs over a ==bounded== dataset: one with a known size and ^card-lwiy
a defined end, read in full before the job produces output. Because the
input is finite, the output is a pure function of it — running the same
job again over the same input produces the same result, which is what
makes batch jobs re-runnable and testable in a way few other kinds of
distributed computation are.

A **stream** processes an unbounded dataset — events keep arriving, there
is no defined end, and so there is no moment at which "the total" or "the
answer" is final in the way a batch job's output is. A stream processor
instead maintains a continuously-updated answer that is always provisional.

> [!card] mcq
> A dataset is described as "unbounded." What does that actually imply
> for a processing job over it?
> - [x] There is no defined end to the input, so no point in time at which the job's output can be called final rather than provisional
> - [ ] The dataset is too large to fit on one machine
> - [ ] The dataset's schema is not known in advance
> - [ ] The job cannot be distributed across multiple nodes ^card-ef1y

What follows from boundedness is not just a definition but a cluster of
practical properties. A batch job can sort its entire input, because all
of it is present at once; a stream processor generally cannot, because
sorting requires knowing that nothing earlier will still arrive. A batch
job's failure recovery is "run it again," since the input hasn't gone
anywhere; a stream, having no fixed input to rewind to in the same sense,
must instead carry forward whatever state it needs to resume correctly —
covered in `checkpointing-state-and-recovery.md` rather than here.

Why is "just run it again" a viable recovery strategy for a failed batch job in a way it is not, without more work, for a failed stream job? :: A batch job's input is a bounded, already-materialized dataset that isn't going anywhere, so re-running the job from scratch reproduces the same output deterministically. A stream has no such fixed input to rewind to — the events that already passed through are gone unless the system deliberately retained them or checkpointed intermediate state, so recovery has to be designed in rather than falling out for free. ^card-pz36

Latency is the difference people notice first: a batch job is typically
scheduled to run over data collected during the previous hour or day and
produces results ==minutes to hours== later, while a stream job processes ^card-uzb6
each event within milliseconds to seconds of its arrival. But latency is
a *consequence* of boundedness, not the defining difference — a batch job
run every few seconds over a tiny bounded window is still batch processing
by the definition above, just a fast one.

That observation is also the seam where the two converge: a stream can be
seen as a sequence of very small batches, and conversely a batch job is
just a stream processor operating on a window so large it happens to have
already closed. Treating batch as a special case of streaming over a
closed, bounded window unifies the two rather than treating them as
unrelated technologies.

Why does describing batch processing as "streaming over a window so large it has already closed" count as unifying the two models rather than just a loose analogy? :: Because a stream's windowed aggregate and a batch job's output are the same operation — compute a function over the events that fall in some span of time — differing only in whether that span is still open (stream) or has already ended (batch). Treating batch as the closed-window special case means one model explains both, instead of treating batch and stream as separate technologies that happen to solve similar problems. ^card-s0f4

Historically, systems that needed both a low-latency approximate view and
a slower, exact one ran two separate pipelines side by side — a stream
job for speed and a batch job that periodically recomputed the correct
answer and overwrote the stream's results. This pairing is known as the
**Lambda architecture**, and its well-known cost is maintaining the same
business logic twice, in two different frameworks, and reconciling them
when they disagree. The **Kappa architecture** answers this by treating
everything as a stream, including "batch" recomputation, which is done by
replaying historical events through the same stream pipeline rather than
running a separate system.

> [!card] recall
> Explain what problem the Lambda architecture's two parallel pipelines
> (batch and stream) were solving, and what specific maintenance cost the
> Kappa architecture eliminates by replaying history through a single
> stream pipeline instead.
> ---
> Lambda existed because early stream processors could only give fast,
> approximate results, while only a batch recomputation over the full
> bounded dataset was trusted as correct — so a system ran both and let
> the batch layer periodically overwrite the stream layer's output. The
> cost was implementing and keeping in sync two versions of the same
> business logic in two different frameworks. Kappa eliminates that
> duplication by making the stream pipeline the only pipeline: a full
> recomputation is just replaying retained history through it again,
> so there is exactly one codebase to maintain and reconcile against. ^card-nudo

The organizing question — when is the answer complete? — reappears
directly as soon as a stream job tries to compute anything aggregate,
like a count or a sum. A batch job's "complete" is unambiguous: all input
has been read. A stream has no such moment, so any aggregate must instead
declare, for some cutoff, that everything relevant to it has probably
arrived. Deciding what "probably" means, and what to do when it's wrong,
is the entire subject of `windowing-strategies.md` and
`watermarks-and-late-data.md`.

> [!card] mcq
> Why can a batch job sort its entire input before processing, while a
> general stream processor cannot sort its input the same way?
> - [x] Sorting requires knowing no more input will arrive; a batch job's input is bounded and fully present, while a stream's is unbounded and open-ended
> - [ ] Sorting algorithms only work on data smaller than memory, and streams are always larger than memory
> - [ ] Stream processors lack CPU capacity for comparison-based sorting
> - [ ] Batch frameworks use a different, faster sorting algorithm than stream frameworks ^card-c9st

A job's determinism depends on the same distinction. Because a batch
job's function is (input -> output) over a fixed, bounded input, the same
job can be re-run and audited, or fixed and re-run, with a guarantee that
the new output reflects exactly the corrected logic applied to exactly
the same data — a property `mapreduce-and-the-shuffle.md` relies on
directly when it explains why failed tasks can simply be retried.

Why does re-running a fixed batch job over unchanged input serve as a trustworthy way to check or correct earlier results, while re-running a "fixed" streaming job usually does not reproduce a comparable guarantee? :: A batch job's output is a pure function of a bounded, unchanging input, so re-running it with corrected logic against the exact same dataset isolates the effect of the fix. A streaming job's input is unbounded and was consumed incrementally over real time; unless every event was durably retained and replayed in the same order with the same timing, "re-running" it does not see the same input the first run saw, so the comparison is no longer apples to apples. ^card-936m
