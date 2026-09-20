---
topic: aws
category: aws-iam
tags: [iam, service-roles, instance-profiles, ec2, credentials]
citations: ["AWS Identity and Access Management User Guide — 'IAM roles for Amazon EC2'"]
---

# Service Roles and Instance Profiles

`roles-and-assume-role.md` describes AssumeRole as something a person, an
application, or a service can call. This note is about the specific,
very common case of compute — an EC2 instance, an ECS task, a Lambda
function — obtaining credentials without a human, or a deploy script,
ever having to generate or hand it a long-lived access key.

A **service role** is simply a role whose trust policy names an AWS
service principal (`ec2.amazonaws.com`, `lambda.amazonaws.com`, and so
on) as the entity allowed to assume it, and whose permissions policy
grants whatever that particular workload needs. Nothing about the role
itself is special beyond that trust relationship — it's the same role
mechanism `roles-and-assume-role.md` covers, applied to a service rather
than a person.

EC2 is a special case, because an EC2 instance isn't itself an IAM
principal that can call `sts:AssumeRole` on its own behalf the way a
Lambda function's execution context can. An **instance profile** is the
container that closes that gap: it's a thin wrapper — holding exactly
one role — that gets attached to the instance at launch (or afterward),
and it's what actually lets the instance obtain that role's temporary
credentials.

> [!card] mcq
> Why does EC2 need an instance profile, when Lambda simply lets you
> attach an execution role directly to a function?
> - [x] An EC2 instance isn't itself capable of assuming a role directly; the instance profile is the container that bridges the instance to a role so its credentials can be delivered to it
> - [ ] Instance profiles are an older, deprecated concept EC2 keeps only for backward compatibility
> - [ ] Because EC2 instances can hold more than one role at a time, unlike Lambda
> - [ ] There's no real difference — "instance profile" is just EC2's name for an execution role ^card-kwi1

Once an instance profile is attached, the instance's software can
retrieve temporary credentials for the attached role from the
**instance metadata service** — a local, non-routable endpoint reachable
only from inside the instance — without any code ever embedding an
access key, and without a human ever typing one in.

Why does credential retrieval through the instance metadata service happen from an endpoint that's only reachable from inside the instance itself? :: Restricting it to a local, non-internet-routable address means the credentials can only be fetched by code actually running on that instance, rather than by an arbitrary external caller who merely knows the instance exists — the network boundary is doing part of the access-control work that would otherwise fall entirely on IAM. ^card-ddzo

This beats a ==long-lived access key== embedded in an environment ^card-ywio
variable, a config file, or (worse) committed to source control, on
every axis that matters: the credentials the instance receives are
temporary and automatically rotated by AWS well before they expire, so
there's no key sitting around indefinitely for an attacker to find,
copy, and reuse long after the fact; there's no manual rotation process
to forget to run; and revoking access means changing the role's
permissions policy or detaching the instance profile, rather than
hunting down every place a static key might have been copied to.

> [!card] recall
> A team currently deploys application credentials to EC2 instances by
> baking an IAM user's static access key into an AMI. Explain the
> concrete operational risks this creates that an instance profile
> removes, and specifically why "temporary and auto-rotated" matters more
> than just "shorter" credentials would. ^card-8u9q

The same principle extends past EC2: ECS tasks get credentials through a
task role delivered via a similar local metadata endpoint, and Lambda
functions get credentials for their execution role injected directly
into the execution environment at init. In every case, the pattern is
the same one this note describes for EC2 — a service principal in a
trust policy, and a delivery mechanism that hands the running workload
temporary credentials it never had to be given by hand.

How does a Lambda function's execution environment obtain credentials for its execution role, compared to how an EC2 instance obtains them via the instance metadata service? :: Lambda has AWS inject the execution role's temporary credentials directly into the execution environment at init time; an EC2 instance instead has to actively fetch its role's credentials from the local instance metadata service after an instance profile has been attached — the same underlying pattern of temporary, non-static credentials, delivered through a different mechanism. ^card-9d2j

What would go wrong, from a security standpoint, if an organization decided instance profiles were unnecessary friction and instead distributed one shared long-lived IAM user's access key to every EC2 instance that needed S3 access? :: A single compromised instance (or a single leaked key, from a log, a snapshot, or a public repo) would expose credentials usable from anywhere, for as long as that key remains active — with no automatic expiration, no way to scope revocation to just the affected instance, and no way to tell from the credential alone which instance was using it, unlike a role session, which is scoped, temporary, and attributable in CloudTrail to the specific instance profile that requested it. ^card-1t9s
