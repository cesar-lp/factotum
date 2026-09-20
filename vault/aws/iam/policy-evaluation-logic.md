---
topic: aws
category: aws-iam
tags: [iam, policy-evaluation, explicit-deny, cross-account]
citations: ["AWS Identity and Access Management User Guide — 'Policy evaluation logic'"]
---

# Policy Evaluation Logic

Every request IAM ever evaluates is decided by the same fixed order of
precedence, applied across every policy that touches the request —
identity policies, resource policies, permission boundaries, and
organization-level SCPs alike. Get this order wrong and every other IAM
note is built on sand.

The order is: an ==explicit deny== anywhere always wins, full stop. If ^card-cp50
any applicable policy contains a Deny statement matching the request,
the request is denied, regardless of how many other policies grant it.
No Allow, from any policy, in any account, can override it.

If no explicit deny applies, IAM checks whether **any** applicable
policy contains an Allow statement matching the request. If one does,
the request is allowed.

If neither an explicit deny nor an explicit allow matches, the request
is denied by **implicit deny** — this is the default state of every IAM
request, before any policy is even consulted: unless something
explicitly says yes, and nothing explicitly says no, the answer is no.

> [!card] mcq
> A request matches no Deny statement in any applicable policy, and no
> Allow statement either. What is the result?
> - [x] Denied, by implicit deny — no policy being silent on the request ever means "allow"
> - [ ] Allowed, because nothing explicitly denied it
> - [ ] The request errors out rather than resolving either way
> - [ ] It depends on which account issued the request ^card-s8pj

Why does an explicit Deny in a resource-based policy override an Allow that appears in the requester's own identity-based policy, given that both policies are "applicable" to the request? :: The evaluation order isn't about which policy is attached to what — it's a fixed sequence checked across every applicable policy at once: any explicit Deny anywhere is checked first and wins outright, before IAM ever looks for an Allow, so it doesn't matter which policy the Deny lives in or how permissive the identity policy is. ^card-peha

That three-step order is the same everywhere, but **which policies count
as "applicable"** changes depending on whether the request stays inside
one account or crosses an account boundary — this is where most
plausible-sounding IAM mistakes live.

For a **same-account** request — the caller and the resource belong to
the same AWS account — a grant from ==either== the identity policy or the ^card-a8r4
resource-based policy is sufficient to allow the request, as long as
neither side contains an explicit deny. The two policies are evaluated
as alternatives that can each independently satisfy the "is there an
allow" step; neither one is required to also grant the action on its
own.

> [!card] mcq
> Within a single account, an S3 bucket policy grants `s3:GetObject` to
> IAM role `Reader`. That role's own identity policy grants no S3
> permissions at all, and neither policy contains a deny. Can `Reader`
> read the object?
> - [x] Yes — for a same-account request, a grant from either the identity policy or the resource policy is enough, absent an explicit deny
> - [ ] No, because the identity policy must independently grant the action too
> - [ ] No, bucket policies can only grant access to principals outside the account
> - [ ] Yes, but only because IAM roles are exempt from needing bucket-policy grants ^card-89io

For a **cross-account** request — the caller's account differs from the
account that owns the resource — that "either side" shortcut disappears.
The resource's account must grant access via its resource-based policy
(naming the external account or principal), **and** the caller's own
account must independently grant that action via the caller's identity
policy. ==Both sides== have to allow the request; a resource-based grant ^card-huul
alone is necessary but never sufficient once the request crosses an
account boundary. Other cross-account access patterns, such as
presigned URLs and role assumption, rely on this exact rule too.

Why does a bucket policy that names an external account as principal, on its own, never let that account's users actually read the object? :: A resource-based grant to an external account satisfies only the resource-account side of a cross-account request; the request still needs the external account's own identity policy to independently allow the same action, because "either side suffices" only holds within a single account — across accounts both sides must allow, or the implicit deny still applies. ^card-mub1

> [!card] recall
> Explain, in terms of the evaluation order above, exactly what changes
> between a same-account and a cross-account request — not the order
> itself, but which set of policies has to agree before the "is there an
> allow" step can be satisfied. Why does adding an account boundary turn
> an "either side" rule into a "both sides" rule? ^card-zozi

Permission boundaries and SCPs add one more layer on top of this: a
permission boundary or SCP never supplies the Allow this note
describes — it can only narrow what an identity policy's Allow is
permitted to reach, which is a different role in the evaluation than
anything covered here.
