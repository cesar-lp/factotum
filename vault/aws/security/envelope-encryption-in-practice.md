---
topic: aws
category: aws-security
tags: [kms, envelope-encryption, data-keys, key-caching]
citations: ["AWS Key Management Service Developer Guide — 'Envelope encryption'"]
---

# Envelope Encryption in Practice

`kms-keys-and-the-key-hierarchy.md` established that a KMS key never
gives up its material — you send KMS things to compute, not requests
to fetch a key. That constraint alone forces a specific pattern once
the data involved is more than trivially small, and this note is
about that pattern as AWS actually implements it.

KMS's `Encrypt` API will not take plaintext larger than ==4 KB== — ^card-34nb
call it against a full file or a database row and it simply rejects
the request. That ceiling isn't an oversight to work around; it's a
design signal pointing at the intended pattern for anything bigger:
never send bulk data to KMS at all. Encrypt it locally, and only ever
send KMS the much smaller key that protected it.

Why does it make sense to read the 4 KB direct-encryption limit as a design signal rather than as an arbitrary restriction KMS happens to impose? :: Because it forces exactly the architecture KMS is built around: bulk data should never be sent to the service at all. Anything larger than a trivial payload has to be encrypted locally with an ordinary symmetric cipher, and only the (small, fixed-size) key that did that encryption is ever exchanged with KMS — which is also what keeps KMS's own load and network cost independent of how much data an application actually protects. ^card-iqdb

`GenerateDataKey` is the call that makes this possible. It returns the
*same* freshly generated data key twice, in two different forms: once
as ==plaintext==, ready to use immediately, and once as that same key ^card-32pd
encrypted (wrapped) under the KMS key you specified. Nothing about the
call touches your data at all — it only ever produces a key.

The discipline that follows from getting both copies back is the whole
pattern: encrypt your data locally with the plaintext copy, store the
encrypted copy right alongside the resulting ciphertext, and then
discard the plaintext copy from memory as soon as the local encryption
finishes — it must never be written to disk or logged anywhere.

> [!card] recall
> `GenerateDataKey` hands back a plaintext data key and an encrypted
> data key in the same response. Walk through the three steps an
> application must perform with those two values, in order, and say
> what goes wrong if the middle step is skipped.
> ---
> First, use the plaintext copy to encrypt the actual data locally,
> with an ordinary symmetric cipher. Second, store the encrypted
> (wrapped) copy of the data key right next to the resulting
> ciphertext — skip this and the data becomes permanently unreadable,
> since nothing else records which key, or which wrapped form of it,
> protects that ciphertext. Third, wipe the plaintext copy from memory
> once local encryption is done, since holding onto it defeats the
> entire purpose of never letting a data key rest in the clear longer
> than it has to. ^card-5324

Decrypting later needs only the wrapped data key and the KMS
`Decrypt` call — and notably, that call takes no key id for a
symmetric key. The ciphertext blob produced by `GenerateDataKey`'s
encrypted copy already names the key that wrapped it, embedded in the
blob itself, so KMS can look it up without being told separately.
Losing track of which literal key id encrypted something is a
non-issue for this reason alone.

> [!card] mcq
> An application calls KMS `Decrypt` on a wrapped data key, passing
> only the ciphertext blob and no `KeyId` parameter. Why does this
> work for a symmetric KMS key?
> - [x] The ciphertext blob itself embeds which KMS key encrypted it, so KMS can resolve the key from the blob without a separate identifier
> - [ ] KMS tries every customer-managed key in the account until one succeeds
> - [ ] Symmetric keys share one key id across an entire AWS account, so there's nothing to disambiguate
> - [ ] The call fails without a KeyId; it is a required parameter for every Decrypt call ^card-z6x6

Some workloads only ever write, never read, in the process that
generates the key — a backup job that seals data now and will only
ever be decrypted by a separate restore process, say. For that case,
`GenerateDataKeyWithoutPlaintext` returns only the encrypted copy,
never a plaintext one at all, so a plaintext data key never even
exists in a process that has no legitimate reason to hold one.

What does `GenerateDataKeyWithoutPlaintext` return, and what kind of workload is it meant for? :: It returns only the encrypted (wrapped) copy of a freshly generated data key, never the plaintext copy. It suits a write-only workload that needs to seal data under a data key now but has no legitimate need to hold that key's plaintext at all, since a separate process will supply the key material again — via KMS — when the data is actually decrypted. ^card-qhaj

Put together, envelope encryption buys three things at once: bulk
data is encrypted at local, in-memory speed with no per-record network
round trip to KMS; KMS is only ever called once per data key rather
than once per object it protects; and revoking access to the KMS key —
by changing its key policy, disabling it, or scheduling it for
deletion — makes every envelope wrapped under it unreadable
immediately, without touching a single byte of the underlying data.

Why does revoking access to a KMS key make every data key wrapped under it useless immediately, even though the encrypted data itself is never touched? :: Because the wrapped data key is only decryptable through a KMS call to that specific key, and revoking access breaks that call outright — nothing can unwrap the data key anymore, and without the unwrapped data key nothing can decrypt the data it protects. The bulk data and its ciphertext are completely unaffected; what's lost is only the ability to ever recover the key that would decrypt them. ^card-6tpj

Calling `GenerateDataKey` for every single object still means one KMS
API call per object, which adds up under high request volume and adds
latency KMS's per-request cost doesn't. **Data key caching** — reusing
one already-generated plaintext data key across several encryption
operations for a bounded time or number of uses, instead of asking KMS
for a fresh one every time — trades that cost down deliberately, at
the price of a larger blast radius: if that one cached key is ever
compromised, it has protected more data than a key used exactly once
would have.

> [!card] recall
> Explain data key caching as a deliberate trade-off, naming both
> sides of the trade: what it buys, and what it gives up compared to
> requesting a fresh data key from KMS for every operation.
> ---
> It buys reduced cost and latency, since a cached plaintext data key
> can encrypt many objects without a KMS API call for each one, which
> matters at high request volume where per-call latency and API cost
> both add up. It gives up blast-radius containment: a key reused
> across many operations has protected more data by the time anything
> goes wrong with it, so a single compromised cached key exposes more
> than a key that was only ever used once. Caching is a knob between
> those two costs, not a free improvement. ^card-i4xj

The symmetric cipher that actually does the local encryption step —
AES in some mode of operation — belongs to
`symmetric-encryption-and-block-ciphers.md`, and the authenticated
construction that should be used for it belongs to
`authenticated-encryption-and-aead.md`; neither is specific to KMS,
and this note leans on both rather than re-deriving them.
