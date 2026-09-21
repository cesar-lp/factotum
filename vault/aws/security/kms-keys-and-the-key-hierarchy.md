---
topic: aws
category: aws-security
tags: [kms, key-hierarchy, key-policy, aliases]
citations: ["AWS Key Management Service Developer Guide — 'AWS KMS concepts'"]
---

# KMS Keys and the Key Hierarchy

`key-management-and-rotation.md` covers why systems protect keys with
other keys in general. This note is about what that discipline looks
like as a concrete AWS service, and the one property that shapes
almost everything else about it.

A KMS key is not a secret you can go get — it's a reference to key
material that lives only inside the service. Every operation is a
request to *compute* with the key, never a request to fetch it: call
`Encrypt` and you send plaintext in, ciphertext comes back; ask for a
data key (the subject of the next note) and KMS generates it inside
the service and hands you the result.

The symmetric material behind an ordinary key, and the private half of
an asymmetric one, never leave the service at all: no API call
==exports== them. Nearly every surprising shape of the KMS API traces ^card-zh31
back to that one constraint — you never hold the key, so everything has
to travel to where the key already is.

Why does the fact that KMS key material never leaves the service, even to you as the key's owner, change what the service's API has to look like compared to a typical secret store? :: Because the service can never simply hand back the key, every operation has to be phrased as "compute this for me using the key" rather than "give me the key." Encryption, decryption, signing, and data-key generation all happen inside KMS and return only results, never the material itself — which is also what makes it meaningful to revoke access to a key after the fact: there's no copy already out in the world to claw back. ^card-s40f

Not every key you use is equally yours, and the difference is
operational, not cosmetic — it determines who can see the key's usage
policy, let alone change it. AWS-owned keys are invisible: several
services encrypt data with keys AWS itself owns and manages behind the
scenes, shared across accounts, with no key resource in your account
and no policy of yours to inspect or edit at all. AWS-managed keys —
`aws/s3`, `aws/rds`, and one per integrated service — do show up in
your account, one per service per account, but you still cannot touch
their key policy; AWS sets it and updates it. Customer-managed keys
are the only ones you actually administer: you write the key policy,
you control whether and how it rotates, and — unlike the other two
classes — you pay a per-key monthly charge for having created it.

> [!card] mcq
> A service integration uses the AWS-managed key `aws/dynamodb` to
> encrypt a table. The team wants to add a condition to that key's
> policy restricting which principals can use it. What has to happen?
> - [x] Nothing is possible on that key — AWS-managed key policies cannot be edited; the team would need to switch the table to a customer-managed key instead
> - [ ] Submit a policy update through the KMS console, since any key in your account accepts a custom policy
> - [ ] Ask AWS Support to append the condition to the managed policy
> - [ ] Attach an IAM permission boundary to the key to achieve the same restriction ^card-qzus

Customer-managed keys also carry a **key spec**, chosen at creation and
==immutable== thereafter: symmetric keys are the default and what nearly ^card-iozz
all envelope-encryption use cases want, while asymmetric keys hold an
RSA or elliptic-curve key pair. Deciding wrong is therefore a migration
rather than a setting change. An asymmetric key's whole point is that
only half of it is a secret — you can export its public key and hand it
out freely for others to encrypt data or verify signatures with, while
the operations that need the private half (decrypt, sign) still have to
happen inside KMS.

What can you do with the public half of an asymmetric KMS key that you cannot do with a symmetric key's material at all? :: You can retrieve and freely distribute the public key itself, letting anyone encrypt data or verify a signature without ever calling KMS. A symmetric key has no such public half — every operation that uses it, including encryption, has to be a call to KMS, since there is nothing safe to hand out. ^card-e68a

A key's identity — its key id or ARN — is assigned at creation and is
permanent: a KMS key cannot be renamed, moved to another region, or
exported in any form, and it never will be, however the surrounding
infrastructure changes. That immutability is exactly why **aliases**
exist: a friendly, mutable name like `alias/orders-prod` that your
application code references instead of the raw key id. Point the
alias at a new key and every caller that names the alias starts using
the new key without a code change — repointing the alias is the only
form of "replacing" a key that KMS actually offers.

> [!card] recall
> A KMS key's id is permanent and the key itself can never be renamed
> or moved. Explain why this makes an alias necessary infrastructure
> rather than a cosmetic convenience, and what would have to change in
> every caller's code if applications referenced raw key ids directly
> instead.
> ---
> Because the underlying key id can never change, any process that
> needs to swap which key is actually in use — rotating to a fresh
> customer-managed key, recovering from a compromised one, migrating
> between environments — has no way to do it except by changing what a
> name points to. An alias is that indirection layer: it's mutable
> where the key id is not, so repointing one alias updates every
> caller at once. Without aliases, every caller hardcoding a raw key
> id would need its own code change and redeploy to pick up a
> replacement key — turning a one-line update into a coordinated
> rollout across every consumer. ^card-dr3j

What three things can never be done to a KMS key once it's created, regardless of key spec or ownership class? :: It can never be renamed, moved to a different region, or exported in any form — its id is permanent and its material stays inside the service for its entire life. The only things that can change around it are what an alias points to, and, eventually, whether the key still exists at all. ^card-6qq8

None of this touches what happens after a key exists — how rotation
actually works, or what deleting one really does — and those questions
get sharp, surprising answers of their own in
`key-rotation-and-key-deletion.md`. Nor does it touch what a key
policy actually says, which is `key-policies-and-the-root-of-authority.md`'s
subject, or what happens when a key needs to be usable outside its
home region, covered in `multi-region-keys-and-the-regional-boundary.md`.

