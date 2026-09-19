---
topic: algorithms
category: algo-data-structures
tags: [universal-hashing, perfect-hashing, collisions, static-key-sets]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 11 (Hash Tables)"]
---

# Universal and Perfect Hashing

The previous two notes' average-case bounds assumed simple uniform
hashing: keys distribute themselves uniformly over slots. But any single,
fixed hash function has some set of keys that all collide with each other
— and if an adversary knows the function, they can choose exactly that
set, driving every operation to Θ(n) regardless of what the average case
"should" be.

==Universal hashing== defends against this by choosing the hash function ^card-h14a
itself at random, from a well-designed family of functions, independently
of the keys that will be inserted — so no fixed set of keys can be
adversarial against a choice the adversary can't predict in advance.

A family H of hash functions is ==universal== if, for every pair of ^card-12d6
distinct keys k and l, the number of functions h in H for which
h(k) = h(l) is at most |H| / m. Equivalently, if h is drawn uniformly at
random from a universal H, then for any fixed pair of distinct keys,
Pr[h(k) = h(l)] ≤ 1/m — no worse than the collision probability from
truly random hashing.

Why does drawing the hash function at random from a universal family defeat an adversary who knows the algorithm's source code? :: The adversary can see the family H and the algorithm, but the specific function h actually used is chosen at random only when the table is built and is unknown to them in advance, so they cannot pick a set of keys guaranteed to collide under whichever h happens to be chosen — any fixed set of keys collides badly for only a small fraction of the functions in H. ^card-rxwz

Using a universal family bounds the ==expected== length of a chain a ^card-i9be
given key falls into by O(1 + α), matching the simple-uniform-hashing
bound — but now the expectation is taken over the algorithm's own random
choice of hash function, not over an unproven assumption about how the
keys happen to be distributed.

> [!card] mcq
> What does universal hashing's guarantee hold an expectation over?
> - [x] The algorithm's own random choice of hash function from the universal family
> - [ ] The random order in which keys happen to be inserted
> - [ ] The physical distribution of keys across memory
> - [ ] The number of probes in a fixed, deterministic hash function ^card-hdu1

==Perfect hashing== targets a different setting: a **static** key set, ^card-n2oj
fixed and known in advance, that never changes after the table is built.
Under that assumption, CLRS's two-level scheme achieves O(1) worst-case
search time — not merely expected or amortized — by using a second
universal hash function inside each first-level slot to guarantee zero
collisions there.

The construction hashes n keys into m = n first-level slots with a
universal hash function; whichever nᵢ keys land in slot i get their own
secondary hash table of size nᵢ², built with a hash function drawn from
a universal family and resampled until it happens to produce zero
collisions among those nᵢ keys. Sizing each secondary table quadratically
in its own key count is exactly what makes a collision-free draw likely
on the first or second try, keeping the expected construction cost low.

Why must perfect hashing's key set be static, given that its guarantee is a worst-case O(1) search? :: The zero-collision secondary hash functions are built once, for the exact keys known at construction time; inserting a new key later could collide with an existing key in its secondary table, and there is no probing or chaining fallback built into the scheme to absorb that collision without rebuilding the affected secondary table. ^card-z60g

> [!card] recall
> Explain why sizing each secondary hash table at nᵢ² slots (rather than,
> say, nᵢ slots) makes it likely that a randomly chosen universal hash
> function produces zero collisions among that slot's keys. ^card-nilf
