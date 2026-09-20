---
topic: aws
category: aws-iam
tags: [iam, cross-account, resource-policy, assume-role]
citations: ["AWS Identity and Access Management User Guide — 'Providing access to AWS accounts owned by third parties'"]
---

# Cross-Account Access

`policy-evaluation-logic.md` establishes the rule this note is built on:
within a single account, a grant from either the identity policy or the
resource policy is enough, but once a request crosses an account
boundary, both sides have to allow it. This note covers the two distinct
mechanisms AWS gives you for actually doing cross-account access under
that rule.

**Mechanism one: role assumption.** The resource account creates a role
whose trust policy names the other account (or a specific principal in
it) as allowed to call `sts:AssumeRole`. Once assumed, the caller is
acting entirely inside the resource account, as a session of that role —
there's no "their identity policy" to separately satisfy anymore,
because for the duration of the session, the ==role's own permissions ^card-pc7e
policy== is the only identity policy in play. `roles-and-assume-role.md`
covers the trust-policy/permissions-policy split this mechanism relies
on.

**Mechanism two: resource-based policies.** Instead of the caller
switching identity, the resource account's resource-based policy (an S3
bucket policy, an SQS queue policy, a KMS key policy, and others) names
the external account or a specific principal in it directly as an
allowed principal, without requiring any assumption step. The caller
keeps acting as themselves, in their own account, for the entire
request.

> [!card] mcq
> Which of these best distinguishes the two cross-account mechanisms?
> - [x] Role assumption changes who the caller is acting as (inside the resource account); a resource-based policy lets the caller keep acting as themselves while the resource account grants them access directly
> - [ ] Role assumption is for humans, resource-based policies are only for services
> - [ ] They differ only in which services support each one, with no structural difference otherwise
> - [ ] Resource-based policies always require the caller to also assume a role first ^card-9uqr

Both mechanisms still have to satisfy "both sides must allow" — they
just satisfy it in different places. With role assumption, the trust
policy is the resource-account side's allow (it decides who may even
become the role), and the role's own permissions policy stands in for
the identity-policy side, since the session has no other identity policy
to consult. With a resource-based policy, the resource account's policy
is the resource-side allow, and the caller's ==own, unchanged identity ^card-0lf9
policy== in their home account must independently allow the action too —
exactly the rule that makes naming an external account in a bucket
policy necessary but not sufficient.

Why does an external account, once its principal is named in a bucket policy, still fail to read the object if that account never granted the action in its own identity policies? :: Naming the account in the bucket policy only satisfies the resource-account side of a cross-account request; the "both sides must allow" rule means the calling account's own identity policy still has to grant the action independently, and a bucket policy has no way to reach into another account and supply that. ^card-sm4q

> [!card] recall
> A team wants Account B's Lambda function to write to Account A's S3
> bucket. Explain the two different ways this could be wired up (role
> assumption vs. a bucket policy naming Account B), and what has to exist
> on Account B's side either way — because "both sides must allow"
> applies to both mechanisms, not just one of them. ^card-xfy0

An explicit deny still overrides everything described in this note. If
either account's applicable policies contain a Deny matching the
request — an SCP in Account B, a permission boundary on the role, an
explicit deny in the bucket policy — the request is denied regardless of
which cross-account mechanism was used or how permissively the other
side was configured. `permission-boundaries-and-scps.md` and
`policy-evaluation-logic.md` cover why an explicit deny can never be
outvoted by an allow, from any side, in any account.

What's the practical reason teams tend to prefer role assumption over resource-based policies for cross-account access that involves broad or evolving permissions? :: Role assumption produces an auditable, time-limited session with its own CloudTrail identity and an expiration built in, and the permissions granted live in one place (the role's permissions policy) rather than being split across a resource policy and a separate identity policy in another account that both have to be kept in sync. ^card-ws0z
