---
topic: aws
category: aws-s3
tags: [multipart-upload, large-objects, upload-reliability, storage-cost]
citations: ["AWS Developer Guide — Amazon S3, 'Uploading and copying objects using multipart upload'"]
---

# Multipart Upload and Large Objects

A single PUT works fine for a small file, but as objects get large it
becomes a liability: one connection carrying the entire object means one
network hiccup near the end throws away everything sent so far.
Multipart upload exists specifically to change the unit of failure from
"the whole object" to something much smaller.

Multipart upload splits an object into independently-uploaded ==parts==, ^card-9nfi
each sent (and retried, if needed) as its own PUT, so a single part
failing doesn't require re-sending the rest of the object.

Why does splitting an upload into parts also make it possible to upload faster than a single PUT could, independent of the reliability benefit? :: Because parts can be uploaded concurrently over multiple connections, rather than pushing the whole object serially down one connection — throughput can scale with parallelism instead of being capped by a single stream. ^card-tgot

After all parts are uploaded, the client sends a ==complete== request ^card-du7d
listing each part's identifying information, and S3 assembles them, in
the order specified, into the final object — the parts themselves are
never independently readable as objects.

> [!card] mcq
> What actually happens when a client issues the "complete multipart
> upload" request?
> - [x] S3 concatenates the already-uploaded parts, in the order the client specifies, into a single object; no additional data is transferred at this step
> - [ ] The client re-uploads the entire object in one request as a final integrity check
> - [ ] S3 deletes all but the largest part and discards the rest
> - [ ] Each part becomes its own independently addressable object ^card-2l1t

If a multipart upload is never completed or explicitly aborted —
because the client crashed, lost network, or simply gave up — the
already-uploaded parts don't vanish on their own: they remain stored,
==billed==, and invisible to normal object listings, since they belong ^card-2tqv
to an incomplete upload rather than to any object.

> [!card] recall
> Explain the specific failure mode of "abandoned incomplete multipart
> uploads": why they're easy to accumulate without noticing, and what
> mechanism (short of manually auditing) is normally used to clean them
> up. ^card-7yeh

What actually reclaims the storage held by an abandoned incomplete multipart upload? :: An explicit abort-multipart-upload call, or a lifecycle rule that targets incomplete uploads after an age threshold — until one of those runs, the uploaded parts persist and are billed as if the upload had finished, despite never becoming a retrievable object. ^card-es8g

What distinguishes a multipart upload's parts from ordinary object versions left behind after an overwrite? :: Parts of an incomplete multipart upload were never assembled into a real object at all — they have no key of their own and never appear in a listing — whereas an old object version is a complete, independently readable object that versioning is deliberately keeping around; the cleanup mechanisms for each (lifecycle rules for incomplete uploads vs. version expiration rules) target different things for that reason. ^card-qvyp

A part can also be sourced from an existing S3 object via
==UploadPartCopy== instead of from the client's own upload, which lets ^card-ap4g
you assemble a new large object out of pieces of existing ones — such as
combining previously uploaded chunks — without transferring those
unchanged bytes through the client at all.
