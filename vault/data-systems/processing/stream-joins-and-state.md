---
topic: data-systems
category: data-processing
tags: [stream-processing, joins, state, windowed-join, slowly-changing-dimension]
citations: ["Kleppmann, Designing Data-Intensive Applications, Ch. 11 (Stream Processing)"]
---

# Stream Joins and State

`joins-in-distributed-batch-processing.md` covers joins where both sides
of the join already exist in full before the query runs. A stream join
cannot make that assumption: the matching record on the other side may
not have arrived yet, or may never arrive. That single difference is why
stream joins need machinery batch joins never do.

A batch join can scan both complete inputs and match them once. A stream
join has to **remember** one side of the join while it waits for the
other, because a record that arrives now might match a record that
arrives an hour from now — and memory to hold that wait is finite, so
"remember everything forever" is not a real option.

Why does a stream join need to hold state at all, when the equivalent batch join over the same two tables does not? :: Because in a stream, the two matching records don't necessarily arrive at the same time or even close together — one side has to be buffered somewhere while the join waits for its counterpart to show up, whereas a batch join runs only once both complete datasets already exist and can be scanned together immediately. ^card-1qry

Three shapes of stream join each bound that state differently.
**Stream-stream** joins buffer both sides, but only within a window — an
order stream joined to a payment-confirmation stream, matching within,
say, 15 minutes of each other. **Stream-table** joins enrich each
incoming stream record against a materialized, continuously-updating
table — for instance, joining click events to a table of current user
profiles. **Table-table** joins treat both inputs as changelogs of an
updating table and maintain a materialized result that is kept current
as either side changes, rather than matching individual passing events.

What makes a table-table join different in kind from a stream-stream join, rather than just a variant of it? :: A stream-stream join matches individual passing records against each other within a window, whereas a table-table join treats both sides as changelogs of continuously updating tables and maintains one materialized result reflecting the current state of both — there's no window bounding "how far apart" two matching records can be, because both inputs are understood as full, evolving tables rather than streams of discrete events to pair up. ^card-949g

> [!card] mcq
> Why does a stream-stream join require a window, when a stream-table
> join does not?
> - [x] Both sides of a stream-stream join are unbounded and have to be buffered while waiting for a match, so a window is the only thing that bounds how much of each side must be held; a stream-table join only buffers the table side, which is bounded by definition
> - [ ] Windows are required by the join syntax regardless of the data shapes involved
> - [ ] Stream-table joins do not need any state at all
> - [ ] Stream-stream joins are always faster to compute than stream-table joins ^card-tqns

The window in a stream-stream join is a direct dial, not just a
correctness knob: a wider window catches more genuine matches (higher
match rate) but holds more buffered state per key for longer, while a
narrower window sheds state faster but misses matches whose two sides
happen to arrive further apart than the window allows.

The size of a stream-stream join's window trades off match rate against ==state== size, since a wider window keeps more unmatched records from both sides alive for longer in the hope a partner still arrives. ^card-28sn

Stream-table joins hide a subtler problem than the buffering
stream-stream joins need: enriching an event with the table's *current*
state gives a different answer than enriching it with the table's state
*as of the event's own timestamp*, because the table keeps changing
after the event occurred. A user's address on file today is not
necessarily the address that was on file when an old order event was
generated, and joining against "current" state silently rewrites
history.

> [!card] recall
> A stream-table join enriches historical order events with a customer
> table that is now on version 5, though most of those orders happened
> when the table was on version 2 or 3. Explain why simply replaying the
> order stream through this join a second time can produce different
> enriched results than the first run did, and name the general problem
> this is an instance of.
> ---
> The join always reads whatever the table's current state is at the
> moment each event is processed, not the state that existed when the
> event actually occurred. Replaying the stream later means the table
> has moved on further still, so an order event gets enriched with
> different customer data on the second run than it got on the first —
> the join result depends on when it was computed, not just on what was
> being joined. This is the slowly-changing-dimension problem: without
> versioning the table so it can be queried "as of" a given time, a
> stream-table join cannot be replayed deterministically. ^card-asl2

To make stream-table joins reproducible under replay, the table has to
be **versioned** so the join can look up its state as of the event's
timestamp rather than its current row — the same idea batch systems know
as a slowly-changing dimension, applied under the added pressure of a
continuously moving stream.

For co-partitioning the two sides of a join onto the same node by join
key — which avoids network shuffling for the match itself — see
`../partitioning.md`.

State stores backing these joins grow without bound if left alone, since
every buffered record and every table row is retained until something
removes it. The only thing that keeps this bounded in practice is a
==TTL== (or equivalent retention policy) that expires state older than ^card-adlu
some threshold, accepting that a match arriving after expiry is simply
missed.

A join's state store needs a retention policy, not just enough disk to hold everything :: because state grows unboundedly as long as records are buffered waiting for a match or a table keeps accumulating history, and without an explicit TTL or retention rule the store eventually exceeds available memory or disk regardless of how the join itself is tuned. ^card-2b6n
