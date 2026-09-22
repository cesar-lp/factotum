---
topic: math
category: math-multivariable
tags: [partial-derivatives, clairaut, mixed-partials, higher-order]
citations: ["Stewart, Calculus: Early Transcendentals 8e, Ch. 14.3"]
---

# Partial derivatives

`functions-of-several-variables.md` established that a scalar field
takes several inputs at once; a **partial derivative** is the first,
smallest step toward differentiating one — and it works by cheating the
multivariable problem away entirely. To compute $\partial f/\partial x$, freeze every
other variable at a constant value and take the ordinary single-variable
derivative with respect to $x$ alone. Nothing new is required: every
differentiation rule from `math-calculus` applies unchanged, because
once the other variables are frozen, $f$ is a function of one variable
again.

$$
\frac{\partial f}{\partial x} = \lim_{h \to 0} \frac{f(x+h, y) - f(x, y)}{h}
$$

That same cheapness is also the partial derivative's limitation. Because
$\partial f/\partial x$ only asks what happens as $x$ moves and $y$ stays fixed, it
describes the function's behavior along a single coordinate direction —
one slice through the surface — and says nothing about what happens
along any other direction. Two functions can have identical partials at
a point and still behave completely differently along a diagonal
approach; a full local description needs more than the two axis-aligned
slopes, which is exactly the gap `directional-derivatives.md` and
`the-gradient-and-steepest-ascent.md` fill.

> [!card] mcq
> For f(x, y) = x^2*y + sin(y), which expression is ∂f/∂y?
> - [x] x^2 + cos(y)
> - [ ] 2*x*y + cos(y)
> - [ ] x^2 + sin(y)
> - [ ] 2*x + cos(y) ^card-vh5g

Notation varies across sources but always means the same object:
$\partial f/\partial x$, $f_x$, and $D_x f$ are interchangeable. Taking a partial
derivative again produces a **higher-order** partial: $\partial^2 f/\partial x^2$ (also
written $f_{xx}$) differentiates twice with respect to $x$.

A derivative that differentiates with respect to two *different* variables in sequence, such as $\partial^2 f/(\partial x \partial y)$, is called a ==mixed partial==. ^card-hipi

Geometrically, $\partial f/\partial x$ at a point is the slope of a tangent line drawn
on a single ==cross-section== of the surface, cut by holding every ^card-jikg
other variable constant.

> [!card] recall
> State Clairaut's theorem (also called Schwarz's theorem) on mixed
> partial derivatives, including its hypothesis, and say what can go
> wrong if the hypothesis is dropped.
> ---
> If f_xy and f_yx are both continuous on an open region containing a
> point, then they are equal there: f_xy = f_yx. Order of differentiation
> doesn't matter under that continuity hypothesis. Without continuity of
> the mixed partials, they can genuinely disagree at a point — there are
> classic examples where f_xy(0,0) != f_yx(0,0) precisely because the
> mixed partials are discontinuous there. ^card-l3zc

Under what hypothesis does f_xy equal f_yx at a point, and what is the practical risk of assuming this equality always holds? :: They are equal provided both mixed partial derivatives are continuous on an open region around the point (Clairaut's/Schwarz's theorem). The risk is that for a function built from a piecewise or otherwise pathological formula, the mixed partials can fail to be continuous, and the equality can genuinely fail — so the hypothesis has to be checked, not assumed. ^card-io78

Holding "every other variable" fixed is a modelling choice, and treating
it as free of consequences is the most common way a partial derivative
gets misapplied. In a real system the other variables are frequently
*not* independent of the one being varied — raising a gas's temperature
in a sealed container also changes its pressure, so $\partial V/\partial T$ computed as
if pressure stays put describes a slice of the equation of state, not
what actually happens physically when you heat the gas. A partial
derivative answers a question about one cross-section of the function;
whether that cross-section corresponds to anything achievable in the
real system is a separate question it does not answer.

> [!card] mcq
> An economist models revenue as R(p, q), where p is price and q is
> quantity sold, and computes ∂R/∂p holding q fixed. Which statement
> correctly describes what this partial derivative tells the economist?
> - [x] How revenue changes if price alone moved and quantity stayed exactly as it was — even if, in the real market, raising price would also change quantity sold
> - [ ] How revenue changes accounting for the fact that raising price typically reduces quantity sold
> - [ ] The total rate of change of revenue with respect to price, including all indirect effects
> - [ ] Nothing useful, since price and quantity are never independent in a real market ^card-fp6p

Why is it true that computing a partial derivative never requires any technique beyond ordinary single-variable differentiation? :: Freezing every variable except one turns the scalar field into an ordinary function of that one remaining variable, so every single-variable differentiation rule (product rule, chain rule, and so on) from math-calculus applies directly without modification. ^card-3b21
