---
topic: aws
category: aws-observability
tags: [cloudwatch, logs, retention, cost]
citations: ["Amazon CloudWatch User Guide — 'Working with log groups and log streams', 'CloudWatch Logs pricing'"]
---

# Log Groups, Streams, and Retention Cost

`../lambda/observability-and-cost-model.md` already covers where a
function's stdout ends up: one log group per function, populated
automatically. This note covers the structure underneath that fact and
the cost consequence almost nobody configures on purpose.

CloudWatch Logs has two levels, and they answer different questions. The
==log group== is the unit you actually manage — it's where retention, ^card-qm8p
encryption, subscription filters, and access permissions are all set —
while a log stream is a single sequential sequence of log events sharing
a source within that group (one Lambda execution environment, one EC2
instance, one container task), which is why ordering only exists inside
a stream and not across the group as a whole.

What does a log group govern that an individual log stream inside it never does? :: Configuration — retention period, encryption (KMS key), subscription filters, and IAM/resource permissions all attach at the log group level. A log stream is just a single sequential source of events within that group; it carries no settings of its own. ^card-cm4l

The single fact worth memorizing here is that a newly created log group's
retention setting defaults to ==never expire==, not some sensible short ^card-sxob
window. Left alone, every event ever ingested into that group sits in
storage and is billed for it indefinitely — nothing ages out on its own.

> [!card] mcq
> A team has been running dozens of Lambda functions and ECS services for two years and never once touched a CloudWatch log group's retention setting. What is true of every one of those log groups by default?
> - [x] They still hold every log event ever ingested, and are being billed for that storage, because the default retention is "never expire"
> - [ ] They were automatically capped at 30 days of retention to control cost
> - [ ] They were automatically archived to S3 Glacier after 90 days
> - [ ] CloudWatch deletes log groups that receive no new events for 60 days ^card-tg3g

Why is an untouched retention setting called out as the most common avoidable AWS observability cost, rather than, say, an oversized alarm bill? :: Because it requires no unusual configuration to happen — it's what CloudWatch does by default, silently, on every log group anyone creates — and the cost compounds forever rather than staying flat, since nothing ever ages out to cap the storage being billed. ^card-hc8o

Retention isn't the only meter running. CloudWatch Logs charges at three
separate points: once to ==ingest== a log event, again to store it for as ^card-ponf
long as retention keeps it around, and again to scan it when a Logs
Insights query reads over it (that query-time cost is its own subject,
covered where Insights is discussed). Because the first of those charges
is billed up front and can't be undone later, the cheapest lever is
almost always writing fewer log lines in the first place, rather than
shortening how long you keep what you already paid to take in.

Why does "log less" beat "retain less" as a cost-cutting strategy, given that both retention and the initial intake are billed separately? :: The intake charge is incurred the moment a log line is written, before any retention setting has a chance to act on it — shortening retention only stops paying for storage going forward, it can't undo the charge already paid for taking the line in. Reducing what gets logged in the first place avoids both charges at the source. ^card-joyx

Getting logs out of CloudWatch and somewhere cheaper or more capable —
a data lake, a SIEM, a third-party log platform — goes through a
==subscription filter==: a pattern-matching rule on a log group that ^card-93z3
streams every matching event, in near real time, to a destination like
Kinesis Data Firehose or a Lambda function, as it arrives.

Export to S3 works differently and serves a different purpose: it's a
one-time (or scheduled) bulk copy of a log group's existing contents into
an S3 bucket for cheap long-term archival, not a live stream of new
events. That distinction is why the standard answer to "we need to keep
these logs for seven years for an audit" is a short CloudWatch retention
window paired with an S3 export or subscription-driven archive, rather
than just setting the log group's own retention to seven years.

> [!card] recall
> An auditor tells a team they must retain application logs for seven
> years. Explain why the right design is short CloudWatch retention plus
> an S3 archive, rather than simply setting the log group's retention
> to seven years, in terms of what each storage tier is priced for.
> ---
> CloudWatch Logs storage is priced for logs you expect to actively
> query — it's optimized for recency, not bulk archival, so paying that
> rate for seven years of rarely-touched data is far more expensive than
> it needs to be. S3 (especially with a lifecycle policy into Glacier)
> is priced for exactly this: cheap, durable, long-term storage of data
> that's read rarely if ever. Keeping CloudWatch retention short and
> exporting or streaming everything else into S3 gets the audit
> requirement satisfied at S3's storage rate instead of CloudWatch's. ^card-m4vn

