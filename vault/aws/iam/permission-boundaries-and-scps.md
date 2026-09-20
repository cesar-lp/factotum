---
topic: aws
category: aws-iam
tags: [iam, permission-boundaries, scp, organizations, ceilings]
citations: ["AWS Identity and Access Management User Guide — 'Permissions boundaries for IAM identities'", "AWS Organizations User Guide — 'Service control policies (SCPs)'"]
---

# Permission Boundaries and SCPs

Every mechanism covered so far — identity policies, resource policies,
trust policies — is capable of granting access. Permission boundaries and
service control policies are structurally different: neither one is
capable of granting anything at all, ever. Confusing that point is the
most common mistake this category of note has to guard against.

A **permission boundary** is an IAM policy attached to a specific user or
role that sets the maximum permissions that identity's own identity
policies are allowed to grant. It is evaluated as a ==ceiling==, never as ^card-cqiq
a source of Allow: an action is only usable if the identity policy grants
it **and** the boundary also allows it. If the boundary is silent on an
action (no matching Allow), that action is off-limits no matter how
generously the identity policy grants it.

> [!card] mcq
> A role's identity policy grants `s3:*` on all resources. Its permission
> boundary allows only `s3:GetObject`. What can the role actually do?
> - [x] Only `s3:GetObject` — the boundary caps the identity policy's grant down to their intersection, and it never adds anything the identity policy didn't already grant
> - [ ] Everything the identity policy grants, since the boundary only matters when it's more permissive
> - [ ] Nothing, because a boundary and an identity policy can never coexist
> - [ ] `s3:*`, because permission boundaries only apply to resource-based policies ^card-y99l

Why is it wrong to describe a permission boundary as "another policy that grants permissions, evaluated alongside the identity policy"? :: Because a boundary never contributes an Allow of its own — the identity's actual permissions are the intersection of what the identity policy grants and what the boundary permits, so a boundary can only remove reachable actions from what the identity policy already grants, never add any. ^card-x6mg

A **service control policy (SCP)** does the same job, one level up: it's
attached to an AWS Organizations account, organizational unit, or the
whole organization, and sets the ceiling on what every identity policy
inside that scope — every user and role in every affected account — is
allowed to grant, no matter what those identity policies themselves say.

> [!card] recall
> An SCP attached to an OU denies `iam:CreateAccessKey` for every account
> in that OU. An account in the OU has an IAM user whose identity policy
> explicitly allows `iam:CreateAccessKey`. Explain what happens when that
> user tries to create an access key, and why the identity policy's Allow
> doesn't matter here at all. ^card-cw4u

That example matters because SCPs commonly use `Deny` rather than
relying purely on the ceiling behavior of an empty Allow list — and an
explicit Deny in an SCP is still an explicit deny, subject to
`policy-evaluation-logic.md`'s rule that no Allow, from any policy in
any account, can ever override it. An SCP with an explicit Deny doesn't
even need an identity policy to be involved for the action to be
blocked.

Permission boundaries and SCPs intersect with identity policies the same
way, but at different scopes: a boundary caps one identity; an SCP caps
every identity in an entire account or OU. Both compose the same way
with everything else in evaluation — they never supply the Allow that
`policy-evaluation-logic.md` looks for, they only shrink the ==space== of ^card-mji5
actions an identity policy's Allow is even permitted to reach.

One scope exception matters: an SCP attached at the organization root or
at an OU never constrains the **management account** (formerly called
the "master account") of that organization. SCPs apply only to member
accounts — the management account's own users and roles are unaffected
by any SCP, even one attached to the organization root that every member
account is subject to. This is why AWS's own guidance is to avoid
running workloads directly in the management account: it's the one part
of the org that SCP-based guardrails structurally can't reach.

> [!card] mcq
> An SCP attached to the organization root denies `iam:CreateUser` for
> every account in the org. Does this SCP block a user in the
> **management account** from calling `iam:CreateUser`?
> - [x] No — SCPs never apply to the management account, regardless of where in the org hierarchy they're attached
> - [ ] Yes, because an SCP on the organization root applies to every account without exception
> - [ ] Only if the management account is also placed inside an OU
> - [ ] It depends on whether the management account has its own identity policy allowing the action ^card-o89j

Why would an organization use SCPs to deny `iam:CreateUser` account-wide, rather than trusting every team's individual identity policies to simply never grant it? :: Because identity policies are written and changed by many different people over time, and any single overly broad grant — even a temporary or accidental one — would create the access; an SCP set at the OU or organization level provides a ceiling that holds even if some individual identity policy is wrong, without requiring every policy author to get it right. ^card-wr2c

What single sentence captures the relationship between an identity policy's Allow and a permission boundary or SCP that also applies? :: An identity's effective permissions are the intersection of what its identity policies grant and what every applicable boundary and SCP permits — never the union, and never something the boundary or SCP contributes on its own. ^card-ulyc
