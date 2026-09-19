---
topic: aws
category: aws-s3
tags: [consistency, read-after-write, linearizability, eventual-consistency]
citations: ["AWS Developer Guide — Amazon S3, 'Amazon S3 data consistency model'"]
---

# Consistency Model

For years, "S3 is eventually consistent" was a fact engineers designed
around: a write might not be visible to a read that followed it, and
overwriting an object could return stale data to some readers for a
while. AWS changed the underlying guarantee, and a surprising number of
architectures and blog posts still assume the old behavior.

S3 now provides ==strong read-after-write consistency== for every ^card-6s48
operation, including new object PUTs, overwrites of existing objects,
and DELETEs.

Under the model this replaced, a GET issued immediately after a PUT to a
new key could return a "key not found" response, and readers could see
different results for the same key depending on which internal replica
served the ==request==. ^card-64wz

Because consistency now applies uniformly, a list operation issued right
after a PUT will ==reflect== that write, rather than having a chance of ^card-fed7
omitting the just-written object as older versions of the model allowed.

What workaround pattern did applications commonly build to compensate for S3's old eventually-consistent reads, and why is it now unnecessary? :: Retry-with-backoff loops or a separate strongly-consistent index (writing metadata to a database and treating S3 as a blob-only store) to paper over the chance that a read directly after a write would miss it; strong read-after-write consistency removed the underlying race that pattern existed to work around, though a separate index may still be worth keeping for other reasons like query patterns S3 alone can't serve. ^card-u9tc

> [!card] mcq
> A client overwrites an existing object and immediately issues a GET
> for the same key. Under S3's current consistency model, what is
> guaranteed?
> - [x] The GET returns the new data (or a later write, if another overwrite has already happened); it will not return the old data
> - [ ] The GET may return either the old or the new data, chosen at random
> - [ ] The GET is guaranteed to return the old data until a cache expires
> - [ ] The GET will fail until the write is confirmed by a separate consistency-check call ^card-b2cn

This is the same guarantee `vault/data-systems/consistency-consensus.md`
calls linearizability's recency property on a single object: once a
write completes, every subsequent read must see that write or a later
one, never something older — S3 applies exactly that guarantee to
every key.

Strong consistency describes the ordering of writes and reads on a
==single object==; it says nothing about coordinating operations across ^card-xh7v
multiple objects the way a database transaction would.

> [!card] recall
> A teammate insists on adding retry-and-verify logic after every S3 PUT
> "just in case a read afterward doesn't see it yet." Explain what
> guarantee makes that logic unnecessary today, and name one situation
> where retry logic around S3 access is still worth keeping for a
> different reason (hint: it isn't about consistency). ^card-7msu

Why can an object be immediately, correctly readable under S3's consistency guarantee even though its replication to another region hasn't happened yet? :: Because strong read-after-write consistency applies to reads of the object in its own bucket; propagating that write to a replication destination is a separate, asynchronous process that the consistency guarantee doesn't cover — the two are decoupled by design. ^card-o48g
