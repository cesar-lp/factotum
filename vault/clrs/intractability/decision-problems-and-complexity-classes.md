---
topic: algorithms
category: algo-intractability
tags: [complexity-theory, decision-problems, p, np, verification]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 34 (NP-Completeness)"]
---

# Decision Problems and Complexity Classes

Every complexity class in this category is defined over **decision**
problems — questions with a yes/no answer — rather than the optimisation
problems that actually motivate them, like "find the shortest tour" or
"find the maximum clique." That choice looks like it throws away exactly
the thing you wanted, so the first job of this note is showing that it
doesn't.

An optimisation problem and its decision version are polynomially
equivalent: given an oracle that answers the decision version instantly,
you can find the optimum itself with only a polynomial number of oracle
calls, by binary-searching over the answer.

```
Optimisation: find the shortest tour through a set of cities.
Decision:     does a tour of length <= k exist?

Given a decision oracle, find the optimum by binary search:
  lo = 0, hi = some polynomial upper bound on tour length
  while lo < hi:
      mid = (lo + hi) / 2
      if oracle(mid) answers "yes": hi = mid
      else: lo = mid + 1
  optimum = lo
```

That equivalence is what licenses the rest of the theory to restrict
itself to yes/no questions: the binary search above uses only
==logarithmically== many oracle calls in the range of possible answers, ^card-j21m
so a fast decision oracle really does hand you a fast optimisation
algorithm, and every later hardness result about a decision problem
transfers cleanly to its optimisation twin.

Why does the theory build its complexity classes around decision problems (yes/no answers) rather than the optimisation problems that motivated them in the first place? :: Because a decision oracle and an optimisation algorithm are polynomially equivalent — you can recover the optimum from repeated calls to a decision oracle via binary search over the answer value, and a decision version follows trivially from any optimisation algorithm by comparing its output to k. Restricting to decision problems makes the classes (P, NP, NP-complete) clean, closed statements about yes/no questions, with no loss of generality for the optimisation problems people actually care about. ^card-peh0

With decision problems as the common currency, **P** is the class of
decision problems solvable by a deterministic algorithm in time
polynomial in the input size. **NP** is defined differently, and
confusing the two definitions is the most common mistake in the subject:
NP is the class of decision problems **verifiable** in polynomial time
given a suitable certificate — it says nothing about how hard the answer
is to *find*, only about how hard it is to *check* once someone hands you
a proposed one.

```
A language L is in NP if there exists a polynomial-time verifier V and
a polynomial p such that, for every input x:
  x is a yes-instance of L
    if and only if
  there exists a certificate y with |y| <= p(|x|) such that V(x, y) accepts.
```

> [!card] mcq
> What does membership in NP actually assert about a decision problem?
> - [x] A proposed solution (certificate) can be checked for correctness in polynomial time
> - [ ] No polynomial-time algorithm exists for solving it
> - [ ] It requires non-deterministic hardware to solve
> - [ ] It can be solved in polynomial time by guessing randomly ^card-z30f

"NP" stands for **nondeterministic polynomial time**, not "not
polynomial" — that misreading of the acronym is the single most common
misconception about the class, and it inverts the actual claim: many
problems in NP (everything in P, for a start) are perfectly polynomial to
solve. What's non-deterministic is the *hypothetical* machine model used
in one equivalent formulation, where a machine can "guess" a certificate
and then verify it in polynomial time; the verifier-based definition
above says the same thing without needing that machine model at all.

What is a certificate, in the definition of NP, and what is it used for? :: A certificate is a piece of evidence — a candidate solution, such as a specific tour, colouring, or satisfying assignment — of size polynomial in the input, which a polynomial-time verifier algorithm checks for correctness. NP membership requires only that such a certificate exists and is checkable quickly for every yes-instance; finding the certificate can be arbitrarily hard. ^card-cr6e

Polynomial time is the boundary these classes are built around for
reasons that are about mathematical convenience as much as practicality.
Polynomials are closed under composition — running one polynomial-time
subroutine a polynomial number of times, or feeding one's output into
another, stays polynomial — which keeps the classes robust under
gluing algorithms together. The class is also stable across reasonable
machine models: a problem polynomial-time solvable on one deterministic
model stays polynomial-time solvable on any other reasonable one, up to
a polynomial-degree change, which single-tape-versus-multi-tape
distinctions do not survive under weaker growth bounds.

None of that makes "polynomial" a synonym for "fast in practice." An
==O(n^100)== algorithm is polynomial and useless on any input a computer ^card-yhb3
will see this century, and plenty of exponential algorithms are fine on
small inputs. Treat "polynomial time" as a theoretical proxy for
tractability, clean enough to build a theory on, not a guarantee that a
polynomial algorithm is actually usable.

Why is "polynomial time" used as the boundary for tractability even though an algorithm like O(n^100) is not remotely practical? :: Because polynomial time is the boundary with clean mathematical properties — closure under composition and stability across reasonable machine models — that make a theory buildable at all, not because every polynomial algorithm is fast. It is a proxy for tractability, not a guarantee of it; in practice essentially all naturally-occurring polynomial algorithms have small exponents, which is why the proxy works well despite pathological counterexamples like O(n^100). ^card-350l

`P` is a subset of `NP`, and the inclusion is immediate once both
definitions are in view: any problem solvable in polynomial time can
also be *verified* in polynomial time, by the trivial strategy of
ignoring whatever certificate is offered and just re-solving the problem
from scratch with the polynomial-time algorithm that already exists for
it. That gives `P <= NP` for free; whether the inclusion is strict —
whether verifying is fundamentally easier than solving — is exactly the
open question the next note takes up.

> [!card] recall
> Explain, from the definitions alone, why P is a subset of NP — what
> verifier would you construct for a problem already known to be in P,
> and why does it not even need to look at the certificate?
> ---
> Take the polynomial-time algorithm A that already decides the problem.
> Build a verifier V(x, y) that ignores y entirely and just runs A(x),
> accepting iff A accepts. V runs in polynomial time because A does, and
> it "verifies" correctly for every certificate (including an empty one)
> because A's answer doesn't depend on any certificate at all. So every
> problem in P trivially satisfies NP's definition. ^card-7578
