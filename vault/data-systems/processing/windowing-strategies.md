---
topic: data-systems
category: data-processing
tags: [stream-processing, windowing, tumbling, sliding, session-windows]
citations: ["Kleppmann, Designing Data-Intensive Applications, Ch. 11 (Stream Processing)"]
---

# Windowing Strategies

`event-time-versus-processing-time.md` established that event time is
the clock worth trusting, but it left open a practical question: an
aggregation like "average per minute" needs a *finite* slice of an
*infinite* stream to average over. A stream has no end, so "sum
everything so far" is the only aggregate you can compute without cutting
the stream into pieces first. A window is that cut.

**Tumbling windows** are fixed-length and non-overlapping — every event
belongs to exactly one window, and windows tile the timeline with no
gaps and no double-counting:

```
timeline:  ---e1--e2----e3--e4--e5---e6------->
windows:   [   W1   ][   W2   ][   W3   ]
```

This is the right default for periodic reporting — "orders per hour,"
"errors per five minutes" — where each event should count toward exactly
one bucket and buckets line up with a calendar.

**Sliding (hopping) windows** are also fixed-length, but they advance by
a step smaller than their length, so a window opens before the previous
one closes and a single event can fall inside several windows at once:

```
timeline:  ---e1--e2----e3--e4--e5---e6------->
window A:  [     WA     ]
window B:      [     WB     ]
window C:          [     WC     ]
```

This is the shape behind a moving average — "average of the last five
minutes, recomputed every minute" — and the overlap is the point, not a
side effect: it produces a smoother, more frequently updated signal than
tumbling windows can.

> [!card] mcq
> A dashboard needs a moving average that updates every minute, computed
> over the trailing ten minutes of data. Which window type fits?
> - [x] Sliding (hopping) windows, with a ten-minute length and a one-minute step
> - [ ] Tumbling windows, since they never overlap
> - [ ] Session windows, since they adapt to activity
> - [ ] No window is needed; a running total suffices ^card-y93c

**Session windows** are not fixed-length at all — a session groups
events by a gap timeout, so a window closes only once no new event has
arrived for some period, and its boundaries are decided by the data
itself rather than by the clock:

```
timeline:  --e1-e2-e3-------------e4-e5---------->
sessions:  [ session A ]         [ session B ]
                        ^-- gap exceeds timeout
```

This fits user-behavior analysis — "how long was this browsing session"
— where a fixed clock boundary would arbitrarily split one continuous
burst of activity into two unrelated pieces.

Session windows group events by activity rather than by a ==fixed== ^card-pita
clock boundary, which is what makes their window edges depend on the
data rather than being known in advance.

Why would a fixed five-minute tumbling window be a poor fit for measuring "how long a user was actively browsing"? :: A user's activity doesn't align to clock boundaries — a burst of clicks spanning 4:58 to 5:03 would be arbitrarily split across two tumbling windows even though it's one continuous session, undercounting the session's real length and fragmenting the behavior the analysis is trying to capture. ^card-kmwh

Whichever shape is chosen, an incoming record is assigned to a window
using its ==event== time, not the time the pipeline happens to process ^card-3kwd
it — otherwise the divergence between the two clocks would put a
record in the wrong window depending on processing delay, defeating the
whole reason for preferring that clock in the first place.

The three shapes are not free to choose without cost. Sliding windows
multiply the state a pipeline must hold per key roughly in proportion to
the overlap: a ten-minute window with a one-minute step keeps up to ten
overlapping windows' worth of partial state alive for every key at once,
compared to one for tumbling.

> [!card] recall
> Explain why a sliding window with a ten-minute length and a one-minute
> step requires roughly ten times the per-key state of a tumbling window
> of the same length, and why this state cost — not implementation
> difficulty — is usually the deciding factor against sliding windows at
> high cardinality.
> ---
> Because each incoming event falls into every window currently open
> that it overlaps, and with a ten-minute length and one-minute step
> there are up to ten such windows open simultaneously. The event (and
> its contribution to the aggregate) must be tracked in all of them until
> each closes, so the pipeline holds roughly ten partial aggregates per
> key instead of one. At high cardinality (many distinct keys), this
> state multiplies directly with the number of keys, so it is memory
> and checkpoint size — not computational complexity — that makes
> sliding windows expensive to run at scale. ^card-qtzz

Session windows introduce a subtler wrinkle: because their boundaries
depend on data that hasn't fully arrived yet, a late event can bridge
what looked like two separate sessions into one, forcing the pipeline to
**merge** two windows it had already provisionally opened — a case
tumbling and sliding windows, with their fixed boundaries, never have to
handle.

A late-arriving event can force two provisionally separate session windows to be ==merged== into one, because the gap between them turns out, once that event is accounted for, to be shorter than the timeout. ^card-85eh
