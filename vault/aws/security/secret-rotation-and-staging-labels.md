---
topic: aws
category: aws-security
tags: [secrets-manager, rotation, staging-labels, rds]
citations: ["AWS Secrets Manager User Guide — 'Rotate AWS Secrets Manager secrets'"]
---

# Secret Rotation and Staging Labels

`key-rotation-and-key-deletion.md` covers KMS key rotation — swapping
the backing key material behind a fixed key id, re-encrypting nothing.
This is a different mechanism entirely, wearing the same word: Secrets
Manager rotation changes the actual secret *value* — a database
password, an API key — and has to do it while other things are actively
reading the old one. `key-management-and-rotation.md` already makes the
general case for rotating secrets at all; this note is about the
specific machinery AWS built to do it without an outage.

Rotation is not a platform feature you flip on — it's a **Lambda
function you own**, invoked by Secrets Manager on a schedule, that walks
through four steps in a fixed order: `createSecret`, `setSecret`,
`testSecret`, `finishSecret`. That sequencing exists because rotation
has to stay safe for a caller that's mid-flight — a connection opened
seconds before rotation started can't be allowed to suddenly break.

> [!card] recall
> Name the four steps of a Secrets Manager rotation Lambda in order,
> and explain why testSecret has to run as its own separate step rather
> than being folded into setSecret.
> ---
> createSecret generates the new candidate value; setSecret applies it
> to the underlying system (e.g. changes the database password);
> testSecret verifies the new value actually works before anything is
> promoted; finishSecret makes the new value the one live callers see.
> testSecret is separate because setSecret succeeding only proves the
> write happened, not that the new credential is actually usable end to
> end — collapsing the two would let a broken credential get promoted on
> the strength of an unrelated API call succeeding. ^card-26u3

The mechanism that makes this safe is **staging labels** — pointers
onto specific versions of the secret's value, not the values
themselves. `AWSCURRENT` marks the version an ordinary `GetSecretValue`
call returns; `AWSPENDING` marks the candidate rotation is building and
testing; `AWSPREVIOUS` marks the value that was current just before the
last rotation. `finishSecret`'s entire job is to move the
`AWSCURRENT` label onto the version that was `AWSPENDING` — an atomic
==relabeling==, not an overwrite of any stored value. ^card-jfb7

Why does finishSecret move a label onto an existing version rather than overwriting the AWSCURRENT version's value in place? :: Moving a label is atomic and instantaneous from every reader's perspective — a GetSecretValue call either sees the old label placement or the new one, never a half-written value. Overwriting in place would create a window where the value is partially updated, and any concurrent reader hitting that window would get a corrupted or inconsistent secret instead of a clean old-or-new result. ^card-i2nr

That label move is what turns rotation from a hazard into a
non-event. A client that fetched and cached the secret moments before
`finishSecret` ran is holding what is now the `AWSPREVIOUS` value —
still a real, working credential for however long the underlying
system honors it — so rotation doesn't force every live connection to
fail in the instant the label moves.

> [!card] mcq
> A web server fetched a database secret 30 seconds before Secrets
> Manager finished rotating it, and the database still accepts both the
> old and new password for a grace window. What happens to the server's
> existing connection?
> - [x] It keeps working — the server is holding the value that's now AWSPREVIOUS, and the database still honors it during the grace window, so rotation causes no immediate disruption
> - [ ] It fails immediately, because AWSCURRENT moving invalidates every credential that isn't the new one
> - [ ] It fails immediately, because finishSecret closes all open connections that used the prior secret
> - [ ] It keeps working only if the server re-fetches the secret within one second of the label move ^card-mwe5

Databases are where rotation gets genuinely risky, and the standard
defense is the **alternating-users strategy**: instead of rotating one
database user's password in place, rotation flips between two
pre-provisioned users — rotating user A's password while user B's
credential is still `AWSCURRENT` and live, then flipping to A as
current next cycle while B's password gets rotated in the background.
==Single-user== rotation, changing one user's password directly, is ^card-2r3a
riskier for the opposite reason: the password changes underneath every
live connection to that same user, and there is a real gap during which
no valid credential exists for it at all if anything goes wrong
mid-rotation.

Why is alternating between two database users safer than rotating a single user's password directly? :: With two users, one user's credentials always remain untouched and live (AWSCURRENT) while the other's are being changed in the background, so there's never a moment with zero working credentials. Single-user rotation changes the one live user in place, so any failure mid-rotation — or even the ordinary propagation delay — can leave connections with no valid password to fall back to. ^card-om06

The failure mode that actually shows up in practice isn't rotation
failing loudly — it's `testSecret` passing without really testing
anything: a shallow check (the API call returned 200, the connection
opened) that doesn't exercise the actual query pattern or permission
the application depends on. Rotation reports success, `AWSCURRENT`
moves, and the break only surfaces days later at the next deploy, when
new code paths hit a working-but-wrong credential for the first time —
far enough removed from the rotation event that nobody thinks to look
there first.

For supported engines — MySQL, PostgreSQL, MariaDB, Oracle, SQL Server
among them — Secrets Manager offers **managed rotation**: AWS supplies
and maintains the four-step Lambda function itself, and you only choose
the schedule and, for the alternating-users pattern, the second user.
Anything outside that supported list — a third-party API key, a
credential for a service AWS doesn't integrate with — means writing and
owning the Lambda yourself, with all four steps and their correctness
squarely your responsibility.

What is the tradeoff a team gives up by using AWS's managed rotation for a supported RDS engine instead of writing its own rotation Lambda? :: It gives up control over the rotation logic's exact behavior in exchange for not having to write, test, or maintain the four-step Lambda itself — AWS owns correctness of the standard flow, but any rotation need outside what the managed function supports (a nonstandard permission model, a non-RDS credential) still requires a custom Lambda. ^card-gt82
