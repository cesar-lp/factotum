---
topic: math
category: math-calculus
tags: [definite-integral, riemann-sum, fundamental-theorem-of-calculus, antiderivative]
citations: ["Stewart, Calculus: Early Transcendentals 8e, Ch. 5"]
---

# The definite integral and the Fundamental Theorem

Every note so far in this category has been about derivatives. The
definite integral is defined completely independently of them — as a
limit of sums approximating area — and the surprising fact this note
exists to explain is that it turns out to be the derivative's inverse
anyway.

The **Riemann sum** approximates the area between a curve and the x-axis
by slicing `[a, b]` into n strips and adding up rectangle areas:

```
sum_{i=1}^n  f(x_i*) * Delta_x        where Delta_x = (b-a)/n
```

The **definite integral** is what that sum approaches as the strips get
arbitrarily thin:

```
int_a^b f(x) dx  =  lim_{n->inf}  sum_{i=1}^n f(x_i*) * Delta_x
```

Nothing in that definition mentions a derivative, an antiderivative, or
even a continuous function that has one in closed form — it is pure
geometry, area under a curve, defined for any function the limit exists
for.

> [!card] recall
> Write the definition of the definite integral as a limit of Riemann sums.
> ---
> int_a^b f(x) dx = lim_{n->inf} sum_{i=1}^n f(x_i*) * Delta_x, where
> Delta_x = (b-a)/n and x_i* is a sample point in the i-th subinterval. ^card-7mir

The integral is a **signed** area: where f dips below the x-axis, that
strip's contribution is negative, so `int_a^b f(x) dx` can come out
negative, zero, or positive independent of how much of the curve lies
below the axis versus above it. Integrals are also ==additive== over adjacent intervals — splitting ^card-iz5j
`[a, c]` at any `b` between a and c gives `int_a^c f = int_a^b f +
int_b^c f` — which is what makes it sensible to build up an integral
over a big interval from pieces.

Why can a definite integral be negative even though it is called an "area"? :: Because it is a signed area, not a geometric one: each Riemann sum term f(x_i*) * Delta_x carries the sign of f at that sample point, so a region where the curve lies below the x-axis contributes negatively. A definite integral equals the area above the axis minus the area below it, not their sum. ^card-d1jp

That the two operations — slopes and areas — turn out to be inverses of
each other is the **Fundamental Theorem of Calculus**, and it earns its
name precisely because the connection is not obvious: nothing about
"rate of change at a point" visibly has anything to do with "accumulated
area up to a point." The theorem has two parts, and they say genuinely
different things, so conflating them is the most common way to
misremember it.

**Part 1** says that accumulating f into a function of its upper limit
produces a new function whose derivative is f back again:

```
F(x) = int_a^x f(t) dt      =>      F'(x) = f(x)
```

In words: integration, run as a function of a variable endpoint, is a
machine that produces differentiable functions — `F` is guaranteed
differentiable even if you have no closed form for it, as long as f is
continuous.

**Part 2** says something practical rather than structural: it gives a
way to *evaluate* a definite integral without ever taking a limit of
sums, using any antiderivative F of f at all:

```
int_a^b f(x) dx  =  F(b) - F(a)
```

> [!card] recall
> State Part 2 of the Fundamental Theorem of Calculus, and what computation it lets you avoid.
> ---
> int_a^b f(x) dx = F(b) - F(a), for any antiderivative F of f. It lets
> you evaluate a definite integral by evaluating F at two points instead
> of taking a limit of Riemann sums. ^card-95ax

> [!card] mcq
> Which statement is Part 1 of the Fundamental Theorem of Calculus, and which is Part 2?
> - [x] Part 1: d/dx of int_a^x f(t) dt equals f(x). Part 2: int_a^b f(x) dx equals F(b) - F(a) for any antiderivative F.
> - [ ] Part 1: int_a^b f(x) dx equals F(b) - F(a). Part 2: d/dx of int_a^x f(t) dt equals f(x).
> - [ ] Both parts state int_a^b f(x) dx equals F(b) - F(a); Part 2 just relaxes the continuity hypothesis.
> - [ ] Part 1 defines the Riemann sum; Part 2 proves it converges. ^card-0mju

What makes it significant that these two theorem parts connect areas to slopes, rather than just useful that they do? :: The definite integral (a limit of sums, defined for its own geometric reasons) and the derivative (a limit of difference quotients, defined for entirely unrelated reasons about instantaneous rate) were developed as separate ideas answering separate questions. The Fundamental Theorem shows they are inverse operations of each other — differentiating an accumulation function recovers the original integrand, and every antiderivative lets you compute an area with no limiting process at all. That two independently motivated constructions turn out to be inverses is why the result is "fundamental" rather than merely a computational shortcut. ^card-38fa

Part 1's guarantee needs a hypothesis: f must be **continuous** on the
interval in question for `F(x) = int_a^x f(t) dt` to be differentiable
with `F'(x) = f(x)` everywhere there. More generally, a function need not
be continuous to be integrable at all — a bounded function with finitely
many discontinuities is still Riemann integrable — but Part 1's
differentiability conclusion specifically leans on continuity of f at the
point in question.

> [!card] mcq
> A bounded function f has a single jump discontinuity on [a, b] but is continuous everywhere else. What can you conclude?
> - [x] f is still Riemann integrable on [a, b], but F(x) = int_a^x f(t) dt may fail to be differentiable at the jump
> - [ ] f is not Riemann integrable on [a, b] at all
> - [ ] f is integrable and F is differentiable everywhere, since one point never matters
> - [ ] Integrability requires continuity, so this case is undefined ^card-80qi

The **indefinite integral** `int f(x) dx` is not a number at all — it's
notation for the whole family of antiderivatives of f, any two of which
differ by a constant, written `F(x) + C`. That the family is exactly "one
antiderivative plus any constant" and nothing wilder is itself a
consequence of the Mean Value Theorem: two functions with the same
derivative everywhere on an interval differ by a constant on it, because
a nonconstant difference would force some point where the difference's
own derivative is nonzero. The definite integral, by contrast, is one
specific number — `F(b) - F(a)` — and the arbitrary constant cancels out
of that subtraction regardless of which antiderivative you picked.

Does the choice of antiderivative F matter when using Part 2 to evaluate int_a^b f(x) dx? :: No. Any two antiderivatives of f differ by a constant C, and F(b) - F(a) subtracts that same C from both terms, so it cancels. The definite integral comes out identical no matter which antiderivative is used to compute it. ^card-tsh6
