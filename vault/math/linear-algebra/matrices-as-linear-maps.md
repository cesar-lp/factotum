---
topic: math
category: math-linear-algebra
tags: [linear-map, matrix, column-space, linearity, basis]
citations: ["Strang, Introduction to Linear Algebra 5e, Ch. 1"]
---

# Matrices as Linear Maps

Vectors, dot products, and bases give you objects to manipulate; this
note gives you the thing that does the manipulating. A matrix is not
primarily a grid of numbers — it's a function. Writing $Ax$ means "feed
x into the linear map A," and everything else in this category, from
multiplication to eigenvalues, is a fact about that function rather
than about the entries themselves.

The property that makes a matrix worth studying as a *linear* map is
linearity itself:

$$
\begin{aligned}
A(x + y) &= Ax + Ay \\
A(cx) &= c(Ax)
\end{aligned}
$$

That pair of identities looks modest, but it has a strong consequence:
a linear map is completely determined by what it does to a basis. Any
vector x decomposes as a linear combination of basis vectors, and
linearity lets you push A through that sum term by term — so once you
know where A sends each basis vector, you know where it sends
everything.

> [!card] recall
> A linear map A agrees with another linear map B on every vector in a
> basis of the domain. Explain why A and B must then agree everywhere,
> using the two linearity identities above.
> ---
> Any vector x in the domain can be written as a linear combination
> x = c_1*v_1 + c_2*v_2 + ... + c_n*v_n of the basis vectors. Applying
> A and using A*(x+y) = A*x + A*y together with A*(c*x) = c*(A*x)
> repeatedly gives A*x = c_1*(A*v_1) + c_2*(A*v_2) + ... + c_n*(A*v_n).
> Since A and B agree on every v_i, this sum is identical whether you
> apply A or B, so A*x = B*x for every x — the maps agree on the whole
> domain, not just the basis. ^card-r68d

That fact is what makes the columns of a matrix so informative. The
standard basis vector e_1 is 1 in the first slot and 0 elsewhere, so
$Ae_1$ picks out exactly the first column of A — nothing else in the
matrix contributes. The same holds for every e_i: $Ae_i$ is the i-th
column of A. So the columns of A are literally the images of the basis
vectors, and you can read off what the transformation does just by
looking at where it sends each e_i.

> [!card] mcq
> A 2-by-2 matrix A has first column (3, 0) and second column (0, -1).
> Reading the columns as images of e_1 and e_2, what does A do to the
> plane?
> - [x] Stretches the x-direction by a factor of 3 and flips the y-direction
> - [ ] Rotates every vector by 90 degrees
> - [ ] Stretches both axes by 3 and leaves y unchanged
> - [ ] Projects every vector onto the x-axis ^card-qpmg

This is the ==column picture== of matrix-vector multiplication: $Ax$ ^card-1iv4
is not "dot each row of A against x" so much as it is a recipe for
combining columns. Writing x = (x_1, x_2, ..., x_n), the product is a
weighted sum of A's own columns:

$$
Ax = x_1 a_1 + x_2 a_2 + \cdots + x_n a_n
$$

where a_1, ..., a_n are the columns of A. The row picture — computing
each output entry as a dot product $\operatorname{row}_i(A) \cdot x$ — gives the identical
numbers, but it answers a different question. The row picture tells
you one output coordinate at a time; the column picture tells you that
every output is built from the *same* set of directions, the columns,
just combined in different proportions for different inputs. That's
the picture that generalizes: it's what makes rank, column space, and
the whole idea of a matrix "reaching" only certain outputs (covered in
the next note) make sense.

Why does the column picture of A*x generalize better than the row picture, even though both compute the same numbers? :: The column picture shows that every possible output of A is some linear combination of a fixed, small set of vectors — A's own columns — so the set of everything A can produce is exactly the span of its columns. The row picture only tells you how to compute one output coordinate at a time and gives no direct handle on what the full range of outputs looks like; the column-space idea that rank and solvability depend on has no natural row-picture analogue. ^card-9qcm

Shape is not incidental bookkeeping — it's a statement about domain and
codomain. An m-by-n matrix takes n numbers in and produces m numbers
out, so it represents a map from R^n to R^m: n columns because there
are n basis vectors in the domain to send somewhere, and m entries per
column because each image lives in the m-dimensional codomain.

> [!card] mcq
> A matrix A is 3-by-5. Which statement about the linear map it
> represents is correct?
> - [x] A maps R^5 to R^3
> - [ ] A maps R^3 to R^5
> - [ ] A maps R^5 to R^5
> - [ ] The shape alone doesn't determine domain or codomain ^card-8j0l

A ==5-by-3== matrix, by contrast, would map R^3 into R^5 — same two ^card-9mmy
numbers, opposite roles, because the column count fixes the domain and
the row count fixes the codomain.

> [!card] recall
> A linear map is known only to send e_1 to (1, 2) and e_2 to (3, -1).
> Write down the 2-by-2 matrix A that represents it, and use the column
> picture to find A times the vector (5, 1).
> ---
> The columns of A are the images of the basis vectors, so
> A = [[1, 3], [2, -1]] (first column (1,2), second column (3,-1)).
> By the column picture, A*(5,1) = 5*(1,2) + 1*(3,-1) = (5,10) + (3,-1)
> = (8, 9). ^card-2f1u

This note treats "matrix" and "linear map" as one idea.

The next note, on multiplication, treats composing two such maps, and
the one after covers what a map's columns can and cannot reach — the
column space and null space.
