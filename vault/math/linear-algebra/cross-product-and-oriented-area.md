---
topic: math
category: math-linear-algebra
tags: [cross-product, determinant, triple-product, orientation]
citations: ["Strang, Introduction to Linear Algebra 5e, Ch. 11"]
---

# Cross product and oriented area

Everything else in this category — span, rank, determinants — works in
any dimension. The cross product doesn't: it is defined only for vectors
in R^3, and unlike the dot product, it produces another vector rather
than a scalar. That combination (dimension-specific, vector-valued) is
unusual enough that it's worth being explicit about what makes the cross
product special and where that specialness stops paying off.

For `x, y` in R^3, the cross product `x × y` is the vector with

```
||x × y|| = ||x|| * ||y|| * sin(theta)
```

where `theta` is the angle between `x` and `y`. That magnitude is exactly
the area of the parallelogram spanned by `x` and `y` — two sides of length
`||x||` and `||y||` meeting at angle `theta` enclose a parallelogram of
that area, which is the standard formula "base times height" written in
terms of sine. The direction of `x × y` is perpendicular to both `x` and
`y`, with which of the two perpendicular directions decided by the
**right-hand rule**: curl the fingers of the right hand from `x` toward
`y`, and the thumb points along `x × y`. So the cross product packs two
different pieces of geometric information into one object — magnitude
measures the size of the area spanned, direction encodes the orientation
of that spanning (which vector comes "first").

> [!card] mcq
> Two nonzero, non-parallel vectors x and y in R^3 satisfy ||x × y|| = 6.
> What does the value 6 represent?
> - [x] The area of the parallelogram with sides x and y
> - [ ] The area of the triangle with sides x and y
> - [ ] The length of the vector obtained by projecting x onto y
> - [ ] The volume of the parallelepiped spanned by x and y ^card-rt76

Why does the cross product produce a vector rather than a scalar, unlike the dot product? :: Because the result needs to carry orientation information (which of the two directions perpendicular to both x and y) in addition to a magnitude (the spanned area) — a single number can encode a size but not a direction in 3-space, so the cross product's output has to be vector-valued to carry both pieces of information at once. ^card-5k4p

The cross product is **anticommutative**:

```
x × y = -(y × x)
```

swapping the order flips the sign — geometrically, it flips which of the
two perpendicular directions the right-hand rule selects, since curling
from `y` to `x` reverses the curl direction. A direct consequence: `x × x
= 0` for every vector, since swapping x with itself must equal its own
negative, and the only vector equal to its own negative is the zero
vector. More generally, the cross product of any two ==parallel== vectors ^card-8g4l
is zero, because `sin(theta) = 0` when `theta` is 0 or 180 degrees — which
makes `x × y = 0` a direct collinearity test: it succeeds precisely when
x and y point along the same line.

> [!card] mcq
> If x × y = -(y × x) for all vectors x, y in R^3, which of these must also be true for every vector x?
> - [x] x × x = 0
> - [ ] x × x = ||x||^2
> - [ ] x × x is undefined
> - [ ] x × x always points along the z-axis ^card-mia5

In coordinates, for `x = (x1, x2, x3)` and `y = (y1, y2, y3)`:

```
x × y = ( x2*y3 - x3*y2,
          x3*y1 - x1*y3,
          x1*y2 - x2*y1 )

equivalently, the formal determinant:
        | i   j   k  |
x × y = | x1  x2  x3 |
        | y1  y2  y3 |
```

The **scalar triple product** `x·(y × z)` combines both products into a
single number: it computes the cross product `y × z` (a vector whose
length is the area of the base parallelogram, pointing perpendicular to
that base) and then dots it with `x`, which projects `x` onto that
perpendicular direction and scales by the base area — exactly the volume
formula "base area times height" for the parallelepiped spanned by `x`,
`y`, and `z`. A zero triple product means that parallelepiped has zero
volume, which happens exactly when the three vectors are ==coplanar== — ^card-od7v
they don't span a genuine 3-dimensional box, only a flat region.

What does it mean geometrically for the scalar triple product x·(y × z) to equal zero, and why does that follow from its formula as a volume? :: It means the three vectors x, y, z are coplanar — they lie in a common plane rather than spanning a genuine three-dimensional region. This follows because the triple product computes the volume of the parallelepiped the three vectors span; a parallelepiped flattened into a plane has zero height and therefore zero volume, regardless of the base area. ^card-w615

It's worth being honest about how far this generalizes: it doesn't. The
cross product's dimension-3, vector-valued behavior is a special
coincidence of R^3, not a preview of a general pattern. The tools that
actually generalize the ideas here — signed area and volume, and the
algebra of oriented multi-dimensional objects — are the determinant
(covered in `determinants-and-invertibility.md`) and, beyond that, the
wedge product from exterior algebra, which is defined in every dimension
and of which the R^3 cross product is a disguised special case. That's
why the cross product shows up constantly in physics and 3-D geometry
(torque, angular momentum, surface normals) and essentially nowhere else
in mathematics that isn't secretly working in three dimensions.

> [!card] recall
> Explain why the cross product is described as "not the general tool" in
> linear algebra, despite being extremely useful in physics and 3-D
> geometry. Name the two constructs that actually generalize the ideas it
> captures.
> ---
> The cross product only exists for R^3 and is a special coincidence of
> that dimension, not an instance of a pattern that extends to other
> dimensions. The constructs that do generalize — the determinant (signed
> volume in n dimensions) and the wedge product from exterior algebra
> (oriented multi-dimensional area/volume in any dimension) — reduce to
> something cross-product-like specifically in R^3, which is why the cross
> product feels central there but has no direct counterpart in, say, R^4
> or R^7. ^card-03w7

Why does swapping the order of a cross product's operands flip the direction it points, rather than simply changing its magnitude? :: The right-hand rule ties the output direction to the order in which the fingers curl from the first vector to the second; reversing which vector is named first reverses the curl direction, and the only way for the perpendicular vector to reflect that reversed curl is to point the opposite way. The magnitude (the spanned area) doesn't depend on order at all, since area is symmetric in the two sides — only the direction encodes order. ^card-sbcv
