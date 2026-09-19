---
topic: algorithms
category: algo-foundations
tags: [ram-model, algorithm-analysis, worst-case, running-time]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 2 (Getting Started)"]
---

# The RAM Model and Analyzing Running Time

Every bound in this category — every Theta, O, and Omega you'll see —
is a statement about a specific cost model, not about wall-clock seconds
on any particular machine. That model is the RAM (random-access
machine): a generic one-processor computer that executes instructions
one after another, with no concurrency.

In the ==RAM model==, each instruction — an arithmetic op, a data ^card-z3e6
movement, a comparison, a control-flow test — takes a constant amount
of time; the model does not pretend real instructions are equally
costly in hardware, only that treating them as unit-cost steps gives an
analysis that predicts real performance well enough to be useful.

Running time is expressed as a function of ==input size==, but what ^card-dytd
"size" means depends on the problem: it might be the number of items in
an array, the number of bits needed to represent a number, or the
number of vertices and edges in a graph. Choosing the wrong measure of
size for a problem makes any bound stated against it meaningless.

Given a fixed input size, an algorithm's running time can still vary
with the actual input. Insertion sort's inner loop runs once per
element if the array arrives already sorted — its ==best case==. It ^card-5bnn
shifts every preceding element instead if the array arrives
reverse-sorted, its ==worst case==. Average case sits between the two, ^card-x8n1
over some assumption about how inputs are distributed.

Worst-case analysis is the default in this category — and in most of
algorithm design — for two reasons.

> [!card] mcq
> Why is worst-case running time the default measure, rather than average-case?
> - [x] It is a guarantee that holds for every input, with no assumption about which inputs are likely
> - [ ] It is always asymptotically larger than the average case, making it a safer number to publish
> - [ ] Average-case analysis is mathematically undefined for most algorithms
> - [ ] Worst-case inputs never actually occur in practice, so the bound is a pure formality ^card-oiwr

A worst-case bound holds for *every* input of that size — no adversary
can find a slower one — which matters directly for systems with hard
deadlines (real-time control, safety-critical code) where "usually
fast" is not good enough. Average-case analysis, by contrast, requires
an explicit assumption about the distribution of inputs (often "all
permutations equally likely"), and that assumption can simply be wrong
for the inputs an algorithm actually sees in production.

What does a worst-case running time bound guarantee, and what does an average-case bound require that a worst-case bound does not? :: A worst-case bound holds for every possible input of a given size, with no assumption needed; an average-case bound requires assuming (or proving) a probability distribution over inputs, and only characterizes typical behavior under that specific distribution — a different real-world input distribution can make the average-case number misleading. ^card-w6cy

There is also a practical coincidence worth knowing: for many
algorithms (insertion sort among them), the average case is
asymptotically no better than the worst case — both are Theta(n^2) —
so there is little to gain from the more fragile, assumption-laden
analysis anyway.

> [!card] recall
> Insertion sort's best case is Theta(n) and its worst case is
> Theta(n^2). Explain why quoting only the best case for an algorithm
> would be misleading, even though it is a true statement about some
> input. ^card-8hrp
