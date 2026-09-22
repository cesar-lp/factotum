---
topic: math
category: math-multivariable
tags: [scalar-fields, limits, continuity, level-sets, domain]
citations: ["Stewart, Calculus: Early Transcendentals 8e, Ch. 14.1-14.2"]
---

# Functions of several variables

`math-calculus` builds derivatives for a single input variable; this
category rebuilds every one of those ideas for a **scalar field**
$f: \mathbb{R}^n \to \mathbb{R}$, a function of several real inputs producing one real
output. That rebuild is not bookkeeping — it is the subject of this
whole category, because moving from one input to several changes what
a limit even means.

With one variable, $x$ can only approach a point from the left or the
right, so checking a limit means checking two directions. With $n$
inputs, a point can be approached along infinitely many paths — straight
lines, parabolas, spirals — and every one of them has to agree for the
limit to exist. This is the concrete surprise that trips up anyone
arriving from single-variable calculus: a function can have the exact
same limit along **every straight line** through a point and still have
no limit there at all, because some curved path of approach gives a
different value. Checking finitely many lines can never prove a limit
exists; it can only fail to disprove it.

> [!card] mcq
> A function $f(x, y)$ has the same limit L along every straight line
> through the point (0, 0). What can be concluded about the limit of
> f(x, y) as (x, y) -> (0, 0)?
> - [x] Nothing yet — a curved path of approach (e.g. a parabola) could still give a different limit
> - [ ] The limit exists and equals L, since direction is all that matters in the plane
> - [ ] The limit exists and equals L, because R^2 has only radial directions to check
> - [ ] The function must be discontinuous at that point ^card-0ks5

Why does agreement along every straight line through a point fail to prove that a limit exists at that point in two or more variables? :: A point in R^n (n >= 2) can be approached along infinitely many curves, not just lines, and checking lines alone never rules out a curved path — such as y = x^2 approaching along a parabola — landing on a different value. Only single-variable limits reduce to two directions of approach. ^card-axxj

A scalar field of two variables has a graph that is a **surface** sitting
one dimension higher than its domain: $z = f(x, y)$ lives in R^3 even
though the input is a point in the plane. Once there are three or more
inputs the graph itself stops being drawable, which is exactly why
==level sets== take over as the practical way to picture the function. ^card-1tc4
A level set fixes the output, $f(x, y) = c$, and plots every input that
produces it; for two variables these are the contour lines on a
topographic map, and for three variables they are level *surfaces*
nested like the layers of an onion.

Reading a contour plot is itself a skill worth stating directly: closely
spaced contours mean the function changes quickly in that region, and
widely spaced contours mean it is nearly flat there — the spacing
encodes steepness the same way elevation lines do on a map.

On a contour plot, what does it mean for the contour lines to be tightly clustered together in some region, versus widely spaced apart? :: Tightly clustered contours mean the function's value changes rapidly as you move through that region — a steep slope — while widely spaced contours mean the function is nearly flat there, changing slowly over the same distance. ^card-sl0q

The domain of a scalar field of $n$ variables is a subset of R^n, and
because inputs are now points rather than numbers, domain restrictions
take on geometric shape: $f(x, y) = \sqrt{1 - x^2 - y^2}$ is defined only
on the closed unit disk, not on an interval. The range is still just a
subset of R, exactly as in the single-variable case — only the domain
gets more interesting.

> [!card] recall
> Describe the domain of f(x, y) = ln(x^2 + y^2 - 1) as a region in the
> plane, and explain in words why it excludes the unit circle itself as
> well as its interior.
> ---
> The domain is every point outside the closed unit disk: x^2 + y^2 > 1.
> The logarithm requires a strictly positive argument, so points with
> x^2 + y^2 <= 1 (inside or exactly on the unit circle) are excluded,
> leaving the open exterior region. ^card-fkn2

This category exists because most of what makes optimisation and
machine learning hard is inherently multivariable: a loss function
depends on millions of parameters at once, not one, and finding where
it is small means understanding how it changes as *all* of those
parameters move together. Every derivative concept from single-variable
calculus — the derivative itself, the chain rule, second-order behaviour,
critical points — has to be rebuilt for scalar fields before any of that
optimisation machinery makes sense, and the rest of this category is
exactly that rebuild.

What is a scalar field, and how does its output type differ from a vector field? :: A scalar field is a function f: R^n -> R that takes a point of n real coordinates and returns a single real number. It differs from a vector field, which returns a vector rather than a single number for each input point (for example, a field of forces or velocities). ^card-33g6

Why does the graph of a two-variable scalar field require three dimensions to draw, and what does that imply about a function of three or more variables? :: The graph is the set of points (x, y, f(x, y)), which adds one output dimension on top of the two input dimensions, so it lives in R^3. For three or more input variables the graph would need four or more dimensions and can no longer be drawn directly, which is why level sets, rather than graphs, become the practical way to visualize such functions. ^card-cirb
