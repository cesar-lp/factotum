---
topic: data-systems
category: data-processing
tags: [stream-processing, watermarks, late-data, allowed-lateness]
citations: ["Kleppmann, Designing Data-Intensive Applications, Ch. 11 (Stream Processing)"]
---

# Watermarks and Late Data

`windowing-strategies.md` cuts an unbounded stream into finite windows,
but left one question unanswered: when is a window actually done? Event
time gives no natural answer — a record timestamped inside a window
could still be in flight, delayed by exactly the causes
`event-time-versus-processing-time.md` lists. A watermark is the
mechanism that answers "done enough" anyway.

A watermark is the system's own assertion that event time has advanced
past some point *t* — a claim that no more events with timestamps before
*t* are still coming, which lets windows ending at or before *t* be
closed and emitted. Crucially, this is a ==heuristic==, not a fact: it is ^card-t4a6
a bet about how late data can arrive, made from evidence, but still a
bet.

> [!card] mcq
> What does a watermark at time t actually guarantee?
> - [x] Nothing with certainty — it is the pipeline's best estimate that no more events earlier than t will arrive, and that estimate can be wrong
> - [ ] That all events with timestamps earlier than t have definitely already arrived
> - [ ] That the pipeline's processing-time clock has reached t
> - [ ] That every downstream window has finished computing its aggregate ^card-hhpc

Because a watermark is a bet, a wrong one is a **correctness** problem,
not merely a performance one: if the watermark advances past *t* and a
window closes, but a genuinely valid event timestamped before *t* arrives
afterward, that event's contribution is lost unless the pipeline has an
explicit policy for handling it.

Being wrong about a watermark is a correctness problem rather than a performance problem :: because closing a window early on a bad watermark permanently drops a legitimate event's contribution to that window's result — it isn't merely slow, the computed answer is wrong, and no amount of extra processing time recovers the discarded event. ^card-lnpv

The trade watermarks sit on is direct and cannot be avoided by tuning
harder: an aggressive watermark (small assumed delay) gives low latency
— windows close quickly — at the cost of dropping more late data as
genuinely-delayed events keep missing the cutoff. A conservative
watermark (large assumed delay) captures more late data correctly but
holds open state longer and delays every result.

> [!card] recall
> A pipeline switches its watermark policy from "assume at most 30
> seconds of delay" to "assume at most 10 minutes of delay." Describe
> the two concrete costs and the one benefit of this change.
> ---
> Cost one: every window's result is delayed by up to 10 minutes instead
> of 30 seconds, since the pipeline must wait that much longer before it
> is willing to call a window closed. Cost two: the pipeline holds
> per-window state open for up to 10 minutes per window instead of 30
> seconds, multiplying memory and checkpoint size across all
> concurrently open windows. The benefit: events that arrive between 30
> seconds and 10 minutes late, which the old policy would have dropped
> or shunted to a correction path, are now included in the window's
> first, on-time result. ^card-wxkp

Watermarks are generated from the timestamps a source actually observes,
combined with an assumption about the maximum delay still to come — for
example, "watermark = latest observed event time minus 30 seconds."
Through a multi-stage pipeline, each operator computes its own
watermark, and an operator with several input streams sets its watermark
to the **minimum** across all of them, since it cannot safely claim
event time has advanced past a point that one of its inputs hasn't
reached yet.

An operator's watermark is the ==minimum== across all of its inputs, so ^card-tht8
a single idle or stalled source — one producing no events at all, not
even late ones — holds the watermark back indefinitely and stalls every
window downstream, even on partitions with plenty of fresh data. This is
a common production incident: a low-traffic partition goes quiet and the
whole job appears to hang.

For events that do arrive after the watermark has already passed their
timestamp, a pipeline picks one of three explicit policies: silently
discard the event, emit a **correction** (an updated result for a window
already emitted), or route the event to a **side output** for separate
handling.

The trap is that ==drop== is the default behavior in many systems when ^card-lm6m
no policy is configured at all, so late data disappears with no error
and no signal that anything was lost.

**Allowed lateness** is the explicit grace period a pipeline can
configure to hold a window's state open past the watermark specifically
to accept late events, trading the state cost of keeping it open for a
bounded chance to still get late data into the window's result before it
is finalized for good.

Why is "drop" being the silent default for late data, rather than an error or a warning, treated as a hazard worth documenting on its own? :: Because a pipeline that drops late events with no configured policy produces incomplete results without failing or logging anything unusual, so the data loss is invisible until someone notices numbers that don't reconcile with a source of truth — by which point the dropped events are already gone. ^card-ahah
