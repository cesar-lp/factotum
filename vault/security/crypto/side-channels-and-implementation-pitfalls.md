---
topic: security
category: security-crypto
tags: [side-channels, timing-attacks, constant-time, padding-oracle, implementation-security]
citations: ["Aumasson, Serious Cryptography, Ch. 3"]
---

# Side Channels and Implementation Pitfalls

A security proof is a statement about an algorithm as a mathematical
object: given certain assumptions, no adversary with bounded
resources can break it. That proof says nothing at all about a
specific piece of code that implements the algorithm on real
hardware, and real hardware leaks information the abstract algorithm
never mentions — how long an operation took, how much power it drew,
which memory it touched.

What does a mathematical security proof for an algorithm actually cover, and why doesn't it rule out attacks against a real implementation of that algorithm? :: It covers the algorithm as an abstract object — that the underlying math can't be broken within the proof's assumptions. It says nothing about a specific implementation running on real hardware, which can leak information through channels the proof never modeled at all: timing, power draw, cache behavior, and more. A side channel is any such observable effect of running the code that carries information the algorithm's description doesn't account for. ^card-zkd7

The most practical side channel to exploit, often remotely, is
timing. If an operation on secret data takes measurably different
amounts of time depending on the secret's value, an attacker who can
time it precisely — even over a network, averaged across many
requests — can recover the secret piece by piece without breaking the
algorithm itself.

> [!card] recall
> A server compares an incoming API token against the correct value
> byte by byte and returns "invalid" as soon as it finds the first
> mismatching byte. An attacker can't see that comparison, but can
> send many requests and measure response time precisely. Explain how
> that early-exit comparison could let the attacker recover the
> correct token through timing alone, with no cryptographic weakness
> in play.
> ---
> A guess whose leading bytes happen to match the real token takes
> measurably longer to reject, because the comparison runs further
> before hitting a mismatch. By trying every possible value for one
> byte position and keeping whichever guess took longest to reject,
> then moving on to the next position, the attacker reconstructs the
> token one byte at a time — using nothing but response time, since
> the comparison logic itself has no bug and no weak algorithm behind
> it. ^card-odhz

Code that runs in constant time regardless of secret values is the
general defense against timing side channels. The first discipline it
requires is being ==branch-free== on secret data: no `if` statement, loop ^card-173c
bound, or early return whose path depends on a secret's value, since a
CPU's timing and branch prediction both vary by which path executes.

The second discipline is being ==lookup-free== on secret data: no array ^card-ke7h
or table index computed from a secret value, because which cache line
gets touched is itself observable. Code with no secret-dependent
branch at all can still leak everything through its memory access
pattern alone.

The padding oracle is the canonical side channel that has nothing to
do with timing — it comes from an error message. Some decryption
schemes require the recovered plaintext to end in a specific padding
pattern, and the code has to check that pattern before it can safely
strip it off and use the result.

> [!card] recall
> A server decrypts an incoming ciphertext and returns one distinct
> error when the padding is invalid, and a different error when the
> padding is valid but something else about the request fails.
> Explain how an attacker who can submit arbitrary ciphertexts and
> observe only which error comes back could use that alone to recover
> the plaintext, without ever learning the decryption key.
> ---
> The two distinguishable errors turn the server into an oracle that
> answers one yes/no question per query: "was the padding valid for
> this ciphertext?" By systematically modifying ciphertext bytes and
> resubmitting, the attacker uses that single bit of feedback to work
> out the underlying plaintext one byte at a time — because whether a
> given modification happens to produce valid padding depends
> entirely on the real plaintext byte at that position. Repeating this
> across every byte and block recovers the full plaintext through the
> error signal alone, with no need to break the cipher or recover the
> key. ^card-aeg8

Why is returning the same generic error for every failure case a stronger default in security-sensitive code than returning a more specific, helpful message for each failure? :: Any distinguishable difference between failure modes — a different message, a different status code, a different response time — can become a side channel an attacker queries repeatedly to learn something the code was never meant to reveal, exactly as a padding oracle does with a decryption error. A uniform, generic failure response leaks nothing beyond "it failed," which is usually all the caller needs. ^card-wa86

Not every implementation pitfall depends on measuring anything. A
==downgrade attack== gets two parties who both support a strong option to ^card-weij
negotiate a weaker one instead, by interfering with whatever step
decides which option gets used, and then attacks the weaker option
neither side actually preferred. A related pitfall, algorithm
confusion, works differently: a system accepts input that names which
algorithm or key type to use, and an attacker supplies a value naming
a different, weaker, or simply wrong one than its author intended —
and the system honors it instead of rejecting it.

Why do downgrade attacks and algorithm-confusion attacks share the same underlying fix, even though one manipulates a negotiation and the other manipulates a labeled input field? :: Both let something outside the system's control decide which cryptographic algorithm gets used — a manipulated negotiation in one case, an attacker-supplied field in the other. The fix in both cases is to remove that decision from anything untrusted: pin the algorithm in code the attacker cannot influence, rather than letting a negotiated or input-specified value determine it. ^card-vxpb

"Don't roll your own crypto" gets repeated so often it turns into an
article of faith, which makes it easy to wave off. Framed precisely,
it's an observation about where the real difficulty sits: picking and
coding up a mathematically correct algorithm is the *easy*, well
covered part — the pool of known-good algorithms is public and
heavily scrutinized. Everything in this note sits outside that
math entirely, so a test suite confirming "correct ciphertext for
these inputs" passes cleanly on code that leaks its own key through
timing on every single run.

> [!card] mcq
> A team implements a well-known, published encryption algorithm from
> scratch and writes tests confirming it produces the correct
> ciphertext for every test vector. What does passing those tests
> establish about the implementation's resistance to the pitfalls
> covered in this note?
> - [x] Almost nothing — correctness on known inputs never exercises timing behavior, error-message behavior, or algorithm-selection logic
> - [ ] That the implementation is now safe against timing attacks, since the underlying math is correct
> - [ ] That padding-oracle-style errors are no longer possible, since decryption works on valid input
> - [ ] That the implementation is as safe as a widely deployed, audited library ^card-8mog
