---
topic: data-systems
category: data-systems
tags: [reliability, scalability, latency, load]
citations: ["Kleppmann, Designing Data-Intensive Applications, Ch. 1"]
---

# Reliability, Scalability, and Maintainability

A **fault** is one component deviating from its spec; a **failure** is the
system as a whole stopping delivery of the required service. Reliable
systems are built assuming faults are inevitable and tolerating them, not
by trying to eliminate every fault. A single disk failure is a fault; if
replication and failover keep serving requests, it never becomes a failure.

Well-designed systems deliberately trigger faults (e.g. Netflix's Chaos
Monkey) to verify that fault-tolerance machinery actually works, rather
than assuming an untested recovery path will succeed under real failure.

Average latency is a poor way to describe how a service feels to users,
because it hides the shape of the distribution. A service can have a low
mean while a meaningful fraction of requests take far longer, and those
slow requests are often the ones from your highest-value or most-active
users, who make more requests and so are more likely to hit the tail.

> [!card] mcq
> Why do engineers report the p99 or p999 latency instead of the mean?
> - [x] The mean hides tail behavior that a meaningful fraction of users actually experience
> - [ ] The mean is mathematically impossible to compute for skewed data
> - [ ] Percentiles are always lower than the mean, so they look better in reports
> - [ ] Regulatory standards require percentile reporting for all APIs ^card-rnvy

A fault is a component deviating from spec; a ==failure== is the system as ^card-e79p
a whole ceasing to provide the required service.

Scalability is not a single number ("this system scales") but a question
of how a system's performance responds as a specific ==load parameter== ^card-ms4h
grows, such as requests per second, the ratio of reads to writes, or the
number of simultaneously active users.

What is the difference between scaling up and scaling out? :: Scaling up (vertical) moves the workload to a more powerful single machine; scaling out (horizontal) distributes the workload across many smaller machines. Shared-nothing horizontal scaling is more common for very large workloads but introduces distributed-systems complexity that a single powerful machine avoids. ^card-1b1b

> [!card] mcq
> A service that was fast with 10 requests/second becomes unusably slow at
> 10,000 requests/second even though the machine has spare CPU. Which load
> parameter most likely explains this?
> - [x] A parameter the original design didn't account for, e.g. fan-out per request or a shared lock's contention
> - [ ] The service is simply CPU-bound and needs a faster processor
> - [ ] HTTP itself cannot handle more than a few thousand requests per second
> - [ ] The percentile latency metric is being miscalculated ^card-0oja

Maintainability is often reduced to three overlapping goals: operability
(making it easy for operations teams to keep the system running),
simplicity (removing unnecessary complexity from the system so new
engineers can understand it), and ==evolvability== (making it easy to ^card-nu5j
adapt the system to new requirements as they inevitably arise).

> [!card] recall
> A team says their system is "reliable" because it hasn't gone down in six
> months. Explain why this claim, on its own, says little about whether the
> system is actually fault-tolerant. ^card-xcne
