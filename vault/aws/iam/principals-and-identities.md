---
topic: aws
category: aws-iam
tags: [iam, principals, users, roles, root-user]
citations: ["AWS Identity and Access Management User Guide — 'IAM identities'"]
---

# Principals and Identities

Every AWS API call is made by someone, and IAM's job starts with naming
that someone precisely. A **principal** is whatever entity is making a
request — at request time, AWS resolves it down to a unique identifier
(an ARN, or an account ID for the root user) and evaluates every policy
against that identifier, not against a display name you might recognize.

An **IAM user** is a persistent identity, usually representing a person
or a long-running application, with its own name and, optionally, its
own long-lived credentials (a password, access keys). A user's ==permissions== ^card-lf0w
come entirely from the policies attached to it directly or through group
membership — a user holds none of its own outside those policies.

**Groups** are not identities and cannot be a principal in a policy or an
API call; a group is only a way to give the same permissions to many
users at once, which is why you can add or remove a user from a group
without touching the ==policies== attached to the group itself. ^card-nwvz

> [!card] mcq
> Which of these can be named as the `Principal` in a resource-based policy?
> - [x] An IAM user, an IAM role, a service principal, or an account
> - [ ] An IAM group
> - [ ] Only IAM users, never roles or services
> - [ ] Only the account root user ^card-qo5e

Why can an IAM group never appear as a `Principal` in a policy, even though it can be granted permissions? :: A group is a container for attaching policies to users in bulk, not an identity that makes requests — at request time AWS always resolves the caller down to a user, a role session, a service, or the root user, and a group was never in that list of things that can act. ^card-7eqx

An **IAM role** differs from a user in one crucial way: it has no
long-lived credentials of its own. Instead, a role is an identity that
something else **assumes** temporarily — a person, an application, or an
AWS service — receiving short-lived credentials scoped to that role's
permissions for the duration of the session. `roles-and-assume-role.md`
covers this mechanism in full.

A **service principal** is how an AWS service itself is named as the
caller inside a trust or resource policy, written as a special DNS-style
identifier such as `lambda.amazonaws.com` or `ec2.amazonaws.com`.

It represents the ==service== acting on your behalf — for example, Lambda ^card-z3hz
assuming an execution role to run your function — rather than any human
or application credential.

> [!card] recall
> Explain why a service principal like `ec2.amazonaws.com` appearing in a
> role's trust policy does not, by itself, grant EC2 instances launched in
> your account any permissions at all. What second piece has to exist
> before that role actually does anything? ^card-k4y8

The **root user** is the identity created when the AWS account itself was
created, identified by the account's email address, and it is the one
principal that can never be fully restricted by an IAM policy — some
account-level actions (closing the account, changing the support plan)
can ==only== be performed by root, no matter what policies exist, because ^card-9jnd
IAM policies attach to identities and root's authority derives from
account ownership rather than from any policy at all.

Because root's credentials are so powerful and largely unconstrainable
by policy, AWS's standing guidance is to lock away root's credentials
(enable MFA, avoid generating access keys for it) and do all routine
work — even administrative work — through an IAM user or role instead,
reserving root for the handful of actions that genuinely require it.

What is the practical difference between "an IAM user with full administrator permissions" and "the root user," given that both can technically do almost everything? :: An administrator's permissions are still expressed as an attached policy and can be revoked, boundaried, or denied by another policy at any time; root's authority for account-level actions doesn't come from a policy at all, so there's no IAM mechanism that can take it away — which is exactly why root should be used as rarely as possible. ^card-xisv
