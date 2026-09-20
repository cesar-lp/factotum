---
topic: aws
category: aws-s3
tags: [access-control, iam, bucket-policy, presigned-url]
citations: ["AWS Developer Guide — Amazon S3, 'Identity and access management in Amazon S3'"]
---

# Access Control and Presigned URLs

S3 gives you four different places to grant or deny access to the same
object, which is exactly the problem: without a mental model of how they
interact, it's easy to either leave something exposed or spend an
afternoon debugging an Access Denied that has nothing to do with the
policy you're staring at.

A **bucket policy** is attached to the bucket itself and grants or denies
access to whoever the policy names as a ==principal== — including, ^card-llxv
unusually for AWS, principals outside your own account — public
(anonymous) access really can be granted by the bucket policy alone,
since there's no identity policy to consult; cross-account access still
needs the external account's own identity policy to also grant the
action, so naming that account in the bucket policy is necessary but not
sufficient on its own.

An **IAM identity policy**, by contrast, is attached to a user or role
and describes what that identity can do across services; a request only
succeeds if neither the identity policy nor the resource-side (bucket)
policy ==denies== it, and at least one of them grants it. ^card-26l3

> [!card] mcq
> A bucket policy grants read access to IAM role `App`, a role in the
> same account as the bucket, and that role's own IAM identity policy
> has no S3 permissions at all. Can the role read the object?
> - [x] Yes — for a same-account request, a grant from either side (the identity policy or the bucket policy) is enough as long as neither side has an explicit deny
> - [ ] No, an identity policy must independently grant the action too, or the request is denied regardless of what the bucket policy says
> - [ ] Yes, because IAM identity policies only matter for services other than S3
> - [ ] No — bucket policies can never grant access to IAM roles, only to users ^card-bahd

Legacy **ACLs** grant access per object or per bucket to a small,
coarse-grained set of grantees (like "authenticated AWS users" or
"everyone") and predate the more expressive JSON-based rule language
that IAM and S3's resource-level grants now use; AWS recommends
disabling ACLs on new buckets since ==bucket policies== and IAM together ^card-ap3e
can already express everything ACLs could, with finer-grained
conditions.

Why does AWS recommend leaving ACLs disabled on new buckets rather than combining them with bucket policies and IAM? :: Because access decisions become the union of several independently-evaluated mechanisms, and reasoning about what's actually reachable gets harder the more of them are active at once; bucket policies and IAM alone can already express everything ACLs could, with finer-grained conditions. ^card-i616

Why is Block Public Access described as a circuit breaker rather than another access rule to reconcile with bucket policies and ACLs? :: Because when enabled it unconditionally overrides any bucket policy or ACL that would otherwise grant public access, rather than being combined or weighed against them the way IAM and bucket-policy grants are — it is a hard override, not one more input to the access decision. ^card-xltv

> [!card] recall
> Explain why Block Public Access is described as an account- or
> bucket-level override rather than "one more access control mechanism
> to combine with the rest." What problem would exist if it were merely
> additive, the way IAM and bucket policies are? ^card-r64e

A **presigned URL** doesn't create a new grant of its own: it embeds a
signature computed from the credentials of whoever generated it, so the
bearer of that URL is exercising exactly the ==signer's== permissions, ^card-vug9
for a limited time, without needing AWS credentials of their own.

What happens to a presigned URL that has already been issued to a user, if the IAM permissions of the identity that generated it are revoked before the URL expires? :: The URL stops working, because S3 re-evaluates the embedded signature's authority against the signer's current permissions at request time — a presigned URL delegates the signer's authority as it exists at the moment of use, not a permanently frozen snapshot from when the URL was created. ^card-7b0f
