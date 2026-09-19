---
topic: algorithms
category: algo-design
tags: [amortized-analysis, potential-method, dynamic-tables, worst-case-analysis]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 16 (Amortized Analysis)"]
---

# Amortized Analysis: Aggregate, Accounting, and Potential Methods

Every other note in this category bounds the cost of *one* run of an
algorithm. Amortized analysis instead bounds the average cost per
operation across a *sequence* of operations on the same data structure,
for the specific case where most operations are cheap and only occasional
ones are expensive — and it is a worst-case guarantee, not a probabilistic
one.

Why is "amortized cost" not the same claim as "average-case" or "expected" cost, even though both involve averaging? :: Average-case and expected-case analysis average over a probability distribution on inputs (or over a randomized algorithm's coin flips) — the bound can fail for some particular input or run. Amortized analysis averages the total cost of a specific worst-case *sequence* of operations over the number of operations in that sequence; it makes no assumption about randomness or input distribution, and the bound holds for every possible sequence, not just typical ones. ^card-cdaf

The ==aggregate method== is the simplest technique: bound the total cost ^card-v436
`T(n)` of any sequence of `n` operations, then divide by `n` to get the
amortized cost per operation, applied uniformly to every operation in the
sequence regardless of that operation's own actual cost.

The ==accounting method== instead assigns each operation an amortized ^card-lw2o
cost that can differ from its actual cost. Cheap operations are charged
slightly more than their actual cost, and the difference is banked as
credit stored on the data structure; an expensive operation later draws
down that stored credit to cover the gap between its actual cost and its
(smaller) amortized cost. The technique is only valid if the total credit
never goes negative.

The ==potential method== generalizes accounting: define a potential ^card-05i6
function `Phi` mapping each state of the data structure to a real number,
with `Phi` of the initial state at its minimum (often 0) and `Phi` never
negative afterward. Then the amortized cost of an operation is defined as
`actual_cost + Phi(after) - Phi(before)`, and because the potential drops
can never total more than its rises, the sum of amortized costs is an
upper bound on the sum of actual costs.

A dynamic table that starts empty and doubles its allocated size whenever
an insertion would overflow it is the worked example. A sequence of `n`
insertions does `n` unit-cost element insertions, plus a copy-and-double
step whose costs form a geometric series (1, 2, 4, ..., roughly `n`) that
sums to less than `2n`. Total cost across `n` insertions is therefore
`O(n)`, and dividing by `n` gives an amortized cost of `O(1)` per
insertion by the aggregate method — even though any individual insertion
that triggers a doubling costs `Theta(n)` on its own.

```
// table-doubling insertion, insertions only
TABLE-INSERT(T, x)
  if T.size == 0:
    allocate T.table with 1 slot; T.size = 1
  if T.num == T.size:
    allocate new table of size 2 * T.size
    copy all T.num items into it; free the old table
    T.table = new table; T.size = 2 * T.size
  insert x into T.table
  T.num = T.num + 1
```

> [!card] mcq
> A dynamic table doubles on overflow, starting from size 1. What is the amortized cost of a single `TABLE-INSERT`, even though the doubling insertions themselves cost `Theta(n)`?
> - [x] O(1)
> - [ ] O(lg n)
> - [ ] O(n)
> - [ ] O(n^2) ^card-nd43

The same bound falls out of the potential method with the potential
function `Phi(T) = 2 * T.num - T.size`. Between doublings, each ordinary
insertion raises `Phi` by 2 (num grows by 1, size unchanged), covering its
own unit cost with room to spare; the insertion that triggers a doubling
sees `size` jump to absorb almost all of the credit that had built up, so
its large actual cost is offset by a large drop in potential.

What two conditions must a candidate potential function satisfy for the potential-method argument to be valid at all? :: `Phi` of the initial data-structure state must be at its global minimum (conventionally 0), and `Phi` must never go negative at any later state; together these guarantee that the total potential drop over any sequence of operations can never exceed the total potential rise, which is what makes the sum of amortized costs a valid upper bound on the sum of actual costs. ^card-znxd

> [!card] recall
> Explain why the aggregate method can tell you the correct amortized
> cost per operation but cannot, on its own, assign a *different*
> amortized cost to different operations in the sequence the way the
> accounting and potential methods can — and why that limitation matters
> for structures with more than one operation type. ^card-5o25
