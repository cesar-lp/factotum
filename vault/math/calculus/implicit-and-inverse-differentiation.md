---
topic: math
category: math-calculus
tags: [implicit-differentiation, inverse-functions, chain-rule, logarithm, arcsin]
citations: ["Stewart, Calculus: Early Transcendentals 8e, Ch. 3"]
---

# Implicit and inverse differentiation

`the-chain-rule.md` covers differentiating a composition when one function
is written explicitly in terms of another. This note is not a new rule —
it is the chain rule applied to a situation where "y in terms of x" isn't
available to write down at all.

Take $x^2 + y^2 = 25$, the equation of a circle. Solved for y, this is two
separate functions — the upper and lower semicircles — glued together at
$(\pm 5, 0)$, and neither one alone is "the" function the equation describes.
There is no single explicit $y = f(x)$ to differentiate. Yet the circle
plainly has a tangent line at every point. Implicit differentiation is how
you get at that tangent's slope without ever solving for y.

The trick is to treat y as *some* unspecified differentiable function of x
and differentiate both sides of the equation with respect to x as they
stand. Every term containing y then picks up a factor of $\frac{dy}{dx}$ by the
chain rule, exactly as $\frac{d}{dx}[\sin(u)] = \cos(u) \frac{du}{dx}$ does when $u$ is a
function of x:

$$
\begin{aligned}
\frac{d}{dx}[x^2 + y^2] &= \frac{d}{dx}[25] \\
2x + 2y \frac{dy}{dx} &= 0 \\
\frac{dy}{dx} &= -\frac{x}{y}
\end{aligned}
$$

That $2y \cdot \frac{dy}{dx}$ term — not just $2y$ — is the entire technique. Forgetting
the extra factor is the standard error, which is why it's worth stating as
a card.

Why is implicit differentiation needed for a relation like x^2 + y^2 = 25 at all, rather than just differentiating an explicit formula for y? :: Because the relation does not define y as a single function of x — solving for y produces two separate branches (the upper and lower semicircles), so there is no one explicit formula to differentiate. Implicit differentiation gets the tangent slope directly from the relation itself, without ever solving for y or picking a branch. ^card-qmvn

> [!card] mcq
> Differentiating $y^3 = x$ implicitly with respect to x, which is the correct next line?
> - [x] $3y^2 \cdot \frac{dy}{dx} = 1$
> - [ ] $3y^2 = 1$
> - [ ] $3y^2 \cdot \frac{dy}{dx} = \frac{dy}{dx}$
> - [ ] $y^3 \cdot \frac{dy}{dx} = 1$ ^card-it6y

Notice the answer, $\frac{dy}{dx} = -x/y$, depends on *both* x and y, not on x
alone. That's not a loose end to clean up — it's the defining symptom of
working on a curve rather than a graph. A function's derivative is a
function of x; the slope of an implicitly defined curve generally needs a
point $(x, y)$ on the curve to evaluate, because the same x-coordinate can
sit under two different points with two different tangent slopes.

Why does the derivative obtained from implicit differentiation typically come out as an expression in both x and y, rather than in x alone? :: Because the equation doesn't define a single function of x — the same x-value can correspond to multiple points on the curve, each with its own tangent slope, so specifying the slope requires knowing which point (x, y) you're at, not just x. ^card-mnkv

Inverse functions are the other place a derivative has to be built without
an explicit formula in hand, and the geometric idea is the same one used
for everything else in this note: work from the relationship, not from an
isolated formula. If $y = f(x)$ and $f$ has an inverse, then reflecting the
graph of $f$ across the line $y = x$ produces the graph of $f^{-1}$ — and
reflecting across that diagonal swaps the roles of rise and run, so the
tangent slope inverts:

$$
(f^{-1})'(y) = \frac{1}{f'(x)} \quad \text{where } y = f(x)
$$

That reflection also explains a failure mode: wherever $f$ has a
*horizontal* tangent ($f'(x) = 0$), the reflected graph has a *vertical*
tangent, and a vertical tangent has no finite slope. So $f^{-1}$ fails to be
differentiable at any point corresponding to a horizontal tangent of $f$.

> [!card] recall
> State the derivative-of-an-inverse formula, and explain in one sentence why a horizontal tangent on the graph of f forces the inverse to be non-differentiable at the corresponding point.
> ---
> $(f^{-1})'(y) = 1/f'(x)$ where $y = f(x)$. Reflecting a graph across $y = x$ turns a horizontal tangent into a vertical one, and a vertical tangent has undefined (infinite) slope, so the formula's denominator $f'(x)$ is zero exactly where the inverse breaks down. ^card-huxl

The standard payoff of this formula is deriving two derivatives that
otherwise look like they must be assumed. Let $f(x) = e^x$, so
$f^{-1}(y) = \ln(y)$ and $f'(x) = e^x = y$:

$$
\frac{d}{dx}[\ln(x)] = \frac{1}{f'(f^{-1}(x))} = \frac{1}{x}
$$

The same move on $f(x) = \sin(x)$, restricted to $[-\pi/2, \pi/2]$ so it has
an inverse, with $f'(x) = \cos(x) = \sqrt{1 - \sin^2(x)} = \sqrt{1 - y^2}$
gives:

$$
\frac{d}{dx}[\arcsin(x)] = \frac{1}{\sqrt{1 - x^2}}
$$

Both derivations lean on nothing beyond ==inverse== function reflection — ^card-4da1
no separate limit computation is needed for either.

Why is $\frac{d}{dx}[\ln(x)] = 1/x$ derivable from $\frac{d}{dx}[e^x] = e^x$ alone, without evaluating any new limit? :: Because ln is the inverse of exp, so its derivative follows directly from the inverse-function formula $(f^{-1})'(y) = 1/f'(x)$: since $f'(x) = e^x = y$ when $f(x)=e^x$, substituting gives $(\ln)'(y) = 1/y$, reusing the already-known derivative of exp rather than computing a new one. ^card-q2nn

> [!card] mcq
> A student computes $\frac{d}{dx}[\arcsin(x)]$ by starting from $f(x) = \sin(x)$ and its inverse-function relationship. Which substitution correctly turns $f'(x) = \cos(x)$ into a function of x (the arcsin's argument) alone?
> - [x] $\cos(x) = \sqrt{1 - \sin^2(x)} = \sqrt{1 - y^2}$, then substitute $y = x$ for the outer variable
> - [ ] $\cos(x) = \sin(x)$, since both derivatives are cofunctions
> - [ ] $\cos(x)$ is left as is; no substitution is needed
> - [ ] $\cos(x) = 1 - \sin^2(x)$, dropping the square root ^card-enmu
