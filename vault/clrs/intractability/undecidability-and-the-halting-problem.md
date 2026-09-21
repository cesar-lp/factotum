---
topic: algorithms
category: algo-intractability
tags: [undecidability, halting-problem, rice-theorem, diagonalization, computability]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 34 (NP-Completeness)"]
---

# Undecidability and the Halting Problem

Every other note in this category is about problems that are *hard* —
solvable in principle, given enough time, but not in polynomial time.
This note is about a different failure mode entirely: problems with no
algorithm at all, for any amount of time. Undecidability is not a
resource question, so it is not a matter of faster hardware or a cleverer
algorithm closing the gap the way parameterized structure or a tighter
approximation can — no future computer, however fast, decides an
undecidable problem, because the question isn't how long the computation
takes but whether a correct, always-terminating decision procedure
==exists== at all. ^card-hcdw

The canonical example is the **halting problem**: given a program and an
input, does the program halt on that input, or run forever? The proof
that no algorithm decides this for all program/input pairs is a
diagonalization argument, and it's worth seeing laid out so the
self-reference is visible rather than taken on faith:

```
Assume HALTS(P, x) exists: a program that always terminates and
correctly reports whether program P halts on input x.

Build a new program D(P):
  if HALTS(P, P) reports "halts":
    loop forever
  else:
    halt

Now ask: does D halt on input D itself?

  If D(D) halts       -> HALTS(D, D) must have reported "loops"
                          -> but D(D) halting contradicts that report
  If D(D) loops forever -> HALTS(D, D) must have reported "halts"
                          -> but D(D) looping contradicts that report

Either way, contradiction. So HALTS cannot exist.
```

The trick is feeding a program its own description and then defining its
behavior to invert whatever the hypothetical decider says about that
exact case — the same self-reference pattern behind Cantor's diagonal
argument and Godel's incompleteness theorem.

What makes the halting-problem proof a diagonalization argument, rather than an ordinary proof by exhaustive case analysis? :: It works by assuming a decider exists, then constructing a program that feeds itself its own description and deliberately behaves opposite to whatever the decider predicts for that self-referential case — halting exactly when the decider says it loops, and vice versa. Both possible outcomes contradict the decider's report, so the contradiction comes from the self-reference itself, not from checking cases. ^card-woa7

The halting problem generalizes far beyond one specific question. **Rice's
theorem** says that every non-trivial ==semantic== property of a ^card-c2un
program's behavior — does it halt, does it ever output a negative number,
does it compute the same function as some other program — is undecidable.

That statement carries two qualifiers worth being precise about.
"Non-trivial" rules out properties that are true of every program or
false of every program. The other qualifier rules out properties you can
determine by reading the source text itself without running it — like
whether the code contains a loop — since those are settled by inspection,
not by reasoning about behavior.

Rice's theorem is the reason every static analyzer you rely on — a null-
pointer checker, a type checker for a Turing-complete language extension,
a dead-code detector — has to give something up. None can be both
**sound** (every warning is a real bug) and **complete** (every real bug
gets a warning), because a tool that was both would decide a semantic
property outright. A sound-but-incomplete tool stays silent on some real
bugs (false negatives); a complete-but-unsound tool flags some correct
code (false positives). Every analyzer you've used made that trade,
whether or not its documentation says so.

Why can't a static analysis tool be simultaneously sound (never wrong when it warns) and complete (catches every real instance of the bug it targets), for a genuinely semantic property in a Turing-complete language? :: Because a tool that was both sound and complete for a non-trivial semantic property would amount to a correct, always-terminating decision procedure for that property, which Rice's theorem rules out. Every real analyzer therefore gives something up: sound-but-incomplete tools miss some real bugs to avoid false alarms, and complete-but-unsound tools flag some correct code to avoid missing bugs. ^card-wd2q

It's easy to conflate undecidable with NP-hard, since both get loosely
called "impossible," but they sit in unrelated axes: NP-hardness is about
problems that *are* decidable but (believed) not in polynomial time,
while undecidability is about problems with no correct algorithm at any
running time, polynomial or not. An undecidable problem can absolutely be
NP-hard in the technical sense — every NP problem reduces to it, since
that reduction only requires the target to be at least as hard, with no
upper bound implied. But it is never **NP-complete**, because
NP-completeness additionally requires membership in NP, and NP requires a
polynomial-time *verifier* for proposed certificates — which in turn
requires the property being checked to be decidable at all.

> [!card] mcq
> A problem is shown to be NP-hard, and separately shown to be
> undecidable. What follows about whether it is NP-complete?
> - [x] It cannot be NP-complete, since NP-completeness requires membership in NP, and an undecidable problem cannot have a polynomial-time (or any) verifier that always terminates correctly
> - [ ] It is automatically NP-complete, since NP-hardness plus any additional hardness result implies completeness
> - [ ] It depends on whether P = NP
> - [ ] NP-hardness and undecidability cannot both hold for the same problem ^card-786f

Between "solvable in polynomial time" and "not solvable at all" sits a
large middle ground worth naming explicitly: plenty of problems are
==decidable== but not tractable, meaning some algorithm gets an answer ^card-h2o1
eventually with no bound promised on how long "eventually" takes.

Every problem elsewhere in this category — NP-complete problems included,
along with anything solved only by brute force — falls into that middle
ground. It is exactly the gap the rest of this category lives in: hard,
in the sense of no known fast algorithm, but never hopeless in the way
this note's subject is.

> [!card] recall
> Explain where "NP-complete," "NP-hard but not NP-complete," "decidable
> but intractable," and "undecidable" each sit relative to one another,
> and give one example problem for the categories that have appeared in
> this category's notes.
> ---
> Decidable problems split into tractable (in P) and intractable; NP-
> complete problems are a specific slice of the decidable-but-believed-
> intractable set, sitting in NP and at least as hard as every other NP
> problem. NP-hard problems need not be in NP at all — some (like the
> optimization version of an NP-complete decision problem) are decidable
> but outside NP as stated; others, like the halting problem, are NP-hard
> in the reduction sense yet undecidable, sitting entirely outside the
> decidable universe. Undecidable is the most severe category, and it is
> disjoint from NP-complete precisely because NP-completeness requires
> deciding the problem to begin with. ^card-p4jm
