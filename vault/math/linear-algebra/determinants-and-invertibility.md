---
topic: math
category: math-linear-algebra
tags: [determinant, invertibility, volume, orientation, cofactor-expansion]
citations: ["Strang, Introduction to Linear Algebra 5e, Ch. 5"]
---

# Determinants and Invertibility

The rank-nullity theorem answers "is A invertible?" via two subspaces
computed by elimination. The determinant answers the same question with
a single number, and it does so because of what that number actually
measures: how much A scales volume.

Feed A the unit square (or unit cube, in higher dimensions) spanned by
the standard basis vectors, and look at the volume of the parallelepiped
its columns now span. That volume, with a sign attached, is $\det(A)$ —
the ==signed volume== scaling factor of the linear map A. A map that ^card-0q3b
doubles all areas has determinant 2; one that leaves volume unchanged
(a rotation) has determinant 1.

That single reading makes the determinant's headline property obvious
rather than memorized: $\det(A) = 0$ exactly when A collapses space into
a lower dimension — squashing a square into a line segment, or a cube
into a plane, has zero area or volume no matter how you measure it. And
collapsing dimension is exactly what makes a map non-invertible: if two
different inputs get flattened onto the same lower-dimensional image,
there's no way to recover which input produced a given output, so no
inverse map can exist.

> [!card] mcq
> A 3-by-3 matrix A has det(A) = 0. What does this imply?
> - [x] A maps R^3 onto a subspace of dimension less than 3, and A is not invertible
> - [ ] A is the zero matrix
> - [ ] A has no eigenvalues
> - [ ] A is invertible, but its inverse has a zero entry somewhere ^card-wa0m

Why does det(A) = 0 imply that A is not invertible, rather than the two facts being independent? :: det(A) is the signed volume-scaling factor of A, and a determinant of zero means A collapses the domain into a lower-dimensional image — some nonzero volume gets crushed to zero. Whenever a map collapses dimension, multiple distinct inputs land on the same output, so the map cannot be undone: there is no way to recover which input produced a given point in the flattened image, which is precisely what "not invertible" means. The zero determinant is a symptom of that collapse, not a coincidence alongside it. ^card-m8uq

The sign of $\det(A)$ carries information the magnitude alone does not:
a negative determinant means A reverses ==orientation== — flips ^card-oocj
handedness, the way a reflection turns a right hand into what looks
like a left hand — while a positive determinant preserves it. Two maps
with the same |det(A)| can differ only in this sign, and nothing about
volume alone would distinguish them.

Composition and the determinant interact multiplicatively, which the
volume reading makes intuitive rather than algebraic:

```
det(A*B) = det(A) * det(B)
det(A^T) = det(A)
det(A^-1) = 1 / det(A)
```

Scaling volume by B's factor and then by A's factor scales it by their
product overall — exactly what $\det(AB) = \det(A)\det(B)$ says — and a
map composed with its own inverse must scale volume back to exactly 1,
which is only possible if the inverse's factor is $1/\det(A)$.

> [!card] mcq
> A has det(A) = 4. What is det(A^-1)?
> - [x] 1/4
> - [ ] -4
> - [ ] 4
> - [ ] A^-1 does not exist unless det(A) = 1 ^card-5tmx

> [!card] recall
> Explain, using the volume-scaling reading of the determinant, why
> det(A*B) = det(A) * det(B) rather than det(A) + det(B) or some other
> combination.
> ---
> det(A) and det(B) are each a scaling factor applied to volume. Applying
> B first scales any region's volume by det(B); applying A to the
> result then scales that already-scaled volume by det(A). Two
> successive scalings compose by multiplying the factors together, the
> same way scaling a length by 3 and then by 2 gives an overall factor
> of 6, not 5 — so the combined map A*B must scale volume by
> det(A) * det(B). ^card-47sa

For a 2-by-2 matrix, the determinant has a closed form, and the general
n-by-n case extends it via cofactor expansion along any row or column:

```
det([[a, b], [c, d]]) = a*d - b*c

det(A) = sum_{j=1}^n (-1)^{1+j} * A_{1j} * det(M_{1j})
```

where $M_{1j}$ is the minor formed by deleting row 1 and column j.

Cofactor expansion is worth knowing conceptually, but it is not how
determinants get computed in practice: each recursive expansion spawns
n smaller determinants, giving `O(n!)` work overall, which becomes
unusable well before n reaches even a modest size. Real computation
goes through elimination instead — row-reduce A and take the product of
the resulting pivots (adjusting sign for row swaps) — which costs only
`O(n^3)`.

Why is a formula that computes the exact right answer, like cofactor expansion, still the wrong tool for actually computing a large determinant? :: Cofactor expansion's cost grows as O(n!), because each level of expansion multiplies the number of smaller determinants still to be computed, and factorial growth overtakes any fixed problem size almost immediately — a 20-by-20 determinant would need on the order of 20! terms. Elimination computes the identical number in O(n^3) by row-reducing to pivots and multiplying them, so the formula is the right way to understand what a determinant means, but the wrong way to compute one past trivially small matrices. ^card-f8gu

The determinant's connection to eigenvalues — it equals their product,
which is another route to the same zero-determinant-means-singular
fact — is developed once eigenvalues themselves are introduced next;
this note has built the invertibility test directly from volume instead.
