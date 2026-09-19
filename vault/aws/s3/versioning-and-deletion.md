---
topic: aws
category: aws-s3
tags: [versioning, delete-markers, recovery, object-lock]
citations: ["AWS Developer Guide — Amazon S3, 'Using versioning in S3 buckets'"]
---

# Versioning and Deletion

Once a bucket has versioning turned on, "delete" stops meaning what it
means everywhere else. Understanding what actually happens to the bytes
when you call DeleteObject is the difference between a routine cleanup
and an unrecoverable mistake — or, just as often, the difference between
panicking over a "lost" object and knowing exactly how to get it back.

With versioning enabled, a PUT to an existing key doesn't overwrite the
prior object — it stores the new content as a distinct ==version==, ^card-2e80
keeping the old one retrievable by its own identifier.

A DELETE request on a versioned key, issued without specifying a version
ID, doesn't erase anything: it inserts a ==delete marker== as the new ^card-e61f
current version of that key, which simply makes GET behave as if the
object is gone.

Why does a plain DELETE on a versioned object return a 404 on the next GET, if nothing was actually erased? :: Because GET without a version ID always resolves to the current version, and after the DELETE the current version is a delete marker rather than the prior object; the object's earlier versions are still stored underneath, just no longer what an unversioned GET reaches. ^card-3x5m

> [!card] mcq
> An object in a versioned bucket has three prior versions and now a
> delete marker as its current version. How do you recover the object
> so that plain GET requests return it again?
> - [x] Delete the delete marker itself (by its version ID), which makes the next most recent version the current one again
> - [ ] Re-run the DELETE request a second time
> - [ ] Nothing can be done; the object is permanently gone
> - [ ] Disable versioning on the bucket ^card-42gn

Permanently removing an object's data requires a DELETE that specifies
the exact ==version ID== you want gone — that call, and only that call, ^card-jzbj
actually removes bytes, and it cannot be undone once issued.

How does versioning let a bucket owner treat an ordinary DELETE as a reversible, low-stakes action while still supporting a genuinely irreversible one? :: A plain DELETE only adds a delete marker and can be reversed by removing it (optionally gated further by MFA Delete), while an irreversible deletion requires a separate DELETE that names the exact version ID to permanently remove — the two are different API calls with deliberately different consequences. ^card-zq4s

> [!card] recall
> A junior engineer accidentally runs a script that issues a plain
> DELETE (no version ID) against every key in a versioned bucket.
> Explain why this incident is recoverable in principle, and what would
> have made it unrecoverable instead. ^card-6b6o

S3 Object Lock builds on versioning rather than replacing it: it prevents
a specific object version from being ==overwritten or deleted== for a ^card-h7lv
retention period, which stops even someone with delete permissions from
removing that version until the lock expires.

What relationship must hold between Object Lock and bucket versioning? :: Object Lock can only be enabled on a bucket that has versioning enabled, since the lock is applied to a specific version and has no meaning on a key that has no version history. ^card-hhfe
