---
topic: math
category: math-multivariable
tags: [jacobian, vector-valued-functions, determinant, inverse-function-theorem]
citations: ["Stewart, Calculus: Early Transcendentals 8e, Ch. 14.5, 15.9"]
---

# The Jacobian

`the-gradient-and-steepest-ascent.md` handles the derivative of a scalar
field, one output number. Most interesting functions in applications —
coordinate changes, robot arm kinematics, neural network layers — output
several numbers at once, $f: \mathbb{R}^n \to \mathbb{R}^m$. The **Jacobian** is the total
derivative for that general case: the matrix collecting every first
partial derivative of every output component with respect to every
input variable.

$$
J = \begin{bmatrix}
\dfrac{\partial f_1}{\partial x_1} & \dfrac{\partial f_1}{\partial x_2} & \cdots & \dfrac{\partial f_1}{\partial x_n} \\
\dfrac{\partial f_2}{\partial x_1} & \dfrac{\partial f_2}{\partial x_2} & \cdots & \dfrac{\partial f_2}{\partial x_n} \\
\vdots & & \ddots & \vdots \\
\dfrac{\partial f_m}{\partial x_1} & \dfrac{\partial f_m}{\partial x_2} & \cdots & \dfrac{\partial f_m}{\partial x_n}
\end{bmatrix}
$$

The shape is the single most-confused point about the Jacobian, so state
it precisely: $m$ rows, one per output component, by $n$ columns, one
per input variable. A function with 3 outputs and 5 inputs has a 3-by-5
Jacobian, never the other way around.

> [!card] mcq
> f: R^5 -> R^3 is a vector-valued function of 5 input variables
> producing 3 outputs. What are the dimensions of its Jacobian matrix?
> - [x] 3 rows by 5 columns
> - [ ] 5 rows by 3 columns
> - [ ] 5 rows by 5 columns
> - [ ] 3 rows by 3 columns ^card-c6e9

Why does the Jacobian of a function f: R^n -> R^m have m rows and n columns rather than n rows and m columns? :: Each row of the Jacobian corresponds to one output component's gradient, and there is one such row per output — m of them. Each column corresponds to one input variable's partial derivative across every output, and there are n input variables, giving n columns. Rows track outputs, columns track inputs. ^card-gq8y

Two special cases tie this back to material already covered. When
$m = 1$, the function is a scalar field and the Jacobian collapses to a
single row — the ==gradient== written as a row vector rather than a ^card-e4si
column. When additionally $n = 1$, both dimensions collapse and the
Jacobian is just the ordinary scalar derivative $f'(x)$.

Whether the gradient itself should be treated as a row or a column is a
genuine convention disagreement in the literature — some texts define
$\nabla f$ as a column vector for consistency with vectors in general, others
as a row to match it directly to the Jacobian's first row — and that
disagreement is exactly why shape errors involving the gradient are so
common when switching between sources.

What accounts for the disagreement, across different textbooks, over whether the gradient should be written as a row vector or a column vector? :: The Jacobian naturally produces the gradient as a row when m = 1, since the Jacobian's single row is the gradient's components in order. But treating gradients as ordinary vectors, which are conventionally columns, motivates writing it as a column instead. Neither convention is wrong; the disagreement means shape has to be checked against whichever source is in use rather than assumed. ^card-c21q

For a Jacobian that's square ($n = m$, same number of inputs as
outputs), the **Jacobian determinant** $\det(J)$ measures how much the
function locally scales volume — a small region of input space near a
point gets stretched or shrunk by a factor of $|\det(J)|$ under the map,
and flipped in orientation if $\det(J)$ is negative. This is exactly the
correction factor in the change-of-variables formula for multiple
integrals: switching from Cartesian to polar coordinates multiplies the
area element by $r$, which is precisely $|\det(J)|$ for that coordinate
transformation.

> [!card] recall
> State the role of the Jacobian determinant in the change-of-variables
> formula for multiple integrals, and explain what a negative Jacobian
> determinant means geometrically.
> ---
> When substituting variables in a multiple integral, the volume element
> transforms as dV_new = |det(J)| * dV_old, where J is the Jacobian of
> the transformation — it's the local volume-scaling factor. A negative
> determinant means the transformation reverses orientation (like a
> reflection) at that point, which is why the formula takes the absolute
> value. ^card-htu2

The Jacobian determinant also governs invertibility: the **inverse
function theorem** states that if $f$ is continuously differentiable
near a point and its Jacobian determinant there is ==nonzero==, then $f$ ^card-nyi7
is locally invertible near that point, with a differentiable inverse.
A zero Jacobian determinant is exactly the condition that can make local
invertibility fail — the map locally collapses some direction to zero
volume, so it can't be undone.

> [!card] recall
> State the inverse function theorem's hypothesis and conclusion for a
> continuously differentiable function f: R^n -> R^n at a point a.
> ---
> If the Jacobian determinant of f at a is nonzero, then f is locally
> invertible near a: there exist neighborhoods of a and f(a) on which f
> is a bijection with a differentiable inverse. A zero Jacobian
> determinant at a gives no such guarantee. ^card-f04q

> [!card] mcq
> f: R^2 -> R^2 has Jacobian determinant equal to 0 at a point p. What
> does the inverse function theorem say about f near p?
> - [x] Nothing — the theorem's hypothesis fails, so it gives no conclusion either way about local invertibility
> - [ ] f is guaranteed not to be locally invertible near p
> - [ ] f is guaranteed to be locally invertible near p, just without a smooth inverse
> - [ ] f must be constant in a neighborhood of p ^card-drrm
