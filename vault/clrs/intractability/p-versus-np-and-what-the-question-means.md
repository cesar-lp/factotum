---
topic: algorithms
category: algo-intractability
tags: [p-vs-np, complexity-theory, cryptography, worst-case-hardness]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 34 (NP-Completeness)"]
---

# P versus NP and What the Question Means

The previous note established `P <= NP` for free from the definitions.
This one is about the open direction: is that inclusion strict?

```
P vs NP: is P = NP, or is P a strict subset of NP?
```

Precisely, the question asks whether every decision problem whose
solutions can be ==verified== quickly can also be solved quickly from ^card-yuih
scratch — whether checking a proposed answer is fundamentally easier than
finding one, or whether the two are secretly the same difficulty.

State precisely what the P versus NP question asks. :: Whether every decision problem whose proposed solutions can be verified in polynomial time can also be solved from scratch in polynomial time — that is, whether P and NP are the same class or whether P is a strict subset of NP. ^card-2dln

The two possible answers are not symmetric in what they'd mean for the
world. If `P = NP`, then a single polynomial algorithm exists for every
one of the thousands of catalogued NP-complete problems — scheduling,
routing, packing, satisfiability — and public-key cryptography as
currently deployed collapses, since RSA and its relatives rely on
problems (like factoring, which is not known to be NP-complete but is
in a similar spirit of assumed hardness) being hard to solve while
staying easy to verify.

Why would a proof that P = NP threaten public-key cryptography as it's currently deployed? :: Public-key schemes like RSA rely on an asymmetry between an easy-to-verify, hard-to-solve computation (using a public key is fast; recovering the private key from it is assumed intractable). If P = NP, that kind of asymmetry could not survive in general — problems whose solutions are easy to check would also become easy to solve outright, undermining the hardness assumption the scheme is built on. ^card-c8mj

If instead `P != NP`, the difficulty of problems like the travelling
salesman or graph colouring is ==intrinsic== to the problem, not an ^card-uhf1
artifact of researchers not having found the right algorithm yet — no
amount of cleverness within polynomial time closes the gap, ever, for
any of them.

The two directions also carry wildly different burdens of proof, which is
part of why the question has stayed open for decades. `P = NP` could in
principle be settled by a single constructive act: exhibit one
polynomial-time algorithm for one NP-complete problem, and (because of
the reductions covered in the next two notes) every problem in NP falls
at once. `P != NP` demands the opposite kind of argument: a proof that
no polynomial algorithm can *ever* exist for some problem in NP, for any
conceivable approach, which is a categorically harder kind of claim to
establish than producing one example.

> [!card] mcq
> Why is P = NP, if true, generally considered easier to prove than P != NP, if true?
> - [x] P = NP only needs one polynomial algorithm for one NP-complete problem exhibited; P != NP needs ruling out every possible polynomial algorithm forever
> - [ ] P = NP is actually harder to prove, since it requires checking every problem in NP individually
> - [ ] Both directions require the same kind of exhaustive proof
> - [ ] P != NP has already been reduced to checking a finite number of cases ^card-nu7u

Despite the asymmetry in provability, most researchers believe `P !=
NP`. That belief rests on decades of failed attempts at polynomial
algorithms for well-studied NP-complete problems across totally
different domains, and on structural results (like the existence of
problems believed to sit strictly between P and NP if the classes
differ) that would look strange if the classes secretly coincided. None
of that constitutes a proof — it is consensus built on the absence of a
counterexample, not a theorem.

What is the epistemic status of "P != NP" today, and what is the evidence most researchers cite for believing it? :: It is an open conjecture, not a proven theorem. The belief rests on circumstantial evidence: decades of independent effort across many fields have failed to find a polynomial algorithm for any NP-complete problem, and no proof of impossibility exists either — the consensus reflects the weight of failed attempts, not a demonstrated impossibility. ^card-3nkt

Even a hypothetical proof of `P != NP` would give a working engineer
less than it sounds like. NP-hardness is a statement about the
**worst case** over all instances of a problem, not about any particular
instance in front of you. A problem being NP-hard says nothing about
whether *your* input is easy — plenty of NP-complete problems have huge
classes of instances (small size, special structure, sparse
constraints) that fall to exact or heuristic methods in practice, every
day, in production systems. Knowing a problem is NP-complete tells you
not to expect a general-purpose polynomial algorithm that handles every
instance; it does not tell you that the instance you actually have is
hard.

> [!card] recall
> A colleague says "this problem is NP-complete, so there's no point
> even trying to solve it exactly." Explain what's wrong with that
> conclusion, using the distinction between worst-case and per-instance
> hardness.
> ---
> NP-completeness is a worst-case statement: it guarantees that no known
> polynomial algorithm handles *every* instance, and (if P != NP) none
> ever will. It says nothing about the specific instance at hand — many
> real instances are small, structured, or sparse enough that exact
> methods solve them quickly, and NP-complete problems are routinely
> solved exactly in practice. The correct conclusion is "no
> general-purpose polynomial algorithm exists," not "this specific
> instance is unsolvable in reasonable time." ^card-o82g

That worst-case-versus-instance gap is the practical takeaway of this
whole note for anyone writing software rather than proving theorems: an
NP-hardness result is a reason to stop looking for one algorithm that
handles every input fast, not a reason to give up on the input you
actually have.
