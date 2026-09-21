---
topic: data-systems
category: data-processing
tags: [skew, stragglers, speculative-execution, salting, hot-keys]
citations: ["Kleppmann, Designing Data-Intensive Applications, Ch. 10 (Batch Processing)"]
---

# Skew and stragglers

`mapreduce-and-the-shuffle.md` and `joins-in-distributed-batch-processing.md`
both describe how work gets distributed by key. This note covers what
happens once it is already running.

A batch job doesn't finish when most of its tasks finish. It finishes
when its ==slowest== task finishes, and that one fact is behind most of ^card-xuaf
what makes operating batch jobs at scale unpleasant.

> [!card] mcq
> A job splits work across 1,000 tasks. 999 finish in two minutes; one
> takes six hours. How long does the job take?
> - [x] Six hours — a batch job's completion time is set by its slowest task, regardless of how fast the rest finished
> - [ ] Roughly two minutes, since the framework can return partial results
> - [ ] Six hours divided by 1,000, since the framework load-balances after the fact
> - [ ] The job fails, because one task ran far longer than the others ^card-cjwv

**Skew** is one cause of that slow task: work grouped by key is only as
balanced as the key distribution, and real-world key distributions are
essentially never uniform — a handful of keys (a celebrity account, a
popular product) can account for a wildly disproportionate share of
records. Whichever task ends up handling that key sees far more input
than its peers and takes far longer, even though every task was assigned,
in principle, "one key's worth of work."

Why is skew intrinsic to grouping-by-key, rather than a bug the framework could simply fix on its own? :: Grouping by key requires that every record for a given key end up on the same task, since that's what makes aggregation over the key correct. If one key's records vastly outnumber another's, the framework cannot split that key's group across multiple tasks without breaking the grouping guarantee itself — so an uneven key distribution mechanically becomes an uneven task runtime, and fixing it requires changing how the job handles that specific key, not a scheduling trick. ^card-bjjo

Mitigating skew means changing how the skewed key is handled, since the
framework can't split a single key's group on its own. **Salting**
appends a random suffix to a hot key, spreading its records across
several sub-keys and therefore several tasks, and then runs a second pass
that combines the partial results back into one answer for the original
key — trading an extra aggregation stage for parallelism on the key that
needed it. A more direct fix is splitting the skewed key out ==explicitly== ^card-yf69
— handling it as its own special case with dedicated capacity — when the
hot keys are known in advance.

Map-side combining also helps, indirectly, by shrinking the volume that
has to move through the shuffle before it ever reaches the skewed
reducer; `mapreduce-and-the-shuffle.md` covers combiners in full.

> [!card] mcq
> A batch job aggregates by user ID, and one celebrity account's ID
> accounts for 40% of all records. What does salting that key accomplish?
> - [x] It spreads the celebrity key's records across several random sub-keys and tasks, then combines the partial results in a second pass, trading an extra aggregation stage for parallelism on that key
> - [ ] It permanently deletes the excess records for that key to keep the dataset balanced
> - [ ] It moves the celebrity key's records onto a single, faster machine
> - [ ] It changes the hash function used for every other key in the job ^card-huqi

A skewed key is not the only reason a task runs long. A **straggler** is
a task that is slow for reasons that have nothing to do with how much
work it was given — degraded hardware, resource contention with another
process on the same node, a flaky network link. The fix here is
**speculative execution**: the framework starts a redundant copy of a
suspiciously slow task on a different node and takes whichever copy
finishes first, discarding the other.

Speculative execution is only a valid strategy for tasks that are
deterministic and free of side effects — the same requirement
`mapreduce-and-the-shuffle.md` covers for retries in general, because
speculation is really just a retry issued preemptively rather than after
a failure. If a task writes to an external system as a side effect,
running two copies means that write can happen twice.

> [!card] recall
> Explain why speculative execution — proactively running a duplicate of
> a slow task on another node — relies on exactly the same property of
> map and reduce functions that makes ordinary failure-retry safe.
> ---
> Both speculative execution and failure-retry work by potentially
> running the same task more than once and treating any one successful
> run as equivalent to any other. That's only true if the task is
> deterministic and has no side effects — otherwise two runs of the
> "same" task could produce different outputs, or apply an external
> effect twice, and the framework has no way to detect or prevent that.
> Speculation is best understood as a retry issued preemptively, on
> suspicion of slowness, rather than after an observed failure. ^card-ctlg

The practical skill is telling these two failure modes apart before
reaching for a fix, because they call for opposite treatment: salting a
key does nothing for a bad node, and replacing a node does nothing for a
genuine hot key. The diagnostic is how much ==input== each task actually processed. ^card-vxpd

Skew shows up as a task with far more to process than its peers, running
proportionally long; a straggler shows up as a task handed an ordinary,
unremarkable share of the work that still takes far longer than peers
given the same share.

> [!card] mcq
> Two tasks in the same job are both taking far longer than the rest.
> Task A processed 50x more input than a typical task; task B processed a
> completely ordinary amount of input but is still running slowly. How
> should each be diagnosed?
> - [x] Task A is data skew — its oversized input explains the slowness; task B is a straggler — its ordinary input means the slowness must come from the node or environment, not the data
> - [ ] Both are stragglers, since speculative execution handles any task that runs long regardless of cause
> - [ ] Both are data skew, since any slow task implies an oversized key
> - [ ] Task A is a straggler and task B is data skew — the pattern is reversed from how it looks ^card-k9t5
