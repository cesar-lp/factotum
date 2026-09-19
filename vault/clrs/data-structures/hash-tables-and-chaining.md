---
topic: algorithms
category: algo-data-structures
tags: [hash-tables, chaining, load-factor, simple-uniform-hashing]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 11 (Hash Tables)"]
---

# Hash Tables and Chaining

A direct-address table maps each key straight to a slot indexed by the
key itself, giving O(1) operations but only working when the universe of
possible keys is small enough to index directly. A hash table relaxes
that by mapping a large key universe down to a small table of m slots
through a hash function, accepting the possibility of two different keys
landing in the same slot.

==Chaining== resolves a collision by storing every key hashed to the same ^card-1vg2
slot in a linked list rooted at that slot. Insertion is O(1) (prepend to
the list); search or deletion cost depends on how long that list gets.

A table's ==load factor== α is defined as n/m, where n is the number of ^card-1i3t
elements stored and m is the number of slots — it is the average number
of elements per chain, and it is the single number that determines how
expensive chained search gets.

```
load factor: alpha = n / m
```

Analyzing chained hash tables requires the assumption of **simple uniform
hashing**: that any given key is equally likely to hash to any of the m
slots, independently of where every other key hashes. This is an
assumption about the hash function's behavior on the actual keys being
stored, not a property you can verify by inspecting the hash function in
isolation — a hash function can be simple uniform for one key
distribution and badly skewed for another.

What exactly does the simple uniform hashing assumption claim, and about what? :: It claims that each key is equally likely to be hashed into any of the m slots, independently of the slot any other key hashes to; it is a claim about the joint behavior of the hash function and the specific set of keys given to it, not a fact you can establish from the hash function's code alone. ^card-n6a7

Under simple uniform hashing, an unsuccessful search (the key is not in
the table) takes expected ==Θ(1 + α)== time: Θ(1) to compute the hash and ^card-56ql
land on the correct slot, plus Θ(α) to walk the average-length chain
there and confirm the key is absent.

> [!card] mcq
> Under simple uniform hashing, what is the expected time for a search (successful or unsuccessful) in a chained hash table with load factor α?
> - [x] Θ(1 + α)
> - [ ] Θ(lg n)
> - [ ] Θ(α^2)
> - [ ] Θ(1), independent of α ^card-u7x7

A successful search also takes expected Θ(1 + α): the Θ(1) term for
hashing, and a Θ(α) term for scanning part of the chain, since the
element being searched for could be anywhere along it. If the number of
slots m is maintained proportional to n (so α = O(1)), all three
dictionary operations run in expected O(1) time.

Why does keeping m proportional to n matter for hash table performance, and not just having "enough" slots? :: The expected search cost is Θ(1 + α), so as n grows with m fixed, α = n/m grows without bound and search degrades toward Θ(n); keeping m proportional to n instead keeps α = O(1) regardless of how large the table gets, which is what keeps operations O(1) on average as the table grows. ^card-8ow8

> [!card] recall
> Explain why the simple uniform hashing assumption cannot generally be
> guaranteed by a fixed, publicly known hash function against an
> adversary who chooses which keys to insert — and what that motivates
> in the next note on universal hashing. ^card-8d9i
