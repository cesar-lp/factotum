---
topic: aws
category: aws-dynamodb
tags: [dynamodb, transactions, conditional-writes, optimistic-concurrency]
citations: ["AWS Developer Guide — Amazon DynamoDB, 'Managing complex workflows with transactions'"]
---

# Transactions and Conditional Writes

`data-systems/transactions.md` frames isolation levels as a spectrum of
which anomalies a database rules out. DynamoDB doesn't offer that
spectrum — it offers a much narrower, explicit set of guarantees built
from conditional writes upward, and knowing exactly what is and isn't
covered matters more here than anywhere else in this category, since
getting it wrong silently reintroduces the write-skew-shaped bugs that
note warns about.

A ==condition expression== attached to a write (`PutItem`, `UpdateItem`, ^card-05a4
`DeleteItem`) makes the write fail instead of applying if that check
evaluates false against the item's current state — for example, only
updating an item if a version attribute still matches the value the
client last read.

This is DynamoDB's building block for **optimistic concurrency
control**: a client reads an item (and its version), computes a new
value, then writes it back with a condition that the version hasn't
changed since the read. If another writer got there first, the ==version ^card-hcvc
mismatch== makes the condition fail and the write is rejected, forcing
the client to re-read and retry rather than silently overwriting a
concurrent update.

> [!card] mcq
> How does DynamoDB's conditional-write approach to optimistic
> concurrency detect a lost update?
> - [x] The write includes a condition that a version (or timestamp) attribute still matches what the client read; if a concurrent writer already changed it, the condition fails and the write is rejected
> - [ ] DynamoDB locks the item automatically on every read until the reader writes back
> - [ ] It compares the entire item byte-for-byte before every write
> - [ ] It relies on the client's system clock to detect concurrent writers ^card-h93w

What must the client do after a conditional write fails because its version condition didn't match? :: Re-read the item to get its current state and version, recompute the intended change against that fresh state, and attempt the conditional write again — the failure is a signal to retry with fresh data, not a permanent error. ^card-xom7

`TransactWriteItems` extends this to up to several items across one or
more tables: every condition check and write in the transaction either
all succeed together or all fail together, giving DynamoDB's
transactions the same atomicity guarantee `data-systems/transactions.md`
attributes to the "A" in ACID.

What DynamoDB transactions do NOT provide, unlike the serializable
isolation `data-systems/transactions.md` describes as the strongest
relational isolation level, is a table-wide guarantee covering every
read and write that touches the table. The atomicity and isolation
guarantee holds only among the operations named in that one ==transactional ^card-lmwe
call== — a plain `GetItem` issued concurrently by some unrelated caller is
not guaranteed to see the transaction's writes as a single indivisible
unit the way a read made through `TransactGetItems` would.

Why is it inaccurate to describe DynamoDB transactions as giving the whole table serializable isolation? :: Serializable isolation (as in the relational sense) requires every transaction in the system to be provably equivalent to some serial order; DynamoDB's transaction API guarantees atomicity and isolation only among the items and operations explicitly included in that specific TransactWriteItems/TransactGetItems call, not with respect to every other read or write happening elsewhere in the table at the same time. ^card-r3hy

> [!card] recall
> A team assumes that wrapping several related writes in
> `TransactWriteItems` means no other operation in the table can ever
> observe a partial result, under any circumstances. Explain precisely
> what guarantee they actually get, and name the kind of read that could
> still see an inconsistent intermediate state if it weren't itself part
> of a transactional read. ^card-tumx
