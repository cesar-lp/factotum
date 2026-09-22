---
topic: math
category: math-calculus
tags: [limits, continuity, epsilon-delta, intermediate-value-theorem]
citations: ["Stewart, Calculus: Early Transcendentals 8e, Ch. 2"]
---

# Limits and continuity

Everything else in this category — the derivative, the integral, even the
idea of a tangent line — is built on a single primitive: the limit. This
note is about that primitive and about continuity, the property that
decides whether a function's value at a point can be trusted to match what
the limit says it should be.

A limit describes the value a function *approaches* as the input approaches
some point, not the value it *takes* there. That distinction is not
pedantic — it's the entire reason limits are useful. Plenty of functions
are undefined, or defined "wrong," exactly at the point you care about, and
the limit lets you reason about their behavior nearby anyway.

The clearest illustration is a quotient like $(x^2 - 1)/(x - 1)$, which is
literally $0/0$ at $x = 1$ and therefore undefined there — direct
evaluation gives you nothing. But for every $x$ near 1 other than 1 itself,
the expression simplifies to $x + 1$, which approaches 2. The limit exists
and equals 2 even though the function itself has no value to offer at that
point.

> [!card] mcq
> $f(x) = (x^2 - 1)/(x - 1)$ is undefined at $x = 1$. What is $\lim_{x \to 1} f(x)$?
> - [x] 2 — the limit only depends on values near 1, where the expression simplifies to x + 1
> - [ ] The limit does not exist, since f(1) is undefined
> - [ ] 0, matching the numerator at x = 1
> - [ ] 1, matching the point being approached ^card-bct4

A limit can also fail to exist even where the function is defined, if
approaching from the left gives a different value than approaching from the
right. Each one-sided limit — $\lim_{x \to a^-}$ from below, $\lim_{x \to a^+}$ from
above — is its own statement, and the two-sided limit $\lim_{x \to a} f(x)$
exists only when both one-sided limits exist *and* agree.

Why does a two-sided limit require both one-sided limits to agree, rather than just requiring the function to be defined at that point? :: Because a limit is a claim about behavior on both sides of the point, and if the function approaches different values from the left and right, there is no single value it is "closing in on." Whether the function has a value at the point is a separate question entirely — plenty of functions with well-defined two-sided limits are undefined right at the point, and plenty of functions with a defined value there have no limit at all. ^card-0ifz

The formal definition makes "approaches" precise instead of relying on
intuition:

$$
\begin{gathered}
\lim_{x \to a} f(x) = L \quad \text{means:} \\
\text{for every } \epsilon > 0 \text{, there exists a } \delta > 0 \text{ such that} \\
0 < |x - a| < \delta \implies |f(x) - L| < \epsilon
\end{gathered}
$$

Read in prose, this says: no matter how small a tolerance $\epsilon$ around
$L$ someone hands you, you can always find a window $\delta$ around $a$
(excluding $a$ itself) narrow enough that every input in that window
produces an output within the tolerance. It's a two-player guarantee — you
get to respond to any challenge with a window that works — not a statement
about any single point.

> [!card] recall
> State the epsilon-delta definition of $\lim_{x \to a} f(x) = L$.
> ---
> For every epsilon > 0, there exists a delta > 0 such that whenever
> 0 < |x - a| < delta, it follows that |f(x) - L| < epsilon. ^card-fnz0

Continuity at a point bolts three separate requirements together into one
equation:

$$
f \text{ is continuous at } a \iff \lim_{x \to a} f(x) = f(a)
$$

That equation quietly demands: the limit on the left side exists, the value
on the right side exists (the function is actually defined at $a$), and the
two ==agree==. ^card-hr7l

Any one of the three can fail independently, and each
failure mode has a name. A **removable** discontinuity is where the limit
exists but either the function isn't defined there or its value disagrees
with the limit — the $(x^2-1)/(x-1)$ function from above, patched to equal
2 at $x = 1$, would be continuous. A **jump** discontinuity is where both
one-sided limits exist but disagree with each other, so no two-sided limit
exists at all. An **infinite** discontinuity is where the function blows up
without bound as $x$ approaches $a$, so there's no finite limit to speak of.

What distinguishes a removable discontinuity from a jump discontinuity? :: In a removable discontinuity the two-sided limit exists — the function just fails to equal it at that point, or isn't defined there at all — so redefining the function at one point fixes it. In a jump discontinuity the left and right one-sided limits both exist but disagree, so there is no single limiting value to assign at that point; no redefinition at one point can fix it. ^card-5vri

The Intermediate Value Theorem is one of the first genuinely useful
consequences of continuity. If $f$ is continuous on the closed interval
$[a, b]$ and $N$ is any value between $f(a)$ and $f(b)$, then some $c$ in
$[a, b]$ satisfies $f(c) = N$. Both hypotheses matter: drop continuity and a
function can jump clean over $N$ without ever equaling it; drop the closed
interval and there may be no room left for $c$ to land in.

> [!card] mcq
> A continuous function satisfies f(1) = -3 and f(4) = 5. What does the Intermediate Value Theorem guarantee?
> - [x] Some c in [1, 4] satisfies f(c) = 0 — existence only, with no method to find c
> - [ ] Exactly one c in [1, 4] satisfies f(c) = 0
> - [ ] A formula for the root c, derivable from f(1) and f(4)
> - [ ] f has a root in [1, 4] only if f is also differentiable there ^card-ca7v

What does the Intermediate Value Theorem give you, and what does it explicitly not give you? :: It guarantees existence — that a continuous function hits every value between f(a) and f(b) somewhere in [a, b] — but it gives no way to find where, and no guarantee of uniqueness; a function can cross the same intermediate value many times. ^card-scgn
