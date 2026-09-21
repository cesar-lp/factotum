---
topic: aws
category: aws-security
tags: [kms, grants, delegation, eventual-consistency]
citations: ["AWS Key Management Service Developer Guide — 'Grants in AWS KMS'"]
---

# Grants and Temporary Delegation

`key-policies-and-the-root-of-authority.md` covers the key policy — a
document you write and attach, meant for durable, human-managed
authorization. A **grant** is KMS's second, quite different mechanism,
and it exists precisely because a key policy is a bad fit for the case a
grant handles well: a piece of software that needs to use a key for a
while, and needs to get and give up that access programmatically rather
than through an edited document.

A grant is an attachment to a key that names a **grantee principal**, the
set of operations that principal may perform (`Decrypt`, `GenerateDataKey`,
and so on), and optionally a constraint tying it to a specific
==encryption context==. Structurally it behaves nothing like a policy ^card-zfe0
statement: it is created and revoked entirely by API call
(`CreateGrant`, not a policy edit), it is purely ==additive== — a grant can ^card-f37f
only add permissions, never deny or narrow anything a policy already
allows — and every grant is identified by its own **grant ID** and, at
creation time, a **grant token**.

> [!card] mcq
> Which statement correctly distinguishes a KMS grant from a key policy statement?
> - [x] A grant is created and destroyed by API call and can only add permissions; a key policy is a document you edit and can express both Allow and Deny
> - [ ] A grant and a key policy statement are two names for the same underlying mechanism
> - [ ] A grant is more durable than a key policy statement, since grants never expire
> - [ ] A grant can deny access the key policy already granted, exactly like a Deny statement ^card-z69l

Why is a grant additive-only, unable to express anything like a Deny statement? :: A grant is meant for narrowly scoped, revocable delegation — it only ever hands out a slice of what the key policy and IAM already allow, never removes it; taking away access is done by revoking or retiring the grant itself, not by encoding a negative permission inside it. ^card-h6ud

Grants have one behavior worth being deliberate about: they are
==eventually consistent==. A caller that creates a grant and immediately ^card-gyp6
turns around to use it — call `CreateGrant`, then call `Decrypt` as the
new grantee — can be denied, because the grant has not yet propagated to
every place KMS checks it. `CreateGrant` solves this by returning a
**grant token** alongside the grant ID; passing that token on the very
next API call makes KMS honor the not-yet-propagated grant immediately,
without waiting out the propagation delay.

Why does CreateGrant return a grant token at all, given that it also returns a grant ID? :: Because grants are eventually consistent, a grant ID alone doesn't guarantee the grant is visible everywhere yet; passing the grant token on a subsequent call tells KMS to honor that specific grant right away, which is what lets a caller create a grant and use it in the same breath instead of hitting a spurious denial while waiting for propagation. ^card-dr3m

A grant's end of life has two distinct paths, and mixing them up is a
common mistake:

> [!card] mcq
> A service was granted temporary use of a key so it could decrypt a
> volume, and the volume is now being deleted by that same service. Which
> API call is the right way for it to end its own grant?
> - [x] RetireGrant — the party the grant was made for ends it themselves, once they no longer need it
> - [ ] RevokeGrant — reserved for the key or grant owner cutting off someone else's access
> - [ ] Neither; grants expire automatically as soon as the underlying resource changes state
> - [ ] DeleteGrant, since grants are deleted rather than retired or revoked ^card-0ue7

What's the difference between who is allowed to call RetireGrant versus RevokeGrant, and what does that difference reflect about the two calls' purpose? :: RetireGrant is called by the grantee itself (or another party named as a "retiring principal" on the grant) to end a grant it was given once it no longer needs the access — the intended, cooperative end-of-life path. RevokeGrant is called by the key's owner or administrator to cut a grant off outright, regardless of whether the grantee still wants it — the owner-initiated path, used when the decision to end access belongs to the key side rather than the grantee. ^card-wymd

The reason unexplained grants show up on a key at all: AWS services
create them on your behalf constantly. Attaching an encrypted EBS volume,
for instance, has EC2 create a grant naming itself as grantee so it can
call `Decrypt` on the volume's key for as long as the volume is attached,
without your ever calling `CreateGrant` yourself — the grant is retired
automatically when the volume is detached or the resource it backs is
deleted. Seeing a grant you never created, naming a service principal
you didn't explicitly authorize, is normal and expected, not a sign of a
compromised key.

> [!card] recall
> An encrypted EBS volume's key shows a grant you never created, naming
> `ec2.amazonaws.com` as the grantee. Explain why this exists, what it
> lets EC2 do, and roughly when it goes away — without treating its
> presence as suspicious.
> ---
> EC2 created the grant itself when the volume was attached, so it could
> call operations like Decrypt against the volume's key for as long as
> the volume needs it, without a human running CreateGrant. It's scoped
> to the resource's lifetime and is retired once the volume is detached
> or deleted — this is the normal, intended mechanism by which AWS
> services get temporary key access on your behalf, not a sign the key
> policy or IAM has been misconfigured. ^card-kosh

A grant can also be narrowed with an encryption-context constraint, which
pins it to one tenant's or one resource's data rather than the whole key
— what encryption context itself is belongs to
`encryption-context-and-authenticated-data.md`.
