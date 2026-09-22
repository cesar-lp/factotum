---
topic: math
category: math-linear-algebra
tags: [span, linear-independence, basis, dimension]
citations: ["Strang, Introduction to Linear Algebra 5e, Ch. 2"]
---

# Linear independence, span, and basis

`vectors-and-vector-spaces.md` names the linear combination as the one
operation everything in this category builds from. This note asks two
questions about a fixed list of vectors, built entirely from that
operation, and shows that a basis is just what happens when both
questions get the best possible answer at once.

The **span** of vectors $v_1, \ldots, v_n$ is the set of everything reachable
by combining them:

$$
\operatorname{span}\{v_1, \ldots, v_n\} = \{ c_1 v_1 + c_2 v_2 + \cdots + c_n v_n : c_1, \ldots, c_n \in \mathbb{R} \}
$$

Span is purely about *coverage* — how much of the space you can reach —
and says nothing about whether the list used to reach it is efficient.
Two vectors pointing in the same direction still span only a line, no
matter how many extra copies you throw in; a longer list can span the
exact same set as a shorter one.

**Independence** is the question span leaves unanswered: does every
vector in the list pull its own weight, or could one be dropped without
shrinking the span? Formally, $v_1, \ldots, v_n$ are linearly independent if
the only solution to

$$
c_1 v_1 + c_2 v_2 + \cdots + c_n v_n = 0
$$

is $c_1 = c_2 = \cdots = c_n = 0$. If some other combination also hits zero,
one vector is expressible in terms of the others — it's redundant, and
removing it leaves the span unchanged. Independence is the formal name
for "no redundancy in this particular list."

> [!card] mcq
> Vectors v_1, v_2, v_3 satisfy 2*v_1 - v_2 + 0*v_3 = 0, with v_1 and v_2
> both nonzero. What does this imply?
> - [x] v_1, v_2, v_3 are linearly dependent, since a nontrivial combination of them equals zero
> - [ ] v_1, v_2, v_3 are linearly independent, since v_3's coefficient is zero
> - [ ] Nothing can be concluded without knowing v_3 explicitly
> - [ ] v_1, v_2, v_3 must span all of R^3 ^card-jbxj

A **basis** for a vector space is a list of vectors that is simultaneously
independent (no redundancy) and spanning (reaches everything) — the exact
meeting point of the two questions above. Spanning alone can be wasteful;
independence alone can fall short of covering the space; a basis is the
smallest list that still reaches everything, and equivalently the largest
list that is still redundancy-free.

The real payoff of a basis isn't spanning or independence individually —
it's that together they guarantee every vector in the space has exactly
one representation as a combination of the basis vectors. If
$x = \sum c_i v_i$ had two different coefficient lists, their difference would be a
nontrivial combination summing to zero, contradicting independence; and
spanning guarantees at least one representation exists in the first
place. Unique coordinates are what make every later construction —
change of basis, matrix representations of linear maps, coordinate
formulas for projections — well-defined operations rather than choices
made among several equally valid answers.

Why does uniqueness of coordinates, rather than spanning or independence individually, count as the real reason a basis matters? :: Spanning by itself only guarantees a representation exists, and independence by itself only guarantees no vector in the list is redundant — neither alone tells you a vector's coordinates are unambiguous. Only when both hold together does every vector get exactly one coefficient list, and that uniqueness is what lets later constructions (change of basis, matrix representations, coordinate formulas) treat "the coordinates of x" as a well-defined object rather than one of several equally valid answers. ^card-z4xq

> [!card] recall
> Explain why a basis must be both spanning and independent, using what
> would go wrong with uniqueness of representation if either property
> were dropped.
> ---
> If the list failed to span, some vector in the space would have no
> representation at all, so "the coordinates of x" wouldn't be defined
> for every x. If the list spanned but was dependent, some vector would
> have more than one valid coefficient list, since a nontrivial relation
> among the basis vectors could be added to any representation to produce
> a different one summing to the same vector. Both failures break the
> single guarantee a basis exists to provide: exactly one representation
> per vector. ^card-mr6l

Every basis of a given vector space has the same number of vectors; that
common count is the space's ==dimension==, an invariant of the space ^card-snj8
itself rather than of any particular basis chosen for it. This is not
obvious a priori — a priori there's no reason two different "smallest
spanning, largest independent" lists couldn't have different sizes — but
it's a theorem, and that theorem is what turns a count attached to one
particular basis into a well-posed property of the space as a whole.

What would go wrong if two different bases of the same vector space were allowed to have different numbers of vectors? :: "Dimension" would stop being a well-defined property of the space itself — it would instead depend on which basis happened to be picked, so a statement like "R^3 is 3-dimensional" would be meaningless without also specifying a basis. The theorem that all bases of a space share the same size is exactly what promotes dimension from a fact about one particular basis to an invariant of the space. ^card-ygxw

Two related counting facts follow directly from dimension being fixed.
Any list of more than $n$ vectors in $\mathbb{R}^n$ must be dependent — there
simply isn't room for more than $n$ independent directions once every
direction is already spanned by some combination of $n$ basis vectors, so
a longer list has redundancy forced on it. Symmetrically, any list of
fewer than $n$ vectors cannot span $\mathbb{R}^n$ — a shorter list reaches at most
a lower-dimensional slice of the space, since each new independent vector
adds at most one new dimension of coverage.

> [!card] mcq
> Five vectors are given in R^3. What must be true of them?
> - [x] They are linearly dependent — R^3 has dimension 3, so no more than 3 vectors can be independent
> - [ ] They span R^3, since there are more vectors than dimensions
> - [ ] They form a basis for R^3
> - [ ] Nothing can be concluded without seeing the vectors ^card-k2vj

Why can a set of vectors be spanning but dependent, or independent but not spanning, without being a basis either way — and why is this the central confusion this note is meant to resolve? :: A spanning-but-dependent set reaches every vector in the space but wastes at least one vector on redundancy — a fourth vector added to a spanning set of three in R^3, for instance, still spans but can no longer be independent. An independent-but-not-spanning set has no redundancy among the vectors it has, but there simply aren't enough of them to reach the whole space — two independent vectors in R^3 span only a plane. Both properties are necessary and neither is sufficient on its own; a basis requires satisfying both simultaneously, which is exactly why the two questions (coverage and redundancy) have to be asked separately rather than treated as one idea. ^card-v6uj

This note treats span, independence, and dimension abstractly; how a
matrix's columns realize these ideas concretely — column space, rank, and
the rank-nullity theorem connecting a matrix's dimensions to its
independence structure — is covered once matrices as linear maps are
introduced later in this category.
