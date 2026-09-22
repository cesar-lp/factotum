---
topic: math
category: math-multivariable
tags: [gradient-descent, optimization, convexity, step-size, condition-number]
citations: ["Stewart, Calculus: Early Transcendentals 8e, Ch. 14"]
---

# Gradient descent and why the gradient matters

Every earlier note in this category built toward one destination:
`the-gradient-and-steepest-ascent.md` established that $\nabla f$ points toward
the fastest local increase of $f$. This note is the payoff — turning that
one fact into an algorithm that finds minima of functions with far too
many variables to solve $\nabla f = 0$ by hand.

If $\nabla f$ is the direction of fastest increase, then $-\nabla f$ is the direction
of fastest decrease, at that point, to first order. Gradient descent does
nothing more clever than stepping repeatedly in that direction:

$$
x_{k+1} = x_k - \alpha \nabla f(x_k)
$$

where $\alpha > 0$ is the step size (also called the learning rate).

> [!card] recall
> Write the gradient descent update rule, and explain in one sentence why the gradient is subtracted rather than added.
> ---
> x_{k+1} = x_k - alpha*∇f(x_k). It's subtracted because ∇f points toward the direction of steepest increase, and minimizing f means moving in the opposite direction — steepest decrease — at each step. ^card-57uo

> [!card] mcq
> To decrease f as quickly as possible from the current point, which direction should the update move in?
> - [x] The negative gradient, -∇f(x_k), since ∇f itself points toward the steepest increase
> - [ ] The gradient itself, ∇f(x_k)
> - [ ] Perpendicular to the gradient
> - [ ] Toward the nearest critical point in a straight line, regardless of the gradient's direction ^card-rst5

The step size $\alpha$ is not a minor tuning knob — it's the central
practical difficulty of the whole method, and there is no universally
correct value. Too small, and convergence is technically guaranteed under
mild conditions but painfully slow, taking many more steps than the
problem should need. Too large, and the update can overshoot the minimum
entirely, oscillate, or diverge outright, since the linear approximation
that justifies "step opposite the gradient" only holds locally.

Why is choosing the gradient descent step size alpha described as a genuine trade-off with no universally right answer, rather than a detail to tune once and forget? :: Because the two failure modes pull in opposite directions and the right balance depends on the specific function's curvature: too small a step wastes enormous numbers of iterations converging slowly, while too large a step causes the linear approximation behind the update to break down, leading to overshoot, oscillation, or outright divergence — no fixed alpha is safe across different problems or even across regions of the same problem. ^card-aohc

What gradient descent guarantees depends entirely on the shape of $f$.
For a ==convex== function, every local minimum is automatically a global ^card-0rt4
minimum, so descent converging to a local minimum has, in that case,
actually solved the global problem.

Without that shape assumption, no such guarantee holds: descent still
converges to a critical point where $\nabla f = 0$, but that point could be a
saddle or a shallow, poor local minimum rather than the function's true
minimum anywhere nearby.

Convexity itself, and why it forces every local minimum to be global, is
developed in the calculus category's convexity note.

> [!card] mcq
> Descent is run on a non-convex function and converges to a point where ∇f = 0. What can you conclude about that point?
> - [x] It's a critical point — possibly a saddle or a mediocre local minimum — but not necessarily the global minimum
> - [ ] It must be the global minimum, since ∇f = 0 is a sufficient condition for global optimality
> - [ ] It must be a saddle point specifically
> - [ ] Gradient descent cannot converge at all on a non-convex function ^card-wg2u

What does convexity of f buy you that makes gradient descent's convergence to a critical point actually useful for finding the true minimum? :: Convexity guarantees that every local minimum is also a global minimum, so once descent settles at a critical point that is a local min, you know — without checking anywhere else — that it's the best value f attains anywhere, not just nearby. ^card-t1gv

Large-scale optimization (fitting a model with millions of parameters)
uses the gradient rather than the Hessian for the same reason
`the-hessian-and-second-order-behaviour.md` gives for preferring
first-order information generally: a gradient in $n$ dimensions costs
$n$ numbers, while a Hessian costs $n^2$ — for large $n$, forming and
inverting it is simply too expensive to do at every step.

Even with a well-chosen step size, descent can be slow for a structural
reason that has nothing to do with $\alpha$: a poorly **conditioned**
landscape, where $f$ curves much more sharply in some directions than
others, makes the steepest-descent direction at a point sit almost
perpendicular to the actual direction toward the minimum. The path zigzags
back and forth across the narrow direction while making slow progress
along the shallow one, because "steepest right now" and "toward the
minimum overall" are two different things whenever the curvature is
uneven.

Why does gradient descent zigzag on a poorly conditioned (elongated, narrow-valley) objective function instead of heading straight for the minimum? :: Because the direction of steepest local decrease is determined by the local gradient, which in an elongated valley points mostly across the narrow direction rather than along the valley toward the minimum — so each step overcorrects across the narrow axis while barely advancing along the long axis, producing a zigzag path instead of a direct one. ^card-18w5

The standard responses to a poorly conditioned landscape don't fix the
curvature itself — they change how the update uses past information.
**Momentum** accumulates a running average of past gradient directions so
that consistent progress along the shallow direction reinforces itself
while oscillation across the narrow direction partially cancels out.
**Adaptive step sizes** (as in Adam or AdaGrad) scale $\alpha$ separately
per coordinate, shrinking it where the gradient has been large and
volatile and growing it where the gradient has been small and steady.

The single idea underlying every difficulty in this note is that $\nabla f$ is
a **local** object — it describes the slope exactly at one point and
nothing about the function's shape anywhere else. Step size, non-convex
critical points, and zigzagging under poor conditioning are three
different symptoms of the same root cause: using purely local information
to make what is supposed to be global progress toward a minimum.

What single property of the gradient ∇f is responsible for all of gradient descent's core difficulties — step size sensitivity, getting stuck at non-global critical points, and zigzagging under poor conditioning? :: The gradient is a purely local quantity — it only describes f's slope at the current point, with no information about the function's shape elsewhere. Every listed difficulty is a consequence of using that local information, one step at a time, to try to make global progress toward the actual minimum. ^card-4cd6
