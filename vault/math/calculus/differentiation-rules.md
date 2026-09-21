---
topic: math
category: math-calculus
tags: [derivative-rules, product-rule, quotient-rule, exponential]
citations: ["Stewart, Calculus: Early Transcendentals 8e, Ch. 3"]
---

# Differentiation rules

`the-derivative-as-a-limit.md` defines `f'` as a limit of difference
quotients. Computing that limit from scratch every time would make
calculus unusable in practice, which is exactly what these rules exist to
avoid — each one is a limit computed once, in general, and then reused
forever. They are theorems, not a table to memorize independently of why
they're true.

Two rules follow almost immediately from the limit definition, because the
limit of a sum (or a constant multiple) is the sum (or multiple) of the
limits:

```
(f + g)' = f' + g'
(c*f)'   = c*f'
d/dx [x^n] = n * x^(n-1)
```

The power rule takes slightly more work — expanding `(x+h)^n` and watching
every term except the linear one vanish as `h -> 0` — but the other two
are direct consequences of limit laws you already have, and together they
give differentiation the property called ==linearity==. ^card-3gm4

The product rule is where intuition most often goes wrong, because the
tempting guess — that the derivative of a product is the product of the
derivatives — is false. The actual rule has two terms:

```
(f*g)' = f'*g + f*g'
```

d/dx of a product f(x)*g(x) is NOT f'(x)*g'(x). What is it instead, and why does the correct rule need two terms rather than one? :: It's f'(x)*g(x) + f(x)*g'(x). Both factors are changing at once, and each term in the rule isolates the contribution of one factor changing while the other is held fixed; adding them captures the combined effect. A single term (or the naive product of derivatives) would silently discard one factor's contribution entirely. ^card-d4p1

The quotient rule follows the same "both parts are changing" logic, but
the denominator's own derivative enters with a minus sign and the whole
thing is scaled down by the denominator squared:

```
(f/g)' = (f'*g - f*g') / g^2
```

> [!card] recall
> State the product rule and the quotient rule for (f*g)' and (f/g)'.
> ---
> (f*g)' = f'*g + f*g'
> (f/g)' = (f'*g - f*g') / g^2 ^card-k4bg

> [!card] mcq
> Which of the following is the correct quotient rule for (f/g)'?
> - [x] (f'*g - f*g') / g^2
> - [ ] (f'*g' ) / g^2
> - [ ] (f*g' - f'*g) / g^2
> - [ ] (f'*g - f*g') / g ^card-cmku

The standard functions each contribute a derivative worth knowing outright
rather than re-deriving:

```
d/dx [exp(x)] = exp(x)
d/dx [ln(x)]  = 1/x
d/dx [sin(x)] = cos(x)
d/dx [cos(x)] = -sin(x)
```

`exp(x)` is singled out by the first line: it is, up to a constant
multiple, the only function that is its **own** derivative. That property
is not incidental — it's the defining characteristic that pins down what
`e` has to be in the first place, since `d/dx [a^x] = a^x * ln(a)`, and `e`
is precisely the base for which `ln(a) = 1`, making the extra factor
disappear.

Why is exp(x) described as "the function that is its own derivative," and how does that property single out the specific base e among all exponential functions a^x? :: For general base a, d/dx[a^x] = a^x * ln(a) — the derivative is the original function scaled by ln(a). That extra factor vanishes only when ln(a) = 1, which happens for exactly one value of a, namely e. So e is defined by the property that makes its exponential function equal to its own derivative with no scaling at all. ^card-xo66

Derivatives can be applied repeatedly: `f''` is the derivative of `f'`,
`f'''` the derivative of that, and so on, each one differentiating
whatever function came before it.

What relationship does f'' (the second derivative) bear to f, in terms of repeated differentiation? :: f'' is the derivative of f' — that is, f differentiated twice in a row. Each higher derivative is obtained by differentiating the previous one again, not by differentiating f itself some other way. ^card-m9aa

The second derivative in particular recurs constantly enough — governing
concavity and acceleration — that it gets its own note.

> [!card] mcq
> A student computes d/dx[x^2 * sin(x)] as 2x * cos(x), applying the derivative to each factor and multiplying the results. What is wrong?
> - [x] The product rule was not used — the correct derivative is 2x*sin(x) + x^2*cos(x), not the product of the individual derivatives
> - [ ] Nothing is wrong; that is the correct derivative
> - [ ] The error is a sign error in the second term
> - [ ] The power rule was applied incorrectly to x^2 ^card-frac
