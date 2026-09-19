---
topic: aws
category: aws-s3
tags: [storage-classes, lifecycle, durability, retrieval-latency]
citations: ["AWS Developer Guide — Amazon S3, 'Using Amazon S3 storage classes'"]
---

# Storage Classes and Lifecycle

It's tempting to read S3's storage classes as a price list: pick the
cheapest tier your budget allows. That framing breaks the moment prices
change, and it hides the actual engineering decision, which is a
three-way tradeoff between durability, availability, and how quickly you
can get an object back.

Every S3 storage class offers the same underlying ==durability== ^card-4hyd
guarantee for the data itself; what differs between classes is
availability (how likely a request succeeds without retrying) and how
long it takes to retrieve an object on demand.

Standard is built for frequently accessed data with millisecond
retrieval and the highest availability target; Infrequent Access classes
trade a lower availability target and a minimum storage duration
commitment for a lower storage cost, while keeping the same millisecond
retrieval — they assume you'll access the data, just rarely.

> [!card] mcq
> What do the Infrequent Access storage classes give up relative to
> Standard, in exchange for a lower storage cost?
> - [x] A lower availability target and a minimum storage duration commitment, while keeping millisecond retrieval
> - [ ] Durability — objects are less protected against loss
> - [ ] The ability to retrieve the object at all without a restore request
> - [ ] Support for versioning ^card-4uvq

The archive tiers make the opposite trade from Infrequent Access: instead
of accepting a lower availability target, they accept a ==restore ^card-zinm
delay== that varies by tier, because the underlying storage medium is
not kept in a state that serves reads directly.

Why can't you simply GET an object stored in an archive tier the way you GET a Standard object? :: An archive-tier object isn't held on immediately-readable media; you must first submit a restore request, wait out that tier's retrieval delay while a temporary readable copy is prepared, and only then issue the GET — treating it like Standard would just return an error until the restore completes. ^card-74q4

One class, Intelligent-Tiering, moves an object between access tiers
automatically based on observed access patterns, which removes the need
to predict ==access frequency== up front at the cost of small monitoring ^card-izud
overhead per object.

A **lifecycle rule** automates the transition of objects between storage
classes, or their expiration, based on the object's age or a tag/prefix
filter — for example, moving log objects to an archive tier after they
stop being queried, without any application code changing where it reads
from.

> [!card] recall
> A team stores application logs in S3 Standard forever and manually
> deletes old ones during an annual cleanup. Explain how a lifecycle
> rule replaces both the "move to cheaper storage" and "delete" halves
> of that manual process, and why doing it through a rule instead of
> a script matters for correctness (hint: think about what happens if
> the script is skipped one year). ^card-5nn5

Lifecycle transitions are irreversible in the sense that ==moving== an ^card-ectz
object to an archive tier is not itself instant — the object remains
addressable by the same key throughout, but a reader must now account
for that class's retrieval delay before the transition is even visible
to them as a behavior change.

What single tradeoff explains why a workload with unpredictable access patterns is a poor fit for a lifecycle rule that moves objects straight to an archive tier on a fixed schedule? :: A fixed-schedule rule can't tell whether an object will actually be needed soon after the schedule fires; if it's accessed while archived, the request pays that tier's restore delay regardless of how "hot" the object turns out to be, whereas Intelligent-Tiering (or no transition at all) avoids guessing wrong about future access. ^card-rpz1
