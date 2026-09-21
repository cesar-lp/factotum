---
topic: aws
category: aws-security
tags: [kms, s3, ebs, rds, dynamodb, encryption-at-rest]
citations: ["AWS Key Management Service Developer Guide — 'How AWS services use AWS KMS'"]
---

# Data at Rest Encryption Across Services

The other notes in this category cover what KMS does as a service. This
one covers what flipping "encrypted at rest" on actually buys you in the
services that call it — and, more importantly, what it doesn't.

S3 offers three distinct ways to encrypt an object server-side, and the
difference between them is about who holds the key and what you can see
about its use, not how strong the encryption is. **SSE-S3** uses keys
that AWS wholly owns and manages: there's no key policy of yours to
write, no per-key CloudTrail record of which key encrypted which object,
and no cost beyond storage — it's the option for teams who need data
encrypted at rest and nothing more. **SSE-KMS** uses a KMS key you
control: your own key policy governs who can use it, every encrypt and
decrypt call is a CloudTrail event tied to a specific object request, and
that auditability is exactly what SSE-S3 cannot offer. That auditability
isn't free — every SSE-KMS object read or write is a KMS API call, billed
and rate-limited like any other, and a high-volume prefix can throttle
against the account's KMS request quota. **S3 Bucket Keys** exist
specifically to fix that: S3 caches a time-limited key derived from the
KMS key at the bucket level and reuses it for many requests, cutting KMS
calls dramatically without weakening the object-level encryption.

> [!card] mcq
> A bucket serving heavy, sustained read/write traffic is encrypted with
> SSE-KMS and starts hitting KMS request throttling under load. What
> directly addresses this without giving up a customer-managed key?
> - [x] Enable S3 Bucket Keys, which reduce the number of calls made to KMS per request by reusing a cached, time-limited key at the bucket level
> - [ ] Switch the bucket to SSE-S3, which removes throttling by removing the KMS dependency entirely
> - [ ] Request a KMS service quota increase, since Bucket Keys only apply to SSE-S3 buckets
> - [ ] Switch to SSE-C, which bypasses KMS request limits by never calling KMS in the first place ^card-746n

Why does moving from SSE-S3 to SSE-KMS trade away simplicity for something specific, rather than being a strict upgrade? :: SSE-KMS buys a key policy you control and a CloudTrail record of every use of that key, at the cost of KMS API calls (and their request charges and throttling limits) on every encrypt or decrypt — S3 Bucket Keys exist to blunt that cost, but the trade itself is inherent to using a key you administer rather than one AWS manages invisibly. ^card-rwxi

The third mode inverts who holds the key entirely. With **SSE-C**, you
supply the raw encryption key on every request — S3 uses it to encrypt
or decrypt and then discards it immediately, storing nothing about the
key at all, not even a reference to it. That has one blunt consequence:
if you lose that key, the object is gone. There is no KMS-style recovery
path, no AWS-side copy, nothing to restore from — the object is exactly
as unrecoverable as if it had never been backed up.

Losing the key used for SSE-C-encrypted data :: Unrecoverable — S3 never stores the SSE-C key or any reference to it, so losing your own copy means there is nothing on the AWS side to recover the object from; it is functionally destroyed. ^card-m40o

EBS volume encryption is a decision made once, at creation, and it does
not budge afterward: there is no API call or console action that
encrypts an existing unencrypted volume in place. The only path from
unencrypted to encrypted is to snapshot the volume and restore that
snapshot as a new, encrypted volume — the data moves, the original
volume doesn't change. Because that's easy to forget in the moment a
volume gets created, EBS also offers **encryption by default**, a
per-region account setting that encrypts every new volume and snapshot
automatically without anyone having to remember to check a box.

> [!card] recall
> An engineer wants to "turn on" encryption for an existing, currently
> unencrypted EBS volume that's already attached to a running production
> instance. Explain why this request has no direct answer, and what has
> to happen instead.
> ---
> EBS encryption is fixed at volume creation and cannot be changed on a
> live volume — there is no in-place toggle. The only route is indirect:
> take a snapshot of the unencrypted volume, create a new encrypted
> volume from that snapshot, and swap it in for the original (typically
> by detaching the old volume and attaching the new one), rather than
> modifying the original volume at all. ^card-y821

RDS follows the identical shape for the identical reason: encryption is
set when the database instance is created and cannot be toggled after
the fact. An unencrypted RDS instance can only become encrypted by the
same detour EBS requires — take a snapshot, copy that snapshot while
enabling encryption on the copy, and restore a new instance from the
encrypted copy — which for a live database also means a migration
window, not a config change.

Which two AWS services covered in this note share the exact same limitation — encryption is fixed at creation, with a snapshot-copy-and-restore as the only route to change it afterward? :: EBS volumes and RDS instances. Neither can have encryption toggled on a live resource; both require creating a snapshot, producing an encrypted copy of it, and restoring or migrating to a new resource built from that copy. ^card-ngyt

DynamoDB breaks that pattern by removing the decision entirely: every
DynamoDB table is encrypted at rest ==unconditionally==, with no ^card-bvo7
unencrypted option and nothing to switch on. The only choice DynamoDB
leaves you is *which* key performs that mandatory encryption — an
AWS-owned key by default, an AWS-managed key (`aws/dynamodb`), or a
customer-managed key if you need your own key policy and audit trail
over table encryption specifically.

> [!card] mcq
> What decision does DynamoDB actually leave in your hands regarding
> encryption at rest?
> - [x] Only which class of KMS key performs the (mandatory) encryption — AWS-owned, AWS-managed, or customer-managed
> - [ ] Whether the table is encrypted at rest at all
> - [ ] Whether encryption is applied per-item or per-table
> - [ ] Whether encryption uses AES-128 or AES-256 ^card-djf8

All of this — SSE-KMS's audit trail, EBS's snapshot dance, DynamoDB's
mandatory encryption — protects against exactly one threat: someone
getting hold of the underlying storage itself, a stolen disk, a
misdirected snapshot, physical media leaving AWS's custody without going
through the service's normal access path. It defends against **nothing**
once a caller has valid credentials and calls the service's own read
API, because the service's job is to decrypt the data and hand back
plaintext to any authorized caller — that's what "the API serves valid
requests" means, encryption at rest included. A leaked S3 access key or
an over-broad IAM role reads plaintext objects out of an SSE-KMS bucket
exactly as easily as out of an unencrypted one; the ciphertext on disk
never enters into it.

Why is it wrong to treat "the bucket is encrypted at rest" as an answer to "is this data safe from a compromised application credential"? :: Because encryption at rest protects the storage medium, not the API — a caller with valid credentials calling GetObject gets decrypted plaintext back regardless of what encryption sits underneath, the same as any other authorized request. The threat a leaked or over-broad credential poses is answered by access control, not by storage-layer encryption; the two defend against entirely different attackers. ^card-91is

The control that actually stands between a valid credential and the data
it can reach is authorization, not encryption: `access-control-and-presigned-urls.md`
covers how S3 itself narrows what a given caller or a presigned URL can
do, and `least-privilege-in-practice.md` covers the discipline of keeping
IAM grants narrow enough that a leaked credential's blast radius stays
small. Encryption at rest and access control aren't alternatives to each
other — they defend against different attackers, and a system needs both.
