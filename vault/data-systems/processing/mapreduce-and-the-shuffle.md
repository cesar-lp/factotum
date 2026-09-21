---
topic: data-systems
category: data-processing
tags: [mapreduce, shuffle, combiners, fault-tolerance, determinism]
citations: ["Kleppmann, Designing Data-Intensive Applications, Ch. 10 (Batch Processing)"]
---

# MapReduce and the shuffle

`batch-versus-stream-processing.md` establishes batch as a function over a
bounded input. MapReduce is the model that made writing that function at
distributed scale tractable for ordinary programmers, and understanding it
means understanding that the two functions it asks you to write are the
easy part — the framework's real work happens between them.

The model has two user-supplied functions. **Map** takes each input
record and emits zero or more key-value pairs. The framework then groups
every emitted pair by key, bringing all values for a given key together
regardless of which map task produced them. **Reduce** takes one key and
its full collection of values and produces the aggregated output for that
key.

> [!card] mcq
> In the MapReduce model, what is the reduce function actually called on?
> - [x] One key and the complete collection of every value emitted for that key across all map tasks
> - [ ] A single key-value pair at a time, in the order map emitted it
> - [ ] The entire raw input dataset, once per key
> - [ ] A single partition of the input, before any grouping happens ^card-et67

The bargain that made this influential: the programmer writes two ==pure== functions with no ^card-hu13
awareness of machines, network, or failure, and the framework owns every
distributed-systems concern — splitting the input, scheduling tasks
across nodes, retrying failures, and grouping by key. Map and reduce
themselves are the part any competent programmer can write in an
afternoon.

The part between them is not. The **shuffle** is the phase that sorts
each map task's output by key and transfers it across the network so
that every value for a given key ends up at the same reducer. This is
where MapReduce actually spends its time and bandwidth: map and reduce
are local computation on data already in hand, but the shuffle is an
all-to-many network transfer of the entire intermediate dataset, and no
algorithmic cleverness in the user's code changes how much data has to
cross the network to get grouped correctly.

> [!card] mcq
> Why does the shuffle phase dominate the running time of a typical
> MapReduce job, more than the map or reduce logic itself does?
> - [x] It has to move the entire intermediate output across the network so all values for each key land on one reducer, an I/O cost independent of how simple the map/reduce code is
> - [ ] The sort algorithm used during shuffle is asymptotically slower than the map or reduce functions
> - [ ] Reducers are always run on slower hardware than mappers
> - [ ] The shuffle re-executes the map function a second time on every record ^card-zgdh

MapReduce also writes intermediate output — both the map output going into
the shuffle and often the reduce output — to ==disk== rather than keeping ^card-2yzd
it resident in memory between stages. That materialization is precisely
why the model tolerates failure so gracefully: if a task dies partway
through, the framework re-runs just that task from its already-durable
inputs rather than restarting the whole job. It is also precisely why
MapReduce is slow relative to later engines that keep intermediate data
in memory across stages and pay that cost only when memory runs out.

> [!card] recall
> Explain the tradeoff MapReduce makes by materializing intermediate
> output to disk between the map and reduce phases: name the specific
> failure-recovery benefit this buys, and the specific performance cost.
> ---
> Writing intermediate state to disk means a failed task can be re-run
> from its own durable inputs instead of forcing the whole job to restart,
> which is what makes MapReduce robust to individual node failures at
> scale. The cost is that every stage boundary pays a disk write and a
> disk read that an in-memory engine would avoid, which is the main
> reason MapReduce is slower than engines that pipeline data through
> memory across stages. ^card-r3ke

That same failure-recovery story depends on an assumption about the
functions themselves: map and reduce must be ==deterministic== and free ^card-dl9t
of side effects. If a task can be silently re-run — because it failed, or
because the framework speculatively started a duplicate to fight a slow
node — then a function whose output can vary from run to run, or that has
a side effect, could produce two different results for the same input, or
apply an effect (like a write to an external system) twice. The whole
retry-and-speculate machinery is only safe because the contract
guarantees re-running a task is indistinguishable from running it once.

Speculative re-execution of slow tasks, and why it too depends on this
same determinism guarantee, is covered in `skew-and-stragglers.md`.

> [!card] mcq
> A map task writes directly to an external database as a side effect,
> and the framework speculatively re-executes it on a second node to
> beat a straggler. What goes wrong?
> - [x] The external write can happen twice, since MapReduce's retry and speculation model assumes re-running a task is harmless and produces identical output, which only holds for pure, side-effect-free functions
> - [ ] Nothing — MapReduce automatically deduplicates external side effects
> - [ ] The job fails immediately at the scheduler level before either copy runs
> - [ ] The speculative copy is guaranteed to run before the original, so only one write occurs ^card-ze93

**Combiners** are an optional optimization: a combiner runs the reduce
logic early, on the map side, aggregating values that share a key before
they ever cross the network into the shuffle — cutting the volume the
shuffle has to move. This is only correct when the reduce operation is
==associative and commutative==, so partial aggregation followed by final ^card-nx7z
aggregation gives the same answer as aggregating everything at once; a
combiner cannot be used, for example, to compute a median.

Why must a combiner's operation be associative and commutative, and what breaks if it isn't? :: Associativity and commutativity guarantee that aggregating in stages — some values locally on the map side, the partial results later at the reducer — gives the same answer as aggregating all values together in one pass. If the operation lacks that property (a median is the standard counterexample), pre-aggregating partial groups on the map side changes the result, so a combiner would silently produce a wrong answer rather than just an inefficient one. ^card-f4mk
