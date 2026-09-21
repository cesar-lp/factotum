---
topic: aws
category: aws-security
tags: [kms, key-rotation, key-deletion, backing-key, imported-key-material]
citations: ["AWS Key Management Service Developer Guide — 'Rotating AWS KMS keys'"]
---

# Key Rotation and Key Deletion

`key-management-and-rotation.md` makes the general argument for
rotating keys: bound how much data sits under any one key, and bound
how long a key stays worth stealing. This note is about what KMS
actually *does* when you turn automatic rotation on, and where that
mechanism stops short of what people assume it does.

When automatic rotation is enabled on a KMS key, KMS generates a new
==backing key== on schedule and starts using it for new `Encrypt` and ^card-04rz
`GenerateDataKey` calls going forward.

It does not touch a single existing ciphertext. Nothing gets
re-encrypted, and no ciphertext becomes unreadable — every prior
backing key is retained internally by KMS specifically so that data
encrypted under it stays decryptable indefinitely, because each
ciphertext records which one produced it and KMS looks that up
automatically on decrypt.

What does the KMS key's key id and ARN do when automatic rotation produces a new backing key — do they change to reflect the new key material? :: No — the key id and ARN never change across a rotation. Rotation only replaces the backing key material used internally; the customer-facing identifier your applications, IAM policies, and grants reference stays exactly the same, which is why rotation requires no application changes at all. ^card-oko8

Why does a ciphertext encrypted before a KMS key's automatic rotation remain decryptable afterward, with no re-encryption step involved? :: Because KMS retains every previous backing key rather than discarding it, and each ciphertext internally records which specific backing key produced it. On Decrypt, KMS looks up and uses the backing key that was current when that ciphertext was created, not whichever backing key is current now — so old and new ciphertexts alike stay readable under the same key id indefinitely. ^card-3vwl

That's the source of the most common misconception about rotation:
believing it re-keys your data. It does the opposite of what an
incident response instinct wants. Rotation limits how much *future*
data accumulates under a single backing key — it does nothing to undo
exposure of data that a compromise already reached, because that data
is still sitting there, still decryptable by whoever has the old
backing key (or, more realistically, whoever retained decrypt access
to the KMS key itself during the exposure window).

> [!card] mcq
> A security team learns that a KMS key may have been used to decrypt
> sensitive data during a window when an attacker had access. They
> immediately trigger a rotation of that key's backing key. What does
> this accomplish for the data already exposed during that window?
> - [x] Nothing — the already-exposed ciphertexts remain exactly as readable as before, since rotation only changes which backing key is used for new operations going forward
> - [ ] It makes the previously exposed ciphertexts unreadable, since the old backing key is discarded
> - [ ] It automatically re-encrypts all existing data under the new backing key
> - [ ] It revokes the attacker's prior decrypt access retroactively ^card-4vyr

Rotation limits the *volume* of data that ever sits under one backing
key and bounds how long any single backing key is worth attacking; it
is not, and was never designed to be, an incident-response tool for
data already exposed. Rotating out from under a known-bad exposure
does nothing, because the compromised material — the old backing
key — is still retained and still valid for the data it already
produced.

There are two situations where the only real fix is a **manual**
rotation: creating an entirely new KMS key and moving an alias to
point at it. The first is when you need to change the key's origin —
switching from AWS-generated key material to imported material, or to
material backed by a custom key store, which automatic rotation on an
existing key can never do because it only ever regenerates the same
kind of backing key. The second is when you actually need data
re-encrypted under different key material — for instance, satisfying a
requirement that specific ciphertexts stop being decryptable under any
previously-existing key at all, which automatic rotation deliberately
does not do (that's what "old backing keys are retained" means).

What must you do to actually change a KMS key's origin — for example, from AWS-generated key material to material you import yourself — given that automatic rotation cannot do this? :: You have to manually create an entirely new KMS key configured with the desired origin, then move any alias that pointed at the old key over to the new one. Automatic rotation only ever regenerates a new backing key of the same kind the key already has; it cannot change origin or key-store type on an existing key. ^card-4z7x

**Imported key material** changes the rotation story entirely.
Once you import your own key material into a KMS key, automatic
rotation is not available for that key at all — KMS has no material
of its own to generate on a schedule, since you supplied it. You also
take on retention: if the material has an expiration you set, KMS
deletes it automatically when that expiration is reached, and once
it's gone, every ciphertext under that key material becomes
unreadable, with no rotation-style fallback to an earlier backing
key to save it.

Does automatic rotation apply to a KMS key whose key material you imported yourself? :: No — imported key material disables automatic rotation entirely, because KMS has nothing of its own to regenerate. You become responsible for that material's lifecycle, including any expiration you configure, which deletes the material (and everything encrypted under it) when it's reached. ^card-p51t

Deletion, not rotation, is the operation that deserves real caution.
Scheduling deletion of a KMS key enforces a mandatory waiting period —
configurable from ==7== to 30 days — during which the key can still be ^card-kjb5
canceled out of pending deletion and restored to normal use. Once that
window elapses and deletion completes, it is irreversible: the key
material is gone permanently, and every ciphertext ever encrypted
under that key becomes permanently unreadable, with no support
path, no backup, and no recovery, because AWS itself never has a copy
of that key material to restore.

> [!card] recall
> A key is scheduled for deletion with the maximum 30-day waiting
> period. Explain what the waiting period actually protects against,
> and why that makes monitoring for use of a pending-deletion key more
> important than the waiting period alone.
> ---
> The waiting period exists because deletion is irreversible and total:
> once it completes, every ciphertext ever encrypted under that key
> becomes permanently unreadable, with no way for AWS to restore the
> key material afterward. The window is meant to give you a chance to
> discover a dependency you didn't know about before it's too late to
> stop. But the window only helps if something actually surfaces that
> dependency during it — nothing about scheduling deletion by itself
> searches for or warns about active use. An alarm on key usage during
> the pending-deletion window is what turns "you have 7 to 30 days to
> notice" into something you'll actually notice, rather than a deadline
> that quietly expires while a dependency you never found keeps running
> right up until it breaks. ^card-zf5s

Because deletion is irreversible and rotation cannot substitute for
it as a safety valve, the operation to reach for almost every time you
think you want deletion is **disabling** the key instead. A disabled
key immediately stops working for every `Encrypt` and `Decrypt` call,
exactly like a deleted one — but it costs nothing to reverse: re-enable
it and every ciphertext under it is readable again, with no waiting
period and no risk of having guessed wrong about whether something
still depended on it.

Why is disabling a KMS key almost always the safer choice over scheduling its deletion, even when the intent is to stop the key from being used going forward? :: Disabling blocks every Encrypt and Decrypt call on the key immediately, achieving the same practical effect as deletion, but it is instantly and completely reversible — re-enabling restores full access with nothing lost. Deletion, once its waiting period elapses, permanently destroys the key material and makes every ciphertext under it unreadable forever, with no path back. Disabling gets the same protective outcome without exposing you to an irreversible mistake if some dependency on the key turns out to still exist. ^card-wk3h
