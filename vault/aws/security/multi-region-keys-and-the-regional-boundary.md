---
topic: aws
category: aws-security
tags: [kms, multi-region, replication, disaster-recovery]
citations: ["AWS Key Management Service Developer Guide — 'Multi-Region keys'"]
---

# Multi-Region Keys and the Regional Boundary

`kms-keys-and-the-key-hierarchy.md` already notes that a key's id is
permanent and the key can never be moved to another region. This note is
about the consequence of that fact once data actually needs to cross
regions, and the one deliberate exception KMS offers to it.

KMS keys are a ==regional== resource: a key created in `us-east-1` exists ^card-swvc
only in `us-east-1`, and ciphertext produced under it carries no meaning
anywhere else. Try to decrypt that ciphertext against KMS in `eu-west-1`
and the call fails outright — there's no key there to ask. This stops
being a footnote the first time something replicates data across
regions: a DynamoDB global table, an S3 cross-region replication rule, a
DR copy of an encrypted snapshot. It surfaces as a decrypt failure in the
destination region, not as a warning at design time, which is exactly
why it catches people who never had a reason to think about it before.

> [!card] recall
> A team enables S3 cross-region replication on a bucket encrypted with
> a single-region customer-managed KMS key, expecting the replica
> objects in the destination region to just work. Explain what actually
> happens and why.
> ---
> Replication copies the object, but the destination region has no
> access to the source region's key material at all — KMS keys never
> leave their region on their own. Without further setup, the replica
> either fails to encrypt under an equivalent key or ends up unreadable,
> because a KMS key id from one region names nothing in another. ^card-ttc2

There are exactly two honest answers to "how do I get KMS-encrypted data
into another region," and neither makes the problem disappear for free.
The default is to decrypt in the source region and re-encrypt under a
key that belongs to the destination region — which means the plaintext
has to exist somewhere in transit between the two calls, or at best
passes through a second, independent envelope-encryption step at the
destination. The alternative is a ==multi-region key==, which avoids the ^card-hrhd
plaintext crossing at all by making the *same* key material available in
both places.

A multi-region key is a ==primary== and one or more ==replica== copies, ^card-tcvy
^card-sztc
created explicitly, that share the same underlying key material and the
same key id suffix — only the region portion of the ARN differs.

Because the material behind those copies is identical, ciphertext
encrypted under one can be decrypted directly against any other, with no
decrypt-and-re-encrypt step and no plaintext ever leaving KMS. This is
the *only* situation in which key material leaves a region at all — every
other key in the service, including every AWS-managed key, keeps its
material sealed inside the region it was created in. That's exactly why
this feature is opt-in, created deliberately as a distinct key type,
rather than a checkbox on an ordinary key: replicating key material
across a regional boundary is the one exception to a rule the rest of
the service enforces absolutely.

> [!card] mcq
> What is true of a multi-region key's primary and its replicas that is
> not true of any other pair of KMS keys in different regions?
> - [x] They share the same underlying key material and key id suffix, so ciphertext from one can be decrypted directly by any of the others
> - [ ] They are the same API resource, just displayed in two regions' consoles
> - [ ] The replica automatically forwards every decrypt call back to the primary's region
> - [ ] They share key material but use independently generated key ids ^card-a9xu

Sharing key material is not the same as sharing everything else. Each
replica is created as its own resource and stays independent for
everything *except* the raw key bits: its own permissions document
governing who can use it, its own grants, its own rotation state and
schedule, and its own CloudTrail trail, logging usage in its own region
only.

Does giving a replica a broader set of permissions than its primary put the primary's own data at risk? :: Not directly — permissions are per-replica, not shared, so a replica compromised through an overly permissive policy in one region doesn't mean the primary's own policy was ever at fault. It does still expose every ciphertext the shared key material can decrypt, since that material itself is identical across primary and replicas; auditing usage of a multi-region key means checking CloudTrail in every region holding a replica, not just the primary's. ^card-z1oo

Multi-region keys also enable a specific failover move that a
single-region key cannot: promoting a replica to become the new primary.
If a region holding the primary becomes unavailable, promoting a replica
in another region lets that region's copy take over as the primary going
forward — new replicas can be created from it, and it stops merely
mirroring another key's material — without re-encrypting a single byte
of existing ciphertext, since every replica could already decrypt
everything the old primary had encrypted.

The trap is that this has to be decided up front: a single-region key
cannot be converted into a multi-region key after the fact, and a
multi-region key cannot be converted back. The choice is made once, at
creation, and a key already in production use under the wrong choice has
no in-place fix — only creating a new key of the right kind and migrating
to it.

Why can't an existing single-region KMS key simply be "upgraded" to multi-region once a cross-region requirement shows up later? :: Because the multi-region property determines the key's identity model from the moment it's created — a single-region key was never assigned the shared key id suffix or replica structure that lets other regions hold decryptable copies of its material. Retrofitting that after the fact would mean changing what the key id itself refers to, which KMS never allows for any key; the only path is creating a new multi-region key and migrating data and callers to it. ^card-q6eh

The case against reaching for multi-region keys by default is the same
fact that makes them useful, seen from the other side: sharing key
material across regions means a compromise of the material is no longer
contained to one region's blast radius. The regional boundary a
single-region key gives up isn't just an operational inconvenience to
route around — it's a real isolation boundary, and multi-region keys
trade it away deliberately in exchange for avoiding plaintext-in-transit
or decrypt-and-re-encrypt overhead. That trade makes sense for the cases
it's built for — cross-region DynamoDB global tables, S3 cross-region
replication, and cross-region disaster recovery where a region-wide
outage has to fail over without a re-encryption pass — and makes much
less sense as a default choice for a key that will only ever live in one
region.

> [!card] mcq
> What is the strongest argument against defaulting to multi-region keys
> for a key that doesn't yet have a known cross-region requirement?
> - [x] Shared key material means a compromise of that material affects every region holding a replica at once, giving up the isolation a single-region key's regional boundary otherwise provides
> - [ ] Multi-region keys cannot use key policies at all, only IAM
> - [ ] Multi-region keys are billed per region even when only one region is ever used
> - [ ] AWS deprecates multi-region keys after their first scheduled rotation ^card-82ar
