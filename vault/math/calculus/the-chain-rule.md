---
topic: math
category: math-calculus
tags: [chain-rule, composition, implicit-differentiation]
citations: ["Stewart, Calculus: Early Transcendentals 8e, Ch. 3"]
---

# The chain rule

Sums, products and quotients are covered by `differentiation-rules.md`.
They leave exactly one way of combining two functions untreated.

That way is plugging one function into another, $f(g(x))$, called
==composition==, and it is the one the chain rule exists for. ^card-5m2j

This needs its own rule, and it's the one that carries the most weight
downstream: almost nothing past this note works without it.

$$
(f(g(x)))' = f'(g(x)) \cdot g'(x)
$$

$$
\frac{dy}{dx} = \frac{dy}{du} \cdot \frac{du}{dx} \quad \text{where } y = f(u),\ u = g(x)
$$

The second form is the one worth internalizing, because it turns the rule
into a statement about rates multiplying through a chain: if $u$ changes
three times as fast as $x$, and $y$ changes twice as fast as $u$, then $y$
changes $3 \times 2 = 6$ times as fast as $x$. Composing functions composes
their rates of change by multiplication, which is exactly what the chain
rule says.

Why does it make intuitive sense that rates of change multiply through a composition, rather than add? :: Because each rate is a ratio describing how one quantity scales relative to another, and chaining two scalings together compounds them multiplicatively — if u moves 3 units for every 1 unit of x, and y moves 2 units for every 1 unit of u, then y moves 3*2 = 6 units for every 1 unit of x. Ratios chain by multiplying, the same way unit conversions do. ^card-1snp

The $\frac{dy}{du} \cdot \frac{du}{dx}$ form looks like the $du$ terms simply cancel, as if
they were ordinary fractions. That's a useful mnemonic for remembering
*which* derivatives to multiply, but it is not a proof — $\frac{dy}{dx}$,
$\frac{dy}{du}$, and $\frac{du}{dx}$ are not fractions being divided, they're each a
single limit, and the actual justification for the chain rule requires
its own limit argument.

> [!card] recall
> State the chain rule for (f(g(x)))' in prime notation and in dy/dx = ... Leibniz notation.
> ---
> (f(g(x)))' = f'(g(x)) * g'(x)
> dy/dx = (dy/du) * (du/dx), where y = f(u) and u = g(x) ^card-gft5

The single most common mistake is evaluating the outer derivative at the
wrong input: $f'(x)$ instead of $f'(g(x))$. The outer function was never
applied to $x$ directly — it was applied to $g(x)$ — so its derivative
must be evaluated there too, not at the bare variable.

> [!card] mcq
> For h(x) = sin(x^2), which is the correct derivative?
> - [x] h'(x) = cos(x^2) * 2x — the outer derivative evaluated at x^2, times the inner derivative
> - [ ] h'(x) = cos(x) * 2x — the outer derivative evaluated at x instead of at x^2
> - [ ] h'(x) = cos(x^2) — the inner derivative 2x is left out entirely
> - [ ] h'(x) = cos(2x) * x^2 ^card-v3jz

What is the single most common error when applying the chain rule, and why does it happen? :: Evaluating the outer function's derivative at the plain variable x instead of at the inner function g(x) — writing f'(x)*g'(x) instead of f'(g(x))*g'(x). It happens because f' is a familiar function on its own, and it's easy to forget that in a composition the outer derivative must be evaluated at whatever the inner function actually outputs, not at x itself. ^card-d5ka

Nested compositions just chain further: for $f(g(h(x)))$, differentiate
outward one layer at a time, $f'(g(h(x))) \cdot g'(h(x)) \cdot h'(x)$, always
evaluating each derivative at the output of everything inside it. Keeping
track is mechanical if you work from the outside in and never skip a
layer.

> [!card] mcq
> Differentiating f(g(h(x))) via the chain rule, at what point should g' be evaluated?
> - [x] At h(x) — g's argument in the composition
> - [ ] At x
> - [ ] At f(g(h(x)))
> - [ ] At g(x) ^card-deq3

The chain rule is the load-bearing rule of the whole subject in a way the
others aren't, because so much of what comes later is the chain rule
wearing a different name: implicit differentiation is just applying it to
both sides of an equation and solving for the derivative you want, related
rates problems are chain-rule applications where the "inner function" is
time, and the training procedure behind neural networks — backpropagation
— is the chain rule applied layer by layer through a deep composition of
functions.

The generalization to functions of several variables — where the chain
rule has to account for more than one path a change can travel through —
belongs to the `math-multivariable` category, not here.

Why is the chain rule described as "load-bearing" for the rest of calculus and beyond, rather than just one rule among several? :: Because so many later techniques are the chain rule applied in a specific setting rather than something genuinely new: implicit differentiation applies it to both sides of an equation, related rates applies it with time as the inner variable, and backpropagation applies it repeatedly through a composition of many layers. Without it, none of those techniques would have a derivative to compute at all. ^card-vxez
