---
topic: math
category: math-linear-algebra
tags: [vectors, vector-spaces, subspaces, linear-combinations, basis]
citations: ["Strang, Introduction to Linear Algebra 5e, Ch. 1"]
---

# Vectors and vector spaces

Everything downstream in this category — dot products, independence,
eigenvalues, the SVD — is a statement about vector spaces, so it's worth
being precise about what a vector actually is before manipulating any.
The payoff for the abstraction shows up immediately: the same theorems
that hold for arrows in the plane also hold for lists of numbers and for
functions, because none of those theorems depend on what a vector "looks
like" — only on two operations it supports.

A **vector space** is a set closed under two operations, vector addition
and scalar multiplication, satisfying a handful of axioms (associativity,
commutativity of addition, distributivity, existence of a zero vector and
additive inverses, and compatibility of scalar multiplication). The exact
list matters less than what it buys you: any manipulation built only from
adding vectors and scaling them is guaranteed to behave sensibly, no
matter which space you're in. That's why the same proof about, say,
solving a linear system carries over unchanged to a space of polynomials
or a space of functions — the proof only ever used addition and scaling.

> [!card] recall
> A vector space is defined by closure under two operations plus a set of
> axioms. Name the two operations, and explain in one or two sentences
> why proofs written using only those two operations transfer automatically
> to any vector space, not just R^n.
> ---
> The two operations are vector addition and scalar multiplication. A proof
> that manipulates vectors using only those two operations never inspects
> what a vector "is" internally, so it holds in any set that supplies those
> two operations obeying the axioms — arrows, coordinate lists, polynomials,
> functions — regardless of how different those objects look from each
> other. ^card-thle

The single operation everything else in this category is built from is
the **linear combination**: given vectors `v_1, ..., v_n` and scalars
`c_1, ..., c_n`, form

```
c_1*v_1 + c_2*v_2 + ... + c_n*v_n
```

Span, independence, basis, rank, and the column space of a matrix are all
just different questions asked about the set of linear combinations of a
fixed collection of vectors. There is no second operation to learn later —
matrix multiplication itself is defined as taking linear combinations of
columns.

What does it mean, structurally, for span, independence, and basis to all reduce to "questions about linear combinations" rather than being three unrelated ideas? :: All three are properties of the set `{c_1*v_1 + ... + c_n*v_n}` formed from a fixed list of vectors: span asks which vectors that set contains, independence asks whether more than one choice of coefficients can produce the same vector (in particular, the zero vector), and basis asks for the smallest list whose combinations already give the whole space. Because they're all views of the same construction, a fact proved about linear combinations — e.g. that they're closed under further combination — applies to all three automatically. ^card-xdmr

A **subspace** is a subset of a vector space that is itself a vector
space under the same operations — equivalently, a subset closed under
linear combinations. That closure requirement forces a subspace to
contain the zero vector, since `0*v = 0` is itself a linear combination of
anything in the subset. This is the standard first trap: a line in the
plane that does not pass through the origin fails to contain the zero
vector, so despite looking exactly like a line through the origin, it is
not a subspace — no combination of its points can produce the origin,
because every point on it already has a fixed nonzero offset.

```
S is a subspace of V  iff  for all u, v in S and all scalars a, b:
    a*u + b*v  is in S

(equivalently: S is closed under addition, closed under scalar
multiplication, and 0 is in S)
```

> [!card] mcq
> Which of the following is NOT a subspace of R^2?
> - [x] The line `{(x, y) : y = x + 1}`
> - [ ] The line `{(x, y) : y = x}`
> - [ ] The single point `{(0, 0)}`
> - [ ] All of R^2 ^card-3b91

Why must every subspace contain the zero vector, and what everyday-looking set does this rule out? :: A subspace must be closed under scalar multiplication, and multiplying any vector already in the subspace by the scalar 0 produces the zero vector — so 0 has to be in the subspace already for closure to hold. This rules out any line, plane, or other flat set that does not pass through the origin: it looks geometrically like a subspace (straight, flat, extends infinitely) but fails this one algebraic test. ^card-hhmq

`R^n` — the set of ordered n-tuples of real numbers — is the vector space
used constantly in practice, but it's worth keeping a distinction in
mind: an element of `R^n` is a list of ==coordinates==, meaningful only ^card-5isu
relative to a chosen basis. The same geometric vector gets a different
numeric list depending on which basis you measure it against. Conflating
"the vector" with "its list in the standard basis" is harmless until
change of basis comes up, at which point the distinction is the entire
content of what's being computed — the vector doesn't move, only the
numbers describing it do.

Why is an element of R^n better described as "coordinates relative to a chosen basis" than as "the vector itself"? :: Because the same underlying vector is assigned a different tuple of numbers depending on which basis is used to measure it — the tuple is a description in a particular reference frame, not an intrinsic property of the vector. Treating the tuple as the vector itself makes change of basis look like the vector changing, when really only the description of it has changed. ^card-yu8l

> [!card] mcq
> A subset S of a vector space is closed under addition and under scalar multiplication, but nobody has checked whether 0 is in S. Is S guaranteed to be a subspace?
> - [x] Yes — if S is nonempty, closure under scalar multiplication already forces 0 into S, since 0 times any element of S gives the zero vector
> - [ ] No, containing 0 must be checked as a separate, independent condition
> - [ ] No, S also needs to be checked for closure under subtraction separately
> - [ ] Yes, but only if S is also required to be finite ^card-kitk

This note deliberately stops short of independence, span, and basis as
formal definitions — `linear-independence-span-and-basis.md` develops
those. It also doesn't touch orthogonality or angle, which need the dot
product from `dot-product-and-orthogonality.md` first.
