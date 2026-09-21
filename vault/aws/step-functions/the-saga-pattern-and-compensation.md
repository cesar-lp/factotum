---
topic: aws
category: aws-step-functions
tags: [step-functions, saga-pattern, compensation, distributed-transactions, orchestration]
citations: ["AWS Step Functions Developer Guide — 'Saga pattern with Step Functions'"]
---

# The Saga Pattern and Compensation

The error-handling note in this category covers retrying and catching a
single state's failure; this one covers a harder problem — a workflow
that has already succeeded at several steps across several services when
a later step fails, with no way to roll all of them back atomically.

A single-database transaction can undo everything with one `ROLLBACK`
because a single engine holds a lock on all the affected rows until it
decides to commit. Once a workflow's steps are calls to separate services
— book a flight, reserve a hotel, charge a card — there is no two-phase
commit spanning all of them in practice, and the workable substitute is
the **saga**: a sequence of local transactions, each service committing
its own step independently, paired with a **compensating transaction**
that semantically undoes that step if a later one fails.

The distinction that matters is that a compensation is not a ==rollback==; ^card-4h6c
it is a separate, forward-moving operation with its own effects.

You cannot un-send a confirmation email or un-charge a card the way a
database rolls back an uncommitted write — the email was already
delivered, the charge already settled. What you can do is send a
correction email or issue a refund, which are business operations in
their own right, with their own preconditions and their own ways of
failing, not free reversals the platform provides for you.

> [!card] mcq
> Why is "compensating transaction" a more accurate term than "rollback" for undoing a completed step in a saga?
> - [x] The step already committed in another service, so undoing it requires a new, separately-executed operation (like a refund) rather than discarding an uncommitted change
> - [ ] They're the same operation; "compensating transaction" is just the distributed-systems name for a rollback
> - [ ] A compensating transaction is faster than a rollback because it skips validation
> - [ ] Rollback only applies to NoSQL databases, so a different term is needed for relational ones ^card-yn7j

In Step Functions, the saga is expressed directly in the state machine:
each forward step's own `Catch` doesn't just go to a generic error
handler, it routes to that step's specific compensation, chained so that
the compensations for every step already completed run in ==reverse== ^card-n7b4
order relative to the order the forward steps committed.

Unwinding in reverse order matters because later steps may have depended
on the state earlier steps established — a refund and a cancellation are
straightforward to reason about only if you undo the most recent
commitment first and work backward, mirroring how the forward steps built
on each other.

Why is a state machine a natural fit for coordinating a saga's compensations, compared to a chain of independent queue consumers each reacting to the step before it? :: A saga's compensation logic needs a single place that knows exactly which steps have already committed so it knows which compensations to run and in what order if something later fails; a state machine's execution state is exactly that record, tracked automatically as it progresses, whereas a chain of independent queue consumers has no shared place remembering "how far did we get" unless something is built specifically to track it. ^card-r5kz

> [!card] recall
> A saga has three forward steps — reserve inventory, charge payment, ship order — each with its own compensation (release inventory, refund payment, cancel shipment). The "ship order" step fails after the first two steps already succeeded. Describe what actually runs, in what order, and why running them in the opposite order would be wrong.
> ---
> Because reserve-inventory and charge-payment already committed, their compensations must run: refund-payment first, then release-inventory — the reverse of the order the forward steps completed in. Running them in forward order instead (release-inventory then refund-payment) would work here since they're independent, but in general the later forward step may depend on the earlier one's effect still being in place while it compensates (e.g. a compensation that needs to look up a reservation record before releasing it), so undoing the most recently completed step first is the safe default, not merely a stylistic choice. ^card-kgfz

The pattern is honest about its hard parts rather than hiding them. A
compensation can itself fail — a refund API can be down — and needs its
own retry policy exactly like a forward step does, which means a saga's
compensation chain is not a guaranteed safety net so much as another
piece of fallible logic that has to be engineered with the same care as
the happy path.

A saga is also not ==atomic==: unlike a database transaction, other ^card-qd72
readers can observe the system in an intermediate state — inventory
reserved but payment not yet charged — while the saga is still in
progress, because each local transaction commits and becomes visible on
its own.

`../../data-systems/transactions.md` covers what atomicity and isolation
mean for a single database transaction; a saga deliberately trades that
guarantee away in exchange for being able to span services that can't
share a transaction at all.

Every step and every compensation in a saga also has to be idempotent,
for the same reason any retried operation does — a saga step or its
compensation can be retried after an ambiguous outcome, and the general
mechanics of that are covered in
`../messaging/idempotency-and-exactly-once.md` rather than repeated here.

What must be true of both a saga's forward steps and its compensations, given that either can be retried after an ambiguous failure? :: Both must be idempotent — applying a forward step or a compensation more than once (because a retry followed an unclear outcome) must produce the same end state as applying it once, otherwise a retried refund or a retried inventory release could double-apply its effect. ^card-3y1s
