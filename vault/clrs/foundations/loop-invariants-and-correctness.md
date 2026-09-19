---
topic: algorithms
category: algo-foundations
tags: [loop-invariants, correctness, insertion-sort, proof-technique]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 2 (Getting Started)"]
---

# Loop Invariants and Correctness

A running-time bound says nothing about whether an algorithm is
correct — it just measures how expensive a computation is, right or
wrong. Proving correctness for a loop-based algorithm is a separate job,
and the standard tool for it is the loop invariant, demonstrated here on
insertion sort.

```
INSERTION-SORT(A, n)
for i = 2 to n
    key = A[i]
    j = i - 1
    while j > 0 and A[j] > key
        A[j+1] = A[j]
        j = j - 1
    A[j+1] = key
```

The invariant claimed for insertion sort's outer loop is: at the start
of each iteration of the `for` loop, indexed by i, the subarray A[1..i-1]
consists of the elements originally there, in sorted order. Proving a
loop invariant is like induction, and needs the same three parts.

==Initialization== is the base case: the invariant must hold before the ^card-b9xy
first iteration begins. For insertion sort, before i = 2, the subarray
A[1..1] is a single element, trivially sorted.

==Maintenance== is the inductive step: if the invariant holds before an ^card-y28m
iteration, the loop body must keep it holding before the next one. Each
pass of insertion sort's inner `while` loop shifts elements right and
inserts `key` into place, extending the sorted subarray from A[1..i-1]
to A[1..i].

==Termination== is what makes the argument say something about the ^card-2h3w
whole algorithm rather than just each step: it asks what the invariant
gives you once the loop's exit condition is reached, i.e. once i has
run past n, and checks that this is exactly the postcondition you set
out to prove.

For insertion sort, termination gives A[1..n] sorted — the entire array,
because the loop exits with i = n + 1.

What does insertion sort's loop invariant assert is true at the start of iteration i of the outer for loop? :: That the subarray A[1..i-1] contains the elements that were originally in those positions, now rearranged into sorted order. ^card-ymzv

> [!card] mcq
> Which part of a loop invariant proof corresponds to the inductive step in a proof by induction?
> - [x] Maintenance
> - [ ] Initialization
> - [ ] Termination
> - [ ] Input size ^card-kj90

A loop invariant proof establishes *what the loop computes*, assuming
the loop body itself does what it's claimed to do — it does not by
itself prove that individual statements inside the loop body are free
of bugs, that the loop terminates in a *reasonable* number of steps
(only that it terminates, or is assumed to), or anything about running
time at all. Correctness and efficiency are proved separately.

Why does establishing a loop invariant not tell you anything about the loop's running time? :: The invariant is a statement about what data-structure property holds at each iteration boundary, independent of how many steps the loop body takes to get there or how many iterations run; two loops can maintain the same invariant while one is Theta(n) and the other Theta(n^2). ^card-vxpv

> [!card] recall
> Insertion sort's inner while loop is itself a loop with its own
> invariant. Sketch what that inner invariant would need to say about
> A[j+1..i] for the outer invariant's maintenance step to go through. ^card-1qx9
