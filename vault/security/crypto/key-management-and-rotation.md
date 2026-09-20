---
topic: security
category: security-crypto
tags: [key-management, envelope-encryption, key-rotation, key-hierarchy]
citations: ["Aumasson, Serious Cryptography, Ch. 3"]
---

# Key Management and Rotation

Every cryptography course spends most of its time on algorithms —
whether AES is secure, whether RSA's underlying math holds up —
because that part is provable once and for all. Key management is
not, and that asymmetry is exactly why it is where real systems
break. A breach postmortem almost never says "the cipher was
broken"; it says a key leaked, sat in a config file, was never
rotated, or got reused somewhere it shouldn't have been.

Why does key management, rather than algorithm strength, dominate the list of causes behind real-world cryptographic breaches? :: Algorithm security is a mathematical property that, once established, holds regardless of who uses the cipher. A key, by contrast, is an operational artifact — it has to be generated, distributed, stored, used, and eventually retired, and every one of those steps is a chance for a human or a system to expose it. A mathematically perfect cipher with a leaked key protects nothing at all. ^card-25n7

That gap between "prove the algorithm" and "manage the key" is why
systems build an explicit key hierarchy rather than encrypting
everything directly under one key. At the top sits a single ==root key==, ^card-7cnv
also called a master key, whose only job is protecting other keys —
never data directly. Below it sit data keys, each scoped to a
narrower job: one dataset, one service, one time window.

That hierarchy is what makes envelope encryption the standard pattern
for protecting data at rest, independent of any particular vendor's
implementation of it. It works in two layers: encrypt the actual data
with a data key (an ordinary symmetric key — the mechanics of that
step belong to the symmetric-encryption notes, not this one), then
encrypt *that data key* with the master key, and store the now-wrapped
data key right alongside the ciphertext it protects.

```
plaintext --[encrypt: data key]--> ciphertext -----> stored together
                                                            |
data key --[encrypt: master key]--> wrapped data key -------
                                                            |
master key ----------------------------------------- kept separate
```

> [!card] mcq
> A system uses envelope encryption: data is encrypted under a data
> key, and the data key is encrypted under a master key and stored
> next to the ciphertext. What is the main operational benefit this
> buys, compared to encrypting every record directly under the master
> key?
> - [x] The master key can be rotated by re-wrapping the (small) data keys, without touching or re-encrypting the (large) bulk data
> - [ ] It makes the data key unnecessary once the master key exists
> - [ ] It removes the need to ever rotate any key at all
> - [ ] It lets the master key be stored in the same place as the data it protects ^card-262d

Encrypting a key with another key — rather than encrypting data with
it — has its own name: ==key wrapping==. It's the operation that makes ^card-bzpy
the second layer of envelope encryption possible, and it's why a
wrapped copy of a data key can sit in the clear next to its
ciphertext without exposing anything: without the master key, that
wrapped copy is just more ciphertext.

Rotating a key means retiring it and switching to a new one for all
future use. Because envelope encryption keeps the master key's job
limited to wrapping small data keys, rotating it is cheap: generate a
new master key, unwrap every data key under the old one and re-wrap
it under the new one, then discard the old master key. The bulk data
itself is never touched.

> [!card] recall
> A team just rotated its master key after learning an old copy of it
> may have leaked months ago. Explain precisely what that rotation
> does and does not accomplish for data that was already encrypted
> before the leak.
> ---
> It does not accomplish much for that specific incident: any
> ciphertext or wrapped data key produced under the old key is exactly
> as readable to an attacker holding that old key as it was the day
> before rotation — rotation changes what gets protected from now on,
> not what already exists. What it does accomplish, in general, is
> limiting future exposure: it caps how much data (or how many wrapped
> keys) ever ends up under a single key, and it bounds how long any
> one key stays worth stealing. ^card-sv3e

Rotation and a second, sharper control solve different problems and
are easy to conflate. Rotation is proactive and routine — swap keys
on a schedule before anything is known to be wrong. ==Revocation== ^card-lrhk
declares a specific key untrustworthy right now, typically because it
is known or suspected to be compromised, and it forces every consumer
to stop honoring that key immediately instead of waiting for its
next scheduled replacement.

Why does giving a key a short, bounded lifetime accomplish something that scheduled rotation alone does not? :: A bounded lifetime is enforced automatically by expiry — the key simply stops being valid at a fixed time, with no dependency on anyone noticing a problem or carrying out a rotation. Scheduled rotation is still an operational process that can slip or be skipped; an expiry date fails safe even if that process breaks down, which is why short-lived keys reduce risk even in a system that also rotates on a schedule. ^card-6z04

There's one more distinction a key hierarchy makes sharp: where a key
is *used* is not the same question as where it is *stored*. A master
key that decrypts other keys has to be used somewhere — inside a
hardware module, an isolated enclave, a process with no other
access — but that place of use need not be anywhere near wherever
configuration files or backups happen to live.

What distinguishes where a key is used from where it is stored, and why does that distinction matter most for a master key specifically? :: Where a key is used is the boundary it operates inside — a hardware module, enclave, or restricted process — and ideally never has to leave that boundary in plaintext. Where it is stored is wherever its protected (wrapped, or access-controlled) form lives, which can be far more widely reachable. It matters most for a master key because that single key can decrypt everything beneath it: if it only ever operates inside one tightly controlled boundary and is never exported unencrypted, compromising a broader system — backups, config, logs — exposes only wrapped material that is useless without it. ^card-gay1
