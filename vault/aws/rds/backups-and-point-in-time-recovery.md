---
topic: aws
category: aws-rds
tags: [rds, backups, point-in-time-recovery, snapshots, restore]
citations: ["AWS User Guide — Amazon RDS, 'Backing up and restoring an Amazon RDS DB instance'"]
---

# Backups and Point-in-Time Recovery

RDS gives you two overlapping but distinct mechanisms for getting old data
back: automated backups, which exist to support point-in-time recovery,
and manual snapshots, which exist to preserve one moment on purpose. Both
end in the same operation — a restore — and that operation behaves the
same surprising way regardless of which kind of backup fed it.

==Automated backups== run on a schedule you don't have to think about: RDS ^card-ofuj
takes a daily storage snapshot and continuously captures the transaction
log in between, together covering a rolling retention window. A ==manual ^card-oxf7
snapshot==, by contrast, is a deliberate, user-triggered copy that is kept
until you delete it — useful for the moment right before a risky schema
change, when "whatever the daily job happens to capture" isn't good enough.

Point-in-time recovery reconstructs the database as of an arbitrary
timestamp by starting from the most recent base snapshot at or before that
time and then replaying the ==transaction logs== captured after it, up to ^card-6ohv
the exact second requested — not just up to whichever daily snapshot
happens to be closest.

Restoring — whether from an automated backup via PITR or from a manual
snapshot — does not touch the instance you restored from. It provisions a
brand-new DB instance with a new endpoint, loaded with the restored data;
the original instance keeps running, unmodified, the whole time.

That last point is easy to miss under pressure: "restore to five minutes
ago" sounds like rolling the current instance backward, but it actually
means standing up a second instance next to the first one and then
deciding what to do with it — repoint the application, copy data out of
it, or discard it.

> [!card] mcq
> After initiating a point-in-time restore on an RDS instance, what do you end up with?
> - [x] A new DB instance, with a new endpoint, containing the restored data — the original instance is untouched
> - [ ] The original instance, rewound in place to the requested timestamp
> - [ ] A downloadable file containing the database contents as of that timestamp
> - [ ] The original instance paused until you confirm the rewind ^card-gcb7

What two pieces does RDS combine to reconstruct a database as of an arbitrary point in time? :: The most recent base snapshot taken at or before that timestamp, plus the transaction log entries recorded between that snapshot and the requested moment, replayed forward to land exactly on it. ^card-6zdr

Why might you take a manual snapshot instead of relying on automated backups alone? :: A manual snapshot is kept until you explicitly delete it and captures a moment you choose on purpose — such as immediately before a risky migration — rather than whatever the automated backup schedule happens to have captured around that time. ^card-mztt

> [!card] recall
> Explain why "restore" on RDS should be understood as "create a new
> instance from historical data" rather than "rewind this instance," and
> why that distinction matters when you're deciding how to respond to an
> incident. ^card-1qg8
