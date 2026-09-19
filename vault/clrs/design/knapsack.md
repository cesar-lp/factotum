---
topic: algorithms
category: algo-design
tags: [knapsack, dynamic-programming, greedy, pseudo-polynomial]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 14 (Dynamic Programming)", "Cormen et al., Introduction to Algorithms 4e, Ch. 15 (Greedy Algorithms)"]
---

# 0-1 Knapsack vs. Fractional Knapsack

CLRS introduces these two versions side by side precisely because they look
almost identical and respond to completely different techniques — this note
exists to keep that contrast sharp rather than let the two blur together.

Both start the same way: given items with weights `w_i` and values `v_i`
and a capacity `W`, choose a subset (or, for the fractional version,
amounts) of items to maximize total value without exceeding `W`.

In ==fractional knapsack==, any fraction of an item may be taken, and a ^card-noih
simple greedy strategy is optimal: sort items by value-per-weight ratio
`v_i / w_i` and take as much as possible of the best-ratio item first,
then the next, until capacity runs out (taking a fraction of the last item
that fits).

Why is the greedy ratio strategy provably optimal for fractional knapsack? :: An exchange argument: if an optimal solution takes less than the maximum possible of the best-ratio item while capacity remains, swapping in more of that item for an equal weight of any lower-ratio item strictly increases (or does not decrease) total value, so an optimal solution can always be transformed into the greedy one without loss — this is the greedy-choice property holding for this specific problem. ^card-ig2x

==0-1 knapsack== forbids fractions: each item is either taken whole or left ^card-wn2z
out. This single change breaks the exchange argument above, because
"swap in a little more of the best-ratio item" is no longer a legal move
once an item can't be split — the greedy choice that was optimal for the
fractional version can now strand unused capacity that no remaining whole
item fits.

> [!card] mcq
> Given items (weight, value) = (10, 60), (20, 100), (30, 120) and capacity 50, greedy-by-ratio picks the weight-10 and weight-20 items (value 160, ratio order 6 > 5 > 4) and cannot fit the last item. What is the actual optimal 0-1 selection?
> - [x] The weight-20 and weight-30 items, value 220
> - [ ] The weight-10 and weight-30 items, value 180
> - [ ] All three items
> - [ ] The weight-10 and weight-20 items, value 160 — greedy is already optimal here ^card-ll9b

0-1 knapsack is instead solved by DP over capacity. Let `c[i][w]` be the
best value achievable using only the first `i` items with capacity `w`:
`c[i][w] = c[i-1][w]` if item `i` doesn't fit (`w_i > w`), otherwise the
better of leaving item `i` out or taking it —
`c[i][w] = max(c[i-1][w], v_i + c[i-1][w - w_i])`.

```
for i = 1 to n:
  for w = 0 to W:
    if weight[i] > w:
      c[i][w] = c[i-1][w]
    else:
      c[i][w] = max(c[i-1][w], value[i] + c[i-1][w - weight[i]])
```

This table has `n` rows and `W + 1` columns, each filled in O(1), giving a
running time of `O(nW)`. A running time like this — polynomial in the
numeric magnitude of an input value rather than in the number of bits
needed to write that value down — is called ==pseudo-polynomial==. ^card-vgq8

What does it mean to call the 0-1 knapsack DP's `O(nW)` running time "pseudo-polynomial", and why does that matter? :: `O(nW)` is polynomial in the *numeric value* of the capacity `W`, but `W` is an input, and the size of an input is measured by how many bits it takes to write down — about `log W` bits — not by its magnitude. Rewritten in terms of true input size, the running time is `O(n * 2^(log W))`, exponential in the bit length of `W`; doubling the number of bits needed to represent `W` roughly squares the running time, exactly the signature of an exponential-time algorithm, even though the formula "looks" polynomial in `n` and `W`. ^card-g51d

> [!card] recall
> Explain why fractional knapsack's greedy solution and 0-1 knapsack's DP
> solution are not just "two ways to solve the same problem" — connect the
> indivisibility of items to why one technique's optimality proof survives
> and the other's does not. ^card-lxz3
