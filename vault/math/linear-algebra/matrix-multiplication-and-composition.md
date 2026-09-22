---
topic: math
category: math-linear-algebra
tags: [matrix-multiplication, composition, associativity, transpose, inverse]
citations: ["Strang, Introduction to Linear Algebra 5e, Ch. 2"]
---

# Matrix Multiplication and Composition

The previous note treated a matrix as a function, $Ax$. This one asks
what it means to apply two of them in a row — first B, then A — and the
answer is the whole reason matrix multiplication is defined the way it
is. The row-times-column rule looks arbitrary the first time you see
it; it stops looking arbitrary once you require that $AB$ represent
"do B, then do A" and nothing else.

> [!card] recall
> State the single requirement that a definition of matrix
> multiplication A*B has to satisfy for it to represent "apply B, then
> apply A" as a linear map. What does that requirement force about how
> the entries of A*B must be computed from the entries of A and B?
> ---
> It must satisfy (A*B)*x = A*(B*x) for every x — applying the combined
> matrix once has to give the same answer as applying B and then
> feeding the result into A. Since B*x is itself a linear combination of
> B's columns, and A then acts on that combination, working through the
> algebra forces entry (i,j) of A*B to be the dot product of A's row i
> with B's column j: there is no other rule that reproduces composition
> exactly, which is why the row-times-column recipe is not a separate
> assumption but a consequence. ^card-ngfz

$$
(AB)_{ij} = \sum_{k=1}^n A_{ik} B_{kj}
$$

That derivation also explains the shape requirement that trips people
up: B's number of columns must equal A's number of rows, because B's
columns are vectors landing in B's codomain, and that codomain has to
be exactly the space A accepts as input. If B is m-by-n and A is p-by-m,
$AB$ is defined and is p-by-n; if the inner dimensions don't match,
composition — feeding B's output into A — is asking A to accept a
vector of the wrong size.

> [!card] mcq
> B is 4-by-2 and A is 3-by-4. Which product is defined, and what shape
> does it have?
> - [x] A*B is defined and is 3-by-2
> - [ ] B*A is defined and is 2-by-3
> - [ ] Neither product is defined
> - [ ] A*B is defined and is 4-by-4 ^card-dsge

Composition being order-sensitive in general — first B then A is a
different map from first A then B — is not a quirk of the notation; it
is a fact about functions that matrix multiplication merely inherits.
Rotating a vector and then stretching it does not, in general, produce
the same result as stretching it first and then rotating it, so there
is no reason to expect $AB = BA$, and it usually fails.

In general, matrices ==do not commute==: A*B and B*A are usually ^card-wqsk
different matrices, and treating them as interchangeable is one of the
most common algebra errors with matrices.

Why should A*B differ from B*A in general, given what A*B represents? :: A*B represents doing B first and then A, while the other order represents doing A first and then B — two different orders of two different operations, and composing functions in a different order generically produces a different function. Matrix multiplication inherits this from composition itself rather than introducing it; agreeing on both orders is the special case, not the default. ^card-vwhh

Associativity, by contrast, does hold without qualification:
$(AB)C = A(BC)$ for any matrices with compatible shapes. This is
also inherited from function composition — applying C, then B, then A
gives the same final map no matter how you parenthesize the middle
step — and it is what licenses treating a chain of transformations as a
single combined matrix, computed in whatever order is convenient,
rather than needing to fix a grouping in advance.

> [!card] recall
> A pipeline applies three transformations to every input vector, in
> order: first C, then B, then A. Explain why it is valid to precompute
> M = A*B and then apply M*C, instead of always computing (B*C) first
> and applying A to that.
> ---
> Matrix multiplication is associative — (A*B)*C = A*(B*C) — because
> both sides represent the identical composed function "apply C, then
> B, then A." Precomputing M = A*B is legal because associativity
> guarantees M*C = A*(B*C), so the two computation orders reach the
> same matrix and therefore the same output for every input; only the
> amount of arithmetic done, not the answer, depends on the grouping. ^card-ke6q

The identity matrix I is the composition-theory counterpart of doing
nothing: $AI = IA = A$ for square A. The ==inverse== A^-1, when it ^card-fl7g
exists, is the map that undoes A: $AA^{-1} = A^{-1}A = I$. Composing a
transformation with the one that reverses it is, by definition, the
transformation that changes nothing.

When two invertible transformations are composed and then undone, the individual inverses have to be applied in the opposite order to actually cancel — why does undoing "first B, then A" require applying A^-1 before B^-1, rather than the other way around? :: To undo a composed map you have to peel off its outermost operation first. If the forward map applies B and then A, the last thing that happened to any input is A, so undoing it starts by applying A^-1, and only then B^-1 to get back to the true starting point; applying B^-1 first would try to undo an operation, A, that has not been reversed yet. This is exactly why (A*B)^-1 = B^-1*A^-1 and not A^-1*B^-1. ^card-9b6q

The transpose obeys the same order-reversing rule, for a related but
distinct reason: $(AB)^\top = B^\top A^\top$. Transposing swaps the roles of
rows and columns, and the row-times-column computation in $AB$ only
lines up correctly after the pieces are transposed if their order is
also flipped.

> [!card] mcq
> Which identity correctly gives the transpose of a product A*B?
> - [x] (A*B)^T = B^T*A^T
> - [ ] (A*B)^T = A^T*B^T
> - [ ] (A*B)^T = B*A, transposed entrywise
> - [ ] (A*B)^T = A^T*B^T only when A and B are square ^card-mubf

Composition is what the next note's rank and null space describe the
*effect* of: rank asks how much of the codomain a composed or single
map actually reaches, and the null space asks what a map crushes to
zero along the way.
