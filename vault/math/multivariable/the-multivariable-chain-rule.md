---
topic: math
category: math-multivariable
tags: [chain-rule, composition, jacobian, backpropagation]
citations: ["Stewart, Calculus: Early Transcendentals 8e, Ch. 14.5"]
---

# The multivariable chain rule

`differentiability-and-the-total-derivative.md` establishes the total
derivative as a linear map. The chain rule is what that buys you: the
derivative of a composition of differentiable functions is the
**product of their derivative matrices**, taken in the same order the
functions compose. The familiar single-variable chain rule
$(f(g(x)))' = f'(g(x))g'(x)$ is just the case where every matrix
involved is 1-by-1, so multiplication of numbers and multiplication of
matrices happen to look identical.

$$
\text{matrix form:} \quad D(f \circ g)(a) = Df(g(a)) \, Dg(a)
$$

When the inner functions are themselves functions of a single parameter
$t$ — say $z = f(x, y)$ with $x = x(t)$ and $y = y(t)$ — the matrix
product expands into a sum, because $Df$ is a row vector (the gradient)
and $Dg$ is a column, and their product is a dot product:

$$
\text{tree form:} \quad \frac{dz}{dt} = \frac{\partial f}{\partial x}\frac{dx}{dt} + \frac{\partial f}{\partial y}\frac{dy}{dt}
$$

> [!card] recall
> Write the multivariable chain rule (tree form) for z = f(x, y) where
> x = x(t) and y = y(t), and explain in one sentence why it is a sum
> rather than a single product.
> ---
> dz/dt = (∂f/∂x)*(dx/dt) + (∂f/∂y)*(dy/dt). It is a sum because t
> influences z along two separate paths — through x and through y — and
> the total rate of change has to account for both. ^card-lb5g

That sum is not a notational accident — it's the general rule for
composed multivariable functions: every path by which an input variable
reaches the output contributes its own term, and along each path you
==multiply== the rates. When more intermediate variables sit between ^card-qcgp
input and output, each one contributes its own product term to the sum,
so a variable feeding the output through three intermediaries gets a
three-factor product term added alongside the others.

This "sum over paths, product along each path" structure is exactly the
rule that makes backpropagation in a neural network work: a parameter
deep inside the network can influence the loss through many different
downstream paths, and the gradient of the loss with respect to that
parameter is computed by summing the contribution along every path,
each contribution itself a product of local derivatives along the way.

> [!card] mcq
> A variable w influences the output z through two separate intermediate
> variables, x and y, each of which depends on w. Which expression
> correctly gives dz/dw?
> - [x] (∂z/∂x)*(∂x/∂w) + (∂z/∂y)*(∂y/∂w)
> - [ ] (∂z/∂x)*(∂x/∂w) * (∂z/∂y)*(∂y/∂w)
> - [ ] (∂z/∂x)*(∂y/∂w)
> - [ ] (∂z/∂x)*(∂x/∂w), ignoring the path through y since only one path is needed ^card-fmmk

Why does a variable that reaches the output of a composed function through two distinct intermediate paths contribute two separate terms to the chain rule sum, rather than one combined term? :: Each intermediate path is an independent channel through which a change in the variable produces a change in the output, and the total effect is the sum of the effects along each channel considered separately. Dropping a path or merging the two into one term would undercount how much the output actually moves when that variable changes. ^card-gw4w

A second confusion is specifically about **partial vs. total** derivatives
when the "independent" variables are secretly related to each other. If
$z = f(x, y)$ but $y$ itself depends on $x$, then $\partial z/\partial x$ (holding y fixed,
ignoring the dependency) and $dz/dx$ (the total derivative, accounting for
y's dependence on x through the chain rule) are genuinely different
numbers, and using the wrong one is where sign and term errors in applied
problems usually come from.

What is the practical difference between ∂z/∂x and dz/dx when z = f(x, y) and y itself depends on x? :: ∂z/∂x treats y as fixed and measures only the direct effect of x on z, ignoring that a change in x also drags y along with it. dz/dx is the total derivative, and by the chain rule equals ∂z/∂x + (∂z/∂y)*(dy/dx) — it accounts for both the direct path through x and the indirect path through y. ^card-lpcp

A related trap is purely notational: reusing the same symbol for both
the outer function and the inner variable it depends on, writing
$z = z(x, y)$ and $x = x(t)$ and then asking for $dz/dt$, makes it easy to
lose track of which $z$ or $x$ a given derivative symbol refers to at
each step of the chain. Keeping the intermediate variables named
distinctly — or at minimum tracking a dependency diagram before writing
any derivative — avoids conflating the two.

> [!card] mcq
> z = f(x, y) where x = g(s, t) and y = h(s, t). Which expression
> correctly gives ∂z/∂s?
> - [x] (∂z/∂x)*(∂x/∂s) + (∂z/∂y)*(∂y/∂s)
> - [ ] (∂z/∂x)*(∂x/∂t) + (∂z/∂y)*(∂y/∂t)
> - [ ] (∂z/∂x) + (∂z/∂y)
> - [ ] (∂z/∂x)*(∂x/∂s) * (∂z/∂y)*(∂y/∂s) ^card-g2t1

Why is the multivariable chain rule better understood as "the derivative of a composition is the product of the derivative matrices" rather than as a new rule specific to several variables? :: Because it is the exact same statement as the single-variable chain rule, just applied to linear maps instead of numbers — Df and Dg are the best linear approximations to f and g, and composing two linear maps is achieved by multiplying their matrices, so D(f∘g) = Df·Dg in every dimension, with the 1-by-1 case reducing to ordinary multiplication. ^card-ih2u
