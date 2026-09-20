---
topic: math
category: math-probability
tags: [balls-and-bins, birthday-problem, coupon-collector, maximum-load]
citations: ["Blitzstein & Hwang, Introduction to Probability 2e, Ch. 4", "Mitzenmacher & Upfal, Probability and Computing, Ch. 5"]
---

# Balls, Bins, and Collisions

Throw balls independently and uniformly at random into bins, and three
questions recur across surprisingly different problems: how soon does
some bin get *two* balls (a collision), how long until *every* bin has
at least one, and how full does the *fullest* bin get once all the
balls are thrown? These are the birthday problem, the coupon collector
problem, and the maximum-load problem, and each is the same underlying
model asked a different question. The model itself is deliberately
generic — a "ball" and a "bin" can stand for a scheduled job and a
machine, a request and a server, a password and a bucket in a table —
which is why the same three answers keep reappearing.

The birthday problem asks: with n balls thrown into m equally likely
bins, how large must n be before some bin is likely to hold two or
more? The naming comes from the classic version — m = 365 days, balls
being people's birthdays — where the surprising fact is that a
==collision== becomes likely once n exceeds about sqrt(m), not once n ^card-h8m6
approaches m. With 23 people (n = 23) sharing 365 birthdays, the
probability two share a birthday already exceeds 1/2, even though 23 is
tiny next to 365.

```
Birthday problem: P(no collision) is roughly exp(-n^2 / (2m))
so a collision becomes likely once n is on the order of sqrt(m)
```

Why does the birthday problem's threshold scale as sqrt(m) rather than as m itself? :: Because a collision only requires ONE of the roughly n(n-1)/2 pairs of balls to land in the same bin, and each pair collides with probability about 1/m; summing that small probability over the quadratically many pairs (a union-bound-style argument) makes the expected number of collisions cross 1 once n is on the order of sqrt(m), not once n approaches m. ^card-44ph

> [!card] mcq
> With n balls thrown into m bins, the birthday problem says a collision (two balls in the same bin) becomes likely once n is roughly what size, relative to m?
> - [x] On the order of sqrt(m) — far smaller than m itself
> - [ ] On the order of m — you need nearly as many balls as bins
> - [ ] On the order of m^2 — many more balls than bins
> - [ ] On the order of log(m) ^card-8omr

The coupon collector problem asks the opposite kind of question: given
m distinct bins, how many balls must you throw, on average, before
*every* bin has been hit at least once? Each new ball is likely to land
in an already-hit bin once most bins are full, so the last few empty
bins are disproportionately expensive to fill — the expected number of
throws needed grows as m times the harmonic sum, which works out to
==m ln(m)==, not m. ^card-w0a3

```
Coupon collector: E[throws to hit all m bins] = m * H_m ~ m * ln(m)
```

Why does filling the last few empty bins dominate the cost in the coupon collector problem, rather than the cost being spread evenly across all m bins? :: Once k bins have already been hit, a new ball only has probability (m - k)/m of landing in one of the remaining empty bins, so the expected wait for the next new bin is m/(m - k); as k approaches m that wait blows up, meaning the final few empty bins each take, in expectation, a number of throws proportional to m, while the very first bin costs only 1 throw. ^card-uya4

What is the expected number of balls needed to fill all m bins at least once, and how does it compare in growth rate to filling only half of them? :: The expectation is m times the mth harmonic number, which is roughly m*ln(m); filling only half the bins takes only about m*ln(2) throws by the same harmonic-sum argument restricted to the still-empty half, so the second half of the bins — going from half-full to completely full — costs far more than the first half did, even though both halves have the same number of bins. ^card-84uy

The maximum-load question is different again: throw n balls into n
bins (the balanced case, one ball per bin on average) and ask how full
the single fullest bin gets. Average load is exactly 1 ball per bin,
but averages hide the tail — some bin, by chance, collects noticeably
more. The precise answer is that the maximum load is, with high
probability,

```
Maximum load (n balls, n bins): Theta( log n / log log n )
```

which grows much faster than the average load of 1, but far slower
than n itself.

> [!card] mcq
> Throwing n balls independently and uniformly into n bins, the maximum load of any single bin is, with high probability, of what order?
> - [x] Theta(log n / log log n)
> - [ ] Theta(1) — the same order as the average load
> - [ ] Theta(log n)
> - [ ] Theta(sqrt(n)) ^card-whhc

> [!card] recall
> Explain, in one or two sentences, why the maximum load of Theta(log
> n / log log n) balls in the fullest of n bins is much larger than
> the average load of 1 ball per bin, without invoking any specific
> proof technique.
> ---
> The average load only says what happens when the n balls are spread
> perfectly evenly, but the throws are independent and random rather
> than coordinated, so by chance some bins receive a run of several
> balls in a row while others receive none; the maximum-load result
> quantifies how large that lucky-bin effect gets, and it grows (slowly,
> like log n / log log n) rather than staying bounded, precisely because
> with n independent trials there are n chances for some bin to get an
> unusually long run of hits. ^card-qhvb

These three results are one model wearing different hats, and the same
model shows up disguised elsewhere. A hash table's collisions are a
birthday-problem instance — two keys landing in the same slot is
exactly two balls in the same bin — and an overloaded partition or
shard in a distributed system is a maximum-load instance, the fullest
bin among many. The general mathematics of when collisions, full
coverage, or an overloaded bin become likely lives here; how a specific
hash table's expected search cost depends on its load factor is a
separate, already-carded story.
