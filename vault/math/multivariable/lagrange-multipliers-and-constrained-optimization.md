---
topic: math
category: math-multivariable
tags: [lagrange-multipliers, constrained-optimization, gradients, shadow-price]
citations: ["Stewart, Calculus: Early Transcendentals 8e, Ch. 14"]
---

# Lagrange multipliers and constrained optimization

`critical-points-and-the-second-derivative-test.md` ends by needing to
search a region's boundary, not just its interior — and a boundary is
usually described by a constraint equation rather than by $\nabla f = 0$. This
note is the general method for optimizing $f$ subject to a constraint
$g(x) = c$, and it starts from a picture, because the algebra alone is
unmemorable.

Imagine the level curves of $f$ drawn across the plane, and the
constraint curve $g(x, y) = c$ cutting through them. Walking along the
constraint curve, $f$'s value changes — except at a point where the
constraint curve is exactly tangent to a level curve of $f$. At that
tangency, moving along the constraint no longer crosses to a
higher or lower level of $f$ to first order, which is exactly the
condition for a constrained extremum.

At a point of tangency between a curve and a level curve, why must their gradient vectors be parallel? :: Because both gradients are perpendicular to their own curve at that point, and the two curves share a common tangent line there — two vectors each perpendicular to the same line must themselves be parallel (scalar multiples of each other). ^card-e843

Since $\nabla f$ is perpendicular to $f$'s level curves and $\nabla g$ is
perpendicular to the constraint curve, tangency between the curves forces
$\nabla f$ and $\nabla g$ to be parallel — one is a scalar multiple of the other.
That scalar is the Lagrange multiplier, conventionally called $\lambda$,
and it is exactly the constant of proportionality, nothing more
mysterious.

The scalar linking the two gradients at a constrained optimum is
conventionally named ==lambda==. ^card-hc6h

The method turns this into a solvable system: a candidate constrained
extremum must satisfy $\nabla f = \lambda \nabla g$, together with the constraint
itself.

$$
\begin{aligned}
\nabla f(x, y) &= \lambda \nabla g(x, y) \\
g(x, y) &= c
\end{aligned}
$$

For a two-variable problem this is three scalar equations —
$f_x = \lambda g_x$, $f_y = \lambda g_y$, and $g(x, y) = c$ — in three
unknowns, $x$, $y$, and $\lambda$.

> [!card] recall
> Write the full system of equations that a Lagrange-multiplier candidate for optimizing f(x, y) subject to g(x, y) = c must satisfy.
> ---
> ∇f(x, y) = lambda * ∇g(x, y), together with the constraint equation g(x, y) = c itself. Dropping the constraint equation leaves only two equations (from the gradient-parallel condition) in three unknowns (x, y, lambda), which is underdetermined and cannot be solved. ^card-mmuq

Forgetting $g(x) = c$ and solving only the gradient-parallel equations is
the most common mechanical error: it leaves you one equation short, since
$\nabla f = \lambda \nabla g$ alone is satisfied by an entire curve of points, and only
the constraint pins down which one you actually want.

> [!card] mcq
> Which of these is the correct full system for optimizing f(x, y, z) subject to a single constraint g(x, y, z) = c?
> - [x] ∇f = lambda*∇g, and g(x, y, z) = c
> - [ ] ∇g = lambda*∇f, and g(x, y, z) = c
> - [ ] ∇f = lambda*∇g, with no further condition needed
> - [ ] f = lambda*g, and ∇g(x, y, z) = c ^card-alj8

The multiplier $\lambda$ is not just bookkeeping — it has a direct
interpretation as a **shadow price**: the rate at which the optimal value
of $f$ changes as the constraint constant $c$ is relaxed or tightened.
Formally, $\lambda = d(f^*)/dc$, where $f^*$ is the optimal value as a
function of $c$. This is why the method shows up throughout economics
(the marginal value of loosening a budget constraint) and machine
learning (the marginal cost of a regularization constraint) rather than
staying a purely geometric curiosity.

Why is the Lagrange multiplier called a "shadow price" in an economics context, such as maximizing output subject to a budget constraint? :: Because its value equals the marginal increase in the optimal objective (e.g., maximum output) per unit relaxation of the constraint (e.g., one more dollar of budget) — it prices out, in units of the objective, exactly how much the constraint itself is costing you at the optimum. ^card-6pmu

With **multiple constraints** $g_1(x) = c_1$, ..., $g_k(x) = c_k$, the
condition generalizes: at a constrained extremum, $\nabla f$ must lie in the
span of the constraint gradients, $\nabla f = \lambda_1 \nabla g_1 + \cdots + \lambda_k \nabla g_k$,
one multiplier per constraint, together with all $k$ constraint
equations.

> [!card] mcq
> With two constraints g_1(x) = c_1 and g_2(x) = c_2, what must be true of ∇f at a constrained extremum?
> - [x] ∇f lies in the span of ∇g_1 and ∇g_2 — i.e., ∇f = lambda_1*∇g_1 + lambda_2*∇g_2 for some scalars
> - [ ] ∇f must be parallel to both ∇g_1 and ∇g_2 individually
> - [ ] ∇f must equal ∇g_1 + ∇g_2 exactly, with no free multipliers
> - [ ] The two constraints must first be combined into one before any gradient condition applies ^card-tzf9

The method also rests on a hypothesis that's easy to forget because it's
rarely violated in textbook problems: it assumes $\nabla g \neq 0$ at the
solution. Where the constraint surface is singular, the tangency argument
breaks down entirely, and the method can miss genuine extrema sitting
exactly at that singular point.

A constraint surface can be singular — for instance carrying a sharp
==cusp== — at exactly the points where its gradient vanishes. ^card-b770

What regularity condition does the Lagrange multiplier method assume, and what can go wrong at a point where it fails? :: It assumes ∇g != 0 at the candidate point. Where the constraint's gradient vanishes, the constraint surface can have a singular point (a cusp or self-intersection) where the level-set tangency argument breaks down, and the method can fail to find an extremum located exactly there. ^card-dbba

Finally, the system $\nabla f = \lambda \nabla g$ with $g = c$ only produces
**candidates** — points where a constrained extremum could occur, the
same way $\nabla f = 0$ only produces unconstrained candidates. The method
itself doesn't rank them. Finding the actual constrained max or min still
requires evaluating $f$ at every candidate the system returns and
comparing the values directly.

Solving the Lagrange system for a constrained optimization problem returns three candidate points. What is the remaining step before you can report the constrained maximum? :: Evaluate f at each of the three candidate points and compare the resulting values directly — the point with the largest f-value is the constrained maximum. The Lagrange condition alone doesn't rank or classify the candidates. ^card-dfof
