---
topic: aws
category: aws-iam
tags: [iam, policy-documents, json, policy-elements]
citations: ["AWS Identity and Access Management User Guide — 'Policies and permissions in IAM'"]
---

# Policy Documents

An IAM policy is a JSON document, and almost every confusing permissions
bug traces back to one of a small handful of elements being missing,
mis-scoped, or attached to the wrong kind of policy. Learning the anatomy
precisely pays for itself immediately.

The **Version** element identifies the policy language version being
used (almost always the literal string `"2012-10-17"` today, since it's
the version that introduced ==Condition== support) and exists purely for ^card-2jaa
AWS's own backward compatibility — it has nothing to do with your
policy's revision history.

A policy document's real content lives inside **Statement**, an array
where each entry is independently evaluated; a single policy commonly
contains several statements, each granting or denying a different slice
of access, and there is no meaningful concept of statements within one
policy depending on each other's outcome.

> [!card] mcq
> A policy document has two statements: one with `"Effect": "Allow"` for
> `s3:GetObject`, and one with `"Effect": "Deny"` for `s3:DeleteObject`.
> What determines whether a `s3:PutObject` request is allowed?
> - [x] Neither statement mentions it, so it falls to whatever the rest of policy evaluation decides — by default, implicit deny
> - [ ] The Allow statement, because it appears first
> - [ ] The Deny statement, because Deny statements take priority regardless of the action named
> - [ ] Both statements average out to a deny ^card-9w6i

Every statement needs an **Effect**, which is only ever one of two literal
values: `Allow` or `Deny`. There is no third option, and a statement
without an explicit Effect is not valid — the direction of every grant or
restriction in IAM traces back to exactly one of these two words.

How many valid values can a statement's `Effect` element take, and what happens if it's left out entirely? :: Exactly two — `Allow` or `Deny`, with no third option; a statement without an explicit Effect isn't a valid statement, since every grant or restriction in IAM has to trace back to one of those two literal values. ^card-utk8

**Action** names the API operation(s) the statement applies to, written
as `service:ActionName` (e.g. `s3:GetObject`, `dynamodb:Query`), and
supports wildcards like `s3:Get*` or a bare `*` for every action across
every service — a convenience `policy-evaluation-logic.md` and
`least-privilege-in-practice.md` both come back to, since a wildcard
here is exactly what makes a policy hard to reason about later.

**Resource** identifies which specific AWS resource(s), by ARN, the
statement covers. Some elements are conditionally required: an ==identity-based== ^card-rxct
policy (attached to a user, group, or role) never includes a `Principal`
element, because the identity it's attached to already implies who the
policy applies to; a resource-based policy (like an S3 bucket policy or
an IAM role's trust policy) must include one, because it's attached to a
resource rather than an identity and needs to say who it's granting
access to.

Why does an identity-based policy never contain a `Principal` element, while a resource-based policy always does? :: An identity-based policy is attached directly to a user, group, or role, so the "who" is already fixed by what the policy is attached to; a resource-based policy is attached to a resource instead, which has no inherent identity of its own, so it must explicitly name the principal(s) it's granting or denying access to. ^card-62mk

The **Condition** element is optional on any statement and narrows when
an Allow or Deny actually applies — it evaluates request context keys
against operators like `StringEquals` or `IpAddress`, and if the
condition doesn't match, the rest of the statement's Effect simply
doesn't apply to that request at all, as though the statement weren't
there. `conditions-and-context-keys.md` covers this element in depth.

> [!card] recall
> A statement has `"Effect": "Deny"`, `"Action": "*"`, `"Resource": "*"`,
> and a `Condition` requiring `aws:MultiFactorAuthPresent` to be `false`.
> Explain in plain language what this statement actually denies, and why
> writing the condition this way (rather than requiring it to be `true`)
> is the correct way to express "block everything unless MFA was used." ^card-b2tm
>

A statement missing `Condition` entirely is not the same as a statement
whose condition always evaluates false — the former applies
unconditionally to every matching request, while the latter never
applies at all; getting these two confused is a common source of
policies that are either far broader or far narrower than intended.
