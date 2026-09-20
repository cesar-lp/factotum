---
topic: aws
category: aws-iam
tags: [iam, conditions, context-keys, least-privilege]
citations: ["AWS Identity and Access Management User Guide — 'IAM JSON policy elements: Condition'"]
---

# Conditions and Context Keys

`policy-documents.md` introduces `Condition` as the optional element that
narrows when a statement's Effect applies. This note is about why that
one element carries so much weight: Action and Resource can only say
*what* and *on which thing* — Condition is where a policy gets to reason
about the circumstances of the request itself.

A **condition operator** compares a request context key's actual value
against a value the policy specifies. `StringEquals` and `StringLike`
compare strings (the latter allowing wildcards); `IpAddress` and
`NotIpAddress` compare a CIDR range; `DateGreaterThan` and
`DateLessThan` compare timestamps; `Bool` compares true/false. Each
operator also has a set-aware variant — `StringEqualsIfExists`, for
instance — that only evaluates if the named key is actually present on
the request, rather than treating a missing key as a mismatch.

> [!card] mcq
> A statement's condition uses `IpAddress` to compare `aws:SourceIp`
> against an allowed CIDR range. The request in question comes from a
> source IP not in that range. What happens to the statement?
> - [x] The condition doesn't match, so the statement's Effect (Allow or Deny) doesn't apply to this request at all — as though the statement weren't there
> - [ ] The statement is treated as a Deny automatically, regardless of what its Effect actually says
> - [ ] The request is rejected before IAM evaluation even begins
> - [ ] The condition is ignored and the Effect applies anyway ^card-chq8

A **request context key** is a piece of information about the request
that AWS makes available to conditions — not something you invent, but
one of a fixed set the platform populates on every call. Global keys
like `aws:SourceIp`, `aws:CurrentTime`, `aws:MultiFactorAuthPresent`, and
`aws:PrincipalOrgID` are available on every request regardless of
service; service-specific keys, like `s3:x-amz-server-side-encryption`
or `dynamodb:LeadingKeys`, are populated only for calls to that service
and expose details specific to it.

Why can't a policy author add an arbitrary new condition key of their own choosing? :: Context keys are populated by AWS itself from the details of the actual request — a condition can only compare against information the platform already knows and exposes, not information a policy author wishes were available; inventing a key that AWS doesn't populate simply never matches anything. ^card-ngjc

What does the `IfExists` suffix on a condition operator (as in `StringEqualsIfExists`) change about how it evaluates a request where the named context key is missing? :: Without the suffix, a missing key causes the comparison to fail as a mismatch; with the suffix, the operator simply skips evaluating that key instead of treating its absence as a mismatch, so the rest of the statement isn't blocked purely because that particular request never populated the key. ^card-rmpn

Conditions are where **least privilege actually gets expressed**, in a
way Action and Resource alone can't reach. An Action/Resource pair says
"this identity can call `s3:PutObject` on this bucket" — full stop. A
condition can narrow that same grant to "only from our corporate VPN's
IP range," "only if the object is being uploaded with
server-side encryption," "only if MFA was present on this session," or
"only before this policy's planned expiration date" — constraints that
have nothing to do with which action or resource is named, and
==everything== to do with the circumstances under which it's acceptable. ^card-byd9

> [!card] recall
> A policy grants `s3:DeleteObject` with no condition at all, versus a
> second version of the same policy that adds a condition requiring
> `aws:MultiFactorAuthPresent` to equal `true`. Explain concretely what
> capability the second version removes that the first version had, and
> why that removal is a meaningful move toward least privilege even
> though the Action and Resource elements are identical in both. ^card-ex7m

**How multiple conditions and multiple values combine** is easy to state
backwards, so it's worth isolating from everything else: within a single
`Condition` element, multiple condition operators (or multiple distinct
context keys attached to different operators) are combined with a
logical **AND** — every one of them has to match for the statement to
apply. But within a *single* condition operator that lists multiple
values for the *same* key, those values are combined with a logical
**OR** — matching any one of them is enough.

> [!card] mcq
> A statement's Condition block has two separate operators: one requiring
> `aws:PrincipalOrgID` to equal `o-example`, and another requiring
> `aws:MultiFactorAuthPresent` to equal `true`. A request satisfies the
> org-ID check but was made without MFA. Does the condition match?
> - [x] No — multiple condition operators in the same block are combined with AND, so every one of them must match, and this request fails the MFA check
> - [ ] Yes, because matching either operator is enough to satisfy the block
> - [ ] Yes, but only the org-ID check is actually enforced
> - [ ] The block errors out because it isn't allowed to contain two operators
>
> A different statement uses `StringEquals` on `aws:RequestedRegion` with
> three values: `us-east-1`, `us-west-2`, `eu-west-1`. A request comes
> from `us-west-2`. Does that single operator match?
> - [x] Yes — multiple values listed for the same key under one operator are combined with OR, so matching any one value is enough
> - [ ] No, because all three listed values would have to match simultaneously
> - [ ] No, because a single operator can only ever compare against one value
> - [ ] It depends on the order the values are listed in ^card-v7xs

Why is it "AND across operators, OR within a single key's value list" rather than the reverse? :: Each distinct operator (or distinct key) expresses a separate requirement the request has to satisfy, so a statement with several of them is only as permissive as its strictest requirement — that's AND. A single key, though, can only ever hold one actual value on a given request, so listing several candidate values for it is really asking "does the request's one value match any of these" — that's OR, because the request could never match more than one of them at once anyway. ^card-qujy

A condition can appear in an Allow statement (narrowing what's granted)
or a Deny statement (narrowing what's blocked) — the two produce very
different postures. A conditional Allow only grants access under the
stated circumstances; a conditional Deny only blocks access under the
stated circumstances, leaving everything else exactly as permissive as
it would have been without the Deny. Writing a broad Deny with a
condition meant to carve out an exception is a common way this gets
inverted by accident.

Why does a Deny statement with a condition of `"aws:MultiFactorAuthPresent": "false"` behave very differently from an Allow statement with the same condition written as `"true"`, even though they sound like opposites? :: The Deny version blocks requests specifically when MFA was absent, leaving every MFA-authenticated request to be decided by whatever else applies; the Allow version only grants access when MFA was present and contributes nothing when it wasn't, meaning by itself it grants nothing to a non-MFA session rather than actively blocking it — the two are not mirror images once other policies are in the picture, because one actively denies and the other simply doesn't allow. ^card-30ax
