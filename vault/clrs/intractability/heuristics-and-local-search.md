---
topic: algorithms
category: algo-intractability
tags: [heuristics, local-search, simulated-annealing, tabu-search, genetic-algorithms]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 35 (Approximation Algorithms)"]
---

# Heuristics and Local Search

The previous note's approximation algorithms come with a proof: ratio
`rho`, established in advance, holding on every instance. A **heuristic**
comes with none of that. It may run brilliantly on the instances you
throw at it and fall apart arbitrarily badly on some other instance, and
because there is no proof either way, you have no way to know in advance
which situation you're in. That absence of a ==guarantee== is the entire ^card-rdr3
distinction from the previous note — not that heuristics are worse in
practice, since they are often the only thing fast enough to run at all,
but that nothing backs up how well they'll do on the next instance.

**Local search** is the basic frame nearly every heuristic in this space
builds on: maintain one candidate solution, define a **neighbourhood** of
solutions reachable from it by a small move (swap two elements, flip one
bit, reroute one edge), and repeatedly move to a better neighbour. The
process halts when no neighbour improves on the current solution — a
**local optimum** — which may be far worse than the true, global optimum,
because the search has no way to see past the neighbourhood it's stuck
in.

Why does local search terminate at a "local optimum" that can be arbitrarily far from the global optimum, rather than always finding the best solution overall? :: Because it only ever compares the current solution to its immediate neighbourhood and moves to any improving neighbour; once no neighbour improves on the current solution, the search stops, even though solutions elsewhere in the space — unreachable by one more small move — might be far better. The neighbourhood structure defines what the search can see, and a local optimum is only optimal relative to that limited view. ^card-km9o

Three families of escape mechanism exist precisely to get unstuck from a
local optimum, and each does it differently:

```
Simulated annealing: accept a worsening move with probability that
  decreases over time (a "temperature" schedule), so early search can
  cross bad valleys and late search settles like plain local search.
Tabu search: forbid re-visiting recently made moves for a fixed number
  of steps, so the search cannot immediately undo its way back into the
  same local optimum it just tried to leave.
Random restarts: abandon the current search entirely and start over
  from a fresh random solution, keeping the best result across restarts.
```

> [!card] mcq
> What is the defining difference between a heuristic like simulated
> annealing and an approximation algorithm like greedy vertex cover, when
> both are applied to the same optimization problem?
> - [x] The approximation algorithm carries a proven worst-case ratio to optimal; the heuristic carries no such proof and may be arbitrarily bad on some instance
> - [ ] The heuristic always runs faster in practice
> - [ ] The approximation algorithm is always simpler to implement
> - [ ] The heuristic is only usable on decision problems, not optimization problems ^card-z67p

What does simulated annealing's decreasing "temperature" schedule actually control, in terms of the search's behaviour over time? :: It controls the probability of accepting a move that makes the current solution worse. Early on, with high temperature, the search accepts worsening moves fairly often, which lets it cross bad regions and escape a local optimum it would otherwise be trapped in; as temperature drops, it accepts fewer and fewer worsening moves, and the search behaves more and more like plain local search, settling into whatever optimum it lands near. ^card-r20r

Why does tabu search need to remember and forbid recently made moves at all, rather than simply always taking the best available neighbour? :: Because always taking the best available move, without memory, tends to walk straight back into the local optimum the search just escaped from — a worsening move made to get away from it looks immediately reversible by the greedy rule. Marking recent moves as forbidden ("tabu") for a fixed number of steps prevents that oscillation, forcing the search to explore further before it's allowed to backtrack. ^card-hxz4

Genetic algorithms and swarm-based methods extend the same idea to a
*population* of candidate solutions rather than one, combining and
perturbing members of the population across generations. They can find
good solutions on problems where no other technique gets traction, but
that same open-endedness is a liability: with no bound to check output
against, it is easy to mistake an unconverged, mediocre population for
genuine progress, and tuning their many parameters (population size,
mutation rate, selection pressure) is itself an unguided search with no
convergence guarantee of its own.

Why does strong performance from a genetic algorithm on one problem deserve more skepticism than similarly strong performance from, say, greedy vertex cover? :: Because greedy vertex cover's performance is backed by a proven ratio that holds on every instance, so strong results are expected and explained. A genetic algorithm has no such backing and several free parameters (population size, mutation rate, selection pressure) that were themselves tuned by an unguided search; strong results could reflect a genuinely good fit to the problem, or could reflect parameters and test cases that happened to align, and without a bound to check against there is no way to tell which. ^card-kurp

Given all of that, most large real-world instances of NP-hard problems
are in fact solved with heuristics, not exact algorithms or approximation
schemes — they are simply the only thing fast enough. The discipline that
makes this defensible, rather than reckless, is measurement: run the
heuristic against a known optimum or a computable bound (an LP
relaxation, a matching-based lower bound) on benchmark instances before
trusting it on production data, because without that comparison there is
no way to distinguish a heuristic that happens to work well from one that
happens to be lucky on the inputs you've tried.

> [!card] recall
> You are evaluating a new heuristic for a scheduling problem and it
> outperforms your current one on every test case you've tried. Explain
> why "it wins on every test case I've tried" is not, by itself, evidence
> that it is a good heuristic in the sense this note cares about, and
> what you would need to add to make the evaluation trustworthy.
> ---
> A heuristic has no proof backing its behavior, so performing well on
> whatever test cases happened to be tried says nothing about performance
> on the instances that matter in production, which may differ in ways
> the test set doesn't cover — this is exactly the gap a proven
> approximation ratio would close and a heuristic cannot. Trustworthy
> evaluation means comparing against a computable lower bound or a known
> optimum on recognized benchmark instances, so "wins on my test cases"
> becomes "stays within X% of a bound across a standard, adversarially
> chosen benchmark suite" — a claim that generalizes past the specific
> instances you happened to try. ^card-9tre
