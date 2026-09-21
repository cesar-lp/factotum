---
topic: aws
category: aws-security
tags: [kms, encryption-context, aad, cloudtrail, multi-tenancy]
citations: ["AWS Key Management Service Developer Guide — 'How to use encryption context to secure your encrypted data'"]
---

# Encryption Context and Authenticated Data

`authenticated-encryption-and-aead.md` covers associated data in
general: input an AEAD scheme authenticates but never encrypts. KMS's
**encryption context** is that mechanism, exposed as a feature you're
meant to actually use — a set of non-secret key-value pairs (for
example `{"tenant": "acme-corp"}`) that you pass to `Encrypt`,
`Decrypt`, `GenerateDataKey`, and the re-encrypt operations, and that
KMS cryptographically binds to the resulting ciphertext.

What kind of AEAD input does KMS's encryption context correspond to, and what property does that give it — authenticated, encrypted, or neither? :: It corresponds to associated data: encryption context is authenticated (bound into the ciphertext's integrity check) but never encrypted. It travels and is stored in the clear; KMS only guarantees that it cannot be altered or swapped without decryption failing. ^card-9yee

The rule that makes it more than a label: whatever context you supply
at `Encrypt` time, you must supply ==exactly== that context, unchanged, ^card-mjf3
at `Decrypt` time, or the call fails outright. There's no partial
match, no subset check — the pairs have to be identical. That failure
mode is the entire point: it turns encryption context from a
descriptive tag into a binding between a ciphertext and the fact it
was encrypted for.

Why does KMS's exact-match requirement on encryption context matter more than the specific key-value pairs chosen? :: Because it's what converts encryption context from a passive label into an enforced binding. If a ciphertext could be decrypted with a different or missing context, the context would be documentation, not a control. The exact-match failure is what lets an application rely on context to guarantee a ciphertext is only usable in the situation it was encrypted for. ^card-7jq2

This is exactly what stops a specific class of bug: a ciphertext
copied or moved into a context it wasn't encrypted for. Say a
multi-tenant table stores every row's data encrypted with the same
shared KMS key, and each row's encryption context records
`tenant=<id>`. If tenant A's encrypted blob is copied into tenant B's
row — by a bug, a bad migration, or an attacker with write access but
no decrypt rights — decrypting it under B's context fails, because the
context baked into the ciphertext still says A. The general shape this
guards against is the **confused deputy** problem: a privileged
component (KMS, holding decrypt rights) being tricked by a less
privileged caller into applying its privilege to the wrong resource.

> [!card] mcq
> A multi-tenant application encrypts every tenant's records under one
> shared KMS key, setting `tenant=<id>` as the encryption context on
> each record. A bug copies tenant A's encrypted blob into tenant B's
> database row. What happens when the application tries to decrypt it
> as part of serving tenant B?
> - [x] The decrypt call fails, because the context recorded in the ciphertext (tenant A) does not match the context supplied for tenant B
> - [ ] It decrypts successfully, since both tenants share the same underlying KMS key
> - [ ] It decrypts successfully, since encryption context is only checked on encrypt, not decrypt
> - [ ] KMS silently re-encrypts the blob under tenant B's context ^card-k00j

Encryption context is deliberately **not secret**. It appears in
plaintext in every relevant CloudTrail log entry — `Encrypt`,
`Decrypt`, `GenerateDataKey` calls all record it — so it must never
hold a password, a token, or anything else that shouldn't be
readable by anyone who can read audit logs. Putting a secret value
into encryption context doesn't just violate a convention; it puts
that secret in plaintext, permanently, in your audit trail.

That same visibility is a feature, not just a caveat. A `Decrypt` call
in CloudTrail is otherwise nearly opaque — a key ARN, a caller
identity, a timestamp, and an encrypted blob's ciphertext, none of
which says *what* was decrypted or *why*. Encryption context turns
that log line into something searchable: filter every `Decrypt` event
by `tenant=acme-corp`, or by `purpose=invoice-pdf`, without ever
touching the plaintext.

Why must encryption context values never contain secrets, given that KMS already restricts who can call Decrypt on a key? :: Because encryption context is written in the clear into CloudTrail on every Encrypt and Decrypt call, regardless of who is authorized to decrypt. Anyone with read access to the audit log — a broader and differently-scoped population than key users — sees the context values, so anything secret placed there is effectively logged in plaintext. ^card-74xe

The context values you already use as an integrity binding double as
an authorization condition. Key policies and grants (grants are
covered in `grants-and-temporary-delegation.md`) can use the condition
key `kms:EncryptionContext:<key>` to require a specific context value
before honoring `Decrypt` — for example, requiring
`kms:EncryptionContext:tenant` to equal the caller's own tenant id.
That's the mechanism that lets one shared KMS key serve many tenants
safely: the key itself grants broad decrypt rights, but the
authorization condition narrows each caller down to only the rows
whose context matches its own tenant, on top of the ciphertext-level
binding that would reject a mismatched row anyway.

Why does pairing a shared KMS key with a `kms:EncryptionContext` condition in the key policy give a defense that the exact-match decrypt check alone does not? :: The exact-match check only fires at decrypt time and only rejects a ciphertext whose baked-in context doesn't match what's supplied — it says nothing about who is allowed to supply a given context in the first place. The `kms:EncryptionContext` condition is an authorization check: it restricts which principals may even attempt a Decrypt call carrying a particular context value, so a caller can be blocked from ever presenting another tenant's context, rather than merely failing after the fact if a ciphertext happens to land in the wrong hands with the wrong context supplied. ^card-elza

> [!card] recall
> A single shared KMS key encrypts records for every tenant of a SaaS
> application, with `tenant=<id>` as encryption context on each record.
> Explain the two separate mechanisms that together make this safe for
> multi-tenant isolation, and what each one alone would fail to catch.
> ---
> The first mechanism is the ciphertext-level binding: KMS requires the
> exact context used at encrypt time to be supplied again at decrypt
> time, so a ciphertext copied into the wrong tenant's context fails to
> decrypt. Alone, this only protects against a mismatched context being
> supplied — it does nothing to stop a caller who is otherwise entitled
> to call Decrypt from simply supplying another tenant's correct
> context value if it can guess or obtain it. The second mechanism is
> the `kms:EncryptionContext` condition in the key policy or a grant,
> which restricts which principals may issue a Decrypt call carrying a
> given context value in the first place — for example, tying a
> caller's allowed context to its own tenant id. Alone, this would
> restrict who may present a given context, but would do nothing to
> stop a ciphertext itself from being moved to the wrong row — the
> ciphertext-level binding is what catches that case. Together, one
> guards the caller and the other guards the data, and either failing
> on its own still leaves the other in place. ^card-02ot
