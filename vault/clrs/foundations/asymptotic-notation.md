---
topic: algorithms
category: algo-foundations
tags: [asymptotic-notation, big-o, theta, omega]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 3 (Characterizing Running Times)"]
---

# Asymptotic Notation: Theta, O, Omega, o, and omega

The previous note establishes worst-case running time as a function of
input size. This note is about the vocabulary used to describe that
function's growth, stripped of constant factors and lower-order terms —
and about the misreadings that vocabulary invites when people forget
what it actually claims.

Each symbol names a *set* of functions, defined by how they compare to
a reference function g(n) as n grows without bound.

```
Theta(g(n)) = { f(n) : there exist positive constants c1, c2, n0 such that
                0 <= c1*g(n) <= f(n) <= c2*g(n) for all n >= n0 }

O(g(n))     = { f(n) : there exist positive constants c, n0 such that
                0 <= f(n) <= c*g(n) for all n >= n0 }

Omega(g(n)) = { f(n) : there exist positive constants c, n0 such that
                0 <= c*g(n) <= f(n) for all n >= n0 }
```

==Theta(g(n))== is the tightest of the three: it says f(n) is sandwiched ^card-i5lm
between two constant multiples of g(n) for all large enough n, i.e. g(n)
is an asymptotically tight bound on f(n), both above and below.

==O(g(n))== is only an asymptotic upper bound — f(n) grows no faster ^card-xyzw
than g(n) — and says nothing about how close f(n) actually gets to
g(n). n is in O(n^2), just as n^2 is; O(g(n)) never by itself claims
tightness.

==Omega(g(n))== is the mirror image: an asymptotic lower bound, f(n) ^card-7s1t
grows at least as fast as g(n), with no claim about an upper limit.

The strict versions tighten the inequality itself, not just which side
it bounds. ==little-o== requires f(n) < c*g(n) for *every* positive ^card-8kx7
constant c, eventually, meaning f(n) becomes insignificant relative to
g(n) as n grows. Its mirror is little-omega, requiring f(n) > c*g(n)
for every constant c; in both strict cases the bound can never be met
with equality in the limit, unlike O and Omega where it can.

Why does little-o require the inequality f(n) < c*g(n) to hold for *every* positive constant c, rather than just some constant c the way O(g(n)) does? :: Requiring it for every c is what forces f(n)/g(n) to go to 0 in the limit — f(n) becomes asymptotically insignificant next to g(n) — whereas O(g(n)) only needs one constant c to work, which is satisfied even when f(n) and g(n) grow at the same rate (f(n) = Theta(g(n)) implies f(n) = O(g(n)), but never f(n) = o(g(n))). ^card-r04a

> [!card] mcq
> Which statement about f(n) = O(g(n)) is correct?
> - [x] f(n) grows no faster than g(n) asymptotically; it says nothing about whether f(n) is close to g(n)
> - [ ] f(n) is on average equal to g(n)
> - [ ] f(n) is a lower bound on the algorithm's running time
> - [ ] f(n) must equal c*g(n) for exactly one constant c ^card-3did

Two misreadings recur constantly. O is not "average case" — it bounds a
specific function, often the worst case, and has nothing to do with
distributions over inputs; "O(n) on average" is a category error unless
you separately name which function is being bounded. And asymptotic
notation is silent on constants, which can dominate at real input
sizes.

Why can an asymptotically slower algorithm (say Theta(n^2)) outperform an asymptotically faster one (Theta(n log n)) in practice? :: Asymptotic notation hides constant factors and lower-order terms, which only become negligible as n grows without bound; for the range of n actually encountered, a large hidden constant in the faster-growing-order algorithm can make it slower than an algorithm with worse asymptotic growth but far smaller constants. ^card-j9rk

Does O(g(n)) being true rule out f(n) also being in Omega(g(n))? :: No — a function can be in both O(g(n)) and Omega(g(n)) at once, and when it is, it is in Theta(g(n)); O alone just doesn't assert the lower bound, it doesn't forbid it. ^card-655r

> [!card] recall
> Explain, in terms of the formal definitions, why "f(n) is O(g(n))" is
> a strictly weaker claim than "f(n) is Theta(g(n))" — what does Theta
> assert that O does not? ^card-easf
