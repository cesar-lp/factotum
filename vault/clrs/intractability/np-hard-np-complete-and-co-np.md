---
topic: algorithms
category: algo-intractability
tags: [np-hard, np-complete, co-np, complexity-classes, ladner]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 34 (NP-Completeness)"]
---

# NP-hard, NP-complete, and co-NP

The earlier notes in this category use "NP-hard" and "NP-complete" almost
interchangeably in casual reading, which is exactly the habit this note
exists to break. The two terms are not synonyms, and the difference is not
pedantic — it changes what kind of problem you're even allowed to be
talking about.

**NP-hard** means "at least as hard as every problem in NP" — formally,
every problem in NP reduces to it in polynomial time. Nothing in that
definition requires the problem to *be* in NP itself.

That omission is not a technicality; it means an NP-hard problem does not
even have to be a decision problem, let alone one with a checkable
certificate.

The halting problem is NP-hard despite being ==undecidable==. ^card-4xac

Why is the halting problem NP-hard without being NP-complete? :: Every ^card-8x3h
problem in NP reduces to the halting problem (simulate the NP verifier and
ask whether it halts accepting), which is enough to satisfy the definition
of NP-hard. But the halting problem has no algorithm at all, decidable or
not, so it certainly has no polynomial-time verifier — meaning it fails the
"in NP" requirement so completely that it isn't even in the broader class of
decidable problems.

**NP-complete** is the much narrower, much more useful class: it is exactly
the intersection of NP-hard and NP. A problem earns "NP-complete" only by
satisfying both halves of the proof skeleton in
`proving-a-problem-np-complete.md` — hard enough to stand in for all of NP,
and also easy enough (in the certificate-verification sense) to belong to NP
in the first place.

> [!card] mcq
> Which statement correctly distinguishes NP-hard from NP-complete?
> - [x] Every NP-complete problem is NP-hard, but an NP-hard problem need not be in NP at all
> - [ ] NP-hard and NP-complete are two names for the same class
> - [ ] Every NP-hard problem is NP-complete, but not vice versa
> - [ ] NP-complete problems are strictly easier than NP-hard problems ^card-9bsp

The distinction is concrete enough to change how you should phrase a claim
about a specific, well-known problem. The travelling salesman *optimization*
problem — find the minimum-weight Hamiltonian cycle — is NP-hard but not
NP-complete, because there is no obvious short certificate for "this is the
minimum"; you'd need to rule out every shorter tour, which isn't a
polynomial check. Its *decision* version — does a Hamiltonian cycle of
weight at most k exist — is NP-complete, because now a candidate cycle is a
certificate that a polynomial-time check can verify directly against k.

Why is TSP's optimization form only NP-hard, while its decision form (does a ^card-z4lj
tour of weight <= k exist) is NP-complete? :: A certificate for the decision
form is just a candidate tour, verified in polynomial time by summing its
weight and comparing to k. There is no equivalent short certificate for
optimality in the optimization form — confirming a tour is *the* minimum
requires ruling out every other tour, which isn't a polynomial-time check —
so the optimization form fails the "in NP" half of NP-completeness even
though it is at least as hard as any NP problem.

**co-NP** is the class of problems whose *no*-instances (not yes-instances)
have polynomial-time-checkable certificates. The standard example is
tautology: given a Boolean formula, is it true under every assignment? A
*no*-certificate is a single falsifying assignment, checkable in polynomial
time; there's no known equivalent way to produce a short certificate for a
*yes* answer, since that seems to require checking all assignments.

Verifying that a Boolean formula is satisfiable is easy — a satisfying ^card-j5p5
assignment is a short certificate. Verifying that no satisfying assignment
exists is not obviously easy in the same way, which is precisely why NP and
co-NP are not known to be the same class. :: Satisfiability's certificate
(a witness assignment) only certifies the yes-answer; certifying the
no-answer (unsatisfiability, i.e. tautology of the negation) has no known
polynomial-size certificate, so the ease of one direction doesn't transfer
to the other. If it did — if every co-NP problem had short yes-certificates
too — that would collapse NP and co-NP into one class, which nobody has
proven or refuted.

> [!card] recall
> Explain what it would mean, structurally, for NP to equal co-NP, and why
> the current understanding treats that as an open question rather than an
> obvious fact.
> ---
> NP = co-NP would mean every problem whose no-instances have short
> certificates also has short certificates for its yes-instances (and vice
> versa) — in particular, it would mean tautology (checking a formula is
> true under *every* assignment) has some polynomial-size proof of that
> fact, not just a disproof via one counterexample. No such proof scheme is
> known, and no one has shown one is impossible either, so the question sits
> unresolved alongside P vs. NP itself, which it is closely tied to: P = NP
> would imply NP = co-NP, though the converse is not known to hold. ^card-ad0b

**P sits inside both** NP and co-NP: every problem solvable in polynomial
time trivially has a polynomial-time-checkable certificate for both its yes-
and no-instances (you don't need a certificate at all — just run the
algorithm), so P is a subset of the intersection of the two.

If P != NP, Ladner's theorem guarantees the existence of ==NP-intermediate== ^card-ut51
problems — in NP, not in P, but also not NP-complete — with integer
factorization and graph isomorphism as the standard suspected (not proven)
examples.

What two problems are the standard suspected examples of NP-intermediate ^card-v0kq
status, and why are they only "suspected" rather than confirmed? :: Integer
factorization and graph isomorphism. They're suspected because no
polynomial-time algorithm is known for either (so they don't look like they
belong in P), yet no NP-hardness proof is known for either either (so they
don't look NP-complete). Neither absence is a proof, though — resolving
their status precisely would resolve open questions about the structure of
NP itself.
