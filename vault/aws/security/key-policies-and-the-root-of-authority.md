---
topic: aws
category: aws-security
tags: [kms, key-policy, iam, cross-account]
citations: ["AWS Key Management Service Developer Guide — 'Key policies in AWS KMS'"]
---

# Key Policies and the Root of Authority

`policy-evaluation-logic.md` establishes that for most AWS resources, a
same-account request only needs a grant from *either* the identity policy
or the resource policy. A KMS key breaks that pattern in a way that
surprises almost everyone who first hits it.

Every KMS key carries a **key policy** — a resource-based policy attached
directly to the key. For nearly every other resource-based policy in AWS
(an S3 bucket policy, an SQS queue policy), that policy is one of two
alternative paths to an Allow. For a KMS key, the key policy is not an
alternative — it is the ==root of authority==. An IAM policy granting ^card-efas
`kms:Decrypt` does nothing on its own. Unless the key policy itself allows
the action, directly or by delegating to IAM, the request is denied no
matter how permissive the caller's identity policy is.

> [!card] mcq
> An IAM user has an identity policy granting `kms:Decrypt` on a specific
> key, with no explicit deny anywhere. The key's key policy contains no
> statement naming that user, that user's account root, or granting IAM
> control at all. Can the user decrypt with that key?
> - [x] No — a KMS key policy is the root of authority; an IAM Allow is irrelevant unless the key policy also allows the action or delegates to IAM
> - [ ] Yes, since within one account an identity-policy grant is always sufficient
> - [ ] Yes, because KMS keys ignore key policies once IAM has an explicit Allow
> - [ ] No, but only because Decrypt specifically always requires a separate grant ^card-z915

Why is a key policy that grants `kms:Decrypt` only to IAM policies, with no reference to the account root, an unusual and risky way to write it? :: Because the key policy is the root of authority for the key, an administrator whose only grant path is an IAM Allow depends entirely on that one statement; if it's ever edited out, tightened, or misconfigured, IAM permissions stop mattering for the key and nobody — no matter how much IAM access they hold — can restore access to it. ^card-uj08

That delegation happens through an idiom worth recognizing on sight: a key
policy statement granting the ==account root principal== `kms:*`. That single ^card-qr52
statement is what makes ordinary IAM policies effective for the key at
all — it hands the key's authority down to IAM, so that from then on an
IAM Allow (or Deny) actually governs access, the way it would for almost
any other resource. A key policy written without this statement produces
a key that only its explicitly named principals can ever use; IAM
administrators, however broad their own permissions, simply have no path
in.

This is the specific failure mode that makes the account-root grant worth
memorizing rather than treating as boilerplate: an administrator with
full `iam:*` access creates a key policy naming only a handful of
application roles, forgets the root-principal delegation statement, and
discovers that they themselves cannot decrypt anything protected by that
key — not through the console, not by attaching a new IAM policy, nothing
in IAM reaches a key policy that never delegated to it. Taken further, a
key policy edited to remove every principal that can manage it can be
==permanently locked out==, with no way back short of opening a support case ^card-ayud
with AWS. The root-principal statement exists precisely so that an account
always retains a path back into its own keys.

> [!card] recall
> Explain concretely what goes wrong, and why IAM cannot rescue it, when
> a key policy is written naming only three specific role ARNs and never
> grants the account root principal anything.
> ---
> None of IAM's usual power helps: the key policy, not IAM, is the root
> of authority, so any principal not named in the key policy (and not
> covered by a root-principal delegation statement) is denied regardless
> of what IAM grants them — including an account administrator with full
> IAM access. The fix has to happen in the key policy itself; if nobody
> left in a named principal can still edit it, the account is locked out
> of the key with no IAM-side recovery. ^card-81fn

Delegating to IAM doesn't mean a key is only ever reachable directly. ^card-b9rs
`kms:ViaService` :: An IAM or key-policy condition key that restricts a
grant so the key can only be used when the request comes *through* a
named AWS service (for example `s3.us-east-1.amazonaws.com`), rather than
by calling KMS directly — useful for keys meant to back a specific
service's encryption rather than general-purpose use.

Cross-account key use inherits the same "root of authority" twist on top
of the ordinary cross-account rule. `policy-evaluation-logic.md`'s "both
sides must allow" already requires the resource's account and the
caller's account to each grant the action; for a KMS key, the resource
side of that pair is the key policy specifically, not just any
resource-based policy, and it must both name the external account (or a
principal in it) and, per this note, actually be the thing granting the
access rather than deferring silently to IAM assumptions that don't apply
across accounts. The calling account still separately needs its own IAM
policy granting the same action — `cross-account-access.md` covers that
general mechanism and why both sides are required; nothing about KMS
changes the mechanism itself, only which policy plays the "resource side"
role.

Why can't an external account read a key policy that names it as principal and simply rely on that alone to use the key cross-account? :: Naming an external account in the key policy only satisfies the resource side of the cross-account requirement; the calling account still needs its own IAM policy granting the action, since crossing an account boundary always requires both sides to allow it, and a key policy — even one that is itself the root of authority within its own account — has no way to reach into another account and supply that grant. ^card-njsf
