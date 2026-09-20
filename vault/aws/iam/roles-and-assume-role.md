---
topic: aws
category: aws-iam
tags: [iam, roles, sts, assume-role, trust-policy]
citations: ["AWS Identity and Access Management User Guide — 'IAM roles'"]
---

# Roles and AssumeRole

`principals-and-identities.md` distinguishes a role from a user by one
fact: a role has no long-lived credentials of its own. Everything in
this note is about what fills that gap — how something becomes able to
act as a role, and what it can do once it has.

Every IAM role carries exactly two separate policy documents that answer
two entirely different questions, and conflating them is the single most
common role-related mistake.

The **trust policy** (formally, the role's assume-role policy document)
answers "who is allowed to become this role?" It is a resource-based
policy attached to the role itself, naming the principals — a user, an
account, a service principal, an identity provider — permitted to call
`sts:AssumeRole` against it.

The **permissions policy** answers a completely different question: "once
someone has become this role, what can they do?" It's an identity-based
policy attached to the role, exactly like one attached to a user, and it
has ==no== influence over who is allowed to assume the role — that's the ^card-c1sv
trust policy's job alone.

> [!card] mcq
> A role's trust policy allows account `111122223333` to assume it. Its
> permissions policy grants no S3 access at all. Someone in that account
> assumes the role and calls `s3:GetObject`. What happens?
> - [x] Denied — the trust policy only controls who can assume the role, not what the resulting session can do; the permissions policy still has to grant the action
> - [ ] Allowed, since the trust policy already vouches for that account
> - [ ] Denied, and the assumption itself would have failed too
> - [ ] Allowed, because trust policies and permissions policies are merged into one set of grants ^card-qye6

Why can a role's trust policy be completely permissive (say, trusting an entire external account) while the role itself remains harmless? :: The trust policy only decides who is allowed to call AssumeRole and obtain a session; it grants zero API permissions on its own. Whatever that session can actually do is governed entirely by the role's separate permissions policy, so a wide-open trust policy paired with a narrow or empty permissions policy still leaves the role doing nothing. ^card-kjw4

Calling `sts:AssumeRole` (or one of its variants, like `AssumeRoleWithSAML`
or `AssumeRoleWithWebIdentity`) doesn't hand back a copy of the role's own
credentials — there are none. Instead, AWS **Security Token Service**
issues a fresh set of ==temporary== credentials: an access key ID, a ^card-9vxa
secret access key, and a session token, all tied to a short expiration
(minutes to a few hours, depending on how the call was made) rather than
existing indefinitely.

Those temporary credentials carry the permissions defined by the role's
permissions policy (intersected with anything the caller's own identity
already had, if a permission boundary applies) for exactly as long as
the session lasts; once the session expires, the credentials stop
working outright — there's no revocation step needed, because expiry is
built into the credential itself.

> [!card] recall
> A developer's IAM user has broad permissions and assumes a narrowly
> scoped role to perform a specific task. Explain why the resulting
> session's permissions are the role's permissions policy, not some
> combination of the user's original permissions and the role's. What
> would go wrong operationally if assumed sessions instead kept the
> caller's original permissions layered on top? ^card-r3i8

Roles exist for exactly the situations where handing out a long-lived
user credential would be the wrong tool: letting an AWS service act on
your behalf, letting a user in one account temporarily act in another,
federating an external identity provider, or letting compute (covered in
`service-roles-and-instance-profiles.md`) obtain credentials without
ever storing an access key anywhere.

What does it mean that a trust policy and a permissions policy are "two distinct documents answering two distinct questions," rather than one merged access-control list on the role? :: It means the two are evaluated at different moments and for different purposes — the trust policy is consulted once, at AssumeRole time, to decide whether the call is even allowed to happen; the permissions policy is consulted afterward, on every subsequent API call the resulting session makes, to decide what that session can do. Changing one never implicitly changes the other. ^card-kp3k
