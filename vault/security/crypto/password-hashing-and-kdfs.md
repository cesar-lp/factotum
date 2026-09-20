---
topic: security
category: security-crypto
tags: [password-hashing, kdf, bcrypt, argon2, salt]
citations: ["Aumasson, Serious Cryptography, Ch. 7"]
---

# Password Hashing and KDFs

Storing a password means storing something derived from it so that a
stolen database doesn't hand out the passwords themselves, and the
obvious first idea is to run the password through an ordinary
general-purpose hash function before saving it. That idea is wrong,
because a general-purpose hash function is built to be *fast* — good
for checksumming files or building data structures, terrible for
protecting secrets that people choose badly. An attacker who steals the
password table can try candidate passwords against it entirely offline,
and a fast hash lets commodity hardware try billions of candidates per
second.

Why is running passwords through an ordinary fast hash function (like the kind used for checksums) the wrong way to store them? :: Because a fast hash lets an attacker who steals the password database try billions of candidate passwords per second, offline, with no rate limiting possible. Most human passwords come from a small, guessable space, so an attacker doesn't need to invert the hash mathematically — cheap brute force over likely candidates is enough once the hash is fast to compute. ^card-ipx6

The fix is to use a function built to be deliberately ==slow==, so ^card-0j73
that trying one guess costs a meaningful amount of computation and
trying billions of guesses becomes correspondingly expensive, even
though a single legitimate login only ever pays that cost once. Raising
that cost doesn't weaken correctness — the real password still
produces the right output — it only weakens the attacker's
guess-per-second rate.

bcrypt, scrypt, and Argon2 all pursue that slowness, but they don't all
spend the attacker's resources the same way. bcrypt is built to be
purely CPU-hard: expensive to compute quickly, but cheap in memory, which
leaves it exposed to attackers who build custom hardware (GPUs, FPGAs,
ASICs) that parallelizes plain CPU work far more cheaply than a defender
can. scrypt was designed specifically to close that gap by also being
memory-hard, forcing every guess to allocate a large block of memory —
custom hardware is good at cramming in more compute, but nowhere near as
good at cramming in more memory. Argon2, the winner of the 2015
Password Hashing Competition, generalizes further: it exposes separate,
tunable parameters for CPU cost and memory cost, so a defender can
demand both.

> [!card] mcq
> A defender is worried specifically about attackers building custom
> ASICs to brute-force stolen password hashes. Which property should
> the chosen password-hashing function have to blunt that threat?
> - [x] Memory-hardness — forcing every guess to use a large amount of memory, which custom hardware can't scale up as cheaply as raw compute
> - [ ] A shorter output length, so each hash takes less storage
> - [ ] Using the same general-purpose hash function the attacker's ASIC already accelerates, just called more times
> - [ ] Removing the salt, so identical passwords always hash identically ^card-jbq8

Which resource does bcrypt's design make expensive for an attacker, and what specific attack does that leave it exposed to? :: bcrypt makes CPU time expensive but leaves memory cheap, which leaves it exposed to attackers running custom hardware (GPUs, FPGAs, ASICs) that parallelizes CPU-bound work far more cost-effectively than general-purpose CPUs can. scrypt and Argon2 close that gap by also demanding memory. ^card-kmab

Whatever function is chosen, "deliberately slow" is a dial, not a fixed
setting. Each of these functions exposes a **work factor** — an
iteration count, or separate memory and time parameters for the
memory-hard designs — that controls exactly how expensive one guess is.
That number has to keep moving: hardware gets faster every year, so a
work factor that made a guess "expensive enough" five years ago buys an
attacker with modern hardware a discount today. Systems that store
password hashes are expected to periodically raise the work factor,
typically by re-hashing at the new setting the next time each user
logs in and presents their password in the clear.

Why can't a system pick one work factor for its password-hashing function and leave it fixed forever? :: Because hardware keeps getting faster and cheaper, so a work factor that was expensive enough when it was chosen becomes progressively cheaper for an attacker to brute-force over time. The work factor has to be raised periodically to keep the cost of a guess roughly constant in real terms, typically by re-hashing each user's password at the higher setting the next time they log in. ^card-l2gu

Slowness alone doesn't stop every attack, though. Two users who happen
to pick the identical password would, with no other input, get the
identical stored hash — letting an attacker precompute a table of
hashes for common passwords once and check it against an entire stolen
database at a glance, or spot at a glance which accounts share a
password. The fix is a **salt**: a random value generated per password,
stored alongside the hash, and mixed in before hashing so the same
password produces a different output for every user. A salt defeats
that precomputation and rules out spotting shared passwords by
inspection, but it does this without needing to be hidden — it can sit
right next to the hash in the database in plain view, because its job
is to make every hash unique, not to be unknown to an attacker.

Why doesn't a salt need to be kept secret in order to do its job? :: A salt's job is to make sure identical passwords produce different hashes and to defeat precomputed lookup tables built against a fixed password without a salt — both of those hold even if the attacker can read the salt, since it only stops precomputation done *before* the attacker has that specific salt. It doesn't add guessing cost, so it provides no protection against an attacker who already has the salt and is brute-forcing that one entry directly; the work factor is what supplies that cost. ^card-tflc

A **pepper** looks similar but plays a different role: it's a value
mixed into every password hash the same way a salt is, except it stays
constant across all users and, unlike a salt, must be kept secret —
typically held in application configuration or a hardware module,
never alongside the password table itself. Because it's stored
separately, an attacker who steals only the password database (salts
and all) still can't compute or check guesses against the hashes at
all, since they're missing an input they never see. A pepper only
helps if that separation actually holds: if it leaks along with the
database, it protects nothing.

> [!card] recall
> A team stores per-user salts in the same database table as the
> password hashes, and also adds a single application-wide secret value
> mixed into every hash, kept only in a separate secrets manager.
> Explain why leaking the password table alone is not enough to attack
> the hashes, and what would have to also leak for that protection to
> fail.
> ---
> The per-user values (salts) being public is fine — they only stop
> precomputed tables and cross-user comparison, not a direct attack
> once you have them. The secret, application-wide value (the pepper)
> is what actually blocks the attacker: it's a required input to every
> hash computation that never sits in the database, so a database-only
> leak leaves the attacker unable to compute or check guesses at all.
> The protection fails only if the pepper itself also leaks — for
> example, if the secrets manager is compromised too, or the same
> breach that took the database also exposed application config. ^card-8l1g

The functions covered so far — the CPU-and-memory-hard family used for
login passwords — are one branch of a broader idea called a
**key-derivation function (KDF)**, and it's worth being precise about
which branch is which, because the other branch is tuned for the
opposite problem. A function like HKDF takes an input that's already a
strong, high-entropy cryptographic key (say, the output of a
Diffie-Hellman exchange) and expands or reshapes it into one or more
keys of the sizes a protocol needs. Nothing about that input is
guessable, so there's no attacker brute-forcing it — HKDF is built to
be fast, not slow, because slowness would buy no security here and
would only waste time on every legitimate use.

A password, by contrast, is a low-entropy secret a human chose and can
plausibly be guessed by an attacker trying candidates one after
another, so the KDF's job is to make each of those candidate checks as
expensive as possible — that's the "stretching" a password-hashing
function performs, and it's the opposite design goal from expanding an
already-strong key.

A protocol needs to turn a Diffie-Hellman shared secret into an AES key and a MAC key, and separately needs to turn a user's typed password into something safe to store. Why is it wrong to reach for the same kind of KDF for both jobs? :: The Diffie-Hellman secret is already high-entropy and unguessable, so that job calls for a fast KDF (like HKDF) that just expands/reshapes it into the right number of keys of the right sizes. The typed password is low-entropy and guessable, so that job calls for a deliberately slow, CPU-and-memory-hard function (bcrypt, scrypt, or Argon2) that makes each guess expensive. Using the fast kind for passwords would leave them brute-forceable; using the slow kind for an already-strong key would only waste time for no security benefit. ^card-dp5b
