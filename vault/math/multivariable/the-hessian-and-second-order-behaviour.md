---
topic: math
category: math-multivariable
tags: [hessian, second-order, taylor-expansion, definiteness, quadratic-form]
citations: ["Stewart, Calculus: Early Transcendentals 8e, Ch. 14.7"]
---

# The Hessian and second-order behaviour

`the-jacobian.md` collects first partials into a matrix; the **Hessian**
does the same for second partials — it is the Jacobian of the gradient,
the matrix of every second partial derivative of a scalar field:

$$
H = \begin{bmatrix}
\dfrac{\partial^2 f}{\partial x_1^2} & \dfrac{\partial^2 f}{\partial x_1 \partial x_2} & \cdots & \dfrac{\partial^2 f}{\partial x_1 \partial x_n} \\
\dfrac{\partial^2 f}{\partial x_2 \partial x_1} & \dfrac{\partial^2 f}{\partial x_2^2} & \cdots & \dfrac{\partial^2 f}{\partial x_2 \partial x_n} \\
\vdots & & \ddots & \vdots \\
\dfrac{\partial^2 f}{\partial x_n \partial x_1} & \dfrac{\partial^2 f}{\partial x_n \partial x_2} & \cdots & \dfrac{\partial^2 f}{\partial x_n^2}
\end{bmatrix}
$$

That's what the Hessian *is*; what it's *for* is the second-order term
in a multivariable Taylor expansion — the natural generalization of the
one-variable $f(x+h) \approx f(x) + f'(x)h + \frac{1}{2}f''(x)h^2$, which
`math-calculus` covers for a single input:

$$
f(a + h) \approx f(a) + \nabla f(a) \cdot h + \frac{1}{2} h^\top H(a) h
$$

The gradient term gives the best *linear* approximation near $a$; the
Hessian term is the first correction that captures curvature, exactly as
$f''$ does in one variable.

Why is the Hessian described as "the Jacobian of the gradient"? :: The gradient ∇f is itself a vector-valued function of the input point, mapping R^n to R^n. Taking the Jacobian of that vector-valued function — the matrix of all its first partials — produces exactly the matrix of all second partials of the original scalar field f, which is the Hessian. ^card-1urs

Under the hypothesis that the second partials are continuous near the
point — the same hypothesis behind the mixed-partials (Clairaut's)
result — the Hessian is guaranteed ==symmetric==: $\partial^2 f/\partial x_i \partial x_j$ equals ^card-cc0j
$\partial^2 f/\partial x_j \partial x_i$. This isn't a separate fact to re-derive here; it's the
same equality-of-mixed-partials statement applied to every off-diagonal
entry at once.

For a fixed nonzero direction vector $h$, the quadratic form $h^\top H h$
is the multivariable stand-in for the sign of $f''$ in the one-variable
second-derivative test, and its behavior across *all* directions $h$
defines the Hessian's **definiteness**:

$$
\begin{aligned}
\text{positive definite:} &\quad h^\top H h > 0 \text{ for every nonzero } h \quad \text{(curves up every way)} \\
\text{negative definite:} &\quad h^\top H h < 0 \text{ for every nonzero } h \quad \text{(curves down every way)} \\
\text{indefinite:} &\quad h^\top H h > 0 \text{ for some } h\text{, } < 0 \text{ for others} \quad \text{(saddle)}
\end{aligned}
$$

> [!card] mcq
> A Hessian H is positive definite at a point. What does this say about
> how f curves near that point?
> - [x] f curves upward in every direction through the point
> - [ ] f curves downward in every direction through the point
> - [ ] f curves upward in some directions and downward in others
> - [ ] f is linear near the point, with no curvature ^card-ulpi

Definiteness reduces entirely to the signs of the Hessian's
==eigenvalues==. All positive gives positive definite, all negative ^card-063p
gives negative definite, and a mix of signs gives a saddle, curving up
in some directions and down in others — so definiteness is checkable
without testing every direction $h$ by hand.

Eigenvalues themselves, and how to compute them, belong to
`math-linear-algebra`; this note only uses their signs as the
Hessian-specific fact that settles definiteness.

Why does an indefinite Hessian at a point rule out that point being either a local maximum or a local minimum? :: An indefinite Hessian means the quadratic form h^T*H*h is positive along some direction and negative along another, so the function curves upward along one direction through the point and downward along a different direction through the same point. A local max requires downward curvature in every direction and a local min requires upward curvature in every direction, so a mix of both is incompatible with either. ^card-6uqu

> [!card] recall
> Explain how the signs of a Hessian's eigenvalues determine whether it
> is positive definite, negative definite, or indefinite.
> ---
> If every eigenvalue is positive, the Hessian is positive definite; if
> every eigenvalue is negative, it is negative definite. If the
> eigenvalues have mixed signs (some positive, some negative), the
> Hessian is indefinite. A zero eigenvalue makes the test inconclusive
> at that direction. ^card-tnry

This note sets up definiteness as a concept; turning it into a working
test for classifying a specific critical point as a max, min, or saddle
is covered separately.

The Hessian's practical cost is worth stating honestly: for $n$ input
variables it has $n^2$ entries (n*(n+1)/2 distinct ones, by symmetry),
so computing and storing it becomes expensive fast as $n$ grows — a
model with a million parameters has a Hessian with a trillion entries.
This is exactly why second-order optimization methods, which use the
Hessian to choose a search direction, are reserved for small problems,
while large-scale optimization (`gradient-descent-and-why-the-gradient-matters.md`)
almost always uses gradient information alone.

> [!card] mcq
> Why do most large-scale optimization methods (e.g. training a model
> with millions of parameters) avoid using the Hessian directly?
> - [x] The Hessian has n^2 entries, making it too expensive to compute and store at that scale
> - [ ] The Hessian is undefined for functions of more than two variables
> - [ ] The Hessian only exists at critical points, so it can't be used during a general search
> - [ ] The Hessian is always singular for high-dimensional functions ^card-e6we

> [!card] recall
> Write the second-order Taylor expansion of a scalar field f near a
> point a, in terms of the gradient and the Hessian, and state which
> term captures curvature information that the gradient term alone
> cannot.
> ---
> f(a + h) ≈ f(a) + ∇f(a)·h + (1/2)*h^T*H(a)*h. The gradient term
> ∇f(a)·h gives only the best linear (flat) approximation; the Hessian
> term (1/2)*h^T*H(a)*h is the first term that captures how the function
> bends, since it depends on second derivatives rather than first. ^card-xboo
