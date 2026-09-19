---
topic: algorithms
category: algo-data-structures
tags: [open-addressing, linear-probing, double-hashing, clustering]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 11 (Hash Tables)"]
---

# Open Addressing

Where chaining stores colliding keys in lists hanging off the table,
==open addressing== stores every key inside the table itself: on a ^card-1x3j
collision, the algorithm computes a sequence of alternative slots — a
**probe sequence** — until it finds one that is empty. This needs no
extra pointers, but caps the load factor α at 1, since the table can
never hold more elements than slots.

**Linear probing** takes an ordinary hash function h′ and probes
h(k, i) = (h′(k) + i) mod m for i = 0, 1, 2, .... Because the sequence
depends only on the starting slot h′(k), there are only m distinct probe
sequences overall, and once a run of occupied slots forms, any key
hashing into that run extends it. This effect, where long runs of
occupied slots keep growing because many probe sequences pass through
them, is ==primary clustering==. ^card-kpe8

```
linear probing:    h(k, i) = (h'(k) + i) mod m
quadratic probing:  h(k, i) = (h'(k) + c1*i + c2*i^2) mod m
double hashing:     h(k, i) = (h1(k) + i*h2(k)) mod m
```

**Quadratic probing** instead probes h(k, i) = (h′(k) + c₁i + c₂i²) mod m.
It avoids primary clustering, but two keys that start at the same slot
h′(k) still follow the exact same probe sequence after that — a milder
effect called ==secondary clustering==. ^card-osjg

Why does quadratic probing avoid primary clustering but not secondary clustering? :: Its probe sequence jumps around by increasing increments instead of stepping one slot at a time, so keys don't all pile onto the same growing run of occupied slots; but the sequence is still determined entirely by the initial probe h'(k), so any two keys that happen to hash to the same starting slot follow identical sequences from then on and compete with each other at every step. ^card-zz7g

**Double hashing** uses two hash functions, probing
h(k, i) = (h₁(k) + i·h₂(k)) mod m. Since both the starting point and the
step size depend on the key, this produces up to Θ(m²) distinct probe
sequences — far more than linear or quadratic probing — which comes
closest of the three to the uniform hashing ideal of picking a random
permutation of slots for each key.

> [!card] mcq
> Why does double hashing produce more distinct probe sequences than linear or quadratic probing?
> - [x] Both the starting slot and the step size between probes depend on the key, instead of just the starting slot
> - [ ] It uses a larger table than linear or quadratic probing
> - [ ] It never revisits a slot that another key has probed
> - [ ] It replaces the hash function with a random number generator ^card-3f3k

Deletion is awkward under open addressing because a search relies on
probing until it hits an empty slot to conclude a key is absent. If a
delete simply marked a slot empty, it could break that logic for a key
inserted later whose probe sequence passed through the deleted slot on
its way to an empty one further along — the search would now stop early
at the falsely-empty slot and wrongly report the key missing, even
though it is present further down the sequence.

How do open-addressing schemes delete a key without corrupting other keys' probe sequences? :: They mark the slot with a special "deleted" sentinel instead of making it empty; a search treats a deleted slot as occupied (so it keeps probing past it, as it would past any other still-full slot), while an insert treats it as available to reuse — preserving every unaffected key's probe sequence at the cost of a slot that stays semantically full until it is reused. ^card-kvpm

> [!card] recall
> Explain why the load factor α can never exceed 1 in an open-addressing
> table, and why that is not a limitation chaining shares. ^card-yf9z
