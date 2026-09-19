---
topic: algorithms
category: algo-design
tags: [huffman-coding, greedy-algorithms, prefix-free-codes, data-compression]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 15 (Greedy Algorithms)"]
---

# Huffman Coding

Huffman coding is the greedy-algorithms chapter's flagship application: a
concrete, practical problem — building the shortest possible encoding for
a set of characters given their frequencies — solved by a greedy
bottom-up merge, with an exchange-argument proof of optimality behind it.

Huffman's encoding is ==prefix-free==: no character's code is a prefix of ^card-je01
any other character's code. This is what lets a decoder read a
compressed bitstream unambiguously, one character at a time, left to
right, without needing separators between codewords or any lookahead.

Why does prefix-freedom let a decoder parse a Huffman-encoded bitstream without delimiters between codewords? :: Because no complete codeword is ever a prefix of another, the decoder can read bits one at a time and stop as soon as the bits read so far match some character's codeword — that match cannot be a partial match for a longer codeword still in progress, so the boundary between codewords is always unambiguous. ^card-n6ys

The construction repeatedly merges the two ==lowest-frequency== nodes into ^card-hchv
a new internal node whose frequency is their sum, using a min-priority
queue to always find the next pair to merge, until one node remains — the
root of the resulting binary tree.

```
HUFFMAN(C)
  n = |C|
  Q = C, as a min-priority queue keyed on frequency
  for i = 1 to n - 1:
    allocate a new node z
    z.left = x = EXTRACT-MIN(Q)
    z.right = y = EXTRACT-MIN(Q)
    z.freq = x.freq + y.freq
    INSERT(Q, z)
  return EXTRACT-MIN(Q)   // the tree's root
```

With a binary min-heap for `Q`, each of the `n - 1` merge steps does two
extractions and one insertion, each ==O(lg n)==, giving a total running ^card-8tsr
time of `O(n lg n)`.

> [!card] mcq
> In the resulting Huffman tree, where do the two lowest-frequency characters in the whole alphabet end up?
> - [x] As siblings at the maximum depth of the tree
> - [ ] As the two children of the root, regardless of frequency spread
> - [ ] At the minimum depth of the tree
> - [ ] Huffman coding does not guarantee anything about their position ^card-5a3h

The optimality proof is a greedy-choice-property argument: it shows that
some optimal prefix-free code must have the two lowest-frequency
characters as siblings at maximum depth, so merging them first loses
nothing, and then shows the merged problem (treat the pair as one
combined-frequency character) has optimal substructure — an optimal tree
for the smaller problem, with the merged node expanded back into its two
children, is an optimal tree for the original problem.

What two properties does the optimality proof for Huffman coding establish, and in what order does the algorithm exploit them? :: First, the greedy-choice property: some optimal tree has the two globally lowest-frequency characters as siblings, so merging them is always a safe first move. Second, optimal substructure on the reduced problem: once those two are merged into one node, an optimal tree for the resulting smaller alphabet, expanded back out, is optimal for the original alphabet — which is what justifies repeating the same greedy merge recursively rather than re-deriving it at every step. ^card-58c7

> [!card] recall
> Explain why a fixed-length code (every character encoded in the same
> number of bits) can never beat Huffman coding's expected code length
> when character frequencies are skewed, and what Huffman's tree structure
> does differently for frequent versus rare characters. ^card-08c4
