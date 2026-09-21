---
topic: aws
category: aws-security
tags: [secrets-manager, parameter-store, kms, cost]
citations: ["AWS Secrets Manager User Guide — 'Compare AWS Secrets Manager with Systems Manager Parameter Store'"]
---

# Secrets Manager versus Parameter Store

`data-at-rest-encryption-across-services.md` covered KMS integration at
the storage-service level. Secrets Manager and Systems Manager Parameter
Store are the two places application configuration and credentials
themselves live, and choosing between them is not a feature checklist —
it's a handful of axes that actually decide it, plus one boundary
question that matters more than any of them.

Start with what they share. Both encrypt at rest with KMS — a Parameter
Store `SecureString` and a Secrets Manager secret each name a KMS key,
and neither service stores plaintext. That shared foundation creates a
shared gotcha: reading either one is gated by ==two== independent checks ^card-0d0p
that both have to pass — the resource's own permissions (a Secrets
Manager resource policy, or the IAM policy governing
`ssm:GetParameter`) and the KMS key policy for the key that encrypted
it. Getting the first right and forgetting the second is the classic
failure: the caller has `secretsmanager:GetSecretValue`, the call still
fails, because the key policy never granted that principal
`kms:Decrypt`.

> [!card] recall
> A developer is granted secretsmanager:GetSecretValue on a specific
> secret but their GetSecretValue call still fails with an access
> denied error. Explain the second gate they're missing and why both
> checks exist independently rather than one implying the other.
> ---
> Reading a KMS-encrypted secret requires kms:Decrypt on the KMS key
> that encrypted it, in addition to the resource-level permission on
> the secret itself. The two are independent because the key policy
> and the secret's own permissions are separate roots of authority
> guarding separate resources — a KMS key can be shared across many
> secrets or services, so its policy can't be inferred from any one
> secret's permissions, and has to be checked on its own. ^card-jdq2

The differences start with what you're paying for. Secrets Manager
charges per secret per month plus per API call, and in exchange gives
you built-in rotation: a scheduled Lambda invocation that can change the
credential itself, not just its stored copy. Parameter Store's
`SecureString` parameters are ==free== at the standard tier — no ^card-bu03
rotation engine ships with it at all; rotation has to be built by hand,
usually as an EventBridge-scheduled Lambda that calls `PutParameter`
itself. That single fact is the main reason teams pay for Secrets
Manager rather than the mechanics of encryption, which both services get
from the same place.

Why does built-in rotation, rather than encryption or access control, explain most of the decision to pay for Secrets Manager over free SecureString parameters? :: Because encryption and access control are identical in substance between the two — both defer to KMS and an access policy — so they don't differentiate the services at all. Rotation is the one piece of functionality Parameter Store simply doesn't ship, meaning the fee buys engineering effort you'd otherwise have to build and operate yourself. ^card-n2tg

Size and cross-account reach also diverge. A Secrets Manager secret can
hold up to 64 KB, comfortably fitting a JSON blob of multiple database
credentials; a standard Parameter Store parameter caps at ==4 KB==, ^card-1d8y
enough for a single value but not a bundled credential set. Cross-account
access follows the same split as the rest of AWS resource sharing:
Secrets Manager attaches a resource policy directly to the secret, so
another account can be granted access without any change on the
consumer's side, while standard-tier Parameter Store has no resource
policy at all — sharing a parameter across accounts means routing
through a role in the owning account instead.

> [!card] mcq
> A platform team wants Account B to read a specific parameter owned by
> Account A, without changing anything in Account B's own IAM setup,
> using standard-tier Parameter Store. What's the outcome?
> - [x] Not directly possible — standard Parameter Store parameters have no resource policy; Account B needs a role in Account A to assume, or the team should use a Secrets Manager secret with a resource policy instead
> - [ ] Trivial — attach a resource policy to the parameter naming Account B
> - [ ] Trivial — all SecureString parameters are readable cross-account by default once KMS grants are configured
> - [ ] Not possible at all, even with a role, because Parameter Store has no cross-account mechanism whatsoever ^card-l8tp

Versioning differs in shape, not just presence. Every Parameter Store
write creates a new numbered version, and old versions are retained but
have no special role — there's no live "current" pointer distinct from
"latest." Secrets Manager instead uses staging labels
(`secret-rotation-and-staging-labels.md` covers this fully) — `AWSCURRENT`
marks the version an ordinary read returns, and that label can move
without the underlying values changing shape, which is what makes
in-place rotation possible at all.

Throughput is the last axis, and it's really a cost decision disguised
as a technical one. Parameter Store's standard throughput can throttle
under heavy concurrent reads from many instances at startup; the fix is
the ==advanced== parameter tier or a higher-throughput setting, both of ^card-lgrn
which cost money — so "Parameter Store is free" stops being quite true
the moment a workload is large enough to need it, and the two services'
pricing curves converge from opposite directions.

None of these axes matter if the thing being stored was never a secret
in the first place. **Configuration is not a secret.** A feature flag, a
timeout value, an S3 bucket name — putting these in Secrets Manager buys
rotation machinery and per-secret charges for values that never need to
rotate and were never sensitive to begin with. The inverse mistake is
the dangerous one: a database password in a plaintext Parameter Store
value, or worse, in a Lambda environment variable that shows up in
`GetFunctionConfiguration` output, isn't a cost optimization — it's a
credential sitting in a place logs, consoles, and anyone with
read-only describe permissions can see it. The permissions shape that
should gate who reaches either service at all is
`../iam/least-privilege-in-practice.md`'s territory, not this note's.

Why is storing a non-sensitive configuration value in Secrets Manager considered a mistake even though nothing about it is insecure? :: Because Secrets Manager's cost and rotation machinery exist to solve a problem non-sensitive configuration doesn't have — there's no credential to rotate and no exposure risk to justify the per-secret charge, so the choice buys operational overhead without buying any corresponding safety benefit. ^card-fg0j
