---
topic: algorithms
category: algo-intractability
tags: [np-completeness, cook-levin, sat, 3-sat, reductions]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 34 (NP-Completeness)"]
---

# NP-Completeness and the Cook-Levin Theorem

`polynomial-time-reductions.md` gave the tool; this note gives the
definition that tool exists to serve, plus the one theorem that makes
the whole apparatus non-vacuous.

A problem is **NP-complete** if it satisfies two conditions at once: it
is itself in NP, and every problem in NP reduces to it in polynomial
time.

```
L is NP-complete if:
  1. L is in NP, and
  2. for every problem L' in NP, L' <=p L
```

Those two conditions together make an NP-complete problem simultaneously
one of the *easiest* problems to state a membership certificate for
(condition 1 puts a ceiling on it — nothing in NP is any harder to
verify) and one of the *hardest* problems in the entire class to solve
(condition 2 puts a floor under it — nothing in NP is any harder to
solve, since everything reduces into it).

Why must an NP-complete problem satisfy both "is in NP" and "everything in NP reduces to it," rather than just the second condition alone? :: Dropping the first condition would allow "NP-hard but not in NP" problems — arbitrarily harder problems that everything in NP reduces to, but which aren't themselves verifiable in polynomial time — to count as NP-complete, which would break the property that an NP-complete problem is the *hardest problem inside NP itself*, not just some upper bound outside it. Membership in NP caps its difficulty at NP; universality among NP problems (via reductions) puts it at the top of that capped class. ^card-uwyr

That "every problem in NP reduces to it" clause is what gives the class
its practical bite: a polynomial-time algorithm for **any single**
NP-complete problem would immediately yield a polynomial-time algorithm
for **every** problem in NP, by chaining the reduction with the newly-
found algorithm. Equivalently, if even one NP-complete problem turns out
to be outside P, then `P != NP`, since that one problem alone would be a
witness that not everything in NP is polynomial-time solvable.

> [!card] mcq
> Why would discovering a polynomial-time algorithm for just one NP-complete problem resolve P versus NP in favor of P = NP?
> - [x] Every problem in NP reduces to it by definition, so chaining any NP problem's reduction with the new algorithm solves that problem in polynomial time too — for all of NP at once
> - [ ] It would only prove that specific problem is in P, leaving the rest of NP's status unchanged
> - [ ] It would prove P != NP instead, since NP-complete problems are assumed intractable
> - [ ] It would only help problems that are easier than the one just solved ^card-iehe

This "reduces to everything" clause creates an obvious chicken-and-egg
problem for whoever wants to name the *first* NP-complete problem: there
is no earlier NP-complete problem to reduce from yet, so condition 2
cannot be established by the usual method of one reduction from an
existing catalogue entry. The first proof has to reach past reductions
entirely and argue condition 2 directly from the definition of NP
itself, for every problem in NP simultaneously — which is exactly what
the ==Cook-Levin== theorem does, for the boolean satisfiability problem, ^card-bpwh
SAT.

Cook-Levin's argument, in shape rather than in full formal detail, works
by encoding computation itself as a boolean formula. Any problem in NP
has, by definition, a polynomial-time verifier that checks a certificate
against an input. Cook-Levin shows that the entire step-by-step
computation of that verifier — for a fixed input and a fixed running-
time bound — can be encoded as a boolean formula over variables
representing the verifier's tape contents and machine state at every
step, such that the formula is satisfiable exactly when there exists
some certificate causing the verifier to accept. Because SAT is
general enough to express *any* polynomial-time computation this way,
every problem in NP reduces to it — condition 2, established from first
principles rather than from a prior NP-complete problem.

What made it necessary to prove SAT's NP-completeness directly from the definition of NP, rather than by reducing some other already-known NP-complete problem to it? :: There was no earlier NP-complete problem to reduce from — SAT was the first. Cook-Levin instead shows directly that every problem in NP reduces to SAT, by encoding an arbitrary polynomial-time verifier's computation as a boolean formula satisfiable exactly when some certificate makes the verifier accept, since that route doesn't presuppose any prior NP-complete problem exists. ^card-3jue

Suppose instead someone proved a specific NP-complete problem has no ^card-im8m
polynomial-time algorithm at all. What would that establish about P
versus NP, and why? :: It would establish P != NP outright. NP-completeness means every problem in NP already reduces to that one problem, so if that single problem is provably outside P, it is a witness that not everything in NP can be solved in polynomial time — one intractable NP-complete problem is enough to settle the whole question.

Once SAT was established as NP-complete, every subsequent NP-completeness
proof in the field could go back to using ordinary reductions — take a
problem already known to be NP-complete and reduce it into the new
problem, rather than repeating Cook-Levin's from-scratch argument. That's
the payoff of having a first NP-complete problem at all: it turns a
one-time, machine-model-level argument into an ==infinitely reusable== ^card-la7u
starting point.

A restricted form of SAT, **3-SAT** — every clause has exactly three
literals, and the formula is a conjunction of such clauses — is still
NP-complete, and it is the form almost every later reduction in this
category actually starts from, rather than starting from unrestricted
SAT.

```
3-SAT instance: a boolean formula in conjunctive normal form where
every clause has exactly 3 literals, e.g.
  (x1 OR x2 OR NOT x3) AND (NOT x1 OR x3 OR x4) AND ...
Question: does some assignment of true/false to the variables
satisfy every clause?
```

3-SAT's restricted shape makes it a more convenient starting point for
new reductions than general SAT — the fixed clause width gives a
reduction's target problem a simpler, more uniform structure to encode
against — while a separate reduction from SAT down to 3-SAT (splitting
longer clauses using auxiliary variables) guarantees that 3-SAT's own
NP-completeness costs nothing beyond SAT's.

> [!card] recall
> Explain why 3-SAT, despite being a *more restricted* problem than
> general SAT (fewer formulas qualify as valid 3-SAT instances), is not
> thereby easier to solve — and why later reductions in this category
> prefer starting from 3-SAT rather than from unrestricted SAT.
> ---
> Restricting the *shape* of instances doesn't restrict the *difficulty*
> of the ones that remain: SAT reduces to 3-SAT (any formula can be
> rewritten, clause by clause, into an equivalent 3-SAT instance using
> extra variables), so 3-SAT inherits full NP-hardness even though it's
> a narrower syntactic class. Later reductions prefer 3-SAT as a source
> because its uniform three-literals-per-clause structure is easier to
> encode into a new target problem than SAT's arbitrary clause lengths,
> even though both are equally hard as reduction sources. ^card-yc2a
