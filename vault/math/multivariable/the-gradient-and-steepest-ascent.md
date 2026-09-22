---
topic: math
category: math-multivariable
tags: [gradient, steepest-ascent, level-sets, orthogonality, covector]
citations: ["Stewart, Calculus: Early Transcendentals 8e, Ch. 14.6"]
---

# The gradient and steepest ascent

`partial-derivatives.md` ended on a gap: the two axis-aligned partials
don't describe behavior along every direction. The **gradient** is the
object that closes that gap and becomes the single most important
construct in this category — everything from Lagrange multipliers to
gradient descent is a statement about it. It is simply the vector of
all first partials:

$$
\begin{aligned}
\nabla f(x, y) &= \left(\frac{\partial f}{\partial x}, \frac{\partial f}{\partial y}\right) \\
\nabla f(x, y, z) &= \left(\frac{\partial f}{\partial x}, \frac{\partial f}{\partial y}, \frac{\partial f}{\partial z}\right)
\end{aligned}
$$

Three facts make the gradient worth naming as its own object rather
than just a bundle of partials: it points in the direction of steepest
ascent at that point, its magnitude $\|\nabla f\|$ is the maximum rate of
increase in any direction, and it is orthogonal to the level set passing
through the point.

> [!card] recall
> State the three defining properties of the gradient ∇f at a point,
> covering direction, magnitude, and its relationship to level sets.
> ---
> (1) ∇f points in the direction of steepest ascent of f at that point.
> (2) ||∇f|| equals the maximum possible rate of change of f in any
> direction at that point. (3) ∇f is orthogonal to the level set (level
> curve or level surface) of f passing through that point. ^card-ycc9

The steepest-ascent property is not a separate assumption bolted onto
the gradient — it falls straight out of the directional derivative
formula covered in `directional-derivatives.md`, $D_u f = \nabla f \cdot u$ for a
unit vector u. The dot product $\nabla f \cdot u$ equals $\|\nabla f\| \|u\| \cos(\theta)$,
where theta is the angle between the two vectors, and since $\|u\| = 1$
this is maximized exactly when $\cos(\theta) = 1$ — that is, when u points
in the same direction as $\nabla f$. Steepest ascent is a consequence of the
dot product being maximized by alignment, not a fact about gradients
specifically.

> [!card] mcq
> Why does the gradient point in the direction of steepest ascent?
> - [x] Because D_u f = ∇f·u is maximized over unit vectors u exactly when u points in the same direction as ∇f, by the dot product's dependence on the angle between vectors
> - [ ] Because the gradient is defined as the steepest-ascent direction, independent of the directional derivative
> - [ ] Because partial derivatives are always largest along the coordinate axes
> - [ ] Because the level set through the point is always perpendicular to the coordinate axes ^card-xv08

The orthogonality-to-level-sets property is the same underlying fact
viewed from a different angle, not an independent theorem. Moving along
a level set, by definition, does not change the value of $f$ at all —
so the directional derivative along any direction tangent to the level
set must be zero. Since $D_u f = \nabla f \cdot u$ and this is zero for every u
tangent to the level set, $\nabla f$ can have no component along that tangent
direction, which is exactly what it means for $\nabla f$ to be orthogonal to
the level set.

Why must the gradient be orthogonal to the level set through a point, rather than this being an independent fact about gradients? :: Because moving along a level set leaves f unchanged, the directional derivative in every direction tangent to that level set is zero. Since D_u f = ∇f·u, a zero directional derivative for every tangent direction u means ∇f has no component in the tangent plane at all, so it must point perpendicular to the level set. ^card-k7h6

> [!card] mcq
> At a point on a contour plot, which direction does ∇f point relative to the contour line passing through that point?
> - [x] Perpendicular to the contour line, pointing toward higher values
> - [ ] Tangent to the contour line, in the direction the value increases fastest along it
> - [ ] Parallel to the contour line, always pointing toward the nearest contour
> - [ ] There is no fixed relationship between the two ^card-nj5b

At a ==critical point==, where every partial derivative is zero, the ^card-5rwu
gradient vector itself is the zero vector. This is a meaningful loss of
information: a nonzero gradient always carries a direction (steepest
ascent) and a magnitude (the steepest rate), but the zero vector carries
no direction at all, so the gradient alone cannot say which way the
function is increasing at such a point.

Answering that question takes second-order information, which is the
subject of two sibling notes later in this category.

One honest caveat, left undeveloped here: the gradient is not purely a
property of $f$ on its own — it is a *covector* in disguise, and its
components depend on the choice of inner product used to measure
lengths and angles in the domain. Changing that inner product changes
what "steepest" means, even though the partial derivatives themselves
don't change.

What happens to the gradient vector at a critical point, and what information is lost as a result compared to a nonzero gradient? :: At a critical point every partial derivative is zero, so the gradient itself is the zero vector. A nonzero gradient carries both a direction (steepest ascent) and a magnitude (the steepest rate of increase), but the zero vector has no direction, so the gradient alone gives no information about which way the function increases near that point. ^card-dcli

Why is the direction of steepest ascent, geometrically, not the same thing as the direction along a contour line where the function's value is unchanging? :: The direction along a contour line is precisely a direction of zero change, since the level set is defined by holding f constant; steepest ascent is the direction of maximum change. These two directions are perpendicular to each other at every point, which is exactly the orthogonality property of the gradient — they answer opposite questions (no change vs. maximum change) and can never coincide except where the gradient itself vanishes. ^card-z7lm
